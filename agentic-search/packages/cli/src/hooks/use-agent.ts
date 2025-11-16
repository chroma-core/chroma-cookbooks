import { CLIFlags } from "@/cli";
import { useEffect, useState } from "react";
import {
  FinalAnswer,
  parseLLMProvider,
  PlanStep,
  Query,
  SearchAgent,
} from "@agentic-search/search-agent";
import { SearchAgentStatusHandler } from "@agentic-search/search-agent/src/status-handler";
import { AgentError } from "@agentic-search/base-agent";

export function useArgent({
  queryId,
  flags,
}: {
  queryId: string;
  flags: CLIFlags;
}) {
  const [appStatus, setAppStatus] = useState<string>("");
  const [query, setQuery] = useState<Query | null>(null);
  const [queryPlan, setQueryPlan] = useState<PlanStep[]>([]);
  const [assistantMessages, setAssistantMessages] = useState<string[]>([]);
  const [result, setResult] = useState<FinalAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    class CLIStatusHandler implements SearchAgentStatusHandler {
      onQueryPlanUpdate(queryPlan: PlanStep[]) {
        setQueryPlan([...queryPlan]);
      }

      onAssistantUpdate(message: string) {
        setAssistantMessages((prevMessages) => [...prevMessages, message]);
      }

      onQueryUpdate(query: Query) {
        setQuery(query);
      }
    }

    async function runAgent() {
      // TODO: remove hardcoded provider model
      const provider = flags.provider || "openai";
      const model = flags.model || "gpt-5-nano";
      const maxPlanSize = flags.maxPlanSize;

      const cliStatusHandler = new CLIStatusHandler();

      const agent = await SearchAgent.create({
        llmConfig: {
          provider: parseLLMProvider(provider),
          model,
        },
        statusHandler: cliStatusHandler,
      });

      const finalAnswer = await agent.answerQuery({
        queryId: queryId,
        maxQueryPlanSize: maxPlanSize,
      });

      setResult(finalAnswer);
      setAppStatus("Done!");
    }

    runAgent().catch((error) => {
      const message =
        error instanceof AgentError
          ? `${error.message}. ${error.cause instanceof Error ? error.cause.message : ""}`
          : "Unknown error";
      setError(message);
    });
  }, [queryId, flags]);

  return { appStatus, query, queryPlan, assistantMessages, result, error };
}
