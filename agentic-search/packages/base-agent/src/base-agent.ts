import { v4 as uuidv4 } from "uuid";
import { LLMMessage, LLMService, ToolCall, ToolMessage } from "./llms";
import {
  AgentContext,
  AgentPrompts,
  BaseAgentAnswerArgs,
  BaseAgentConfig,
  Evaluation,
  evaluationSchema,
  EvaluationStatus,
  FinalAnswer,
  finalAnswerSchema,
  PlanStep,
  PlanStepStatus,
  QueryPlan,
  queryPlanSchema,
  StepOutcome,
  stepOutcomeSchema,
  Tool,
} from "./types";
import { LLMFactory } from "./llms";
import { AgentError } from "./errors";
import { AgentStatusHandler, ConsoleStatusHandler } from "./status-handler";
import { stringifyToolArguments } from "./utils";

export class BaseAgent {
  public static readonly MAX_QUERY_PLAN_SIZE = 10;
  public static readonly MAX_STEP_ITERATIONS = 5;
  protected llmService: LLMService;
  protected prompts: AgentPrompts;
  protected tools: Tool[];
  protected statusHandler: AgentStatusHandler;

  constructor({ llmConfig, prompts, tools, statusHandler }: BaseAgentConfig) {
    this.llmService = LLMFactory.create(llmConfig);
    this.prompts = prompts;
    this.tools = tools;
    this.statusHandler = statusHandler || new ConsoleStatusHandler();
  }

  private static singletonQueryPlan(query: string): QueryPlan {
    return {
      steps: [
        {
          id: uuidv4(),
          title: "Solving the user's query",
          description: "I will solve the user's query",
          status: PlanStepStatus.InProgress,
        },
      ],
      summary: query,
    };
  }

  public async answer({
    query,
    maxQueryPlanSize = BaseAgent.MAX_QUERY_PLAN_SIZE,
    maxStepIterations = BaseAgent.MAX_STEP_ITERATIONS,
  }: BaseAgentAnswerArgs): Promise<FinalAnswer> {
    const queryPlan = await this.generateQueryPlan({ query, maxQueryPlanSize });

    const context: AgentContext = {
      steps: [...queryPlan.steps],
      query: queryPlan.summary,
      history: [],
    };

    let stepIndex = 0;
    while (stepIndex < context.steps.length && stepIndex < maxStepIterations) {
      const step = context.steps[stepIndex];
      step.status = PlanStepStatus.InProgress;
      this.statusHandler.onQueryPlanUpdate(context.steps);

      const outcome = await this.executeStep(step, context, maxStepIterations);
      context.history.push(outcome);

      step.status = outcome.status;
      this.statusHandler.onQueryPlanUpdate(context.steps);

      const evaluation = await this.evaluate({
        query,
        maxNewSteps: maxQueryPlanSize - stepIndex,
        context,
      });

      if (
        evaluation.status === EvaluationStatus.OverridePlan &&
        evaluation.planOverride?.length
      ) {
        context.steps = [
          ...context.steps.slice(0, stepIndex + 1),
          ...evaluation.planOverride,
        ];
        this.statusHandler.onQueryPlanUpdate(context.steps);
      } else if (evaluation.status === EvaluationStatus.Finalize) {
        break;
      }

      stepIndex += 1;
    }

    this.statusHandler.onAssistantUpdate("Finalizing answer");

    return await this.synthesizeFinalAnswer(query, context);
  }

  private async generateQueryPlan({
    query,
    maxQueryPlanSize,
  }: {
    query: string;
    maxQueryPlanSize: number;
  }): Promise<QueryPlan> {
    if (maxQueryPlanSize < 0) {
      throw new AgentError("Max plan size should be greater than 0");
    }

    if (maxQueryPlanSize <= 1) {
      return BaseAgent.singletonQueryPlan(query);
    }

    const messages: LLMMessage[] = [
      {
        role: "system",
        content: this.prompts.generateQueryPlan(maxQueryPlanSize),
      },
      { role: "user", content: query },
    ];

    try {
      return await this.llmService.getStructuredOutput<QueryPlan>({
        messages,
        schema: queryPlanSchema,
        schemaName: "query_plan",
      });
    } catch (error) {
      throw new AgentError("Failed to generate query plan", error);
    }
  }

  private async executeStep(
    step: PlanStep,
    context: AgentContext,
    maxIterations: number = 10,
  ): Promise<StepOutcome> {
    const messages: LLMMessage[] = [
      { role: "system", content: this.prompts.executeStepSystemPrompt() },
      {
        role: "user",
        content: this.prompts.evaluateStepUserPrompt({ step, context }),
      },
    ];

    let turn = 0;
    for (; turn < maxIterations; turn += 1) {
      const toolCallResponse = await this.llmService.callTools({
        messages,
        tools: this.tools,
      });
      messages.push(toolCallResponse);

      const toolCalls = toolCallResponse.toolCalls;
      if (!toolCalls || toolCalls.length === 0) {
        break;
      }

      const toolsResults = await Promise.all(
        toolCalls.map((call) => this.runTool(call)),
      );

      messages.push(...toolsResults);
    }

    const outcome = await this.finalizeStep(messages);
    if (turn >= maxIterations) {
      outcome.status = PlanStepStatus.Timeout;
    }
    return outcome;
  }

  private async runTool(toolCall: ToolCall): Promise<ToolMessage> {
    const tool = this.getTool(toolCall.name);
    if (!tool) {
      return {
        role: "tool",
        content: `Unknown tool: ${toolCall.name}`,
        toolCallID: toolCall.id,
      };
    }

    let parsed: any;
    try {
      parsed = tool.parameters.parse(JSON.parse(toolCall.arguments));
    } catch (error) {
      return {
        role: "tool",
        content: `Invalid arguments for tool ${tool.name}`,
        toolCallID: toolCall.id,
      };
    }

    const { reason, ...toolParams } = parsed ?? {};

    this.statusHandler?.onAssistantUpdate(
      `I am calling ${toolCall.name}${
        Object.keys(toolParams).length
          ? `, with arguments ${stringifyToolArguments(toolParams)}`
          : ""
      }. ${reason ?? ""}`.trim(),
    );

    try {
      const toolResult = await tool.execute(toolParams);
      return {
        role: "tool",
        content: JSON.stringify(toolResult),
        toolCallID: toolCall.id,
      };
    } catch (error) {
      return {
        role: "tool",
        content: `Error running tool ${tool.name}${(error as Error)?.message ? (error as Error).message : ""}`,
        toolCallID: toolCall.id,
      };
    }
  }

  private getTool(toolId: string) {
    return this.tools.find((tool) => tool.id === toolId);
  }

  private async finalizeStep(messages: LLMMessage[]): Promise<StepOutcome> {
    messages.push({
      role: "user",
      content: this.prompts.finalizeStepPrompt(),
    });

    try {
      return await this.llmService.getStructuredOutput<StepOutcome>({
        messages,
        schema: stepOutcomeSchema,
        schemaName: "step_outcome",
      });
    } catch (error) {
      throw new AgentError("Failed to generate step outcome", error);
    }
  }

  private async evaluate(args: {
    query: string;
    maxNewSteps: number;
    context: AgentContext;
  }): Promise<Evaluation> {
    const { query, maxNewSteps, context } = args;
    const messages: LLMMessage[] = [
      {
        role: "system",
        content: this.prompts.evaluateSystemPrompt(maxNewSteps),
      },
      {
        role: "user",
        content: this.prompts.evaluateUserPrompt({ context, query }),
      },
    ];

    try {
      return await this.llmService.getStructuredOutput<Evaluation>({
        messages,
        schema: evaluationSchema,
        schemaName: "evaluation",
      });
    } catch (error) {
      throw new AgentError("Failed to evaluate step", error);
    }
  }

  private async synthesizeFinalAnswer(
    query: string,
    context: AgentContext,
  ): Promise<FinalAnswer> {
    const messages: LLMMessage[] = [
      { role: "system", content: this.prompts.finalAnswerSystemPrompt() },
      {
        role: "user",
        content: this.prompts.finalAnswerUserPrompt({ context, query }),
      },
    ];

    try {
      return await this.llmService.getStructuredOutput<FinalAnswer>({
        messages,
        schema: finalAnswerSchema,
        schemaName: "final_answer",
      });
    } catch (error) {
      throw new AgentError("Failed to generate the final answer", error);
    }
  }
}
