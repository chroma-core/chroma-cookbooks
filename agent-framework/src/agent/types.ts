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
import { BaseComponentConfig } from "../components";
import { Planner } from "../components/planner";
import { Evaluator } from "../components/evaluator";
import { Context, ContextConfig } from "../states/context";
import { Memory } from "../states/memory";

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

export type BaseAgentFactory<
  T extends BaseAgentTypes,
  S extends BaseAgentServices<T>,
  R,
> = (config: BaseComponentConfig<T, S>) => R;

export interface BaseAgentComponentFactory<
  T extends BaseAgentTypes,
  S extends BaseAgentServices<T>,
> {
  planner: BaseAgentFactory<T, S, Planner<T>>;
  executor: BaseAgentFactory<T, S, Executor<T>>;
  evaluator: BaseAgentFactory<T, S, Evaluator<T>>;
}

export type ContextFactory<
  T extends BaseAgentTypes,
  S extends BaseAgentServices<T>,
> = (config: ContextConfig<T, S>) => Context<T>;

export type BaseAgentStateFactory<
  T extends BaseAgentTypes,
  S extends BaseAgentServices<T>,
> = Partial<{
  context: ContextFactory<T, S>;
  memory: BaseAgentFactory<T, S, Memory<T>>;
}>;

export interface Runtime<T extends BaseAgentTypes> {
  planner: Planner<T>;
  executor: Executor<T>;
  evaluator: Evaluator<T>;
}

export interface BaseAgentConfig<
  T extends BaseAgentTypes,
  S extends BaseAgentServices<T>,
> {
  schemas: T;
  services: S;
  tools: Tool[];
  components?: Partial<BaseAgentComponentFactory<T, S>>;
  states?: BaseAgentStateFactory<T, S>;
}

export type CreateBaseAgentConfig<
  T extends Partial<BaseAgentTypes>,
  S extends BaseAgentServices<Resolve<T>>,
> = Partial<{
  schemas: T;
  services: Partial<Omit<S, "llmService">>;
  tools: Tool[];
  components: Partial<BaseAgentComponentFactory<Resolve<T>, S>>;
  states: BaseAgentStateFactory<Resolve<T>, S>;
}> & { llmConfig: LLMServiceConfig };

export interface RunConfig {
  maxPlanSize: number;
  maxStepIterations: number;
  query?: string;
  signal?: AbortSignal;
}
