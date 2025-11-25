DEFAULT_BATCH_SIZE = 100

# Provider and model configurations
EMBEDDING_CONFIGS = {
    "openai": [
        "text-embedding-3-small",
        "text-embedding-3-large",
    ],
    "jina": [
        "jina-embeddings-v3",
    ],
    "voyage": [
        "voyage-3-large",
        "voyage-3",
    ],
}


def validate_provider_and_model(provider: str, model_name: str) -> None:
    """Validate that provider and model are supported.

    Args:
        provider: The embedding provider (e.g., 'openai', 'jina', 'voyage')
        model_name: The model name

    Raises:
        ValueError: If provider or model is not supported
    """
    if provider not in EMBEDDING_CONFIGS:
        raise ValueError(
            f"Unsupported provider: {provider}. "
            f"Supported providers: {list(EMBEDDING_CONFIGS.keys())}"
        )

    if model_name not in EMBEDDING_CONFIGS[provider]:
        raise ValueError(
            f"Unsupported model: {model_name} for provider {provider}. "
            f"Supported models: {EMBEDDING_CONFIGS[provider]}"
        )
