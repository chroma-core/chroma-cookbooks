import { v4 as uuidv4 } from "uuid";
import {
  AgentStatusHandler,
  BaseComponentConfig,
  Context,
  getCollection,
  LLMMessage,
  LLMRole,
  LLMService,
  Memory,
  Tool,
} from "@chroma-cookbooks/agent-framework/src";
import { InboxAgentTypes } from "./types";
import { Collection } from "chromadb";
import { z, ZodObject, ZodTypeAny } from "zod";
import { InboxAgentError } from "./errors";

const consolidationSchema = z.object({
  rulesToDelete: z
    .array(z.string())
    .optional()
    .nullable()
    .describe("The IDs of existing rules to be deleted, due to replacement"),
  newRules: z
    .array(z.string())
    .optional()
    .nullable()
    .describe("New rules to add"),
});

type Consolidation = z.infer<typeof consolidationSchema>;

export class InboxMemory implements Memory<InboxAgentTypes> {
  static COLLECTION_NAME = "inbox-agent-memory";
  private collection: Collection | undefined;
  private llmService: LLMService;
  private statusHandler: AgentStatusHandler<InboxAgentTypes> | undefined;
  tools: Tool[];

  constructor(config: BaseComponentConfig<InboxAgentTypes>) {
    this.tools = [
      new MemorySearchTool({
        getCollection: this.getMemoriesCollection.bind(this),
      }),
    ];
    this.llmService = config.agentServices.llmService;
    this.statusHandler = config.agentServices.statusHandler;
  }

  private async getMemoriesCollection(): Promise<Collection> {
    if (!this.collection) {
      this.collection = await getCollection({
        name: InboxMemory.COLLECTION_NAME,
      });
    }
    return this.collection;
  }

  async extractFromRun(config: {
    context: Context<InboxAgentTypes>;
  }): Promise<void> {
    this.statusHandler?.onAssistantUpdate?.("Updating memory...");

    const runMemories = config.context.history
      .map((outcome) => outcome.derivedRules)
      .flat()
      .filter((rule) => typeof rule === "string");

    if (runMemories.length === 0) {
      return;
    }

    const storedMemories = await this.getMemoriesCollection();
    const records = await storedMemories.get();
    const memories = records
      .rows()
      .filter((record) => typeof record.document === "string")
      .map((record) => `ID: ${record.id}\n${record.document}`);

    const messages: LLMMessage[] = [
      {
        role: LLMRole.System,
        content: `You are an inbox assistant that manages the user's email processing rules.

## Inputs
You will receive:
1. **Existing rules**: The user's current inbox processing rules
2. **New rules**: Rules generated from the latest session

## Your Task
Merge these into a single, optimized ruleset. For each new rule:

- **Match** - If a derived rule matches an existing one, do nothing.
- **No conflict**: Add the new derived rule to the final ruleset
- **Conflict with existing rule**: Create a single merged rule that incorporates the intent of both, mark the existing rule for deletion.
- **Improves an existing rule**: Mark the existing rule for deletion, and add the new rule

Rules should be self contained and include all the information needed to process an email. For example, if a rule says: For X, do
A if B, or C if D. You should have 2 separate rules: For X and B, do A. For X and D do C.
`,
      },
      {
        role: LLMRole.User,
        content: `Existing rules: ${memories.join("\n")}\n\nDerived rules: ${runMemories.join("\n")}`,
      },
    ];

    const consolidation =
      await this.llmService.getStructuredOutput<Consolidation>({
        messages,
        schema: consolidationSchema,
        schemaName: "consolidation",
      });

    if (consolidation.rulesToDelete && consolidation.rulesToDelete.length > 0) {
      await storedMemories.delete({ ids: consolidation.rulesToDelete });
    }

    if (consolidation.newRules && consolidation.newRules.length > 0) {
      await storedMemories.add({
        ids: consolidation.newRules.map((_) => uuidv4()),
        documents: consolidation.newRules,
        metadatas: consolidation.newRules.map((_) => ({
          type: "instruction",
          createdBy: "assistant",
        })),
      });
    }
  }
}

export const memorySearchToolParamsSchema = z.object({
  query: z.string().describe("The search query to submit"),
});

export type MemorySearchToolParams = z.infer<
  typeof memorySearchToolParamsSchema
>;

export class MemorySearchTool implements Tool<MemorySearchToolParams, string> {
  private readonly getCollection: () => Promise<Collection>;
  id: string = "search_memory";
  name: string = "Search Memory";
  description: string = "Search memory for inbox-processing rules";
  parametersSchema: ZodObject<any> = memorySearchToolParamsSchema;
  resultSchema: ZodTypeAny = z.string();

  constructor({ getCollection }: { getCollection: () => Promise<Collection> }) {
    this.getCollection = getCollection;
  }

  async execute(parameters: MemorySearchToolParams): Promise<string> {
    const collection = await this.getCollection();
    try {
      const records = await collection.query({
        queryTexts: [parameters.query],
      });

      if (!records.rows()[0]) {
        return "No results found.";
      }

      return records
        .rows()[0]
        .map((record) => record.document)
        .filter((doc) => typeof doc === "string")
        .join("\n\n");
    } catch (e) {
      throw new InboxAgentError("Failed to fetch memory records", e);
    }
  }

  format(result: string): string | undefined {
    return result;
  }
}
