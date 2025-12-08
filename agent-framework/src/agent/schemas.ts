import { z } from "zod";

export enum BaseStepStatus {
  Success = "success",
  Failure = "failure",
  Pending = "pending",
  InProgress = "inProgress",
  Timeout = "timeout",
  Cancelled = "cancelled",
}

export const baseStepSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.nativeEnum(BaseStepStatus),
  parents: z
    .array(z.string())
    .optional()
    .nullable()
    .describe(
      "The IDs of steps that must complete before processing this step.",
    ),
});

export type BaseStep = z.infer<typeof baseStepSchema>;

export type BaseStepSchema = z.ZodType<BaseStep, z.ZodTypeDef>;

export const baseOutcomeSchema = z.object({
  stepId: z.string(),
  status: z.nativeEnum(BaseStepStatus),
  summary: z
    .string()
    .describe(
      "a concise, factual summary grounded ONLY in the tool calls results",
    ),
});

export type BaseOutcome = z.infer<typeof baseOutcomeSchema>;

export type BaseOutcomeSchema = z.ZodType<BaseOutcome, z.ZodTypeDef>;

export function createBaseSystemEvaluationMetadataSchema<
  S extends BaseStepSchema,
>(stepSchema: S) {
  return z.object({
    planOverride: z
      .array(stepSchema)
      .describe("New query plan to perform instead of the remaining ones")
      .nullable(),
  });
}

export const baseSystemEvaluationMetadataSchema =
  createBaseSystemEvaluationMetadataSchema(baseStepSchema);

export enum BaseEvaluationDecision {
  Continue = "continue",
  Break = "break",
  Override = "override",
}

export function createEvaluationSchema() {
  const shape = baseSystemEvaluationMetadataSchema.shape;

  const forbiddenShape = Object.fromEntries(
    (Object.keys(shape) as Array<keyof typeof shape>).map((key) => [
      key,
      z.never().optional(),
    ]),
  ) as { [K in keyof typeof shape]: z.ZodOptional<z.ZodNever> };

  return z.object({
    decision: z.nativeEnum(BaseEvaluationDecision),
    reason: z.string(),
    ...forbiddenShape,
  });
}

export const baseEvaluationSchema = createEvaluationSchema();

export type BaseEvaluation = z.infer<typeof baseEvaluationSchema>;

export type BaseEvaluationSchema = z.ZodObject<
  typeof baseEvaluationSchema.shape,
  "strip",
  z.ZodTypeAny,
  BaseEvaluation
>;

export function createBaseSystemEvaluation<
  S extends BaseStepSchema,
  E extends BaseEvaluationSchema,
>(stepSchema: S, evaluationSchema: E) {
  const systemMetadata =
    createBaseSystemEvaluationMetadataSchema<S>(stepSchema);
  return evaluationSchema.extend(systemMetadata.shape);
}

export type BaseSystemEvaluation<
  S extends BaseStepSchema,
  E extends BaseEvaluationSchema,
> = z.infer<ReturnType<typeof createBaseSystemEvaluation<S, E>>>;

export type BaseSystemEvaluationSchema<
  S extends BaseStepSchema,
  E extends BaseEvaluationSchema,
> = z.ZodType<BaseSystemEvaluation<S, E>, z.ZodTypeDef>;

export const baseAnswerSchema = z.any();

export type BaseAnswer = z.infer<typeof baseAnswerSchema>;

export type BaseAnswerSchema = z.ZodType<BaseAnswer, z.ZodTypeDef>;
