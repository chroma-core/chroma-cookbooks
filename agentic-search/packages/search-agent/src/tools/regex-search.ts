import { z } from "zod";
import { Collection, K, Search } from "chromadb";
import { ChromaTool, ChromaToolResult } from "./chroma-tool";
import { processSearchResults } from "./utils";

const parametersSchema = z.object({
  pattern: z.string().describe("The regex pattern to match for."),
});

export class RegexSearchTool extends ChromaTool {
  private collection: Collection;

  constructor(collection: Collection) {
    super({
      id: "regex_search",
      name: "Regex Search",
      description: "Regex search to find matching content in documents",
      parameters: parametersSchema,
    });
    this.collection = collection;
  }

  public async execute(
    parameters: z.infer<typeof parametersSchema>,
  ): Promise<ChromaToolResult> {
    const search = new Search()
      .where(K("query").ne(true).and(K.DOCUMENT.regex(parameters.pattern)))
      .limit(5)
      .select(K.DOCUMENT, K.METADATA);

    const start = performance.now();
    const results = await this.collection.search(search);
    const end = performance.now();

    return {
      records: processSearchResults(results),
      latency: `${(end - start).toFixed(2)} ms`,
    };
  }
}
