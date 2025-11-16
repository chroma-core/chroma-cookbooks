import { BaseAgent, FinalAnswer, Tool } from "@agentic-search/base-agent";
import { Collection } from "chromadb";
import { SearchAgentAnswerArgs, SearchAgentConfig } from "./types";
import { getBrowseCompPlusCollection, getQuery } from "./chroma";
import { searchTools } from "./tools";
import { searchAgentPrompts } from "./prompts";
import {
  SearchAgentConsoleStatusHandler,
  SearchAgentStatusHandler,
} from "./status-handler";

export class SearchAgent extends BaseAgent {
  private readonly browseCompPlusCollection: Collection;
  declare protected readonly statusHandler: SearchAgentStatusHandler;

  constructor(config: SearchAgentConfig) {
    const tools: Tool[] = searchTools.map(
      (SearchTool) => new SearchTool(config.browseCompPlusCollection),
    );

    const statusHandler =
      config.statusHandler || new SearchAgentConsoleStatusHandler();

    super({ ...config, tools, statusHandler, prompts: searchAgentPrompts });
    this.browseCompPlusCollection = config.browseCompPlusCollection;
  }

  public static async create(
    config: Omit<SearchAgentConfig, "browseCompPlusCollection">,
  ): Promise<SearchAgent> {
    const browseCompPlusCollection = await getBrowseCompPlusCollection();

    return new SearchAgent({
      ...config,
      browseCompPlusCollection,
    });
  }

  public async answerQuery(args: SearchAgentAnswerArgs): Promise<FinalAnswer> {
    const query = await getQuery({
      collection: this.browseCompPlusCollection,
      queryId: args.queryId,
    });

    this.statusHandler.onQueryUpdate(query);
    return super.answer({ ...args, query: query.content });
  }
}
