from typing import Dict, Type
from .base_llm import BaseLLM
from .openai_llm import OpenAILLM
from .anthropic_llm import AnthropicLLM


LLM_PROVIDER_MAP: Dict[str, Type[BaseLLM]] = {
    "openai": OpenAILLM,
    "anthropic": AnthropicLLM,
}


def get_llm(provider: str, model_name: str) -> BaseLLM:
    if provider not in LLM_PROVIDER_MAP:
        raise ValueError(f"Unknown provider: {provider}. Available: {list(LLM_PROVIDER_MAP.keys())}")

    llm_class = LLM_PROVIDER_MAP[provider]
    return llm_class(model_name=model_name)
