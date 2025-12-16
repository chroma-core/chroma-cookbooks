# Agentic Memory

This project is a demo of how to build an AI-powered agent with persistent memory. The system is built on a general-purpose **`BaseAgent`** that provides a framework for multistep query planning, dynamic tool calling, and reflective evaluation.

The `BaseAgent` is configured with custom components, prompts, and services to build an inbox-processing agent. Given an `InboxService` (an interface to interact with an email provider), it fetches unread emails and processes them by user-defined rules. If the agent does not know how to process an email it will prompt the user for instructions, and persist those in its memory. On future runs, the agent uses the persistent memory to automatically process emails for which the user provided instructions in previous runs.

You can learn more about this project by visiting the accompanying [guide](https://docs.trychroma.com/guides/build/agentic-memory)

## Core Concepts

### The Base Agent: A General Agentic Framework

The `agent-framework` package is the core engine of this project. It is designed to be domain-agnostic and provides the fundamental building blocks for an agentic system:

* **Query Planning:** The `Planner` first decomposes a complex user query into a logical, multistep plan.
* **Tool Calling:** The agent is equipped with a set of tools it can call. The `Executor` handles the logic for managing tool definitions, calling them with the correct arguments, and processing their outputs.
* **Evaluation & Reflection:** After each step, the `Evaluator` evaluates its progress. It decides whether to continue with the original plan, finalize an answer, or override the plan entirely based on new information.
* The agent framework contains services for LLM-interaction, I/O, prompts, and more, that can be defined at the framework level and inherited by components, or defined per component.

### The InboxAgent: A Specific Implementation

The `inbox-agent` package is the application-specific implementation that configures the framework to become an inbox-processing agent:

* The `InboxService` is an interface for interacting with a user's inbox. This project is wired to work with mock data in a Chroma Cloud collection.
* The `Planner` here overrides the framework's `BasePlanner`. It simply fetches all unread emails using the `InboxService`. Every step of the plan here is dedicated to process a single unread email.
* The `InboxMemory` is a `Memory` implementation for persisting instructions on how to process emails. It provides the agent tools to search over the memory collection.
* The prompts are written to guide the agent in its role as an inbox processing expert.

## Project Structure

The `chroma-cookbooks` repo is a monorepo managed with pnpm workspaces.

* `/agent-framework`
    * Contains the core `BaseAgent` class, which manages the agentic loop (plan, execute, evaluate).
    * Defines the types for tools, plans, and outcomes.
    * Includes the LLM factory for interfacing with different providers like OpenAI.

* `/agentic-memory/packages/inbox-agent`
    * Contains the `InboxAgent` class, which configures a `BaseAgent` for the email processing task.
    * Defines specific components and services to override `BaseAgent`'s default agnetic loop.
    * Includes logic for connecting to a mock inbox on Chroma Cloud, as well as persisting the agent's memory on Chroma Cloud.

* `/agentic-memory/packages/cli`
    * A command-line interface built with **Ink** and React to interact with the `InboxAgent`.
    * It visualizes the agent's full process, including its status, query plan, thoughts, and final answer.

## Usage

This project includes an interactive CLI to run the search agent.

### 1. Get the data

* [Sign up](https://trychroma.com/signup) for a Chroma Cloud account. You will get free credits that should be more than enough for running this project.
* Create a new database, and choose the "load dataset" onboarding flow.
* Chose the "personal-inbox" dataset. This will copy the data into your own Chroma Cloud DB in a new collection.
* On the DB view, go to "Settings" and get your connection credentials at the bottom of the page.

### 2. Environment Variables

Before running the CLI, you must set up your environment variables. The project looks for a `.env` file located in the root directory (i.e., `agentic-memory/.env`).

The following variables are required:
* `CHROMA_API_KEY`: Your API key for Chroma.
* `CHROMA_TENANT`: Your Chroma tenant name.
* `CHROMA_DATABASE`: The Chroma database name.
* `OPENAI_API_KEY`: Your API key for OpenAI.

### 3. Running the CLI

The basic command structure is:
```bash
pnpm cli:dev
```

You can also provide other arguments to the CLI, like modifying the model used, the maximum number of emails to process, and more:

```bash
pnpm cli:dev -m gpt-5
```