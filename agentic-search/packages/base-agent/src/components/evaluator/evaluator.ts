import { AgentContext } from "../../types";
import { LLMMessage } from "../../llms";
import { AgentError } from "../../errors";
import {
  Evaluation,
  evaluationSchema,
  FinalAnswer,
  finalAnswerSchema,
} from "./types";
import { AgentComponent, CoreServices } from "../agent-component";

export class Evaluator extends AgentComponent {
  constructor(services: CoreServices) {
    super(services);
  }

  public async evaluatePlan(args: {
    query: string;
    maxNewSteps: number;
    context: AgentContext;
  }): Promise<Evaluation> {
    const { query, maxNewSteps, context } = args;
    const messages: LLMMessage[] = [
      {
        role: "system",
        content: this.prompts.evaluatePlanSystemPrompt(maxNewSteps),
      },
      {
        role: "user",
        content: this.prompts.evaluatePlanUserPrompt({ context, query }),
      },
    ];

    try {
      const evaluation = await this.llmService.getStructuredOutput<Evaluation>({
        messages,
        schema: evaluationSchema,
        schemaName: "evaluation",
      });

      this.statusHandler?.onPlanEvaluation?.(evaluation);

      return evaluation;
    } catch (error) {
      throw new AgentError("Failed to evaluate step", error);
    }
  }

  public async synthesizeFinalAnswer({
    query,
    context,
  }: {
    query: string;
    context: AgentContext;
  }): Promise<FinalAnswer> {
    this.statusHandler?.onAssistantUpdate?.("Finalizing my answer...");

    const messages: LLMMessage[] = [
      { role: "system", content: this.prompts.finalAnswerSystemPrompt() },
      {
        role: "user",
        content: this.prompts.finalAnswerUserPrompt({ context, query }),
      },
    ];

    try {
      return await this.llmService.getStructuredOutput<FinalAnswer>({
        messages,
        schema: finalAnswerSchema,
        schemaName: "final_answer",
      });
    } catch (error) {
      throw new AgentError("Failed to generate the final answer", error);
    }
  }
}
