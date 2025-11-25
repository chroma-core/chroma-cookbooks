from .dense_embed import DenseEmbed
from .sparse_embed import SparseEmbed

EMBED_REGISTRY = {
    "dense": DenseEmbed,
    "sparse": SparseEmbed,
}

def get_embedder(embed_type: str, client, collection_name: str, provider: str = None, model_name: str = None):
    if embed_type not in EMBED_REGISTRY:
        raise ValueError(f"Unknown embed type: {embed_type}")

    if embed_type == "sparse":
        return SparseEmbed(client, collection_name)
    else:
        return EMBED_REGISTRY[embed_type](client, collection_name, provider, model_name)
