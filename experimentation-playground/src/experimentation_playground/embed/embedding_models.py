from typing import List, Any, Dict, Optional
from tqdm import tqdm
import requests
import json
from voyageai import Client as VoyageClient
from openai import OpenAI as OpenAIClient
import os
import dotenv

from .config import validate_provider_and_model, EMBEDDING_CONFIGS, DEFAULT_BATCH_SIZE

dotenv.load_dotenv()

# common embedding functions
def openai_embed(
    openai_client: OpenAIClient, 
    texts: List[str], 
    model: str
) -> List[List[float]]:
    try:
        return [response.embedding for response in openai_client.embeddings.create(model=model, input = texts).data]
    except Exception as e:
        print(f"Error embedding: {e}")
        return [[0.0]*1024 for _ in texts]
 
def openai_embed_in_batches(
    openai_client: OpenAIClient, 
    texts: List[str], 
    model: str, 
    batch_size: int = 100
) -> List[List[float]]:
    all_embeddings = []

    for i in tqdm(range(0, len(texts), batch_size), desc="Processing OpenAI batches"):
        batch = texts[i:i + batch_size]
        batch_embeddings = openai_embed(openai_client, batch, model)
        all_embeddings.extend(batch_embeddings)

    return all_embeddings


def jina_embed(
    JINA_API_KEY: str, 
    input_type: str, 
    texts: List[str]
) -> List[List[float]]:
    try:
        url = "https://api.jina.ai/v1/embeddings"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {JINA_API_KEY}"
        }
        
        data = {
            "model": "jina-embeddings-v3",
            "task": input_type,
            "late_chunking": False,
            "dimensions": 1024,
            "embedding_type": "float",
            "input": texts
        }

        response = requests.post(url, headers=headers, json=data)
        response_dict = json.loads(response.text)
        embeddings = [item["embedding"] for item in response_dict["data"]]
        
        return embeddings
    
    except Exception as e:
        print(f"Error embedding batch: {e}")
        return [[0.0]*1024 for _ in texts]

def jina_embed_in_batches(
    JINA_API_KEY: str, 
    input_type: str, 
    texts: List[str], 
    batch_size: int = 100
) -> List[List[float]]:
    all_embeddings = []
    
    for i in tqdm(range(0, len(texts), batch_size), desc="Processing Jina batches"):
        batch = texts[i:i + batch_size]
        batch_embeddings = jina_embed(JINA_API_KEY, input_type, batch)
        all_embeddings.extend(batch_embeddings)
    
    return all_embeddings


def voyage_embed(
    voyage_client: VoyageClient, 
    input_type: str, 
    texts: List[str]
) -> List[List[float]]:
    try:
        response = voyage_client.embed(texts, model="voyage-3-large", input_type=input_type)
        return response.embeddings
    
    except Exception as e:
        print(f"Error embedding batch: {e}")
        return [[0.0]*1024 for _ in texts]

def voyage_embed_in_batches(
    voyage_client: VoyageClient,
    input_type: str,
    texts: List[str],
    batch_size: int = 100
) -> List[List[float]]:
    all_embeddings = []

    for i in tqdm(range(0, len(texts), batch_size), desc="Processing Voyage batches"):
        batch = texts[i:i + batch_size]

        batch_embeddings = voyage_embed(voyage_client, input_type, batch)

        all_embeddings.extend(batch_embeddings)

    return all_embeddings


class EmbeddingModel:
    """Unified interface for embedding models across different providers.

    Args:
        provider: The embedding provider ('openai', 'jina', 'voyage')
        model_name: The specific model name
        api_key: Optional API key (can also be set via environment variables)
        **kwargs: Additional provider-specific configuration

    Example:
        >>> # OpenAI
        >>> model = EmbeddingModel(provider="openai", model_name="text-embedding-3-small")
        >>> embeddings = model.embed(["Hello world", "Test text"])

        >>> # Jina with custom input type
        >>> model = EmbeddingModel(provider="jina", model_name="jina-embeddings-v3")
        >>> embeddings = model.embed(["Hello"], input_type="query")

        >>> # Voyage
        >>> model = EmbeddingModel(provider="voyage", model_name="voyage-3-large")
        >>> embeddings = model.embed_in_batches(texts, batch_size=50)
    """

    def __init__(
        self,
        provider: str,
        model_name: str,
        api_key: Optional[str] = None,
        **kwargs
    ):
        self.provider = provider.lower()
        self.model_name = model_name
        validate_provider_and_model(self.provider, self.model_name)

        # Initialize provider-specific clients
        if self.provider == "openai":
            api_key = api_key or os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise ValueError("OpenAI API key required. Set OPENAI_API_KEY environment variable or pass api_key parameter.")
            self.client = OpenAIClient(api_key=api_key)

        elif self.provider == "jina":
            self.api_key = api_key or os.getenv("JINA_API_KEY")
            if not self.api_key:
                raise ValueError("Jina API key required. Set JINA_API_KEY environment variable or pass api_key parameter.")

        elif self.provider == "voyage":
            api_key = api_key or os.getenv("VOYAGE_API_KEY")
            if not api_key:
                raise ValueError("Voyage API key required. Set VOYAGE_API_KEY environment variable or pass api_key parameter.")
            self.client = VoyageClient(api_key=api_key)

        # Store additional kwargs for provider-specific options
        self.kwargs = kwargs

    def embed(
        self,
        texts: List[str],
        input_type: Optional[str] = None
    ) -> List[List[float]]:
        """Generate embeddings for a list of texts.

        Args:
            texts: List of texts to embed
            input_type: Optional input type ('query' or 'document') for Jina/Voyage

        Returns:
            List of embedding vectors
        """
        if self.provider == "openai":
            return openai_embed(self.client, texts, self.model_name)

        elif self.provider == "jina":
            input_type = input_type or "document"
            return jina_embed(self.api_key, input_type, texts)

        elif self.provider == "voyage":
            input_type = input_type or "document"
            return voyage_embed(self.client, input_type, texts)

        raise ValueError(f"Unsupported provider: {self.provider}")

    def embed_in_batches(
        self,
        texts: List[str],
        batch_size: int = DEFAULT_BATCH_SIZE,
        input_type: Optional[str] = None
    ) -> List[List[float]]:
        """Generate embeddings in batches for large text collections.

        Args:
            texts: List of texts to embed
            batch_size: Number of texts per batch (default: 100)
            input_type: Optional input type ('query' or 'document') for Jina/Voyage

        Returns:
            List of embedding vectors
        """
        if self.provider == "openai":
            return openai_embed_in_batches(self.client, texts, self.model_name, batch_size)

        elif self.provider == "jina":
            input_type = input_type or "document"
            return jina_embed_in_batches(self.api_key, input_type, texts, batch_size)

        elif self.provider == "voyage":
            input_type = input_type or "document"
            return voyage_embed_in_batches(self.client, input_type, texts, batch_size)

        raise ValueError(f"Unsupported provider: {self.provider}")

    @classmethod
    def supported_providers(cls) -> List[str]:
        """Get list of supported providers."""
        return list(EMBEDDING_CONFIGS.keys())

    @classmethod
    def supported_models(cls, provider: str) -> List[str]:
        """Get list of supported models for a provider."""
        if provider not in EMBEDDING_CONFIGS:
            raise ValueError(f"Unsupported provider: {provider}")
        return EMBEDDING_CONFIGS[provider]