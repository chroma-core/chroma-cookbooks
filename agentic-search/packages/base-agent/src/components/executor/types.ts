import { z } from "zod";
import { PlanStepStatus } from "../query-planner";
import { CoreServices } from "../agent-component";
import { Tool } from "./tool";

export const stepOutcomeSchema = z.object({
  stepId: z.string(),
  status: z.nativeEnum(PlanStepStatus),
  summary: z
    .string()
    .describe("a concise, factual summary grounded ONLY in the search results"),
  evidence: z
    .array(z.string())
    .nullable()
    .describe(
      "The IDs of the documents found to be relevant to solving the step",
    ),
  candidateAnswers: z
    .array(z.string())
    .nullable()
    .describe("Potential candidates for answering the overall user question"),
});

export type StepOutcome = z.infer<typeof stepOutcomeSchema>;

export type ExecutorConfig = CoreServices & {
  tools: Tool[];
  maxIterations: number;
};
