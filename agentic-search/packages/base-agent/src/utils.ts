import { LLMProvider } from "./llms";
import { PlanStep, PlanStepStatus } from "./types";

export function stringifyToolArguments(args: Record<string, any>): string {
  return Object.entries(args)
    .map(([key, value]) => `${key}: "${value}"`)
    .join(", ");
}

export function parseLLMProvider(input: string) {
  switch (input.toLowerCase()) {
    case "openai":
      return LLMProvider.OpenAI;
    default:
      throw new AggregateError(`Unsupported LLM provider: ${input}`);
  }
}

export function overrideQueryPlan({
  queryPlan,
  lastExecuted,
  newSteps,
}: {
  queryPlan: PlanStep[];
  lastExecuted: number;
  newSteps?: PlanStep[];
}) {
  return [
    ...queryPlan.slice(0, lastExecuted + 1),
    ...queryPlan
      .slice(lastExecuted + 1, queryPlan.length)
      .map((step) => ({ ...step, status: PlanStepStatus.Cancelled })),
    ...(newSteps || []),
  ];
}
