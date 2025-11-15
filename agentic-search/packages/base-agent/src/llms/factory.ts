import { LLMProvider, LLMServiceConfig } from "./types";
import { OpenAIService } from "./openai";
import { AgentError } from "../errors";

export class LLMFactory {
  public static create(config: LLMServiceConfig) {
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
