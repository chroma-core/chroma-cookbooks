import {
  AgentStatusHandler,
  BaseAgentAnswerArgs,
  BaseAgentConfig,
} from "@agentic-search/base-agent";
import { Collection } from "chromadb";
import { SearchAgentStatusHandler } from "./status-handler";

export interface SearchAgentConfig
  extends Omit<BaseAgentConfig, "tools" | "prompts"> {
  browseCompPlusCollection: Collection;
  statusHandler?: SearchAgentStatusHandler;
}

export interface SearchAgentAnswerArgs
  extends Omit<BaseAgentAnswerArgs, "query"> {
  queryId: string;
}

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
