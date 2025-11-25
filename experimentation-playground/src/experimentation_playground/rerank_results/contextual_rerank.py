import requests
import os
import time
from dotenv import load_dotenv
from typing import List
from .base_rerank import BaseRerank

load_dotenv()

class ContextualReranker(BaseRerank):
    def __init__(self, model_name: str):
        super().__init__(model_name)
        self.api_key = os.getenv("CONTEXTUAL_API_KEY")

    def rerank(self, query: str, documents: List[str], docids: List[str], **kwargs) -> List[str]:
        url = "https://api.app.contextual.ai/v1/rerank"

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }

        payload = {
            "query": query,
            "documents": documents,
            "model": self.model_name,
            "top_n": len(documents),
            "instruction": kwargs.get("instruction", ""),
            "metadata": ["" for _ in range(len(documents))]
        }

        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = requests.post(url, json=payload, headers=headers)
                response.raise_for_status()
                response_data = response.json()

                reranked_results = response_data.get('results')
                if not reranked_results:
                    raise ValueError(f"Reranker returned empty or no results. Response: {response_data}")

                sorted_results = sorted(reranked_results, key=lambda x: x.get('relevance_score', 0), reverse=True)
                reranked_docids = [docids[result['index']] for result in sorted_results]

                return reranked_docids
            except Exception as e:
                if attempt < max_retries - 1:
                    wait_time = 2 ** attempt
                    print(f"Attempt {attempt + 1}/{max_retries} failed: {str(e)}. Retrying in {wait_time}s...")
                    time.sleep(wait_time)
                else:
                    if isinstance(e, requests.exceptions.RequestException):
                        raise RuntimeError(f"API request failed after {max_retries} attempts: {str(e)}") from e
                    elif isinstance(e, (KeyError, IndexError)):
                        raise ValueError(f"Failed to parse reranking response: {str(e)}") from e
                    else:
                        raise
