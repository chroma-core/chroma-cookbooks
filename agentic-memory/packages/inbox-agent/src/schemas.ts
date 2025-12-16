import {
  baseAnswerSchema,
  baseEvaluationSchema,
  baseOutcomeSchema,
  baseStepSchema,
} from "@chroma-cookbooks/agent-framework";
import { z } from "zod";
import { emailSchema } from "./inbox-service";

export const stepSchema = baseStepSchema.extend({ email: emailSchema });

export type Step = z.infer<typeof stepSchema>;

export const outcomeSchema = baseOutcomeSchema.omit({ summary: true }).extend({
  summary: z
    .string()
    .describe(
      "A short (1 sentence or less) summary of the email. Include information about the sender. The steps you took to process this email and the result",
    ),
  derivedRules: z
    .array(z.string())
    .optional()
    .nullable()
    .describe(
      "ONLY if you requested input from the user for processing this step, note here the rules you derived from the user input provided that allowed you to complete this step",
    ),
});

export type Outcome = z.infer<typeof outcomeSchema>;

export const evaluationSchema = baseEvaluationSchema;

export type Evaluation = z.infer<typeof evaluationSchema>;

export const answerSchema = z.object({
  summary: z
    .string()
    .describe(
      "A summary of the inbox processing run. Note all the actions you took, and if you derived any new rules.",
    ),
});

export type Answer = z.infer<typeof answerSchema>;
