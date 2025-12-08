import {
  AssistantMessage,
  LLMMessage,
  LLMRole,
  LLMServiceDescription,
} from "../types";
import { LLMService } from "../llm-service";
import { APIUserAbortError, OpenAI } from "openai";
import { zodToJsonSchema } from "zod-to-json-schema";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { LLMServiceError } from "../errors";
import { getRunContext, RunAbortedError } from "../../../agent/run-context";
import { Tool } from "../../../components/executor";

export interface OpenAIServiceConfig {
  model: string;
  apiKey?: string;
}

const serviceDescription: LLMServiceDescription = {
  id: "openai",
  name: "OpenAI",
  apiKeyEnvVar: "OPENAI_API_KEY",
};

export class OpenAIService implements LLMService {
  private readonly model: string;
  private client: OpenAI;

  constructor(config: OpenAIServiceConfig) {
    const { apiKey, model } = config;
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  static describe(): LLMServiceDescription {
    return serviceDescription;
  }

  private static toOpenAIMessages(
    messages: LLMMessage[],
  ): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    return messages.map((message) => {
      switch (message.role) {
        case LLMRole.User:
        case LLMRole.System:
        case LLMRole.Developer:
          return { role: message.role, content: message.content };
        case LLMRole.Assistant: {
          const tool_calls = message.toolCalls?.map((tc) => ({
            id: tc.id,
            type: "function" as const,
            function: { name: tc.name, arguments: tc.arguments },
          }));
          return {
            role: "assistant",
            content: message.content ?? "",
            ...(tool_calls ? { tool_calls } : {}),
          };
        }
        case LLMRole.Tool:
          return {
            role: "tool",
            content: message.content,
            tool_call_id: message.toolCallId,
          };
      }
    });
  }

  private static toOpenAITools(
    tools: Tool[],
  ): OpenAI.Chat.Completions.ChatCompletionTool[] {
    return tools.map((tool) => ({
      type: "function",
      function: {
        name: tool.id,
        description: tool.description,
        parameters: tool.parametersSchema
          ? zodToJsonSchema(tool.parametersSchema)
          : undefined,
      },
    }));
  }

  async getStructuredOutput<T>({
    messages,
    schema,
    schemaName,
  }: {
    messages: LLMMessage[];
    schema: z.AnyZodObject;
    schemaName: string;
  }): Promise<T> {
    const signal = getRunContext()?.signal;

    let response;
    try {
      response = await this.client.chat.completions.parse(
        {
          model: this.model,
          messages: OpenAIService.toOpenAIMessages(messages),
          response_format: zodResponseFormat(schema, schemaName),
        },
        { signal },
      );
    } catch (error) {
      if (error instanceof APIUserAbortError) {
        throw new RunAbortedError();
      }
      throw new LLMServiceError("Failed to get structured output", {
        cause: error,
      });
    }

    const output = response.choices[0].message.parsed as T | null;
    if (!output) {
      throw new LLMServiceError("Failed to parse output.");
    }
    return output;
  }

  async callTools({
    messages,
    tools,
  }: {
    messages: LLMMessage[];
    tools: Tool[];
  }): Promise<AssistantMessage> {
    const signal = getRunContext()?.signal;
    let response;
    try {
      response = await this.client.chat.completions.create(
        {
          model: this.model,
          messages: OpenAIService.toOpenAIMessages(messages),
          tools: OpenAIService.toOpenAITools(tools),
        },
        { signal },
      );
    } catch (error) {
      if (error instanceof APIUserAbortError) {
        throw new RunAbortedError();
      }
      throw new LLMServiceError("Failed to call tools", { cause: error });
    }

    const result = response.choices[0].message;

    const toolCalls =
      result.tool_calls?.map((tc) => ({
        id: tc.id,
        name: tc.type === "function" ? tc.function.name : "",
        arguments: tc.type === "function" ? tc.function.arguments : "",
      })) ?? undefined;

    return {
      role: LLMRole.Assistant,
      content: result.content ?? "",
      toolCalls,
    };
  }
}
