from concurrent.futures import ThreadPoolExecutor, as_completed
import os
import multiprocessing
from typing import List, Any, Dict, Optional
from tqdm import tqdm
from chromadb import Search, K, Knn

def add_to_chroma_collection(
    collection: Any, 
    ids: List[str], 
    texts: List[str], 
    embeddings: List[List[float]] | None = None, 
    metadatas: List[Dict[str, Any]] | None = None
) -> None:
    BATCH_SIZE = 100
    LEN = len(texts)
    N_THREADS = min(os.cpu_count() or multiprocessing.cpu_count(), 20)

    def add_batch(start: int, end: int) -> None:
        id_batch = ids[start:end]
        doc_batch = texts[start:end]

        try:
            if embeddings and metadatas:
                collection.add(ids=id_batch, documents=doc_batch, embeddings=embeddings[start:end], metadatas=metadatas[start:end])
            elif embeddings:
                collection.add(ids=id_batch, documents=doc_batch, embeddings=embeddings[start:end])
            elif metadatas:
                collection.add(ids=id_batch, documents=doc_batch, metadatas=metadatas[start:end])
            else:
                collection.add(ids=id_batch, documents=doc_batch)

        except Exception as e:
            raise Exception(f"Error adding {start} to {end}: {e}")

    threadpool = ThreadPoolExecutor(max_workers=N_THREADS)

    futures = []
    for i in range(0, LEN, BATCH_SIZE):
        future = threadpool.submit(add_batch, i, min(i + BATCH_SIZE, LEN))
        futures.append(future)

    for future in tqdm(as_completed(futures), total=len(futures), desc="Adding to Chroma"):
        future.result()

    threadpool.shutdown(wait=True)

def search_chroma_collection(
    collection: Any,
    query_ids: List[str],
    query_embeddings: Optional[List[List[float]]] = None,
    query_texts: Optional[List[str]] = None,
    n_results: int = 10,
    embedding_key: Optional[str] = None
) -> Dict[str, List[str]]:
    BATCH_SIZE = 5
    results: Dict[str, List[str]] = {}

    if query_embeddings is None and query_texts is None:
        raise ValueError("Either query_embeddings or query_texts must be provided")

    total_queries = len(query_ids)

    for i in tqdm(range(0, total_queries, BATCH_SIZE), desc="Processing batches"):
        end_idx = min(i + BATCH_SIZE, total_queries)
        batch_ids = query_ids[i:end_idx]

        searches = []
        for idx in range(len(batch_ids)):
            if query_embeddings is not None:
                query = query_embeddings[i + idx]
            else:
                query = query_texts[i + idx]

            if embedding_key:
                search = (Search()
                    .rank(Knn(query=query, key=embedding_key))
                    .limit(n_results)
                    .select(K.ID))
            else:
                search = (Search()
                    .rank(Knn(query=query))
                    .limit(n_results)
                    .select(K.ID))
            searches.append(search)

        search_results = collection.search(searches)

        for idx, query_id in enumerate(batch_ids):
            results[query_id] = search_results['ids'][idx]

    return results