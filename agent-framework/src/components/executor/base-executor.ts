import { BaseExecutorConfig, Executor } from "./types";
import { BaseComponent } from "../base";
import { Tool } from "./tool";
import { Context } from "../../states/context";
import {
  LLMMessage,
  LLMRole,
  ToolCall,
  ToolMessage,
} from "../../services/llms";
import { ExecutorPrompts } from "../../services/prompts";
import { ExecutorStatusHandler } from "../../services/status-handler";
import {
  BaseAgentTypes,
  OutcomeOf,
  OutcomeSchemaOf,
  StepOf,
  BaseStepStatus,
  ExecutorError,
} from "../../agent";

export class BaseExecutor<T extends BaseAgentTypes>
  extends BaseComponent<T>
  implements Executor<T>
{
  declare protected prompts: ExecutorPrompts<T>;
  declare protected statusHandler: ExecutorStatusHandler<T>;
  private readonly _tools: Record<string, Tool>;
  readonly outcomeSchema: OutcomeSchemaOf<T>;

  constructor(config: BaseExecutorConfig<T>) {
    super(config);
    this.outcomeSchema = config.outcomeSchema ?? config.agentSchemas.outcome;
    this._tools = BaseExecutor.mapTools(
      config.tools?.map((tool) => {
        if (typeof tool === "function") {
          return tool(config);
        } else {
          return tool;
        }
      }) ?? config.agentTools,
    );
  }

  get tools(): Tool[] {
    return Object.values(this._tools);
  }

  async run({
    step,
    context,
    maxIterations,
  }: {
    step: StepOf<T>;
    context: Context<T>;
    maxIterations: number;
  }): Promise<OutcomeOf<T>> {
    let prompt = this.prompts.executeStepSystemPrompt();
    if (context.memory && context.memory.forExecution) {
      const memoryPrompt = await context.memory.forExecution({ context });
      prompt += "\n\n" + memoryPrompt;
    }

    const messages: LLMMessage[] = [
      {
        role: LLMRole.System,
        content: prompt,
      },
      {
        role: LLMRole.User,
        content: this.prompts.executeStepUserPrompt({
          step,
          context,
        }),
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

      const toolsResults: ToolMessage[] = await Promise.all(
        toolCalls.map(async (call) => await this.runTool(call)),
      );

      messages.push(...toolsResults);
    }

    this.statusHandler?.onAssistantUpdate?.("Finalizing step execution...");

    let outcome = await this.finalizeStep(messages);

    if (turn >= maxIterations) {
      outcome = { ...outcome, status: BaseStepStatus.Timeout };
      this.statusHandler?.onAssistantUpdate?.(
        `Maxed out tool calls for ${step.id}`,
      );
    }

    this.statusHandler?.onStepOutcome?.(outcome);

    return outcome;
  }

  protected getTool(toolId: string): Tool | undefined {
    return this._tools[toolId];
  }

  private static mapTools(tools: Tool[]): Record<string, Tool> {
    return tools.reduce<Record<string, Tool>>((tools, tool) => {
      tools[tool.id] = tool;
      return tools;
    }, {});
  }

  private async runTool(toolCall: ToolCall): Promise<ToolMessage> {
    const tool = this.getTool(toolCall.name);
    if (!tool) {
      return {
        role: LLMRole.Tool,
        content: `Unknown tool: ${toolCall.name}`,
        toolCallId: toolCall.id,
      };
    }

    let parsed: any;
    try {
      parsed = tool.parametersSchema?.parse(JSON.parse(toolCall.arguments));
    } catch (error) {
      return {
        role: LLMRole.Tool,
        content: `Invalid arguments for tool ${tool.name}`,
        toolCallId: toolCall.id,
      };
    }

    const { reason, ...toolParams } = parsed ?? {};

    this.statusHandler?.onToolCall?.({ toolCall, toolParams, reason });

    try {
      const toolResult = await tool.execute(toolParams);
      this.statusHandler?.onToolResult?.(toolResult, toolCall);
      return {
        role: LLMRole.Tool,
        content: tool.format(toolResult) ?? "",
        toolCallId: toolCall.id,
      };
    } catch (error) {
      return {
        role: LLMRole.Tool,
        content: `Error running tool ${tool.name}${(error as Error)?.message ? `: ${(error as Error).message}` : ""}`,
        toolCallId: toolCall.id,
      };
    }
  }

  private async finalizeStep(messages: LLMMessage[]): Promise<OutcomeOf<T>> {
    messages.push({
      role: LLMRole.User,
      content: this.prompts.finalizeStepPrompt(),
    });

    try {
      return await this.llmService.getStructuredOutput<OutcomeOf<T>>({
        messages,
        schema: this.outcomeSchema,
        schemaName: "step_outcome",
      });
    } catch (error) {
      throw new ExecutorError("Failed to generate step outcome", error);
    }
  }
}
