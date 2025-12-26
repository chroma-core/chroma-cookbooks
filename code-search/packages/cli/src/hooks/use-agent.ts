import { CLIFlags } from "@/cli";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CodeSearchAgent,
  CodeSearchAgentStatusHandler,
  Answer,
  Step,
  Outcome,
  Evaluation,
} from "@code-search/code-agent";
import {
  AgentError,
  getToolParamsSymbol,
  LLMFactory,
  ToolCall,
} from "@chroma-cookbooks/agent-framework";

export function useAgent({
  query,
  flags,
}: {
  query: string;
  flags: CLIFlags;
}) {
  const [appStatus, setAppStatus] = useState<string>("Initializing...");
  const [queryPlan, setQueryPlan] = useState<Step[]>([]);
  const [assistantMessages, setAssistantMessages] = useState<string[]>([]);
  const [result, setResult] = useState<Answer | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    class CLIStatusHandler implements CodeSearchAgentStatusHandler {
      onIndex() {
        setAppStatus("Indexing repository...");
      }

      onPlanUpdate(queryPlan: Step[]) {
        setAppStatus("Executing plan...");
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
        const message = `Calling ${args.toolCall.name}(${getToolParamsSymbol(args.toolParams)})${args.reason ? `\n${args.reason}` : ""}`;
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
    }

    async function runAgent() {
      const provider = flags.provider || "openai";
      const model = flags.model || "gpt-4o-mini";
      const repoPath = flags.path || process.cwd();
      const maxPlanSize = flags.maxPlanSize;
      const maxStepIterations = flags.maxStepIterations;

      const cliStatusHandler = new CLIStatusHandler();

      const agent = await CodeSearchAgent.create({
        path: repoPath,
        llmConfig: {
          provider: LLMFactory.parseLLMProvider(provider),
          model,
        },
        statusHandler: cliStatusHandler,
      });

      const finalAnswer = await agent.run({
        query,
        maxPlanSize,
        maxStepIterations,
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
          ? `${error.message}${error.cause instanceof Error ? `. ${error.cause.message}` : ""}`
          : error instanceof Error
            ? error.message
            : "Unknown error";
      setError(message);
    });

    return () => {
      abortController.abort();
    };
  }, [query, flags]);

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
