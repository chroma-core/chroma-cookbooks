import { BaseAgent, FinalAnswer, Tool } from "@agentic-search/base-agent";
import { Collection } from "chromadb";
import { SearchAgentAnswerArgs, SearchAgentConfig } from "@/src/types";
import { getBrowseCompPlusCollection, getQuery } from "@/src/chroma";
import { searchTools } from "@/src/tools";
import { searchAgentPrompts } from "@/src/prompts";

export class SearchAgent extends BaseAgent {
  private readonly browseCompPlusCollection: Collection;

  constructor(config: SearchAgentConfig) {
    const tools: Tool[] = searchTools.map(
      (SearchTool) => new SearchTool(config.browseCompPlusCollection),
    );
    super({ ...config, tools, prompts: searchAgentPrompts });
    this.browseCompPlusCollection = config.browseCompPlusCollection;
  }

  public static async create(config: SearchAgentConfig): Promise<SearchAgent> {
    const browseCompPlusCollection = await getBrowseCompPlusCollection();
    return new SearchAgent({ ...config, browseCompPlusCollection });
  }

  public async answerQuery(args: SearchAgentAnswerArgs): Promise<FinalAnswer> {
    const query = await getQuery({
      collection: this.browseCompPlusCollection,
      queryId: args.queryId,
    });
    return super.answer({ ...args, query });
  }
}
