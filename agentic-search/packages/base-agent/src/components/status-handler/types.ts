import { ToolCall, ToolMessage } from "../../llms";
import { StepOutcome } from "../executor";
import { PlanStep } from "../query-planner";
import { Evaluation, FinalAnswer } from "../evaluator";

interface StatusHandlers {
  onAssistantUpdate(message: string): void;
  onQueryPlanUpdate(queryPlan: PlanStep[]): void;
  onToolCall(args: {
    toolCall: ToolCall;
    toolParams: any;
    reason?: string;
  }): void;
  onToolResult(result: any, toolCall?: ToolCall): void;
  onStepOutcome(outcome: StepOutcome): void;
  onPlanEvaluation(evaluation: Evaluation): void;
  onFinalAnswer(answer: FinalAnswer): void;
}

export type AgentStatusHandler = Partial<StatusHandlers>;
