import {
  AgentContext,
  AgentPrompts,
  BaseAgentAnswerArgs,
  BaseAgentConfig,
  CreateBaseAgentConfig,
} from "./types";
import { LLMFactory, LLMService } from "./llms";
import {
  PlanStep,
  QueryPlanner,
  EvaluationStatus,
  Evaluator,
  FinalAnswer,
  Executor,
  StepOutcome,
  Tool,
  AgentStatusHandler,
  CoreServices,
} from "./components";
import { AgentError } from "./errors";

export class BaseAgent {
  public static readonly MAX_QUERY_PLAN_SIZE = 10;
  public static readonly MAX_STEP_ITERATIONS = 3;
  protected llmService: LLMService;
  protected prompts: AgentPrompts;
  protected statusHandler?: AgentStatusHandler;
  protected tools: Tool[];

  constructor({ tools, ...services }: BaseAgentConfig) {
    this.llmService = services.llmService;
    this.prompts = services.prompts;
    this.statusHandler = services.statusHandler;
    this.tools = tools;
  }

  public static async create({
    llmConfig,
    ...config
  }: CreateBaseAgentConfig): Promise<BaseAgent> {
    const llmService = await LLMFactory.create(llmConfig);
    return new BaseAgent({ llmService, ...config });
  }

  private services(): CoreServices {
    return {
      llmService: this.llmService,
      prompts: this.prompts,
      statusHandler: this.statusHandler,
    };
  }

  public async answer({
    query,
    maxPlanSize = BaseAgent.MAX_QUERY_PLAN_SIZE,
    maxIterations = BaseAgent.MAX_STEP_ITERATIONS,
  }: BaseAgentAnswerArgs): Promise<FinalAnswer> {
    if (!query) {
      throw new AgentError("No query was provided");
    }

    const queryPlanner = await QueryPlanner.create({
      query,
      maxPlanSize,
      ...this.services(),
    });

    const executor = new Executor({
      maxIterations,
      tools: this.tools,
      ...this.services(),
    });

    const evaluator = new Evaluator(this.services());

    const context: AgentContext = {
      steps: queryPlanner.plan,
      query,
      history: [],
    };

    for (const steps of queryPlanner) {
      const outcomes: StepOutcome[] = await Promise.all(
        steps.map(async (step: PlanStep) => {
          const outcome = await executor.run({ step, context });
          queryPlanner.updateStepsStatus({
            steps: [step],
            status: outcome.status,
          });
          return outcome;
        }),
      );

      context.history.push(...outcomes);

      if (queryPlanner.completed()) {
        break;
      }

      const planEvaluation = await evaluator.evaluatePlan({
        query,
        context,
        maxNewSteps: queryPlanner.availableBuffer(),
      });

      if (
        planEvaluation.status === EvaluationStatus.OverridePlan &&
        planEvaluation.planOverride
      ) {
        queryPlanner.overridePlan(planEvaluation.planOverride);
        continue;
      }

      if (planEvaluation.status === EvaluationStatus.Finalize) {
        break;
      }
    }

    queryPlanner.cancelPlan();
    return await evaluator.synthesizeFinalAnswer({ query, context });
  }
}
