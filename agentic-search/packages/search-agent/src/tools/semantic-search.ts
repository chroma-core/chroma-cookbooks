import { Tool } from "@agentic-search/base-agent";
import { z } from "zod";
import { Collection } from "chromadb";
import { processRecords } from "./utils";

const parametersSchema = z.object({
  query: z
    .string()
    .describe(
      "A short natural-language phrase or sentence describing the meaning of what to search for",
    ),
});

export class SemanticSearchTool extends Tool {
  private collection: Collection;

  constructor(collection: Collection) {
    super({
      id: "semantic_search",
      name: "Semantic Search",
      description:
        "Dense-vector semantic search. Use this when you want to find documents that are **conceptually related** to a natural-language question or idea",
      parameters: parametersSchema,
    });
    this.collection = collection;
  }

  public async execute(
    parameters: z.infer<typeof parametersSchema>,
  ): Promise<string> {
    const records = await this.collection.query<{ doc_id: string }>({
      queryTexts: [parameters.query],
      where: { query: { $ne: true } },
      nResults: 5,
    });

    return processRecords(records);
  }
}
