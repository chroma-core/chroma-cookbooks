import { BaseEvaluatorConfig, Evaluator } from "./types";
import { BaseComponent } from "../base";
import { Context } from "../../states/context";
import { LLMMessage, LLMRole } from "../../services/llms";
import { EvaluatorPrompts } from "../../services/prompts";
import { EvaluatorStatusHandler } from "../../services/status-handler";
import {
  AnswerOf,
  AnswerSchemaOf,
  BaseAgentTypes,
  EvaluationOf,
  EvaluationSchemaOf,
  StepSchemaOf,
  SystemEvaluationOf,
  SystemSchemaEvaluationOf,
} from "../../agent/types";
import { createBaseSystemEvaluation } from "../../agent/schemas";
import { EvaluatorError } from "../../agent/errors";

export class BaseEvaluator<T extends BaseAgentTypes>
  extends BaseComponent<T>
  implements Evaluator<T>
{
  declare protected prompts: EvaluatorPrompts<T>;
  declare protected statusHandler: EvaluatorStatusHandler<T>;
  readonly evaluationSchema: SystemSchemaEvaluationOf<T>;
  readonly answerSchema: AnswerSchemaOf<T>;

  constructor(config: BaseEvaluatorConfig<T>) {
    super(config);
    this.evaluationSchema = config.evaluationSchema
      ? createBaseSystemEvaluation<StepSchemaOf<T>, EvaluationSchemaOf<T>>(
          config.agentSchemas.step,
          config.evaluationSchema,
        )
      : config.agentSchemas.evaluation;
    this.answerSchema = config.answerSchema ?? config.agentSchemas.answer;
  }

  async evaluatePlan({
    query,
    maxNewSteps,
    context,
  }: {
    query: string;
    maxNewSteps: number;
    context: Context<T>;
  }): Promise<SystemEvaluationOf<T>> {
    const messages: LLMMessage[] = [
      {
        role: LLMRole.System,
        content: this.prompts.evaluatePlanSystemPrompt(maxNewSteps),
      },
      {
        role: LLMRole.User,
        content: this.prompts.evaluatePlanUserPrompt({ context }),
      },
    ];

    try {
      const evaluation = await this.llmService.getStructuredOutput<
        SystemEvaluationOf<T>
      >({
        messages,
        schema: this.evaluationSchema,
        schemaName: "evaluation",
      });

      this.statusHandler?.onPlanEvaluation?.(evaluation);

      return evaluation;
    } catch (error) {
      throw new EvaluatorError("Failed to evaluate step", error);
    }
  }

  async synthesizeFinalAnswer({
    query,
    context,
  }: {
    query: string;
    context: Context<T>;
  }): Promise<AnswerOf<T>> {
    this.statusHandler?.onAssistantUpdate?.("Finalizing my answer...");

    const messages: LLMMessage[] = [
      { role: LLMRole.System, content: this.prompts.finalAnswerSystemPrompt() },
      {
        role: LLMRole.User,
        content: this.prompts.finalAnswerUserPrompt({ context }),
      },
    ];

    try {
      return await this.llmService.getStructuredOutput<AnswerOf<T>>({
        messages,
        schema: this.answerSchema,
        schemaName: "final_answer",
      });
    } catch (error) {
      throw new EvaluatorError("Failed to generate the final answer", error);
    }
  }
}
