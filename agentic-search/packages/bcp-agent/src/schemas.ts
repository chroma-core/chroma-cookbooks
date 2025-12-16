import {
  BaseEvaluation,
  baseEvaluationSchema,
  baseOutcomeSchema,
  baseStepSchema,
  BaseSystemEvaluation,
} from "@chroma-cookbooks/agent-framework";
import { z } from "zod";

export const stepSchema = baseStepSchema.extend({
  description: z.string().describe("Written in first person"),
});

export type Step = z.infer<typeof stepSchema>;

export const outcomeSchema = baseOutcomeSchema.extend({
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

export type Evaluation = BaseSystemEvaluation<
  typeof stepSchema,
  typeof baseEvaluationSchema
>;

export type Outcome = z.infer<typeof outcomeSchema>;

export const answerSchema = z.object({
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

export type Answer = z.infer<typeof answerSchema>;

export interface BCPAgentTypes {
  step: typeof stepSchema;
  outcome: typeof outcomeSchema;
  evaluation: typeof baseEvaluationSchema;
  answer: typeof answerSchema;
}
