import {
  AgentStatusHandler,
  ConsoleStatusHandler,
} from "@agentic-search/base-agent";
import { Query } from "./types";

export interface SearchAgentStatusHandler extends AgentStatusHandler {
  onQueryUpdate(query: Query): void;
}

export class SearchAgentConsoleStatusHandler
  extends ConsoleStatusHandler
  implements SearchAgentStatusHandler
{
  onQueryUpdate(query: Query) {
    console.log(`
    Query ${query.id}:
    ${query.content}
    
    Answer: ${query.answer}
    `);
  }
}
