import { LLMProvider, LLMService, LLMServiceConfig } from "./types";
import { OpenAIService } from "./openai";
import { AgentError } from "../errors";

export function parseLLMProvider(input: string) {
  switch (input.toLowerCase()) {
    case "openai":
      return LLMProvider.OpenAI;
    default:
      throw new AggregateError(`Unsupported LLM provider: ${input}`);
  }
}

export class LLMFactory {
  public static async create(config: LLMServiceConfig): Promise<LLMService> {
    switch (config.provider) {
      case LLMProvider.OpenAI:
        return new OpenAIService(config);
      default:
        throw new AgentError(
          `Unsupported LLM provider: ${(config as LLMServiceConfig).provider}`,
        );
    }
  }
}
