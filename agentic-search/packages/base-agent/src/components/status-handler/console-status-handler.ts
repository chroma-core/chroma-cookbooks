import { AgentStatusHandler } from "./types";
import { PlanStep } from "../query-planner";
import { ToolCall } from "../../llms";
import { StepOutcome } from "../executor";
import { Evaluation, FinalAnswer } from "../evaluator";
import { getStatusSymbol, getToolParamsSymbol } from "./utils";

export class ConsoleStatusHandler implements AgentStatusHandler {
  public onAssistantUpdate(message: string): void {
    console.log(message + "\n");
  }

  public onQueryPlanUpdate(queryPlan: PlanStep[]): void {
    console.log(
      queryPlan
        .map((step) => `${getStatusSymbol(step.status)} ${step.title}`)
        .join("\n") + "\n",
    );
  }

  public onToolCall(args: {
    toolCall: ToolCall;
    toolParams: any;
    reason?: string;
  }): void {
    console.log(
      `Calling ${args.toolCall.name}(${getToolParamsSymbol(args.toolParams)})`,
    );
  }

  public onStepOutcome(outcome: StepOutcome): void {
    console.log(outcome.summary);
  }

  public onPlanEvaluation(evaluation: Evaluation): void {
    console.log(evaluation.reason);
  }

  public onFinalAnswer(answer: FinalAnswer): void {
    console.log(answer.answer);
  }
}
