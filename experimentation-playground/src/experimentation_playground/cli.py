import click
import json
import os
import chromadb
import dotenv
from pathlib import Path

from .run import Run
from .embed.embed_mapping import get_embedder
from .rewrite_query.rewrite_mapping import get_rewriter
from .rerank_results.rerank_mapping import get_reranker
from .visualize.visualize_run import visualize_run
from .visualize.visualize_sweep import visualize_sweep

dotenv.load_dotenv()

@click.group()
def cli():
    pass

@cli.command('single')
@click.option('--run-id', required=True)
@click.option('--embed-method', required=True)
@click.option('--rewrite-method', default=None)
@click.option('--rerank-method', default=None)
@click.option('--collection', required=True)
@click.option('--data-dir', default='data/experimentation-playground-sample-data')
def run_experiment(run_id: str, embed_method: str, rewrite_method: str, rerank_method: str, collection: str, data_dir: str):
    click.echo(f"Starting run: {run_id}")

    data_path = Path(data_dir)
    id_to_chunk = json.load(open(data_path / "id_to_chunk.json"))
    id_to_query = json.load(open(data_path / "id_to_query.json"))
    query_to_chunk = json.load(open(data_path / "query_to_chunk.json"))

    chroma_client = chromadb.CloudClient(
        api_key=os.getenv("CHROMA_API_KEY"),
        tenant=os.getenv("CHROMA_TENANT"),
        database=os.getenv("CHROMA_DATABASE")
    )

    embed_parts = embed_method.split(":")
    embed_type = embed_parts[0]
    embed_provider = embed_parts[1] if len(embed_parts) > 1 else None
    embed_model = embed_parts[2] if len(embed_parts) > 2 else None

    embedder = get_embedder(embed_type, chroma_client, collection, embed_provider, embed_model)

    config = {
        "embed_method": embed_method,
        "rewrite_method": rewrite_method,
        "rerank_method": rerank_method,
        "collection": collection,
        "data_dir": data_dir,
    }

    rewriter = None
    rewriter_args = None
    if rewrite_method:
        rewrite_parts = rewrite_method.split(":")
        rewrite_type = rewrite_parts[0]
        rewrite_provider = rewrite_parts[1]
        rewrite_model = rewrite_parts[2]
        rewriter = get_rewriter(rewrite_type)
        rewriter_args = {"provider": rewrite_provider, "model_name": rewrite_model}

    reranker = None
    if rerank_method:
        rerank_parts = rerank_method.split(":")
        rerank_type = rerank_parts[0]
        rerank_model = rerank_parts[1]
        reranker = get_reranker(rerank_type, rerank_model)

    run = Run(
        run_id=run_id,
        embedder=embedder,
        id_to_chunk=id_to_chunk,
        id_to_query=id_to_query,
        query_to_chunk=query_to_chunk,
        config=config,
        rewriter=rewriter,
        rewriter_args=rewriter_args,
        reranker=reranker,
    )

    results = run.run()

    click.echo(f"✓ Run complete: {run_id}")

    json_path = f"results/{run_id}.json"
    html_path = f"results/{run_id}.html"

    click.echo(f"Results saved to: {json_path}")

    # Generate visualization
    visualize_run(json_path, html_path)
    click.echo(f"Visualization saved to: {html_path}")

    metrics = results.get('metrics', {})
    click.echo(f"Recall@1: {metrics.get('Recall@1', 'N/A')}")
    click.echo(f"Recall@5: {metrics.get('Recall@5', 'N/A')}")
    click.echo(f"Recall@10: {metrics.get('Recall@10', 'N/A')}")

@cli.command('sweep')
@click.option('--config', required=True, type=click.Path(exists=True))
def run_sweep(config: str):
    click.echo(f"Starting sweep from config: {config}")

    with open(config) as f:
        sweep_config = json.load(f)

    data_dir = sweep_config.get('data_dir', 'data/experimentation-playground-sample-data')
    data_path = Path(data_dir)
    id_to_chunk = json.load(open(data_path / "id_to_chunk.json"))
    id_to_query = json.load(open(data_path / "id_to_query.json"))
    query_to_chunk = json.load(open(data_path / "query_to_chunk.json"))

    chroma_client = chromadb.CloudClient(
        api_key=os.getenv("CHROMA_API_KEY"),
        tenant=os.getenv("CHROMA_TENANT"),
        database=os.getenv("CHROMA_DATABASE")
    )

    output_dir = sweep_config.get('output_dir', 'results/sweeps')
    runs = sweep_config.get('runs', [])

    for run_config in runs:
        run_id = run_config['run_id']
        click.echo(f"\n→ Running: {run_id}")

        embed_method = run_config['embed_method']
        embed_parts = embed_method.split(":")
        embed_type = embed_parts[0]
        embed_provider = embed_parts[1] if len(embed_parts) > 1 else None
        embed_model = embed_parts[2] if len(embed_parts) > 2 else None

        collection = run_config['collection']
        embedder = get_embedder(embed_type, chroma_client, collection, embed_provider, embed_model)

        config_obj = {
            "embed_method": embed_method,
            "rewrite_method": run_config.get('rewrite_method'),
            "rerank_method": run_config.get('rerank_method'),
            "collection": collection,
            "data_dir": data_dir,
        }

        rewriter = None
        rewriter_args = None
        if run_config.get('rewrite_method'):
            rewrite_method = run_config['rewrite_method']
            rewrite_parts = rewrite_method.split(":")
            rewrite_type = rewrite_parts[0]
            rewrite_provider = rewrite_parts[1]
            rewrite_model = rewrite_parts[2]
            rewriter = get_rewriter(rewrite_type)
            rewriter_args = {"provider": rewrite_provider, "model_name": rewrite_model}

        reranker = None
        if run_config.get('rerank_method'):
            rerank_method = run_config['rerank_method']
            rerank_parts = rerank_method.split(":")
            rerank_type = rerank_parts[0]
            rerank_model = rerank_parts[1]
            reranker = get_reranker(rerank_type, rerank_model)

        run = Run(
            run_id=run_id,
            embedder=embedder,
            id_to_chunk=id_to_chunk,
            id_to_query=id_to_query,
            query_to_chunk=query_to_chunk,
            config=config_obj,
            rewriter=rewriter,
            rewriter_args=rewriter_args,
            reranker=reranker,
        )

        results = run.run(output_dir=output_dir)

        metrics = results.get('metrics', {})
        click.echo(f"  ✓ Recall@1: {metrics.get('Recall@1', 'N/A')}")
        click.echo(f"  ✓ Recall@5: {metrics.get('Recall@5', 'N/A')}")
        click.echo(f"  ✓ Recall@10: {metrics.get('Recall@10', 'N/A')}")

    click.echo(f"\n✓ Sweep complete!")
    click.echo(f"Results saved to: {output_dir}/")

    # Generate sweep visualization
    sweep_html_path = f"{output_dir}/sweep_visualization.html"
    visualize_sweep(output_dir, sweep_html_path)
    click.echo(f"Sweep visualization saved to: {sweep_html_path}")

if __name__ == '__main__':
    cli()
