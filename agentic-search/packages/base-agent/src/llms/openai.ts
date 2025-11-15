import { AnyZodObject } from "zod";
import { AssistantMessage, LLMMessage, LLMService } from "./types";
import { OpenAI } from "openai";
import { AgentError } from "../errors";
import { zodToJsonSchema } from "zod-to-json-schema";
import { Tool } from "../types";

export interface OpenAIServiceConfig {
  model: string;
  apiKey?: string;
}

export class OpenAIService implements LLMService {
  private readonly model: string;
  private client: OpenAI;

  constructor(config: OpenAIServiceConfig) {
    let apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new AgentError(
        "OpenAI API key missing. Provide it to the constructor or set you OPENAI_API_KEY environment variable",
      );
    }

    this.client = new OpenAI({ apiKey });
    this.model = config.model;
  }

  private static toOpenAIMessages(
    messages: LLMMessage[],
  ): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    return messages.map((message) => {
      switch (message.role) {
        case "user":
        case "system":
        case "developer":
          return { role: message.role, content: message.content };
        case "assistant": {
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
        case "tool":
          return {
            role: "tool",
            content: message.content,
            tool_call_id: message.toolCallID,
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
        parameters: zodToJsonSchema(tool.parameters),
      },
    }));
  }

  public async getStructuredOutput<T>({
    messages,
    schema,
    schemaName,
  }: {
    messages: LLMMessage[];
    schema: AnyZodObject;
    schemaName: string;
  }): Promise<T> {
    const response = await this.client.chat.completions.parse({
      model: this.model,
      messages: OpenAIService.toOpenAIMessages(messages),
      response_format: {
        type: "json_schema",
        json_schema: {
          name: schemaName,
          schema: zodToJsonSchema(schema),
          strict: true,
        },
      },
    });

    const output = response.choices[0].message.parsed as T | null;
    if (!output) {
      throw new AgentError("Failed to parse output.");
    }
    return output;
  }

  public async callTools({
    messages,
    tools,
  }: {
    messages: LLMMessage[];
    tools: Tool[];
  }): Promise<AssistantMessage> {
    let response;
    try {
      response = await this.client.chat.completions.create({
        model: this.model,
        messages: OpenAIService.toOpenAIMessages(messages),
        tools: OpenAIService.toOpenAITools(tools),
      });
    } catch (error) {
      throw new AgentError("Failed to call tools", error);
    }

    const result = response.choices[0].message;

    const toolCalls =
      result.tool_calls?.map((tc) => ({
        id: tc.id,
        name: tc.type === "function" ? tc.function.name : "",
        arguments: tc.type === "function" ? tc.function.arguments : "",
      })) ?? undefined;

    return {
      role: "assistant",
      content: result.content ?? "",
      toolCalls,
    };
  }
}
