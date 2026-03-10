"""Video processing: download, extract frames, get transcript."""

import re
import json
import subprocess
from pathlib import Path

import yt_dlp
from youtube_transcript_api import YouTubeTranscriptApi

from config import get_video_dir, get_frames_dir


def extract_video_id(url: str) -> str:
    """Extract video ID from YouTube URL."""
    patterns = [
        r'(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/shorts/)([a-zA-Z0-9_-]{11})',
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    raise ValueError(f"Could not extract video ID from URL: {url}")


def download_video(url: str, video_id: str) -> Path:
    """Download video using yt-dlp."""
    video_dir = get_video_dir(video_id)
    video_dir.mkdir(parents=True, exist_ok=True)
    video_path = video_dir / "video.mp4"

    if video_path.exists():
        print(f"  Video already downloaded: {video_path}")
        return video_path

    ydl_opts = {
        'format': 'best[ext=mp4]',
        'outtmpl': str(video_path),
        'quiet': True,
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([url])

    return video_path


def extract_frames(video_id: str, interval: float = 1.0) -> list[str]:
    """Extract frames from video at specified interval. Returns list of frame names."""
    video_path = get_video_dir(video_id) / "video.mp4"
    frames_dir = get_frames_dir(video_id)
    frames_dir.mkdir(parents=True, exist_ok=True)

    # Check if frames already extracted
    existing_frames = sorted(frames_dir.glob('frame_*.jpg'))
    if existing_frames:
        print(f"  Frames already extracted: {len(existing_frames)} frames")
        return [f.stem for f in existing_frames]

    cmd = [
        'ffmpeg',
        '-i', str(video_path),
        '-vf', f'fps=1/{interval}',
        '-q:v', '2',
        str(frames_dir / 'frame_%03d.jpg'),
        '-y'
    ]

    subprocess.run(cmd, check=True, capture_output=True)

    frames = sorted(frames_dir.glob('frame_*.jpg'))
    return [f.stem for f in frames]


def get_transcript(video_id: str) -> list[dict]:
    """Get transcript for a YouTube video."""
    try:
        api = YouTubeTranscriptApi()
        transcript = api.fetch(video_id)
        return [
            {"text": item.text, "start": item.start, "duration": item.duration}
            for item in transcript
        ]
    except Exception as e:
        print(f"  Warning: Could not fetch transcript: {e}")
        return []


def align_transcript_to_frames(transcript: list[dict], num_frames: int, interval: float = 1.0) -> dict[str, str]:
    """Align transcript to frame timestamps. Returns {frame_name: text}."""
    aligned = {}

    for frame_idx in range(num_frames):
        frame_name = f"frame_{frame_idx + 1:03d}"
        start_time = frame_idx * interval
        end_time = (frame_idx + 1) * interval

        frame_text = []
        for segment in transcript:
            seg_start = segment['start']
            seg_end = seg_start + segment['duration']

            if seg_start < end_time and seg_end > start_time:
                frame_text.append(segment['text'])

        aligned[frame_name] = " ".join(frame_text) if frame_text else ""

    return aligned


def process_video(url: str) -> tuple[str, list[str], dict[str, str]]:
    """
    Process a YouTube video: download, extract frames, get transcript.

    Returns: (video_id, frame_names, transcript_by_frame)
    """
    print("Processing video...")

    video_id = extract_video_id(url)
    print(f"  Video ID: {video_id}")

    print("  Downloading video...")
    download_video(url, video_id)

    print("  Extracting frames...")
    frame_names = extract_frames(video_id)
    print(f"  Extracted {len(frame_names)} frames")

    print("  Fetching transcript...")
    transcript = get_transcript(video_id)
    transcript_by_frame = align_transcript_to_frames(transcript, len(frame_names))
    print(f"  Got transcript for {sum(1 for t in transcript_by_frame.values() if t)} frames")

    return video_id, frame_names, transcript_by_frame
