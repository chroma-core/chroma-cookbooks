import {
  baseAnswerSchema,
  BaseAnswerSchema,
  baseEvaluationSchema,
  BaseEvaluationSchema,
  baseOutcomeSchema,
  BaseOutcomeSchema,
  baseStepSchema,
  BaseStepSchema,
} from "./schemas";
import { BaseSystemEvaluationSchema } from "./schemas";
import { InputHandler } from "../services/input-handler";
import { z } from "zod";
import { LLMService, LLMServiceConfig } from "../services/llms";
import { PromptsService } from "../services/prompts";
import { AgentStatusHandler } from "../services/status-handler";
import { Executor, Tool } from "../components/executor";
import { BaseComponentConfig } from "../components/base";
import { Planner } from "../components/planner";
import { Evaluator } from "../components/evaluator";
import { Context, ContextConfig } from "../states/context";

export interface BaseAgentTypes {
  step: BaseStepSchema;
  outcome: BaseOutcomeSchema;
  evaluation: BaseEvaluationSchema;
  answer: BaseAnswerSchema;
}

export interface BaseAgentTypeDefaults {
  step: typeof baseStepSchema;
  outcome: typeof baseOutcomeSchema;
  evaluation: typeof baseEvaluationSchema;
  answer: typeof baseAnswerSchema;
}

export type StepSchemaOf<T extends BaseAgentTypes> = T["step"];
export type OutcomeSchemaOf<T extends BaseAgentTypes> = T["outcome"];
export type EvaluationSchemaOf<T extends BaseAgentTypes> = T["evaluation"];
export type AnswerSchemaOf<T extends BaseAgentTypes> = T["answer"];
export type SystemSchemaEvaluationOf<T extends BaseAgentTypes> =
  BaseSystemEvaluationSchema<StepSchemaOf<T>, EvaluationSchemaOf<T>>;

export type StepOf<T extends BaseAgentTypes> = z.infer<StepSchemaOf<T>>;
export type OutcomeOf<T extends BaseAgentTypes> = z.infer<OutcomeSchemaOf<T>>;
export type EvaluationOf<T extends BaseAgentTypes> = z.infer<
  EvaluationSchemaOf<T>
>;
export type AnswerOf<T extends BaseAgentTypes> = z.infer<AnswerSchemaOf<T>>;
export type SystemEvaluationOf<T extends BaseAgentTypes> = z.infer<
  SystemSchemaEvaluationOf<T>
>;

export type Resolve<T extends Partial<BaseAgentTypes>> = {
  [K in keyof BaseAgentTypes]: T[K] extends BaseAgentTypes[K]
    ? T[K]
    : BaseAgentTypes[K];
};

export type BaseAgentSchemas<T extends BaseAgentTypes> = Pick<
  T,
  "step" | "outcome" | "answer"
> & { evaluation: SystemSchemaEvaluationOf<T> };

export interface BaseAgentServices<T extends BaseAgentTypes> {
  inputHandler: InputHandler;
  llmService: LLMService;
  prompts: PromptsService<T>;
  statusHandler?: AgentStatusHandler<T>;
}

export type BaseAgentFactory<T extends BaseAgentTypes, R> = (
  config: BaseComponentConfig<T>,
) => R;

export interface BaseAgentComponentFactory<T extends BaseAgentTypes> {
  planner: BaseAgentFactory<T, Planner<T>>;
  executor: BaseAgentFactory<T, Executor<T>>;
  evaluator: BaseAgentFactory<T, Evaluator<T>>;
}

export type ContextFactory<T extends BaseAgentTypes> = (
  config: ContextConfig<T>,
) => Context<T>;

export interface BaseAgentStateFactory<T extends BaseAgentTypes> {
  context: ContextFactory<T>;
}

export interface Runtime<T extends BaseAgentTypes> {
  planner: Planner<T>;
  executor: Executor<T>;
  evaluator: Evaluator<T>;
}

export interface BaseAgentConfig<T extends BaseAgentTypes> {
  schemas: T;
  services: BaseAgentServices<T>;
  tools: Tool[];
  components?: Partial<BaseAgentComponentFactory<T>>;
  states?: BaseAgentStateFactory<T>;
}

export type CreateBaseAgentConfig<T extends Partial<BaseAgentTypes>> = Partial<{
  schemas: T;
  services: Partial<Omit<BaseAgentServices<Resolve<T>>, "llmService">>;
  tools: Tool[];
  components: Partial<BaseAgentComponentFactory<Resolve<T>>>;
  states: BaseAgentStateFactory<Resolve<T>>;
}> & { llmConfig: LLMServiceConfig };

export interface RunConfig {
  maxPlanSize: number;
  maxStepIterations: number;
  query?: string;
  signal?: AbortSignal;
}
