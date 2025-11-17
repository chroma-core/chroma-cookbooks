import { z } from "zod";
import { OpenAIServiceConfig } from "./openai";
import { Tool } from "../types";

export enum LLMProvider {
  OpenAI = "openai",
}

export type LLMServiceConfig = {
  provider: LLMProvider.OpenAI;
} & OpenAIServiceConfig;

export type LLMRole = "system" | "user" | "assistant" | "tool" | "developer";

interface BaseMessage<R extends LLMRole> {
  role: R;
  content: string;
}

export type SystemMessage = BaseMessage<"system">;
export type UserMessage = BaseMessage<"user">;
export type DeveloperMessage = BaseMessage<"developer">;

export type ToolCall = {
  id: string;
  name: string;
  arguments: string;
};

export type AssistantMessage = BaseMessage<"assistant"> & {
  toolCalls?: ToolCall[];
};

export type ToolMessage = BaseMessage<"tool"> & {
  toolCallID: string;
};

export type LLMMessage =
  | SystemMessage
  | UserMessage
  | AssistantMessage
  | ToolMessage
  | DeveloperMessage;

export interface LLMService {
  getStructuredOutput<T>(args: {
    messages: LLMMessage[];
    schema: z.AnyZodObject;
    schemaName: string;
  }): Promise<T>;

  callTools(args: {
    messages: LLMMessage[];
    tools: Tool[];
  }): Promise<AssistantMessage>;
}
