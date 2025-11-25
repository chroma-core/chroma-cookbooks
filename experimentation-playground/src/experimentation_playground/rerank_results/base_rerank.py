from abc import ABC, abstractmethod
from typing import List

class BaseRerank(ABC):
    def __init__(self, model_name: str):
        self.model_name = model_name

    @abstractmethod
    def rerank(self, query: str, documents: List[str], docids: List[str], **kwargs) -> List[str]:
        pass
