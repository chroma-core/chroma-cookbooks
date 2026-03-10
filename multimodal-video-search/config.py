import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# API Keys
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
CHROMA_HOST = os.getenv("CHROMA_HOST")
CHROMA_API_KEY = os.getenv("CHROMA_API_KEY")
CHROMA_TENANT = os.getenv("CHROMA_TENANT")
CHROMA_DATABASE = os.getenv("CHROMA_DATABASE")

# Models
EMBEDDING_MODEL = "gemini-embedding-2-exp-11-2025"
LLM_MODEL = "gemini-3.1-pro"

# Settings
EMBED_BATCH_SIZE = 5
MAX_RETRIES = 5
INITIAL_RETRY_DELAY = 30

# Paths
OUTPUT_DIR = Path("output")


def get_video_dir(video_id: str) -> Path:
    return OUTPUT_DIR / video_id


def get_frames_dir(video_id: str) -> Path:
    return get_video_dir(video_id) / "frames"


def get_frame_path(video_id: str, frame: str) -> Path:
    return get_frames_dir(video_id) / f"{frame}.jpg"


def get_collection_name(video_id: str) -> str:
    return f"multimodal-video-{video_id}"
