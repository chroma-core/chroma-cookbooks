import { Context, PromptsService } from "@chroma-cookbooks/agent-framework";
import { Chunk, Step } from "./schemas";
import { CodeSearchAgentTypes } from "./types";

function generatePlan(
  maxQueryPlanSize: number,
  initialPlanSize: number = 4,
): string {
  return `You are an expert code search planner for a multi-step agent operating on an indexed codebase.
Your job: given a question about the code, produce a concise sequence of steps that an external agent can follow to find the answer by searching and reading code from the indexed repository.

Rules:
- Steps should decompose the original query into logical code search operations.
- Do NOT answer the question.
- Do NOT call tools. You only describe what the agent should do.
- Do NOT invent specific file paths, function names, or implementation details you haven't seen.
- Do NOT assume any knowledge about the codebase structure.

Express each step with:
- A clear goal (what to find or understand)
- Think in terms of: identify key concepts → search for relevant code → understand relationships → verify against requirements

Guidelines:
- Maximum ${Math.min(initialPlanSize, maxQueryPlanSize)} steps, chained logically.
- Generate parallel steps when possible. Use the "parents" field to indicate dependencies.
- For "how does X work" questions: find X's definition, then trace its usage.
- For "where is X used" questions: find X's definition, then search for references.
- For bug/behavior questions: identify relevant code paths, then analyze logic flow.
`;
}

function executeStepSystemPrompt(): string {
  return `You are an expert code search agent operating on an indexed codebase.
You are currently executing ONE step from the query plan previously generated to answer the user's question.

Rules:
- Use the available tools to search and read code relevant to completing the current step.
- If is useful to start off with semantic search when you have no relevant information yet.
- When you have enough information to satisfy the step's goal, stop calling tools.
- When search results are repeatedly insufficient, try a different approach or stop.
- Prefer targeted searches: specific function names, class names, or narrow concepts.
- Pay attention to file paths and symbols - they help trace code relationships.
- Note any symbols (function/class names) that appear relevant for potential follow-up searches.
`;
}

export function evaluateStepUserPrompt({
  context,
  step,
  query,
}: {
  context: Context<CodeSearchAgentTypes>;
  step?: Step;
  query?: string;
}): string {
  let history: string | null = null;
  if (context.history.length > 0) {
    history = context.history
      .map((outcome) => {
        const parts = [`Step ${outcome.stepId}`, outcome.summary];

        if (outcome.chunks && outcome.chunks.length > 0) {
          const chunkSummary = outcome.chunks
            .map(
              (c: Chunk) =>
                `  - ${c.filePath}${c.symbol ? ` (${c.symbol})` : ""}\n    ${c.snippet}`,
            )
            .join("\n");
          parts.push(`Relevant code:\n${chunkSummary}`);
        }

        if (outcome.insights && outcome.insights.length > 0) {
          parts.push(`Insights: ${outcome.insights.join("; ")}`);
        }

        return parts.join("\n");
      })
      .join("\n\n");
  }

  return `The original user query: ${query || context.query}

The query plan:
${context.plan.map((s) => `${s.id}: ${s.title}`).join("\n")}
${
  step
    ? `
The current step:
${step.id}: ${step.title}
${step.description}
`
    : ""
}
${history ? `What we discovered so far:\n${history}` : ""}
`;
}

function finalizeStepPrompt() {
  return `Now finalize the current step based on your code search findings.

Summarize:
- What code you found relevant to the step's goal
- Key insights about how the code works
- Any symbols or files that might be useful for subsequent steps

If the search didn't yield useful results, explain what was tried and suggest alternative approaches.`;
}

function evaluatePlanSystemPrompt(maxNewSteps: number) {
  return `You are an expert code search planner. The user will give you the execution history with outcomes, the original query plan, and the original question.

Your job:
- Choose the appropriate evaluation status: "continue", "break", or "override"
- Use "continue" if we should proceed with the remaining plan steps
- Use "break" ONLY if we have enough code evidence to answer the user's question
- Use "override" if the remaining plan should be revised based on what we've learned

When to override:
- Initial searches revealed the code is structured differently than expected
- We found a better entry point into the relevant code
- The current approach isn't yielding relevant results
- We discovered related code that changes our search strategy

If you choose "override", produce a maximum of ${maxNewSteps} new steps. Build on what was already discovered.
`;
}

function finalAnswerSystemPrompt() {
  return `You are an expert code search agent. Given the original question and all the code search steps taken, produce the final answer.

Guidelines:
- Ground your answer in the actual code found during the search
- Reference specific files and symbols when explaining behavior
- If the code search was inconclusive, explain what was found and what remains unclear
`;
}

export const codeSearchAgentPrompts: PromptsService<CodeSearchAgentTypes> = {
  generatePlan,
  executeStepSystemPrompt,
  executeStepUserPrompt: ({
    step,
    context,
  }: {
    step: Step;
    context: Context<CodeSearchAgentTypes>;
  }) => evaluateStepUserPrompt({ step, context }),
  evaluateStepUserPrompt,
  finalizeStepPrompt,
  evaluatePlanSystemPrompt,
  evaluatePlanUserPrompt: ({
    query,
    context,
  }: {
    query: string;
    context: Context<CodeSearchAgentTypes>;
  }) => evaluateStepUserPrompt({ query, context }),
  finalAnswerSystemPrompt,
  finalAnswerUserPrompt: ({
    query,
    context,
  }: {
    query: string;
    context: Context<CodeSearchAgentTypes>;
  }) => evaluateStepUserPrompt({ query, context }),
};
