# Agentic Search

This project is a demo of how to build an AI-powered search agent from scratch. The system is built on a general-purpose **`base-agent`** that provides a framework for multistep query planning, dynamic tool calling, and reflective evaluation.

This general framework is then extended by a **`search-agent`** which implements the agentic system for a specific task: answering complex queries over the [Browse-Comp-Plus benchmark](https://github.com/texttron/BrowseComp-Plus). A subset of the benchmark data is indexed in a [Chroma Cloud](https://trychroma.com) collection, and the agent uses a suite of search tools to find and synthesize information.

You can learn more about this project by visiting the accompanying [guide](https://docs.trychroma.com/guides/build/agentic-search)

## Core Concepts

### The Base Agent: A General Agentic Framework

The `base-agent` package is the core engine of this project. It is designed to be domain-agnostic and provides the fundamental building blocks for an agentic system:

* **Query Planning:** The agent first decomposes a complex user query into a logical, multistep plan.
* **Tool Calling:** The agent is equipped with a set of tools it can call. The `BaseAgent` class handles the logic for managing tool definitions, calling them with the correct arguments, and processing their outputs.
* **Evaluation & Reflection:** After each step, the agent evaluates its progress. It decides whether to continue with the original plan, finalize an answer, or override the plan entirely based on new information.

### The Search Agent: A Specific Implementation

The `search-agent` package is the application-specific implementation that extends the `BaseAgent`. It is tailored for the search task with:

* **Targeted Tools:** It provides a set of search tools, using the Chroma API.
* **Specialized Prompts:** The prompts are written to guide the agent in its role as a search expert, helping it create effective search strategies and synthesize answers from document snippets.
* **Data Source:** The agent is configured to work specifically with the Browse-Comp-Plus collection indexed in Chroma.

## Project Structure

This project is a monorepo managed with pnpm workspaces.

* `/packages/base-agent`
    * Contains the core `BaseAgent` class, which manages the agentic loop (plan, execute, evaluate).
    * Defines the types for tools, plans, and outcomes.
    * Includes the LLM factory for interfacing with different providers like OpenAI.

* `/packages/search-agent`
    * Contains the `SearchAgent` class, which extends `BaseAgent`.
    * Defines the specific search tools (`hybrid`, `semantic`, etc.) that interface with Chroma Cloud.
    * Includes logic for connecting to and querying the Chroma database.

* `/packages/cli`
    * A command-line interface built with **Ink** and React to interact with the `SearchAgent`.
    * It visualizes the agent's full process, including its status, query plan, thoughts, and final answer.

## Usage

This project includes an interactive CLI to run the search agent.

### 1. Get the data

* [Sign up](https://trychroma.com/signup) for a Chroma Cloud account. You will get free credits that should be more than enough for running this project.
* Create a new database, and choose the "load dataset" onboarding flow.
* Chose the "BrowseCompPlus" dataset. This will copy the data into your own Chroma Cloud DB in a new collection.
* On the DB view, go to "Settings" and get your connection credentials at the bottom of the page.

### 2. Environment Variables

Before running the CLI, you must set up your environment variables. The project looks for a `.env` file located in the root directory (i.e., `agentic-search/.env`).

The following variables are required:
* `CHROMA_API_KEY`: Your API key for Chroma.
* `CHROMA_TENANT`: Your Chroma tenant name.
* `CHROMA_DATABASE`: The Chroma database name.
* `OPENAI_API_KEY`: Your API key for OpenAI.

### 3. Running the CLI

The basic command structure is:
```bash
pnpm cli:dev <query-id>
```

**Example:**
```bash
pnpm cli:dev 769
```

You can also provide other arguments to the CLI, like modifying the model used, the size of the query plan, and more:

```bash
pnpm cli:dev 770 -m gpt-5 --max-plan-size 10
```