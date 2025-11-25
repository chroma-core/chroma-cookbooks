import os
from typing import List, Dict, Optional
from dotenv import load_dotenv
from openai import OpenAI
from .base_llm import BaseLLM

load_dotenv()


class OpenAILLM(BaseLLM):
    def __init__(
        self,
        model_name: str = "gpt-4.1"
    ):
        super().__init__(provider="openai", model_name=model_name)
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    def generate(
        self,
        messages: List[Dict[str, str]],
        **kwargs
    ) -> str:
        response = self.client.responses.create(
            model=self.model_name,
            input=messages,
            **kwargs
        )
        return response.output[0].content[0].text