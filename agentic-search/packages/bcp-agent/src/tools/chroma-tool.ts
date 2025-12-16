import { z } from "zod";
import { Tool } from "@chroma-cookbooks/agent-framework";

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

export interface ChromaToolConfig {
  id: string;
  name: string;
  description: string;
  parametersSchema: z.ZodObject<any>;
}

export abstract class ChromaTool implements Tool<ChromaToolResult> {
  id: string;
  name: string;
  description: string;
  parametersSchema: z.ZodObject<any>;
  resultSchema: typeof chromaToolResultSchema;

  protected constructor(config: ChromaToolConfig) {
    const { id, name, description, parametersSchema } = config;
    this.id = id;
    this.name = name;
    this.description = description;
    this.resultSchema = chromaToolResultSchema;

    this.parametersSchema = z
      .object({
        numResults: z
          .number()
          .nullable()
          .default(5)
          .describe(
            "The number of result documents to return. Increase the default only when you want to broaden your search",
          ),
        reason: z
          .string()
          .describe(
            "The reason you chose this tool, written in first person. Reference previous tool calls if they influenced your decision.",
          ),
      })
      .extend(parametersSchema.shape);
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

  abstract execute(parameters: any): Promise<ChromaToolResult>;
}
