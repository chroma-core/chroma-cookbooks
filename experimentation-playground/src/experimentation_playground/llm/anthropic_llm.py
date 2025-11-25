import os
from typing import List, Dict
from dotenv import load_dotenv
from anthropic import Anthropic
from .base_llm import BaseLLM

load_dotenv()


class AnthropicLLM(BaseLLM):
    def __init__(
        self,
        model_name: str = "claude-4-5-sonnet",
    ):
        super().__init__(provider="anthropic", model_name=model_name)
        self.client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    def generate(
        self,
        messages: List[Dict[str, str]],
        **kwargs
    ) -> str:
        response = self.client.responses.create(
            model=self.model_name,
            messages=messages,
            **kwargs
        )
        return response.content[0].text