import { PlanStep, PlanStepStatus } from "./types";

export interface AgentStatusHandler {
  onQueryPlanUpdate(queryPlan: PlanStep[]): void;
  onAssistantUpdate(message: string): void;
}

export class ConsoleStatusHandler implements AgentStatusHandler {
  public onQueryPlanUpdate(queryPlan: PlanStep[]) {
    queryPlan.forEach((step: PlanStep, index: number) => {
      let statusSymbol: string;
      switch (step.status) {
        case PlanStepStatus.InProgress:
        case PlanStepStatus.Pending:
          statusSymbol = "◻";
          break;
        case PlanStepStatus.Success:
          statusSymbol = "✓";
          break;
        default:
          statusSymbol = "ⅹ";
          break;
      }

      console.log(`${statusSymbol} ${step.description}`);
    });
    console.log();
  }

  public onAssistantUpdate(message: string): void {
    console.log(message);
  }
}
