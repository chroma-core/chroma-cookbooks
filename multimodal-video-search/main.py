#!/usr/bin/env python3
"""
Multimodal Video Search with Gemini + Chroma

Usage:
    python main.py "https://youtube.com/shorts/xyz" "How many bowls are in the video?"
"""

import sys

from video_processor import process_video, extract_video_id
from embeddings import embed_images
from chroma_store import (
    collection_exists_and_populated,
    add_transcripts,
    add_images,
)
from agent import answer_question


def main():
    if len(sys.argv) < 3:
        print("Usage: python main.py <youtube_url> <question>")
        print('Example: python main.py "https://youtube.com/shorts/xyz" "What is happening?"')
        sys.exit(1)

    url = sys.argv[1]
    question = sys.argv[2]

    # Extract video ID to check if already indexed
    video_id = extract_video_id(url)
    print(f"Video ID: {video_id}")

    # Check if already indexed
    if collection_exists_and_populated(video_id):
        print("Collection already exists and is populated. Skipping indexing.")
    else:
        # Process video
        video_id, frame_names, transcript_by_frame = process_video(url)

        # Embed images
        print("Embedding images...")
        frame_embeddings = embed_images(video_id, frame_names)

        # Index to Chroma
        print("Indexing to Chroma...")
        add_transcripts(video_id, transcript_by_frame)
        add_images(video_id, frame_embeddings)
        print("Indexing complete!")

    # Answer question
    print(f"\nQuestion: {question}")
    print("Searching...\n")

    answer = answer_question(video_id, question)

    print("\n" + "=" * 50)
    print("Answer:")
    print("=" * 50)
    print(answer)


if __name__ == "__main__":
    main()
