import { getStatusSymbol, getToolParamsSymbol } from "./utils";
import { ToolCall } from "../llms";
import { AgentStatusHandler } from "./types";
import {
  AnswerOf,
  BaseAgentTypes,
  OutcomeOf,
  StepOf,
  SystemEvaluationOf,
} from "../../agent";

export class ConsoleStatusHandler<
  T extends BaseAgentTypes,
> implements AgentStatusHandler<T> {
  onAssistantUpdate(message: string): void {
    console.log(message + "\n");
  }

  onPlanUpdate(plan: StepOf<T>[]): void {
    console.log(
      plan
        .map((step) => `${getStatusSymbol(step.status)} ${step.title}`)
        .join("\n") + "\n",
    );
  }

  onToolCall({
    toolCall,
    toolParams,
  }: {
    toolCall: ToolCall;
    toolParams: any;
    reason?: string;
  }): void {
    console.log(`Calling ${toolCall.name}(${getToolParamsSymbol(toolParams)})`);
  }

  onStepOutcome(outcome: OutcomeOf<T>): void {
    console.log(outcome.summary);
  }

  onPlanEvaluation(evaluation: SystemEvaluationOf<T>): void {
    console.log(evaluation);
  }

  onFinalAnswer(answer: AnswerOf<T>): void {
    console.log(answer.answer);
  }
}
