"""Image embedding using Google Gemini."""

import time
from pathlib import Path

from google import genai
from google.genai.errors import ClientError

from config import (
    GEMINI_API_KEY,
    EMBEDDING_MODEL,
    MAX_RETRIES,
    INITIAL_RETRY_DELAY,
    get_frame_path,
)

# Shared client
_client = None


def get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=GEMINI_API_KEY)
    return _client


def embed_image(video_id: str, frame_name: str) -> tuple[str, list[float]]:
    """
    Embed a single image with retry logic.

    Returns: (files_api_name, embedding_vector)
    """
    client = get_client()
    frame_path = get_frame_path(video_id, frame_name)
    delay = INITIAL_RETRY_DELAY

    # Upload to Files API
    uploaded = client.files.upload(file=frame_path)

    # Embed with retry
    for attempt in range(MAX_RETRIES):
        try:
            result = client.models.embed_content(
                model=EMBEDDING_MODEL,
                contents=[uploaded]
            )
            return uploaded.name, result.embeddings[0].values
        except ClientError as e:
            if e.code == 429:
                if attempt < MAX_RETRIES - 1:
                    print(f"    Rate limited. Waiting {delay}s... ({attempt + 1}/{MAX_RETRIES})")
                    time.sleep(delay)
                    delay *= 2
                else:
                    raise RuntimeError(f"Max retries exceeded for {frame_name}") from e
            else:
                raise


def embed_images(video_id: str, frame_names: list[str]) -> dict[str, tuple[str, list[float]]]:
    """
    Embed multiple images one at a time.

    Returns: {frame_name: (files_api_name, embedding_vector)}
    """
    results = {}
    total = len(frame_names)

    for i, frame_name in enumerate(frame_names):
        print(f"  Embedding {i + 1}/{total}: {frame_name}")
        file_name, embedding = embed_image(video_id, frame_name)
        results[frame_name] = (file_name, embedding)

    return results
