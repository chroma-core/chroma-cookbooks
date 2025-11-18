import {
  AgentContext,
  AgentPrompts,
  PlanStep,
} from "@agentic-search/base-agent";

function generateQueryPlan(
  maxQueryPlanSize: number,
  initialPlanSize: number = 4,
): string {
  return `You are an expert query planner for a multi-step search agent operating on a large corpus of documents.
  Your job: given a question text, produce a concise sequence of of steps that an external agent can follow to find the answer only by searching and reading documents from the fixed corpus.
  Rules:
  - Steps should aim to decompose the original query into logical subqueries.
  - Do NOT answer the question.
  - Do NOT call tools. You only describe what the agent should do.
  - Do NOT invent specific document IDs, URLs, or unseen facts.
  - Do NOT assume any knowledge about the corpus or the question.
  - Express each step as:
    - a clear goal (what to figure out)
    - a suggested strategy (how to search / what clues to extract / how to narrow)
    - Think in terms of: decompose constraints → search for candidate entities/docs → verify against all criteria → then (later, by another component) synthesize the final answer.
    - Keep it focused: maximum ${Math.min(initialPlanSize, maxQueryPlanSize)} steps, chained logically.
    - All actions must be phrased as operations over the corpus (e.g. “search for pages mentioning…”, “read candidate documents to check…”).
   - Try to generate parallel step as much as possible. Use the "parent" field on each step to indicate it has to wait for a dependency.
  `;
}

function executeStepSystemPrompt(): string {
  return `You are an expert query planner for a multi-step search agent operating on a large corpus of documents.
  You are currently executing ONE step from the query plan previously generated to answer the user's question.
  Rules:
  - Use the available tools to find relevant information for completing the current step.
  - When you have enough information, stop calling tools.
  - When search results are repeatedly insufficient, stop calling tools.
  - Prefer concise, targeted searches over vague or huge ones.
  `;
}

export function evaluateStepUserPrompt({
  context,
  step,
  query,
}: {
  context: AgentContext;
  step?: PlanStep;
  query?: string;
}): string {
  let history: string | null = null;
  if (context.history.length > 0) {
    history = context.history
      .map((outcome) => {
        const parts = [`Step ${outcome.stepId}`, outcome.summary];

        if (outcome.evidence) {
          parts.push(`Evidence: ${outcome.evidence.join(", ")}`);
        }

        if (outcome.candidateAnswers) {
          parts.push(`Candidate answers: ${outcome.candidateAnswers}`);
        }

        return parts.join("\n");
      })
      .join("\n\n");
  }

  return `The original user query: ${query || context.query}
  
  The query plan:
  ${context.steps.map((s) => `${s.id}: ${s.title}`).join("\n")}
  ${
    step
      ? `\nThe current step:
  ${step.id}: ${step.title}
  ${step.description}\n`
      : ""
  }
  ${history ? `What we discovered so far:\n${history}` : ""}
  `;
}

function finalizeStepPrompt() {
  return "Now finalize the current step in the plan based on your findings. Decide weather the current step's goal has been satisfied based on the evidence. If this step yields partial or full candidates to the question, state them explicitly. If there isn't enough evidence, say so.";
}

function evaluatePlanSystemPrompt(maxNewSteps: number) {
  return `You are an expert query planner for a multi-step search agent operating on a large corpus of documents. The user will give you the history of the plan execution with the outcome of the latest step included, the original query plan, and the original user query. 
  Your job:
  - Choose the appropriate evaluation status: "continue", "finalize", or "overridePlan"
  - Use "continue" if we should proceed with the rest of the existing query plan steps in order
  - Use "finalize" ONLY if we have enough evidence to answer the user's question
  - Use "overridePlan" if the remaining plan is misguided or can be improved based on the evidence so far. This can also be useful when the search approach so far has not yielded good results.
  - If you choose "overridePlan" you can produce a maximum of ${maxNewSteps} new steps 
  `;
}

function finalAnswerSystemPrompt() {
  return "You are an expert query planner for a multi-step search agent operating on a large corpus of documents. Given the original question and all the reasoning steps the agent took, produce the final answer. Ground the answer only in the cited evidence. If the evidence is inconclusive, produce your best short answer with a lower confidence score.";
}

export const searchAgentPrompts: AgentPrompts = {
  generateQueryPlan,
  executeStepSystemPrompt,
  executeStepUserPrompt: ({
    step,
    context,
  }: {
    step: PlanStep;
    context: AgentContext;
  }) => evaluateStepUserPrompt({ step, context }),
  evaluateStepUserPrompt,
  finalizeStepPrompt,
  evaluatePlanSystemPrompt,
  evaluatePlanUserPrompt: ({
    query,
    context,
  }: {
    query: string;
    context: AgentContext;
  }) => evaluateStepUserPrompt({ query, context }),
  finalAnswerSystemPrompt,
  finalAnswerUserPrompt: ({
    query,
    context,
  }: {
    query: string;
    context: AgentContext;
  }) => evaluateStepUserPrompt({ query, context }),
};
