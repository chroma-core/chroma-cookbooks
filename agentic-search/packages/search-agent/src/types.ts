import {
  BaseAgentAnswerArgs,
  BaseAgentConfig,
} from "@agentic-search/base-agent";
import { Collection } from "chromadb";

export interface SearchAgentConfig
  extends Omit<BaseAgentConfig, "tools" | "prompts"> {
  browseCompPlusCollection: Collection;
}

export interface SearchAgentAnswerArgs
  extends Omit<BaseAgentAnswerArgs, "query"> {
  queryId: string;
}
