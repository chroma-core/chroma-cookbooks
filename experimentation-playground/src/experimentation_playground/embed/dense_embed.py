from .base_embed import BaseEmbed
from typing import List, Any, Dict
from .embedding_models import EmbeddingModel
from .chroma import *

class DenseEmbed(BaseEmbed):    
    def __init__(self, client: Any, collection_name: str, provider: str, model_name: str):
        super().__init__(client, collection_name)
        self.provider = provider
        self.model_name = model_name
        self.model = EmbeddingModel(provider, model_name)
        if collection_name not in [collection.name for collection in client.list_collections()]:
            self.collection = client.create_collection(collection_name, metadata={"hnsw:space": "cosine"})
            print(f"Collection {collection_name} created")
        else:
            self.collection = client.get_collection(collection_name)
            print(f"Collection {collection_name} already exists")

    def add_to_collection(self, id_to_chunk: Dict[str, str]) -> None:
        if self.collection.count() == 0:
            embeddings = self.model.embed_in_batches(list(id_to_chunk.values()))
            add_to_chroma_collection(self.collection, list(id_to_chunk.keys()), list(id_to_chunk.values()), embeddings)
        
    def query_collection(self, id_to_query: Dict[str, str], n_results: int = 10) -> Dict[str, List[str]]:
        embeddings = self.model.embed(list(id_to_query.values()))
        return search_chroma_collection(
            self.collection,
            list(id_to_query.keys()),
            query_embeddings=embeddings,
            n_results=n_results
        )