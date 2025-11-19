import { ExecutorConfig, StepOutcome, stepOutcomeSchema } from "./types";
import { LLMMessage, ToolCall, ToolMessage } from "../../llms";
import { AgentContext } from "../../types";
import { PlanStep, PlanStepStatus } from "../query-planner";
import { AgentError } from "../../errors";
import { AgentComponent } from "../agent-component";
import { Tool } from "./tool";

export class Executor extends AgentComponent {
  private readonly maxIterations: number;
  private readonly tools: Tool[];

  constructor({ tools, maxIterations, ...services }: ExecutorConfig) {
    super(services);
    this.maxIterations = maxIterations;
    this.tools = tools;
  }

  public async run({
    step,
    context,
  }: {
    step: PlanStep;
    context: AgentContext;
  }): Promise<StepOutcome> {
    const messages: LLMMessage[] = [
      {
        role: "system",
        content: this.prompts.executeStepSystemPrompt(),
      },
      {
        role: "user",
        content: this.prompts.executeStepUserPrompt({
          step,
          context,
        }),
      },
    ];

    let turn = 0;
    for (; turn < this.maxIterations; turn += 1) {
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

    const outcome = await this.finalizeStep(messages);

    if (turn >= this.maxIterations) {
      outcome.status = PlanStepStatus.Timeout;
      this.statusHandler?.onAssistantUpdate?.(
        `Maxed out tool calls for ${step.id}`,
      );
    }

    this.statusHandler?.onStepOutcome?.(outcome);

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

    this.statusHandler?.onToolCall?.({ toolCall, toolParams, reason });

    try {
      const toolResult = await tool.execute(toolParams);
      this.statusHandler?.onToolResult?.(toolResult, toolCall);
      return {
        role: "tool",
        content: tool.format(toolResult),
        toolCallID: toolCall.id,
      };
    } catch (error) {
      return {
        role: "tool",
        content: `Error running tool ${tool.name}${(error as Error)?.message ? `: ${(error as Error).message}` : ""}`,
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
}
