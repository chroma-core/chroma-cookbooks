import { LLMService } from "../llms";
import { AgentPrompts } from "../types";
import { AgentStatusHandler } from "./status-handler";

export interface CoreServices {
  llmService: LLMService;
  prompts: AgentPrompts;
  statusHandler?: AgentStatusHandler;
}

export abstract class AgentComponent {
  protected llmService: LLMService;
  protected prompts: AgentPrompts;
  protected statusHandler?: AgentStatusHandler;

  protected constructor(services: CoreServices) {
    this.llmService = services.llmService;
    this.prompts = services.prompts;
    this.statusHandler = services.statusHandler;
  }
}
