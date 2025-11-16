import { z } from "zod";
import { Tool } from "@agentic-search/base-agent";
import { Collection, K, Knn, Rrf, Search } from "chromadb";
import { processRecords } from "./utils";

const parametersSchema = z.object({
  denseQuery: z
    .string()
    .describe(
      "Natural-language query capturing the overall meaning of what to retrieve.",
    ),
  sparseQuery: z
    .string()
    .describe(
      "Keyword-style query with important exact terms, dates, and names. Use the same as denseQuery if unsure.",
    ),
  denseWeight: z
    .number()
    .describe(
      "Relative importance of semantic matching. Default: 2.0 if not specified.",
    )
    .optional(),
  sparseWeight: z
    .number()
    .describe(
      "Relative importance of keyword/lexical matching. Default: 1.0 if not specified.",
    )
    .optional(),
});

export class HybridSearchTool extends Tool {
  private collection: Collection;

  constructor(collection: Collection) {
    super({
      id: "hybrid_search",
      name: "Hybrid Search",
      description: `
Hybrid search using both dense (semantic) and sparse (keyword) signals.

Use this when:
- You have a complex constraint-heavy question (dates, places, entities, events).
- You want robustness: match by meaning AND by exact tokens.

Guidelines:
- denseQuery: short natural-language description capturing the overall meaning.
- sparseQuery: focused keywords/numbers/names from the question.
- If unsure, use the SAME text for both queries.
- denseWeight / sparseWeight: usually 2.0 / 1.0 (dense 2x more important). 
  Increase denseWeight to favor semantic similarity; increase sparseWeight to
  favor exact term matches (IDs, dates, names).
`,
      parameters: parametersSchema,
    });
    this.collection = collection;
  }

  public async execute(
    parameters: z.infer<typeof parametersSchema>,
  ): Promise<string> {
    const {
      denseQuery,
      sparseQuery,
      denseWeight = 2.0,
      sparseWeight = 1.0,
    } = parameters;

    const denseRank = Knn({
      query: denseQuery,
      returnRank: true,
      limit: 100,
    });

    const sparseRank = Knn({
      query: sparseQuery,
      key: "sparse_embedding",
      returnRank: true,
      limit: 100,
    });

    const hybridRank = Rrf({
      ranks: [denseRank, sparseRank],
      weights: [denseWeight, sparseWeight],
      k: 60,
    });

    const search = new Search()
      .rank(hybridRank)
      .where(K("query").ne(true))
      .limit(5)
      .select(K.DOCUMENT, K.METADATA);

    const records = await this.collection.search(search);
    return processRecords(records);
  }
}
