import { Query } from "./types";
import {
  AgentStatusHandler,
  ConsoleStatusHandler,
} from "@chroma-cookbooks/agent-framework";
import { BCPAgentTypes } from "./schemas";

export interface BCPAgentStatusHandler extends AgentStatusHandler<BCPAgentTypes> {
  onQueryUpdate(query: Query): void;
}

export class BCPAgentConsoleStatusHandler
  extends ConsoleStatusHandler<BCPAgentTypes>
  implements BCPAgentStatusHandler
{
  onQueryUpdate(query: Query) {
    console.log(`
    Query ${query.id}:
    ${query.content}
    
    Answer: ${query.answer}
    `);
  }
}
