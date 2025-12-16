import { z } from "zod";
import { Context } from "../../states/context";
import { EvaluatorStatusHandler } from "../../services/status-handler";
import { EvaluatorPrompts } from "../../services/prompts";
import { BaseComponentConfig } from "../base";
import {
  AnswerOf,
  AnswerSchemaOf,
  BaseAgentServices,
  BaseAgentTypes,
  EvaluationSchemaOf,
  SystemEvaluationOf,
  SystemSchemaEvaluationOf,
} from "../../agent";

export interface Evaluator<T extends BaseAgentTypes> {
  readonly evaluationSchema: SystemSchemaEvaluationOf<T>;
  readonly answerSchema: AnswerSchemaOf<T>;

  evaluatePlan(config: {
    query: string;
    maxNewSteps: number;
    context: Context<T>;
  }): Promise<SystemEvaluationOf<T>>;

  synthesizeFinalAnswer(config: {
    query: string;
    context: Context<T>;
  }): Promise<AnswerOf<T>>;
}

export type BaseEvaluatorConfig<
  T extends BaseAgentTypes,
  S extends BaseAgentServices<T>,
> = BaseComponentConfig<T, S> &
  Partial<{
    evaluationSchema: EvaluationSchemaOf<T>;
    answerSchema: AnswerSchemaOf<T>;
    statusHandler: Partial<EvaluatorStatusHandler<T>>;
    prompts: Partial<EvaluatorPrompts<T>>;
  }>;
