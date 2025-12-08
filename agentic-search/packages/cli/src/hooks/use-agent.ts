import { CLIFlags } from "@/cli";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AgentError,
  Answer,
  BCPAgentStatusHandler,
  BrowseCompPlusAgent,
  Evaluation,
  getToolParamsSymbol,
  LLMFactory,
  Outcome,
  Query,
  Step,
  ToolCall,
} from "@agentic-search/bcp-agent";

export function useAgent({
  queryId,
  flags,
}: {
  queryId: string;
  flags: CLIFlags;
}) {
  const [appStatus, setAppStatus] = useState<string>("");
  const [query, setQuery] = useState<Query | null>(null);
  const [queryPlan, setQueryPlan] = useState<Step[]>([]);
  const [assistantMessages, setAssistantMessages] = useState<string[]>([]);
  const [result, setResult] = useState<Answer | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    class CLIStatusHandler implements BCPAgentStatusHandler {
      onPlanUpdate(queryPlan: Step[]) {
        setQueryPlan([...queryPlan]);
      }

      onAssistantUpdate(message: string) {
        setAssistantMessages((prevMessages) => [...prevMessages, message]);
      }

      onToolCall(args: {
        toolCall: ToolCall;
        toolParams: any;
        reason?: string;
      }) {
        const message = `I am calling ${args.toolCall.name}(${getToolParamsSymbol(args.toolParams)})\n${args.reason ? args.reason : ""}`;
        setAssistantMessages((prevMessages) => [...prevMessages, message]);
      }

      onStepOutcome(outcome: Outcome) {
        setAssistantMessages((prevMessages) => [
          ...prevMessages,
          outcome.summary,
        ]);
      }

      onPlanEvaluation(evaluation: Evaluation) {
        setAssistantMessages((prevMessages) => [
          ...prevMessages,
          evaluation.reason,
        ]);
      }

      onQueryUpdate(query: Query) {
        setQuery(query);
      }
    }

    async function runAgent() {
      // TODO: remove hardcoded provider model
      const provider = flags.provider || "openai";
      const model = flags.model || "gpt-4o-mini";
      const maxPlanSize = flags.maxPlanSize;

      const cliStatusHandler = new CLIStatusHandler();

      const agent = await BrowseCompPlusAgent.create({
        llmConfig: {
          provider: LLMFactory.parseLLMProvider(provider),
          model,
        },
        statusHandler: cliStatusHandler,
      });

      const finalAnswer = await agent.answer({
        queryId,
        maxPlanSize,
        signal: abortController.signal,
      });

      setResult(finalAnswer);
      setAppStatus("Done!");
    }

    runAgent().catch((error) => {
      if (abortController.signal.aborted) {
        return;
      }
      const message =
        error instanceof AgentError
          ? `${error.message}. ${error.cause instanceof Error ? error.cause.message : ""}`
          : "Unknown error";
      setError(message);
    });

    return () => {
      abortController.abort();
    };
  }, [queryId, flags]);

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  return {
    appStatus,
    query,
    queryPlan,
    assistantMessages,
    result,
    error,
    cancel,
  };
}
