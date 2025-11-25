import voyageai
import time
from typing import List
import os
from dotenv import load_dotenv
from .base_rerank import BaseRerank

load_dotenv()

class VoyageReranker(BaseRerank):
    def __init__(self, model_name: str):
        super().__init__(model_name)
        self.client = voyageai.Client(api_key=os.getenv("VOYAGE_API_KEY"))

    def rerank(self, query: str, documents: List[str], docids: List[str], **kwargs) -> List[str]:
        max_retries = 3
        for attempt in range(max_retries):
            try:
                reranking = self.client.rerank(query, documents, model=self.model_name, top_k=len(documents))

                if not reranking.results:
                    raise ValueError("Reranker returned empty results")

                reranked_results = sorted(reranking.results, key=lambda x: x.relevance_score, reverse=True)
                reranked_docids = [docids[result.index] for result in reranked_results]

                return reranked_docids
            except Exception as e:
                if attempt < max_retries - 1:
                    wait_time = 2 ** attempt
                    print(f"Attempt {attempt + 1}/{max_retries} failed: {str(e)}. Retrying in {wait_time}s...")
                    time.sleep(wait_time)
                else:
                    raise RuntimeError(f"Voyage reranking failed after {max_retries} attempts: {str(e)}") from e