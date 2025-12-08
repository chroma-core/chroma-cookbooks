import {
  baseAnswerSchema,
  BaseEvaluationDecision,
  baseEvaluationSchema,
  baseOutcomeSchema,
  baseStepSchema,
  createBaseSystemEvaluation,
} from "./schemas";
import {
  AnswerOf,
  BaseAgentComponentFactory,
  BaseAgentConfig,
  BaseAgentSchemas,
  BaseAgentServices,
  BaseAgentStateFactory,
  BaseAgentTypes,
  CreateBaseAgentConfig,
  EvaluationSchemaOf,
  OutcomeOf,
  Resolve,
  RunConfig,
  Runtime,
  StepOf,
  StepSchemaOf,
} from "./types";
import { ConsoleInputHandler } from "../services/input-handler";
import { ConsoleStatusHandler } from "../services/status-handler";
import { createBasePrompts } from "../services/prompts/base-prompts";
import { LLMFactory } from "../services/llms";
import { Tool } from "../components/executor";
import { BaseAgentComponentConfig } from "../components/base";
import { BasePlanner } from "../components/planner";
import { BaseExecutor } from "../components/executor/base-executor";
import { BaseEvaluator } from "../components/evaluator";
import { BaseContext, Context, ContextConfig } from "../states/context";
import { runContext, throwIfAborted } from "./run-context";
import { AgentError } from "./errors";

export class BaseAgent<T extends BaseAgentTypes> {
  protected static DEFAULT_SCHEMAS = {
    step: baseStepSchema,
    outcome: baseOutcomeSchema,
    evaluation: baseEvaluationSchema,
    answer: baseAnswerSchema,
  };

  protected readonly schemas: BaseAgentSchemas<T>;
  protected readonly services: BaseAgentServices<T>;
  protected readonly tools: Tool[];
  protected readonly components: BaseAgentComponentFactory<T>;
  protected readonly states: BaseAgentStateFactory<T>;

  protected constructor(config: BaseAgentConfig<T>) {
    const { schemas, services, tools, components, states } = config;

    this.services = services;
    this.tools = tools;

    const { step, evaluation, ...baseSchemas } = schemas;
    this.schemas = {
      ...baseSchemas,
      step,
      evaluation: createBaseSystemEvaluation<
        StepSchemaOf<T>,
        EvaluationSchemaOf<T>
      >(step, evaluation),
    };

    const {
      planner = (config: BaseAgentComponentConfig<T>) =>
        new BasePlanner<T>(config),
      executor = (config: BaseAgentComponentConfig<T>) =>
        new BaseExecutor<T>(config),
      evaluator = (config: BaseAgentComponentConfig<T>) =>
        new BaseEvaluator<T>(config),
    } = components ?? {};

    this.components = { planner, executor, evaluator };

    const { context = (config: ContextConfig<T>) => new BaseContext(config) } =
      states ?? {};
    this.states = { context };
  }

  static create<T extends Partial<BaseAgentTypes> = {}>(
    config: CreateBaseAgentConfig<T>,
  ): BaseAgent<Resolve<T>>;

  static create(config: CreateBaseAgentConfig<Partial<BaseAgentTypes>>) {
    const { schemas, services, llmConfig, tools, components, states } =
      config || {};
    const {
      step = BaseAgent.DEFAULT_SCHEMAS.step,
      outcome = BaseAgent.DEFAULT_SCHEMAS.outcome,
      evaluation = BaseAgent.DEFAULT_SCHEMAS.evaluation,
      answer = BaseAgent.DEFAULT_SCHEMAS.answer,
    } = schemas || {};

    const {
      inputHandler = new ConsoleInputHandler(),
      prompts,
      statusHandler = new ConsoleStatusHandler(),
    } = services || {};

    return new BaseAgent({
      schemas: { step, outcome, evaluation, answer },
      services: {
        inputHandler,
        llmService: LLMFactory.create(llmConfig),
        prompts: { ...createBasePrompts(), ...prompts },
        statusHandler,
      },
      tools: tools ?? [],
      components,
      states,
    });
  }

  protected componentConfig(): BaseAgentComponentConfig<T> {
    return {
      agentServices: this.services,
      agentSchemas: this.schemas,
      agentTools: this.tools,
    };
  }

  private runtime(): Runtime<T> {
    const config = this.componentConfig();
    const { planner, executor, evaluator } = this.components;
    return {
      planner: planner(config),
      executor: executor(config),
      evaluator: evaluator(config),
    };
  }

  protected async executeSteps({
    steps,
    runtime,
    context,
    maxIterations,
  }: {
    steps: StepOf<T>[];
    runtime: Runtime<T>;
    context: Context<T>;
    maxIterations: number;
  }): Promise<OutcomeOf<T>[]> {
    return await Promise.all(
      steps.map(async (step: StepOf<T>) => {
        const outcome = await runtime.executor.run({
          step,
          context,
          maxIterations,
        });
        throwIfAborted();

        runtime.planner.updateStepsStatus({
          steps: [step],
          status: outcome.status,
        });

        return outcome;
      }),
    );
  }

  protected async evaluate({
    runtime,
    context,
    maxPlanSize,
  }: {
    runtime: Runtime<T>;
    context: Context<T>;
    maxPlanSize: number;
  }): Promise<{ break: boolean }> {
    const { planner, evaluator } = runtime;

    if (planner.completed()) {
      return { break: true };
    }

    const evaluation = await evaluator.evaluatePlan({
      query: context.query,
      context,
      maxNewSteps: maxPlanSize,
    });

    if (evaluation.decision === BaseEvaluationDecision.Break) {
      return { break: true };
    }

    if (
      evaluation.decision === BaseEvaluationDecision.Override &&
      evaluation.planOverride
    ) {
      planner.override(evaluation.planOverride);
    }

    return { break: false };
  }

  protected async finalize({
    runtime,
    context,
    query,
  }: {
    runtime: Runtime<T>;
    context: Context<T>;
    query: string;
  }): Promise<AnswerOf<T>> {
    return await runtime.evaluator.synthesizeFinalAnswer({ context, query });
  }

  async run({
    query,
    maxPlanSize,
    maxStepIterations,
    signal,
  }: RunConfig): Promise<AnswerOf<T>> {
    if (!query) {
      throw new AgentError("No query provided for Agent run");
    }

    return runContext.run({ signal }, async () => {
      const runtime = this.runtime();
      const { planner } = runtime;

      const context = this.states.context({ query, plan: planner.getPlan });

      await planner.initialize({ query, maxSize: maxPlanSize });

      for (const steps of planner) {
        throwIfAborted();
        const outcomes = await this.executeSteps({
          steps,
          runtime,
          context,
          maxIterations: maxStepIterations,
        });

        context.addOutcomes(outcomes);

        if (planner.completed()) break;

        const result = await this.evaluate({ runtime, maxPlanSize, context });
        if (result.break) {
          break;
        }
      }

      planner.cancel();
      return await this.finalize({ runtime, context, query });
    });
  }
}
