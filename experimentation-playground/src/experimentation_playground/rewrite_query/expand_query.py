from ..llm.llm_mapping import get_llm

def expand_query(provider: str, model_name: str, query: str) -> str:
    llm = get_llm(provider=provider, model_name=model_name)

    messages = [
        {
            "role": "user",
            "content": f"""Your task is to expand the query to be more specific and increase recall. Keep the query concise, just add a few extra keywords.
            The query is: {query}

            Only output the rewritten query, no other text or commentary."""
        }
    ]

    return llm.generate(messages)