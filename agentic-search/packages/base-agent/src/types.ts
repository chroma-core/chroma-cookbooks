import { LLMServiceConfig } from "./llms";
import { z } from "zod";
import { AgentStatusHandler } from "./status-handler";

export interface AgentPrompts {
  generateQueryPlan: (maxQueryPlanSize: number) => string;
  executeStepSystemPrompt: () => string;
  evaluateStepUserPrompt: (args: {
    step: PlanStep;
    context: AgentContext;
  }) => string;
  finalizeStepPrompt: () => string;
  evaluateSystemPrompt: (maxNewSteps: number) => string;
  evaluateUserPrompt: (args: {
    query: string;
    context: AgentContext;
  }) => string;
  finalAnswerSystemPrompt: () => string;
  finalAnswerUserPrompt: (args: {
    query: string;
    context: AgentContext;
  }) => string;
}

export interface BaseAgentConfig {
  llmConfig: LLMServiceConfig;
  prompts: AgentPrompts;
  tools: Tool[];
  statusHandler?: AgentStatusHandler;
}

export abstract class Tool {
  id: string;
  name: string;
  description: string;
  parameters: z.AnyZodObject;

  protected constructor(args: {
    id: string;
    name: string;
    description: string;
    parameters: z.AnyZodObject;
  }) {
    this.id = args.id;
    this.name = args.name;
    this.description = args.description;
    this.parameters = args.parameters;
  }

  abstract execute(parameters: any): Promise<string>;
}

export enum PlanStepStatus {
  Success = "success",
  Failure = "failure",
  Pending = "pending",
  InProgress = "inProgress",
  Timeout = "timeout",
  Cancelled = "cancelled",
}

export enum EvaluationStatus {
  Continue = "continue",
  Finalize = "finalize",
  OverridePlan = "overridePlan",
}

export const planStepSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().describe("Written in first person"),
  status: z.nativeEnum(PlanStepStatus),
});

export type PlanStep = z.infer<typeof planStepSchema>;

export const queryPlanSchema = z.object({
  steps: z.array(planStepSchema).min(1),
  summary: z
    .string()
    .describe(
      "A summary of the input query only. Do not mention the query plan itself",
    ),
});

export type QueryPlan = z.infer<typeof queryPlanSchema>;

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

export interface AgentContext {
  steps: PlanStep[];
  query: string;
  history: StepOutcome[];
}

export interface BaseAgentAnswerArgs {
  query: string;
  maxQueryPlanSize?: number;
  maxStepIterations?: number;
}
