from typing import Dict, List

def get_recall(
    query_results: Dict[str, List[str]],
    query_to_chunk: Dict[str, str],
    k_values: List[int] = [1, 5, 10]
) -> Dict[str, float]:
    recall = {}

    for k in k_values:
        recall[f"Recall@{k}"] = 0
    
    for query_id, retrieved_ids in query_results.items():
        matching_chunk_id = query_to_chunk[query_id]
        for k in k_values:
            if matching_chunk_id in retrieved_ids[:k]:
                recall[f"Recall@{k}"] += 1

    for k, v in recall.items():
        recall[k] = v / len(query_results)

    return recall