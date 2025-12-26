# Code Search Agent

An agentic code search tool that indexes Git repositories to Chroma Cloud and to power an AI-agent to answer questions about your codebase. The agent creates a query plan, executes searches using multiple strategies (semantic, symbol, regex), and synthesizes answers grounded in actual code.

## Use Case

Ask natural language questions about any codebase:

- "How is authentication implemented?"
- "Where is the database connection configured?"
- "What does the UserService class do?"

The agent will search through your indexed code and provide answers with references to specific files and symbols.

## Prerequisites

- Node.js 22 (see `.nvmrc` in repo root)
- pnpm
- A [Chroma Cloud](https://trychroma.com) account (free tier available)
- An [OpenAI API key](https://platform.openai.com/api-keys)

## Setup

1. Install dependencies from the monorepo root:
   ```bash
   pnpm install
   ```

2. Create a `.env` file in the `code-search` directory:
   ```
   CHROMA_API_KEY=your_api_key
   CHROMA_TENANT=your_tenant
   CHROMA_DATABASE=your_database
   OPENAI_API_KEY=your_openai_key
   ```

3. Run the CLI:
   ```bash
   cd code-search
   pnpm cli:dev "Your question about the code" --path /path/to/repository
   ```

## CLI Usage

```
Usage:
    $ code-search <query> [options]

Arguments:
    query                  The question to ask about the codebase

Options:
    --path, -p             Path to the repository to search (Default: current directory)
    --provider             Specify the LLM provider to use (Default: openai)
    --model, -m            Specify the model to use (Default: gpt-4o-mini)
    --max-plan-size        Max number of steps in the query plan (Default: 10)
    --max-step-iterations  Max iterations per step (Default: 5)

Examples:
    $ pnpm dev "How is authentication implemented?" --path ./my-project
    $ pnpm dev "What does the UserService class do?" -m gpt-4o
```

## How It Works

### Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Repository    │────▶│     Indexer     │────▶│  Chroma Cloud   │
│   (Git repo)    │     │  (chunks code)  │     │  (stores vectors)│
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     Answer      │◀────│   Code Search   │◀────│    LLM Agent    │
│                 │     │     Agent       │     │  (plans & searches)
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Indexing Pipeline

The indexer processes your repository in several stages:

#### 1. Repository Walking

The indexer walks through the repository, respecting `.gitignore` rules:

```
repository/
├── src/
│   ├── auth/           ✓ indexed
│   └── utils/          ✓ indexed
├── node_modules/       ✗ ignored
└── .git/               ✗ ignored
```

#### 2. Code Chunking with Tree-sitter

Files are parsed using [tree-sitter](https://tree-sitter.github.io/tree-sitter/) to understand code structure. The chunker extracts semantic units:

- **Functions** and **methods**
- **Classes** and **interfaces**
- **Type definitions** and **enums**
- **Export statements**

Each chunk preserves:
- File path and line numbers
- Symbol name (function/class name)
- Language type
- The actual code content

Chunks are sized to fit within token limits (8192 tokens) while respecting semantic boundaries—a function won't be split mid-definition.

**Currently supported languages:** TypeScript (`.ts`, `.tsx`)

#### 3. Embedding and Storage

Chunks are embedded using OpenAI's `text-embedding-3-large` model and stored in Chroma collections. Each collection is named after the Git commit hash it represents.

#### 4. Incremental Indexing

The indexer tracks which commits have been indexed:

```
┌─────────────────────────────────────────────────────────┐
│                   Commits Collection                     │
├─────────────────────────────────────────────────────────┤
│  abc123 (latest: false)  ──▶  Collection: abc123        │
│  def456 (latest: true)   ──▶  Collection: def456        │
└─────────────────────────────────────────────────────────┘
```

When you run a query:

1. **If no index exists:** Full repository indexing
2. **If index exists but outdated:**
   - Compute diff between indexed commit and HEAD
   - Fork the existing collection
   - Remove changed/deleted files
   - Re-index only modified and added files
3. **If working tree has uncommitted changes:**
   - Create a temporary "dirty" collection
   - Apply working tree diff to the latest commit's collection

This means re-indexing a large repository after small changes is fast—only the changed files are processed.

### Agent Execution

Once indexed, the agent answers your query through a multi-step process:

#### 1. Planning

The LLM creates a query plan with logical steps:

```
Query: "How is authentication implemented?"

Plan:
1. Search for authentication-related services and modules
2. Find the main auth entry points and middleware
3. Trace the authentication flow from request to response
4. Identify token/session management
```

#### 2. Step Execution

For each step, the agent has access to these tools:

| Tool | Description |
|------|-------------|
| **Semantic Search** | Vector similarity search for conceptual queries |
| **Symbol Search** | Exact match on function/class/interface names |
| **Regex Search** | Pattern matching across the codebase |
| **Get File** | Retrieve full file contents |
| **List Files** | Show repository structure |

The agent iterates within each step, calling tools until it has enough information.

#### 3. Evaluation

After executing steps, the agent evaluates progress:

- **Continue:** Proceed with remaining steps
- **Break:** Enough evidence found, skip to answer
- **Override:** Revise the plan based on discoveries

#### 4. Answer Synthesis

Finally, the agent synthesizes an answer grounded in the actual code found, referencing specific files and symbols.

## Project Structure

```
code-search/
├── packages/
│   ├── code-agent/          # Core agent implementation
│   │   └── src/
│   │       ├── agent.ts     # CodeSearchAgent class
│   │       ├── tools.ts     # Search tools
│   │       ├── schemas.ts   # Zod schemas for steps/outcomes
│   │       ├── prompts.ts   # LLM prompts
│   │       ├── chunker/     # Tree-sitter code parsing
│   │       ├── indexer/     # Chroma indexing logic
│   │       └── repository/  # Git abstraction
│   └── cli/                 # Terminal UI (Ink/React)
│       └── src/
│           ├── main.tsx     # Entry point
│           ├── cli.ts       # Argument parsing
│           └── components/  # UI components
├── package.json
└── tsconfig.base.json
```

## Extending Language Support

To add support for a new language:

1. Install the tree-sitter grammar:
   ```bash
   pnpm add tree-sitter-python  # example
   ```

2. Create a language config in `chunker/languages/`:
   ```typescript
   // python.ts
   import Python from "tree-sitter-python";

   export const pythonConfig: LanguageConfig = {
     name: "python",
     language: () => Python,
     targetNodes: new Set([
       "function_definition",
       "class_definition",
       // ... other node types
     ]),
   };
   ```

3. Register it in `chunker/languages/index.ts`:
   ```typescript
   export const languageConfigs: Record<string, LanguageConfig> = {
     ".ts": typescriptConfig,
     ".tsx": tsxConfig,
     ".py": pythonConfig,  // add this
   };
   ```
