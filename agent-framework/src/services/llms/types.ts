import { OpenAIServiceConfig } from "./providers";
import { LLMService } from "./llm-service";

export enum LLMProvider {
  OpenAI = "openai",
}

export type LLMServiceConfig = {
  provider: LLMProvider.OpenAI;
} & OpenAIServiceConfig;

export interface LLMServiceDescription {
  id: string;
  name: string;
  apiKeyEnvVar: string;
}

export interface LLMProviderEntry {
  create: (config: LLMServiceConfig) => LLMService;
  description: LLMServiceDescription;
}

export enum LLMRole {
  System = "system",
  User = "user",
  Assistant = "assistant",
  Tool = "tool",
  Developer = "developer",
}

interface BaseMessage<R extends LLMRole> {
  role: R;
  content: string;
}

export type SystemMessage = BaseMessage<LLMRole.System>;
export type UserMessage = BaseMessage<LLMRole.User>;
export type DeveloperMessage = BaseMessage<LLMRole.Developer>;

export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
}

export type AssistantMessage = BaseMessage<LLMRole.Assistant> & {
  toolCalls?: ToolCall[];
};

export type ToolMessage = BaseMessage<LLMRole.Tool> & {
  toolCallId: string;
};

export type LLMMessage =
  | SystemMessage
  | UserMessage
  | AssistantMessage
  | ToolMessage
  | DeveloperMessage;
