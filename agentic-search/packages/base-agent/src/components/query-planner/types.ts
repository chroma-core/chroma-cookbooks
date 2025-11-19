import { z } from "zod";
import { CoreServices } from "../agent-component";

export enum PlanStepStatus {
  Success = "success",
  Failure = "failure",
  Pending = "pending",
  InProgress = "inProgress",
  Timeout = "timeout",
  Cancelled = "cancelled",
}

export const planStepSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().describe("Written in first person"),
  status: z.nativeEnum(PlanStepStatus),
  parent: z
    .string()
    .nullable()
    .describe("The step ID that must complete before processing this step."),
});

export type PlanStep = z.infer<typeof planStepSchema>;

export const queryPlanSchema = z.object({
  steps: z.array(planStepSchema).min(1),
});

export type QueryPlan = z.infer<typeof queryPlanSchema>;

export type QueryPlannerConfig = CoreServices & {
  plan: PlanStep[];
  maxPlanSize: number;
};

export type CreateQueryPlannerConfig = Omit<QueryPlannerConfig, "plan"> & {
  query: string;
};
