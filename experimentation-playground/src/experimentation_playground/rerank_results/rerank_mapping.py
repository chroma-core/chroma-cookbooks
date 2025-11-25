from .voyage_rerank import VoyageReranker
from .contextual_rerank import ContextualReranker

RERANK_REGISTRY = {
    "voyage": VoyageReranker,
    "contextual": ContextualReranker,
}

def get_reranker(rerank_type: str, model_name: str):
    if rerank_type not in RERANK_REGISTRY:
        raise ValueError(f"Unknown rerank type: {rerank_type}")
    return RERANK_REGISTRY[rerank_type](model_name)
