import {
  LLMProvider,
  LLMProviderEntry,
  LLMServiceConfig,
  LLMServiceDescription,
} from "./types";
import { OpenAIService, OpenAIServiceConfig } from "./providers";
import { LLMService } from "./llm-service";
import { LLMServiceError } from "./errors";

export class LLMFactory {
  private static PROVIDERS: Record<LLMProvider, LLMProviderEntry> = {
    [LLMProvider.OpenAI]: {
      create: (config) => new OpenAIService(config as OpenAIServiceConfig),
      description: OpenAIService.describe(),
    },
  };

  static parseLLMProvider(input: string): LLMProvider {
    switch (input.toLowerCase()) {
      case "openai":
        return LLMProvider.OpenAI;
      default:
        throw new LLMServiceError(`Unsupported LLM provider: ${input}`);
    }
  }

  static create(config: LLMServiceConfig): LLMService {
    return LLMFactory.PROVIDERS[config.provider].create(config);
  }

  static escribe(provider: LLMProvider): LLMServiceDescription {
    return LLMFactory.PROVIDERS[provider].description;
  }
}
