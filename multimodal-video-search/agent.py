"""Agentic search using Gemini with semantic_search tool."""

import json
from google import genai
from google.genai import types

from config import GEMINI_API_KEY, LLM_MODEL, get_frame_path
from chroma_store import search as chroma_search

# Shared client
_client = None


def get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=GEMINI_API_KEY)
    return _client


# Tool definition
SEMANTIC_SEARCH_TOOL = types.Tool(
    function_declarations=[
        types.FunctionDeclaration(
            name="semantic_search",
            description="Search the video's frames and transcript for relevant content. Use this to find specific moments, objects, or spoken text in the video.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "query": types.Schema(
                        type=types.Type.STRING,
                        description="Search query describing what you're looking for",
                    ),
                    "n_results": types.Schema(
                        type=types.Type.INTEGER,
                        description="Number of results to return (default 5)",
                    ),
                    "filter_type": types.Schema(
                        type=types.Type.STRING,
                        enum=["image", "transcript"],
                        description="Filter to only search images or transcript",
                    ),
                },
                required=["query"],
            ),
        )
    ]
)


def execute_search(video_id: str, args: dict) -> list[dict]:
    """Execute semantic search and return results."""
    query = args["query"]
    n_results = args.get("n_results", 5)
    filter_type = args.get("filter_type")

    results = chroma_search(
        video_id=video_id,
        query=query,
        n_results=n_results,
        filter_type=filter_type,
    )

    return results


def build_tool_response(video_id: str, results: list[dict]) -> types.Content:
    """Build a tool response, including images for image results."""
    client = get_client()
    parts = []

    for result in results:
        metadata = result["metadata"]
        result_type = metadata["type"]
        frame = metadata["frame"]
        timestamp = f"{metadata['timestamp_start']:.0f}s - {metadata['timestamp_end']:.0f}s"

        if result_type == "transcript":
            parts.append(types.Part.from_text(
                f"[Transcript at {timestamp}, {frame}]: {result.get('text', '')}"
            ))
        else:
            # Image result - include the actual image
            parts.append(types.Part.from_text(
                f"[Image at {timestamp}, {frame}]:"
            ))

            # Load image from Files API if available, otherwise from local
            files_api_name = metadata.get("files_api_name")
            if files_api_name:
                try:
                    file_ref = client.files.get(name=files_api_name)
                    parts.append(types.Part.from_uri(
                        file_uri=file_ref.uri,
                        mime_type="image/jpeg",
                    ))
                except Exception:
                    # Fallback to local file
                    frame_path = get_frame_path(video_id, frame)
                    if frame_path.exists():
                        parts.append(types.Part.from_bytes(
                            data=frame_path.read_bytes(),
                            mime_type="image/jpeg",
                        ))
            else:
                frame_path = get_frame_path(video_id, frame)
                if frame_path.exists():
                    parts.append(types.Part.from_bytes(
                        data=frame_path.read_bytes(),
                        mime_type="image/jpeg",
                    ))

    return types.Content(role="user", parts=parts)


def answer_question(video_id: str, question: str, max_iterations: int = 10) -> str:
    """
    Answer a question about a video using agentic search.

    The agent will use semantic_search tool to find relevant content,
    and can view both transcript and actual images.
    """
    client = get_client()

    system_instruction = """You are an AI assistant that answers questions about videos.
You have access to a semantic_search tool that lets you search through the video's frames and transcript.

When answering questions:
1. Use semantic_search to find relevant frames and transcript segments
2. For image results, you will see the actual frame images
3. You can search multiple times with different queries if needed
4. Once you have enough information, provide a clear answer

Be thorough but efficient - search for what you need, then answer."""

    messages = [
        types.Content(role="user", parts=[types.Part.from_text(question)])
    ]

    for iteration in range(max_iterations):
        response = client.models.generate_content(
            model=LLM_MODEL,
            contents=messages,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                tools=[SEMANTIC_SEARCH_TOOL],
            ),
        )

        # Check if model wants to use a tool
        if response.candidates[0].content.parts:
            for part in response.candidates[0].content.parts:
                if part.function_call:
                    # Execute the tool
                    func_call = part.function_call
                    print(f"  [Agent] Searching: {func_call.args.get('query', '')}")

                    results = execute_search(video_id, dict(func_call.args))
                    print(f"  [Agent] Found {len(results)} results")

                    # Add assistant's response and tool result
                    messages.append(response.candidates[0].content)
                    messages.append(build_tool_response(video_id, results))
                    break
                elif part.text:
                    # Model provided final answer
                    return part.text

        # If no function call and no text, something went wrong
        if not any(p.function_call or p.text for p in response.candidates[0].content.parts):
            return "I couldn't find enough information to answer that question."

    return "I reached the maximum number of search iterations without finding a complete answer."
