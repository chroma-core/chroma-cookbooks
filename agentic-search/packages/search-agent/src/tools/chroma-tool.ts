import { Tool, ToolArgs } from "@agentic-search/base-agent";
import { z } from "zod";

export const chromaRecordSchema = z.object({
  id: z.string(),
  docId: z.string(),
  document: z.string(),
});

export type ChromaRecord = z.infer<typeof chromaRecordSchema>;

export const chromaToolResultSchema = z.object({
  records: z.array(chromaRecordSchema),
  latency: z.string(),
});

export type ChromaToolResult = z.infer<typeof chromaToolResultSchema>;

export abstract class ChromaTool extends Tool<ChromaToolResult> {
  protected constructor(args: ToolArgs<ChromaToolResult>) {
    super(args);
    this.parameters = this.parameters.extend({
      numResults: z
        .number()
        .nullable()
        .default(5)
        .describe(
          "The number of result documents to return. Increase the default only when you want to broaden your search",
        ),
    });
  }

  format(result: ChromaToolResult): string {
    const { records } = result;

    if (records.length === 0) {
      return "No records found";
    }

    return records
      .map(
        (record) => `// Document ${record.id}
// Corpus document ID: ${record.docId}
${record.document}`,
      )
      .join("\n\n");
  }
}
