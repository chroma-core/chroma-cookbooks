import {
  baseOutcomeSchema,
  baseStepSchema,
} from "@chroma-cookbooks/agent-framework";
import { z } from "zod";

export const stepSchema = baseStepSchema.extend({
  description: z.string().describe("Written in first person"),
});

export type Step = z.infer<typeof stepSchema>;

export const chunkSchema = z.object({
  filePath: z.string(),
  snippet: z.string(),
  symbol: z.string().nullable().describe("Function, class, or variable name"),
  relevance: z.number().min(0).max(1),
});

export type Chunk = z.infer<typeof chunkSchema>;

export const outcomeSchema = baseOutcomeSchema.extend({
  chunks: z
    .array(chunkSchema)
    .describe("Code chunks found relevant to the step"),
  insights: z
    .array(z.string())
    .nullable()
    .describe("Key observations about the code found"),
});

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
});

export type Answer = z.infer<typeof answerSchema>;
