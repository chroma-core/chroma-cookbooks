from typing import Dict, List, Any, Optional, Callable
import json
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from tqdm import tqdm
from .embed.base_embed import BaseEmbed
from .rerank_results.base_rerank import BaseRerank
from .eval.simple_eval import get_recall

class Run:
    def __init__(
        self,
        run_id: str,
        embedder: BaseEmbed,
        id_to_chunk: Dict[str, str],
        id_to_query: Dict[str, str],
        query_to_chunk: Dict[str, str],
        config: Dict[str, Any],
        rewriter: Optional[Callable] = None,
        rewriter_args: Optional[Dict[str, Any]] = None,
        reranker: Optional[BaseRerank] = None,
    ):
        self.run_id = run_id
        self.embedder = embedder
        self.id_to_chunk = id_to_chunk
        self.id_to_query = id_to_query
        self.query_to_chunk = query_to_chunk
        self.config = config
        self.rewriter = rewriter
        self.rewriter_args = rewriter_args or {}
        self.reranker = reranker

    def run(self, n_results: int = 10, output_dir: str = "results") -> Dict[str, Any]:
        self.embedder.add_to_collection(self.id_to_chunk)

        debug_log = {}
        for qid in self.id_to_query:
            debug_log[qid] = {
                "original_query": self.id_to_query[qid],
                "rewritten_query": None,
                "retrieved_results": [],
                "reranked_results": [],
                "expected_doc_id": self.query_to_chunk.get(qid),
                "recall": {}
            }

        queries_to_execute = self.id_to_query.copy()
        if self.rewriter:
            queries_to_execute = {}
            query_items = list(self.id_to_query.items())
            batch_size = 100

            with tqdm(total=len(query_items), desc="Rewriting queries") as pbar:
                for i in range(0, len(query_items), batch_size):
                    batch = query_items[i:i + batch_size]

                    with ThreadPoolExecutor() as executor:
                        futures = {
                            executor.submit(self.rewriter, **self.rewriter_args, query=query): qid
                            for qid, query in batch
                        }

                        for future in as_completed(futures):
                            qid = futures[future]
                            rewritten = future.result()
                            queries_to_execute[qid] = rewritten
                            debug_log[qid]["rewritten_query"] = rewritten
                            pbar.update(1)

        query_results = self.embedder.query_collection(queries_to_execute, n_results=n_results)

        for qid, doc_ids in query_results.items():
            debug_log[qid]["retrieved_results"] = [
                {
                    "doc_id": doc_id,
                    "content": self.id_to_chunk[doc_id]
                }
                for doc_id in doc_ids
            ]

        if self.reranker:
            reranked_results = {}
            query_result_items = list(query_results.items())
            batch_size = 5 # change based on rate limits

            def rerank_query(qid, doc_ids):
                original_query = self.id_to_query[qid]
                documents = [self.id_to_chunk[doc_id] for doc_id in doc_ids]
                reranked_docids = self.reranker.rerank(original_query, documents, doc_ids)
                return qid, reranked_docids

            with tqdm(total=len(query_result_items), desc="Reranking results") as pbar:
                for i in range(0, len(query_result_items), batch_size):
                    batch = query_result_items[i:i + batch_size]

                    with ThreadPoolExecutor() as executor:
                        futures = {
                            executor.submit(rerank_query, qid, doc_ids): qid
                            for qid, doc_ids in batch
                        }

                        for future in as_completed(futures):
                            try:
                                qid, reranked_docids = future.result()
                                reranked_results[qid] = reranked_docids
                                # Log reranked results
                                debug_log[qid]["reranked_results"] = [
                                    {
                                        "doc_id": doc_id,
                                        "content": self.id_to_chunk[doc_id]
                                    }
                                    for doc_id in reranked_docids
                                ]
                            except Exception as e:
                                error_msg = f"Reranking failed for query {futures[future]}: {str(e)}"
                                print(f"\nERROR: {error_msg}")
                                debug_log[futures[future]]["rerank_error"] = str(e)
                                raise
                            finally:
                                pbar.update(1)

            query_results = reranked_results

        eval_results = get_recall(query_results, self.query_to_chunk)

        for qid, retrieved_ids in query_results.items():
            expected_chunk_id = self.query_to_chunk.get(qid)
            if expected_chunk_id:
                for k in [1, 5, 10]:
                    debug_log[qid]["recall"][f"Recall@{k}"] = expected_chunk_id in retrieved_ids[:k]

        results = {
            "run_id": self.run_id,
            "config": self.config,
            "metrics": eval_results,
        }

        to_save = {
            "results": results,
            "log": debug_log,
        }
        
        os.makedirs(output_dir, exist_ok=True)
        with open(f"{output_dir}/{self.run_id}.json", "w") as f:
            json.dump(to_save, f, indent=4)

        return results
