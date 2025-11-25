from abc import ABC, abstractmethod
from typing import List, Any, Dict

class BaseEmbed(ABC):
    def __init__(self, client: Any, collection_name: str):
        self.client = client
        self.collection_name = collection_name

    @abstractmethod
    def add_to_collection(self, id_to_chunk: Dict[str, str]) -> None:
        pass

    @abstractmethod
    def query_collection(self, id_to_query: Dict[str, str], n_results: int = 10) -> Dict[str, List[str]]:
        pass