import { ToolCall } from "../llms";
import {
  AnswerOf,
  BaseAgentTypes,
  OutcomeOf,
  StepOf,
  SystemEvaluationOf,
} from "../../agent/types";

export type CommonStatusHandler = Partial<{
  onAssistantUpdate(message: string): void;
}>;

export type PlannerStatusHandler<T extends BaseAgentTypes> =
  CommonStatusHandler & Partial<{ onPlanUpdate(plan: StepOf<T>[]): void }>;

export type ExecutorStatusHandler<T extends BaseAgentTypes> =
  CommonStatusHandler &
    Partial<{
      onToolCall(args: {
        toolCall: ToolCall;
        toolParams: any;
        reason?: string;
      }): void;
      onToolResult(result: any, toolCall?: ToolCall): void;
      onStepOutcome(outcome: OutcomeOf<T>): void;
    }>;

export type EvaluatorStatusHandler<T extends BaseAgentTypes> =
  CommonStatusHandler &
    Partial<{
      onPlanEvaluation(evaluation: SystemEvaluationOf<T>): void;
      onFinalAnswer(answer: AnswerOf<T>): void;
    }>;

export type AgentStatusHandler<T extends BaseAgentTypes> = CommonStatusHandler &
  PlannerStatusHandler<T> &
  ExecutorStatusHandler<T> &
  EvaluatorStatusHandler<T>;
