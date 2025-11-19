import { z } from "zod";
import { planStepSchema } from "../query-planner";

export enum EvaluationStatus {
  Continue = "continue",
  Finalize = "finalize",
  OverridePlan = "overridePlan",
}

export const evaluationSchema = z.object({
  status: z.nativeEnum(EvaluationStatus),
  reason: z.string().describe("The reason for your chosen evaluation status"),
  planOverride: z
    .array(planStepSchema)
    .describe("New query plan to perform instead of the remaining ones")
    .nullable(),
});

export type Evaluation = z.infer<typeof evaluationSchema>;

export const finalAnswerSchema = z.object({
  answer: z
    .string()
    .describe("A short final answer. Does not have to be a full sentence"),
  reason: z
    .string()
    .describe(
      "Explain why you think this is the correct answer based on the gathered evidence",
    ),
  evidence: z
    .array(z.string())
    .min(1)
    .describe(
      "The IDs of the documents used as evidence to reach the final answer",
    ),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe(
      "Confidence score between 0 and 1 reflecting certainty in the answer",
    ),
});

export type FinalAnswer = z.infer<typeof finalAnswerSchema>;
