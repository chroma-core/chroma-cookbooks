import { BaseAgentAnswerArgs, CoreServices } from "@agentic-search/base-agent";
import { Collection } from "chromadb";

export interface SearchAgentConfig
  extends Omit<CoreServices, "prompts" | "tools"> {
  browseCompPlusCollection: Collection;
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
