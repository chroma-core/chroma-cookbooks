import { BaseStepStatus } from "../../agent/schemas";

export function getStatusSymbol(status: BaseStepStatus) {
  switch (status) {
    case BaseStepStatus.Success:
      return "✓";
    case BaseStepStatus.Timeout:
    case BaseStepStatus.Failure:
      return "x";
    case BaseStepStatus.Pending:
      return "·";
    case BaseStepStatus.InProgress:
      return "◻";
    case BaseStepStatus.Cancelled:
      return "⊗";
  }
}

export function getToolParamsSymbol(parameters: any) {
  return Object.entries(parameters)
    .map(([key, value]) => `${key}=${value}`)
    .join(", ");
}
