import { LLMServiceConfig } from "./llms";
import { PlanStep, StepOutcome, CoreServices, Tool } from "./components";

export interface AgentPrompts {
  generateQueryPlan: (maxQueryPlanSize: number) => string;
  executeStepSystemPrompt: () => string;
  executeStepUserPrompt: (args: {
    step: PlanStep;
    context: AgentContext;
  }) => string;
  evaluateStepUserPrompt: (args: {
    step: PlanStep;
    context: AgentContext;
  }) => string;
  finalizeStepPrompt: () => string;
  evaluatePlanSystemPrompt: (maxNewSteps: number) => string;
  evaluatePlanUserPrompt: (args: {
    query: string;
    context: AgentContext;
  }) => string;
  finalAnswerSystemPrompt: () => string;
  finalAnswerUserPrompt: (args: {
    query: string;
    context: AgentContext;
  }) => string;
}

export interface AgentContext {
  steps: PlanStep[];
  query: string;
  history: StepOutcome[];
}

interface AgentAnswerArgs {
  query: string;
  maxPlanSize: number;
  maxIterations: number;
}

export type BaseAgentAnswerArgs = Partial<AgentAnswerArgs>;

export type BaseAgentConfig = CoreServices & { tools: Tool[] };

export type CreateBaseAgentConfig = Omit<BaseAgentConfig, "llmService"> & {
  llmConfig: LLMServiceConfig;
};
