import { InboxService, InboxServiceProvider } from "./inbox-service";
import {
  AgentStatusHandler,
  BaseAgent,
  ConsoleStatusHandler,
  LLMServiceConfig,
} from "@chroma-cookbooks/agent-framework";
import { InboxAgentTypes } from "./types";
import {
  answerSchema,
  evaluationSchema,
  outcomeSchema,
  stepSchema,
} from "./schemas";
import {
  ConsoleInboxInputHandler,
  InboxInputHandler,
  InputTool,
} from "./input-handler";
import { inboxToolsFactory } from "./inbox-service/tools";
import { InboxPlanner } from "./planner";
import { InboxEvaluator } from "./evaluator";
import { inboxAgentPrompts } from "./prompts";
import { InboxServiceFactory } from "./inbox-service";
import { InboxMemory } from "./memory";

export class InboxAgent {
  private readonly inboxService: InboxService;
  private agent: BaseAgent<InboxAgentTypes>;
  private statusHandler: AgentStatusHandler<InboxAgentTypes>;

  constructor({
    inputHandler = new ConsoleInboxInputHandler(),
    statusHandler = new ConsoleStatusHandler(),
    inboxProvider,
    llmConfig,
  }: {
    inboxProvider: InboxServiceProvider;
    llmConfig: LLMServiceConfig;
    inputHandler?: InboxInputHandler;
    statusHandler?: AgentStatusHandler<InboxAgentTypes>;
  }) {
    this.inboxService = InboxServiceFactory.create({ provider: inboxProvider });
    this.statusHandler = statusHandler;

    this.agent = BaseAgent.create({
      llmConfig,
      schemas: {
        step: stepSchema,
        outcome: outcomeSchema,
        answer: answerSchema,
      },
      services: {
        inputHandler,
        statusHandler,
        prompts: inboxAgentPrompts,
      },
      tools: [
        new InputTool({ inputHandler }),
        ...inboxToolsFactory({ inputHandler, inboxService: this.inboxService }),
      ],
      components: {
        planner: (config) =>
          new InboxPlanner({ inboxService: this.inboxService, ...config }),
        evaluator: (config) => new InboxEvaluator(config),
      },
      states: {
        memory: (config) => new InboxMemory(config),
      },
    });
  }

  async run({
    signal,
    maxPlanSize,
  }: { signal?: AbortSignal; maxPlanSize?: number } = {}) {
    this.statusHandler.onAssistantUpdate?.("Fetching unread emails...");
    await this.inboxService.authenticate();

    const emails = await this.inboxService.getUnread();
    return this.agent.run({
      query: "Process inbox",
      maxPlanSize: maxPlanSize
        ? Math.min(emails.length, maxPlanSize)
        : emails.length,
      maxStepIterations: 10,
      signal,
    });
  }
}
