"""Chroma Cloud storage for multimodal video data."""

import chromadb
from chromadb.utils.embedding_functions import GoogleGenerativeAiEmbeddingFunction

from config import (
    GEMINI_API_KEY,
    CHROMA_HOST,
    CHROMA_API_KEY,
    CHROMA_TENANT,
    CHROMA_DATABASE,
    EMBEDDING_MODEL,
    get_collection_name,
)

# Shared client
_client = None


def get_chroma_client() -> chromadb.CloudClient:
    global _client
    if _client is None:
        _client = chromadb.CloudClient(
            host=CHROMA_HOST,
            api_key=CHROMA_API_KEY,
            tenant=CHROMA_TENANT,
            database=CHROMA_DATABASE,
        )
    return _client


def get_embedding_function():
    return GoogleGenerativeAiEmbeddingFunction(
        api_key=GEMINI_API_KEY,
        model_name=EMBEDDING_MODEL,
    )


def get_or_create_collection(video_id: str):
    """Get or create a collection for a video."""
    client = get_chroma_client()
    collection_name = get_collection_name(video_id)

    return client.get_or_create_collection(
        name=collection_name,
        embedding_function=get_embedding_function(),
    )


def collection_exists_and_populated(video_id: str) -> bool:
    """Check if collection exists and has data."""
    client = get_chroma_client()
    collection_name = get_collection_name(video_id)

    try:
        collection = client.get_collection(
            name=collection_name,
            embedding_function=get_embedding_function(),
        )
        return collection.count() > 0
    except Exception:
        return False


def add_transcripts(
    video_id: str,
    transcript_by_frame: dict[str, str],
) -> None:
    """Add transcript documents to collection."""
    collection = get_or_create_collection(video_id)

    ids = []
    documents = []
    metadatas = []

    for frame_name, text in transcript_by_frame.items():
        if not text:
            continue

        frame_num = int(frame_name.split("_")[1])
        ids.append(f"transcript_{frame_name}")
        documents.append(text)
        metadatas.append({
            "type": "transcript",
            "frame": frame_name,
            "timestamp_start": float(frame_num - 1),
            "timestamp_end": float(frame_num),
        })

    if ids:
        collection.add(
            ids=ids,
            documents=documents,
            metadatas=metadatas,
        )
        print(f"  Added {len(ids)} transcript segments")


def add_images(
    video_id: str,
    frame_embeddings: dict[str, tuple[str, list[float]]],
) -> None:
    """Add image embeddings to collection."""
    collection = get_or_create_collection(video_id)

    ids = []
    embeddings = []
    metadatas = []

    for frame_name, (files_api_name, embedding) in frame_embeddings.items():
        frame_num = int(frame_name.split("_")[1])
        ids.append(f"image_{frame_name}")
        embeddings.append(embedding)
        metadatas.append({
            "type": "image",
            "frame": frame_name,
            "timestamp_start": float(frame_num - 1),
            "timestamp_end": float(frame_num),
            "files_api_name": files_api_name,
        })

    if ids:
        collection.add(
            ids=ids,
            embeddings=embeddings,
            metadatas=metadatas,
        )
        print(f"  Added {len(ids)} image embeddings")


def search(
    video_id: str,
    query: str,
    n_results: int = 5,
    filter_type: str | None = None,
) -> list[dict]:
    """
    Search the collection.

    Args:
        video_id: The video to search
        query: Search query (text)
        n_results: Number of results
        filter_type: Optional filter - "image" or "transcript"

    Returns:
        List of results with id, type, frame, distance, and content
    """
    collection = get_or_create_collection(video_id)

    where = None
    if filter_type:
        where = {"type": filter_type}

    results = collection.query(
        query_texts=[query],
        n_results=n_results,
        where=where,
        include=["metadatas", "documents", "distances"],
    )

    output = []
    for i in range(len(results["ids"][0])):
        result = {
            "id": results["ids"][0][i],
            "metadata": results["metadatas"][0][i],
            "distance": results["distances"][0][i],
        }
        # Include document text if it's a transcript
        if results["documents"] and results["documents"][0][i]:
            result["text"] = results["documents"][0][i]
        output.append(result)

    return output
