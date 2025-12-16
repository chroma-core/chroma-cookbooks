import { LLMServiceConfig, RunConfig } from "@chroma-cookbooks/agent-framework";
import { Collection } from "chromadb";
import { BCPAgentStatusHandler } from "./status-handler";

export interface Query {
  id: string;
  content: string;
  answer: string;
}

export type QueryRecordMetadata = {
  query_id: string;
  answer: string;
  gold_docs: string;
};

export interface BCPAgentConfig {
  llmConfig: LLMServiceConfig;
  collection: Collection;
  statusHandler?: BCPAgentStatusHandler;
}

export interface BCPAgentRunConfig extends Omit<
  RunConfig,
  "query" | "maxPlanSize" | "maxStepIterations"
> {
  queryId: string;
  maxPlanSize?: number;
  maxStepIterations?: number;
}
