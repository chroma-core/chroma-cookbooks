import { z } from "zod";
import { Tool } from "@agentic-search/base-agent";
import { Collection, K, Search } from "chromadb";
import { processRecords } from "./utils";

const parametersSchema = z.object({
  pattern: z.string().describe("The regex pattern to match for."),
});

export class RegexSearchTool extends Tool {
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
  ): Promise<string> {
    const search = new Search()
      .where(K("query").ne(true).and(K.DOCUMENT.regex(parameters.pattern)))
      .limit(5)
      .select(K.DOCUMENT, K.METADATA);

    const records = await this.collection.search(search);

    return processRecords(records);
  }
}
