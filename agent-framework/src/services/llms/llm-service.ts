import { AssistantMessage, LLMMessage } from "./types";
import { z } from "zod";
import { Tool } from "../../components/executor";

export interface LLMService {
  getStructuredOutput<T>(args: {
    messages: LLMMessage[];
    schema: z.ZodSchema;
    schemaName: string;
  }): Promise<T>;

  callTools(args: {
    messages: LLMMessage[];
    tools: Tool[];
  }): Promise<AssistantMessage>;
}
