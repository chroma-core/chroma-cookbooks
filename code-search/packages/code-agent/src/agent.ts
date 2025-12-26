import { Indexer } from "./indexer";
import {
  CodeSearchAgentConfig,
  CodeSearchAgentCreateConfig,
  CodeSearchAgentRunConfig,
  CodeSearchAgentStatusHandler,
  CodeSearchAgentTypes,
} from "./types";
import { AgentError, BaseAgent } from "@chroma-cookbooks/agent-framework";
import { answerSchema, outcomeSchema, stepSchema } from "./schemas";
import { codeSearchAgentPrompts } from "./prompts";
import { GitRepository } from "./repository";
import {
  GetFileTool,
  ListFilesTool,
  RegexSearchTool,
  SemanticSearchTool,
  SymbolSearchTool,
} from "./tools";

export class CodeSearchAgent {
  private static MAX_PLAN_SIZE = 10;
  private static MAX_STEP_ITERATIONS = 5;

  private indexer: Indexer;
  private agent: BaseAgent<CodeSearchAgentTypes>;
  private statusHandler: CodeSearchAgentStatusHandler | undefined;

  private constructor({
    indexer,
    llmConfig,
    statusHandler,
  }: CodeSearchAgentConfig) {
    this.indexer = indexer;
    this.statusHandler = statusHandler;
    this.agent = BaseAgent.create({
      llmConfig,
      schemas: {
        step: stepSchema,
        outcome: outcomeSchema,
        answer: answerSchema,
      },
      services: { statusHandler, prompts: codeSearchAgentPrompts },
      tools: [new ListFilesTool(this.indexer.repository.path)],
    });
  }

  static async create({
    repository,
    path,
    ...config
  }: CodeSearchAgentCreateConfig) {
    if (!path && !repository) {
      throw new AgentError("Must provide a path or reference to a repository");
    }

    const indexer = await Indexer.create({
      repository: repository || new GitRepository(path!),
    });

    return new CodeSearchAgent({ indexer, ...config });
  }

  async run({
    query,
    maxPlanSize = CodeSearchAgent.MAX_PLAN_SIZE,
    maxStepIterations = CodeSearchAgent.MAX_STEP_ITERATIONS,
    signal,
  }: CodeSearchAgentRunConfig) {
    this.statusHandler?.onIndex();
    const collection = await this.indexer.run();
    return await this.agent.run({
      query,
      maxPlanSize,
      maxStepIterations,
      signal,
      runtimeTools: [
        new SymbolSearchTool(collection),
        new RegexSearchTool(collection),
        new SemanticSearchTool(collection),
        new GetFileTool(collection),
      ],
    });
  }
}
