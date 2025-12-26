import { Indexer } from "./indexer";
import {
  AgentStatusHandler,
  baseEvaluationSchema,
  LLMServiceConfig,
  RunConfig,
} from "@chroma-cookbooks/agent-framework";
import { answerSchema, outcomeSchema, stepSchema } from "./schemas";
import { Repository } from "./repository";

export interface CodeSearchAgentConfig {
  indexer: Indexer;
  llmConfig: LLMServiceConfig;
  statusHandler?: CodeSearchAgentStatusHandler;
}

export interface CodeSearchAgentStatusHandler extends AgentStatusHandler<CodeSearchAgentTypes> {
  onIndex(): void;
}

export type CodeSearchAgentCreateConfig = Omit<
  CodeSearchAgentConfig,
  "indexer"
> &
  Partial<{ path: string; repository: Repository }>;

export interface CodeSearchAgentTypes {
  step: typeof stepSchema;
  outcome: typeof outcomeSchema;
  evaluation: typeof baseEvaluationSchema;
  answer: typeof answerSchema;
}

export interface CodeSearchAgentRunConfig extends Omit<
  RunConfig,
  "maxPlanSize" | "maxStepIterations"
> {
  maxPlanSize?: number;
  maxStepIterations?: number;
}
