from .base_embed import BaseEmbed
from typing import List, Any, Dict
from .embedding_models import EmbeddingModel
from .chroma import *
from chromadb import Schema, SparseVectorIndexConfig, K, Knn, Search
from chromadb.utils.embedding_functions import ChromaCloudSpladeEmbeddingFunction

class SparseEmbed(BaseEmbed):    
    def __init__(self, client: Any, collection_name: str):
        super().__init__(client, collection_name)
        schema = Schema()
        sparse_ef = ChromaCloudSpladeEmbeddingFunction()
        schema.create_index(
            config=SparseVectorIndexConfig(
                source_key=K.DOCUMENT,
                embedding_function=sparse_ef
            ),
            key="sparse_embedding"
        )

        if collection_name not in [collection.name for collection in client.list_collections()]:
            self.collection = client.create_collection(collection_name, schema=schema)
        else:
            self.collection = client.get_collection(collection_name)
            print(f"Collection {collection_name} already exists")

    def add_to_collection(self, id_to_chunk: Dict[str, str]) -> None:
        if self.collection.count() == 0:
            add_to_chroma_collection(self.collection, list(id_to_chunk.keys()), list(id_to_chunk.values()))
    
    def query_collection(self, id_to_query: Dict[str, str], n_results: int = 10) -> Dict[str, List[str]]:
        return search_chroma_collection(
            self.collection,
            list(id_to_query.keys()),
            query_texts=list(id_to_query.values()),
            n_results=n_results,
            embedding_key="sparse_embedding"
        )