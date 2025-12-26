import { AgentError, Tool } from "@chroma-cookbooks/agent-framework";
import { z } from "zod";
import { Collection, QueryRowResult, SearchResultRow } from "chromadb";
import path from "path";
import fs from "fs";
import ignore from "ignore";

export const recordSchema = z.object({
  code: z.string(),
  filePath: z.string(),
});

export type Record = z.infer<typeof recordSchema>;

export const codeSearchToolResultSchema = z.object({
  records: z.array(recordSchema),
});

export type CodeSearchToolResult = z.infer<typeof codeSearchToolResultSchema>;

export interface CodeSearchToolConfig {
  id: string;
  name: string;
  description: string;
  parametersSchema: z.ZodObject<any>;
  collection: Collection;
}

export abstract class CodeSearchTool implements Tool<CodeSearchToolResult> {
  protected collection: Collection;
  id: string;
  name: string;
  description: string;
  parametersSchema: z.ZodObject<any>;
  resultSchema: typeof codeSearchToolResultSchema;

  protected constructor(config: CodeSearchToolConfig) {
    const { id, name, description, parametersSchema, collection } = config;
    this.id = id;
    this.name = name;
    this.description = description;
    this.resultSchema = codeSearchToolResultSchema;
    this.collection = collection;

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

  protected processResults(
    results: QueryRowResult<{ filePath: string }>[],
  ): Record[] {
    return results.map((result) => {
      if (!result.document || !result.metadata?.filePath) {
        throw new AgentError(
          `Corrupted record ${result.id} has no document or metadata`,
        );
      }
      return {
        code: result.document,
        filePath: result.metadata.filePath,
      };
    });
  }

  format(result: CodeSearchToolResult): string {
    const { records } = result;

    if (records.length === 0) {
      return "No records found";
    }

    return records
      .map(
        (record) => `// ${record.filePath}
${record.code}`,
      )
      .join("\n\n");
  }

  abstract execute(parameters: any): Promise<CodeSearchToolResult>;
}

export class SymbolSearchTool extends CodeSearchTool {
  constructor(collection: Collection) {
    super({
      id: "code_symbol_search",
      name: "Symbol Search",
      description:
        "Find symbol declarations/definitions by name. Use for functions, classes, interfaces, enums, or modules.",
      parametersSchema: z.object({
        symbolName: z.string().describe("The symbol name to search"),
      }),
      collection,
    });
  }

  async execute({
    symbolName,
  }: {
    symbolName: string;
  }): Promise<CodeSearchToolResult> {
    const results = await this.collection.get<{ filePath: string }>({
      where: { symbolName },
    });
    return { records: this.processResults(results.rows()) };
  }
}

export class RegexSearchTool extends CodeSearchTool {
  constructor(collection: Collection) {
    super({
      id: "regex_search",
      name: "Regex Search",
      description: "Run regex search on the codebase.",
      parametersSchema: z.object({
        pattern: z.string().describe("Regex pattern to match for"),
      }),
      collection,
    });
  }

  async execute({
    pattern,
  }: {
    pattern: string;
  }): Promise<CodeSearchToolResult> {
    const results = await this.collection.get<{ filePath: string }>({
      whereDocument: { $regex: pattern },
    });
    return { records: this.processResults(results.rows()) };
  }
}

export class SemanticSearchTool extends CodeSearchTool {
  constructor(collection: Collection) {
    super({
      id: "semantic_search",
      name: "Semantic Search",
      description:
        "Run semantic search on the codebase. Useful for running general queries like 'how is auth implemented'",
      parametersSchema: z.object({
        query: z.string().describe("The semantic search query to run"),
      }),
      collection,
    });
  }

  async execute({ query }: { query: string }): Promise<CodeSearchToolResult> {
    const results = await this.collection.query<{ filePath: string }>({
      queryTexts: [query],
    });
    return { records: this.processResults(results.rows()[0]) };
  }
}

export class GetFileTool implements Tool<{
  content: string;
  filePath: string;
}> {
  private collection: Collection;
  id: string = "get_file";
  name: string = "Get File";
  description: string = "Get the contents of the file";
  parametersSchema = z.object({
    filePath: z.string().describe("The file pat to retrieve"),
  });
  resultSchema = z.object({
    filePath: z.string(),
    content: z.string(),
  });

  constructor(collection: Collection) {
    this.collection = collection;
  }

  async execute({
    filePath,
  }: {
    filePath: string;
  }): Promise<{ content: string; filePath: string }> {
    const results = await this.collection.get<{ startLine: number }>({
      where: { filePath },
    });

    if (results.ids.length === 0) {
      throw new AgentError(`No file with path ${filePath} found`);
    }

    const records = results.rows().map((result) => {
      if (!result.document || !result.metadata?.startLine) {
        throw new AgentError(`Corrupted record ${result.id} has no document`);
      }

      return {
        content: result.document,
        startLine: result.metadata.startLine,
      };
    });

    return {
      content: records
        .sort((a, b) => a.startLine - b.startLine)
        .map((record) => record.content)
        .join("\n"),
      filePath,
    };
  }

  format({ content, filePath }: { content: string; filePath: string }): string {
    return `// ${filePath}\n\n${content}`;
  }
}

export class ListFilesTool implements Tool<{ files: string }> {
  private readonly rootPath: string;
  id: string = "list_files";
  name: string = "List Files";
  description: string = "List all the files in this repository.";
  parametersSchema = z.object({});
  resultSchema = z.object({ files: z.string() });

  constructor(rootPath: string) {
    this.rootPath = rootPath;
  }

  async execute(): Promise<{ files: string }> {
    const ig = ignore();
    ig.add(".git");

    const gitignore = path.join(this.rootPath, ".gitignore");
    if (fs.existsSync(gitignore)) {
      const content = await fs.promises.readFile(gitignore, "utf8");
      ig.add(content);
    }

    const lines: string[] = [path.basename(this.rootPath)];

    const walkDir = async (root: string, rel: string, prefix: string) => {
      const abs = path.join(root, rel);

      const entries = await fs.promises
        .readdir(abs, { withFileTypes: true })
        .catch(() => []);

      const items = entries
        .map((d) => ({ name: d.name, isDir: d.isDirectory() }))
        .sort((a, b) => a.name.localeCompare(b.name))
        .filter(({ name, isDir }) => {
          const relPath = rel ? path.posix.join(rel, name) : name;
          return !ig.ignores(isDir ? relPath + "/" : relPath);
        });

      for (let i = 0; i < items.length; i++) {
        const { name, isDir } = items[i];
        const isLast = i === items.length - 1;
        const branch = isLast ? "└── " : "├── ";
        const childPrefix = prefix + (isLast ? "    " : "│   ");

        lines.push(prefix + branch + name);
        if (isDir) {
          await walkDir(root, rel ? path.join(rel, name) : name, childPrefix);
        }
      }
    };

    await walkDir(this.rootPath, "", "");
    return { files: lines.join("\n") };
  }

  format({ files }: { files: string }): string {
    return files;
  }
}
