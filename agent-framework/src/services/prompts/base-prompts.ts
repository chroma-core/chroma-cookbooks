import { PromptsService } from "./types";
import { Context } from "../../states/context";
import { BaseAgentTypes, StepOf } from "../../agent/types";

function generatePlan(maxSize: number): string {
  return `You are a helpful query planner. Given the user query, break it down to logical steps, and generate a query 
plan of maximum ${maxSize} steps.`;
}

function executeStepSystemPrompt(): string {
  return `You are an expert query planner for a multi-step agent.
  You are currently executing ONE step from the query plan previously generated to answer the user's question.
  Rules:
  - Use the available tools to find relevant information for completing the current step.
  - If no tools are available, use your knowledge to complete or provide an answer for the current step.
  - When you have enough information, stop calling tools.
  - When tool results are repeatedly insufficient, stop calling tools.
  - Prefer concise, targeted searches over vague or huge ones.
  `;
}

function executeStepUserPrompt<T extends BaseAgentTypes>({
  step,
  context,
}: {
  context: Context<T>;
  step?: StepOf<T>;
}): string {
  let history: string | null = null;
  if (context.history.length > 0) {
    history = context.history
      .map((outcome) => [`Step ${outcome.stepId}`, outcome.summary].join("\n"))
      .join("\n\n");
  }

  return `The original user query: ${context.query}
  
  The query plan:
  ${context.plan.map((s) => `${s.id}: ${s.title}`).join("\n")}
  ${step ? `\nThe current step: ${step.id}: ${step.title}\n` : "\n"}
  ${history ? `What we discovered so far:\n${history}` : ""}`;
}

function finalizeStepPrompt(): string {
  return `Now finalize the current step in the plan based on your findings. Decide weather the current step's goal 
has been satisfied based on the evidence.`;
}

function evaluatePlanSystemPrompt(maxNewSteps: number) {
  return `You are an expert query planner for a multi-step agent. The user will give you the history of the plan 
execution with the outcome of the latest step included, the original query plan, and the original user query. 
Your job:
  - Choose the appropriate evaluation status: "continue", "finalize", or "override_plan"
  - Use "continue" if we should proceed with the rest of the existing query plan steps in order
  - Use "finalize" ONLY if we have enough information to complete the user's query
  - Use "override_plan" if the remaining plan is misguided or can be improved based on the evidence so far. 
This can also be useful when the approach so far has not yielded good results.
  - If you choose "override_plan" you can produce a maximum of ${maxNewSteps} new steps 
  `;
}

function finalAnswerSystemPrompt() {
  return `You are an expert query planner for a multi-step agent. Given the original question and all the reasoning 
steps the agent took, produce the final answer. Ground the answer only in the evidence from your run.`;
}

export function createBasePrompts<
  T extends BaseAgentTypes = BaseAgentTypes,
>(): PromptsService<T> {
  return {
    generatePlan,
    executeStepSystemPrompt,
    executeStepUserPrompt,

    evaluateStepUserPrompt(args: {
      step: StepOf<T>;
      context: Context<T>;
    }): string {
      return executeStepUserPrompt({ step: args.step, context: args.context });
    },

    finalizeStepPrompt,
    evaluatePlanSystemPrompt,

    evaluatePlanUserPrompt(args: { context: Context<T> }): string {
      return executeStepUserPrompt(args);
    },

    finalAnswerSystemPrompt,

    finalAnswerUserPrompt(args: { context: Context<T> }): string {
      return executeStepUserPrompt(args);
    },
  };
}
