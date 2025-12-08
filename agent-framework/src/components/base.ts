import { LLMService } from "../services/llms";
import { InputHandler } from "../services/input-handler";
import { AgentStatusHandler } from "../services/status-handler";
import { PromptsService } from "../services/prompts";
import { BaseAgentSchemas, BaseAgentServices, BaseAgentTypes } from "../agent";
import { Tool } from "./executor";

export interface BaseAgentComponentConfig<T extends BaseAgentTypes> {
  agentSchemas: BaseAgentSchemas<T>;
  agentServices: BaseAgentServices<T>;
  agentTools: Tool[];
}

export type BaseComponentConfig<T extends BaseAgentTypes> =
  BaseAgentComponentConfig<T> & Partial<BaseAgentServices<T>>;

export abstract class BaseComponent<T extends BaseAgentTypes> {
  protected inputHandler: InputHandler;
  protected llmService: LLMService;
  protected prompts: Partial<PromptsService<T>>;
  protected statusHandler: Partial<AgentStatusHandler<T>> | undefined;

  protected constructor({
    inputHandler,
    statusHandler,
    llmService,
    prompts,
    agentServices,
  }: BaseComponentConfig<T>) {
    this.inputHandler = inputHandler ?? agentServices.inputHandler;
    this.statusHandler = statusHandler ?? agentServices.statusHandler;
    this.llmService = llmService ?? agentServices.llmService;
    this.prompts = { ...agentServices.prompts, ...prompts };
  }
}
