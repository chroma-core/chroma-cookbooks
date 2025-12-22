# Visualizing Embedding Spaces

This notebook demonstrates how to visualize high-dimensional embedding spaces to analyze and debug RAG pipelines. By projecting embeddings onto a 2D space using UMAP, you can identify clusters, highlight anomalies, and assess data quality.

## Use Case

We use a dataset of customer support messages from Chroma Cloud to show how visualization helps:

- Identify tight vs. scattered retrieval results
- Find gaps in data coverage
- Discover and label topic clusters

## Prerequisites

- Python 3.9+
- A [Chroma Cloud](https://trychroma.com) account (free tier available)
- An [OpenAI API key](https://platform.openai.com/api-keys)

## Setup

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Log in to [Chroma Cloud](https://trychroma.com/login) and create a new database named `visualizations`

3. Choose "Load a sample dataset" and select "Customer support messages"

4. In Settings, generate an API key and copy the `.env` connection variables

5. Create a `.env` file in this directory with your credentials:
   ```
   CHROMA_API_KEY=your_api_key
   CHROMA_TENANT=your_tenant
   CHROMA_DATABASE=visualizations
   OPENAI_API_KEY=your_openai_key
   ```

6. Run the notebook:
   ```bash
   jupyter notebook visualizations.ipynb
   ```

## What You'll Learn

- How to project embeddings using UMAP for visualization
- How to plot queries and their retrieval results in embedding space
- How to identify data coverage gaps
- How to cluster and label embedding regions with an LLM
