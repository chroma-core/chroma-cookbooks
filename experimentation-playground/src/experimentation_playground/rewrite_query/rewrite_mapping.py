from .expand_query import expand_query

REWRITE_REGISTRY = {
    "expand": expand_query,
}

def get_rewriter(rewrite_type: str):
    if rewrite_type not in REWRITE_REGISTRY:
        raise ValueError(f"Unknown rewrite type: {rewrite_type}")
    return REWRITE_REGISTRY[rewrite_type]
