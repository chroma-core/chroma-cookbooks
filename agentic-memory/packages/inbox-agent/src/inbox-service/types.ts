import { z } from "zod";

export const labelSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export type Label = z.infer<typeof labelSchema>;

export const emailSchema = z.object({
  id: z.string(),
  subject: z.string(),
  from: z.string(),
  date: z.string(), // or z.string().datetime() if you want ISO validation
  threadId: z.string(),
  content: z.string(),
  flagged: z.boolean().optional(),
  archived: z.boolean().optional(),
  labels: z.array(labelSchema).optional(),
});

export type Email = z.infer<typeof emailSchema>;

export enum InboxServiceProvider {
  Chroma = "chroma",
  Gmail = "gmail",
}
