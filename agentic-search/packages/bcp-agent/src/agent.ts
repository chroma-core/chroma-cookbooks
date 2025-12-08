import { BaseAgent, LLMServiceConfig } from "@chroma-cookbooks/agent-framework";
import {
  answerSchema,
  BCPAgentTypes,
  outcomeSchema,
  stepSchema,
} from "./schemas";
import { Collection } from "chromadb";
import {
  BCPAgentConsoleStatusHandler,
  BCPAgentStatusHandler,
} from "./status-handler";
import { searchAgentPrompts } from "./prompts";
import { searchToolsFactory } from "./tools";
import { getBrowseCompPlusCollection, getQuery } from "./chroma";
import { BCPAgentConfig, BCPAgentRunConfig } from "./types";

export class BrowseCompPlusAgent {
  private static MAX_PLAN_SIZE = 10;
  private static MAX_STEP_ITERATIONS = 5;

  private readonly browseCompPlusCollection: Collection;
  private agent: BaseAgent<BCPAgentTypes>;
  private statusHandler: BCPAgentStatusHandler | undefined;

  protected constructor({
    llmConfig,
    collection,
    statusHandler,
  }: BCPAgentConfig) {
    this.browseCompPlusCollection = collection;
    this.statusHandler = statusHandler;

    this.agent = BaseAgent.create({
      llmConfig,
      schemas: {
        step: stepSchema,
        outcome: outcomeSchema,
        answer: answerSchema,
      },
      services: {
        statusHandler: statusHandler ?? new BCPAgentConsoleStatusHandler(),
        prompts: searchAgentPrompts,
      },
      tools: searchToolsFactory(this.browseCompPlusCollection),
    });
  }

  static async create(config: Omit<BCPAgentConfig, "collection">) {
    const collection = await getBrowseCompPlusCollection();
    return new BrowseCompPlusAgent({
      collection,
      ...config,
    });
  }

  async answer({
    queryId,
    maxPlanSize = BrowseCompPlusAgent.MAX_PLAN_SIZE,
    maxStepIterations = BrowseCompPlusAgent.MAX_STEP_ITERATIONS,
    signal,
  }: BCPAgentRunConfig) {
    const query = await getQuery({
      collection: this.browseCompPlusCollection,
      queryId,
    });
    this.statusHandler?.onQueryUpdate(query);
    return this.agent.run({
      query: query.content,
      maxPlanSize,
      maxStepIterations,
      signal,
    });
  }
}
