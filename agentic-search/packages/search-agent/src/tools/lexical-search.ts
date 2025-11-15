import { z } from "zod";
import { Tool } from "@agentic-search/base-agent";
import { Collection, K, Knn, Search } from "chromadb";
import { processRecords } from "@/src/tools/utils";

const parametersSchema = z.object({
  query: z
    .string()
    .describe("A short query comprised of keywords and/or phrases."),
});

export class LexicalSearchTool extends Tool {
  private collection: Collection;

  constructor(collection: Collection) {
    super({
      id: "lexical_search",
      name: "Lexical Search",
      description:
        "Perform sparse-vector lexical search. Use this when you want to find documents that **contain specific words, phrases, names, or numbers**. This search is keyword-based and benefits from including precise terms, dates, places, and entities.",
      parameters: parametersSchema,
    });
    this.collection = collection;
  }

  public async execute(
    parameters: z.infer<typeof parametersSchema>,
  ): Promise<string> {
    const sparseRank = Knn({
      query: parameters.query,
      key: "sparse_embedding",
    });
    const search = new Search()
      .rank(sparseRank)
      .where(K("query").ne(true))
      .limit(5)
      .select(K.DOCUMENT, K.METADATA);
    const records = await this.collection.search(search);
    return processRecords(records);
  }
}
