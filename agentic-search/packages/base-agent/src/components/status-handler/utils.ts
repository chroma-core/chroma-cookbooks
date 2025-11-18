import { PlanStepStatus } from "../query-planner";

export function getStatusSymbol(status: PlanStepStatus) {
  switch (status) {
    case PlanStepStatus.Success:
      return "✓";
    case PlanStepStatus.Timeout:
    case PlanStepStatus.Failure:
      return "x";
    case PlanStepStatus.Pending:
      return "·";
    case PlanStepStatus.InProgress:
      return "◻";
    case PlanStepStatus.Cancelled:
      return "⊗";
  }
}

export function getToolParamsSymbol(parameters: any) {
  return Object.entries(parameters)
    .map(([key, value]) => `${key}=${value}`)
    .join(", ");
}
