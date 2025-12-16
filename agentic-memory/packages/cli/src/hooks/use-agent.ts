import { CLIFlags } from "@/cli";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  InboxAgent,
  InboxAgentTypes,
  InboxInputHandler,
  InboxServiceProvider,
  Step,
  Outcome,
  Answer,
  AgentError,
  AgentStatusHandler,
  getToolParamsSymbol,
  LLMFactory,
  ToolCall,
} from "@agentic-memory/inbox-agent";

export type InputRequest = {
  id: string;
  type: "text" | "selection";
  prompt: string;
  options?: [string | number, string][];
  resolve: (value: string | (string | number)[]) => void;
};

type InputRequestQueue = InputRequest[];

export function useAgent({ flags }: { flags: CLIFlags }) {
  const [appStatus, setAppStatus] = useState<string>("Initializing...");
  const [plan, setPlan] = useState<Step[]>([]);
  const [assistantMessages, setAssistantMessages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [result, setResult] = useState<Answer | null>(null);
  const [inputQueue, setInputQueue] = useState<InputRequestQueue>([]);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    class CLIStatusHandler implements AgentStatusHandler<InboxAgentTypes> {
      onPlanUpdate(queryPlan: Step[]) {
        setPlan([...queryPlan]);
      }

      onAssistantUpdate(message: string) {
        setAssistantMessages((prev) => [...prev, message]);
      }

      onToolCall(args: {
        toolCall: ToolCall;
        toolParams: any;
        reason?: string;
      }) {
        const message = `Calling ${args.toolCall.name}(${getToolParamsSymbol(args.toolParams)})`;
        setAssistantMessages((prev) => [...prev, message]);
      }

      onStepOutcome(outcome: Outcome) {
        setAssistantMessages((prev) => [
          ...prev,
          `Step complete: ${outcome.summary}`,
        ]);
      }
    }

    class CLIInputHandler implements InboxInputHandler {
      async onInputRequest(prompt: string): Promise<string> {
        return new Promise((resolve) => {
          const id = Math.random().toString(36).slice(2);
          setInputQueue((prev) => [
            ...prev,
            {
              id,
              type: "text",
              prompt,
              resolve: (value) => resolve(value as string),
            },
          ]);
        });
      }

      async onSelectionRequest<C extends string | number>(config: {
        prompt: string;
        options: [C, string][];
      }): Promise<C[]> {
        return new Promise((resolve) => {
          const id = Math.random().toString(36).slice(2);
          setInputQueue((prev) => [
            ...prev,
            {
              id,
              type: "selection",
              prompt: config.prompt,
              options: config.options as [string | number, string][],
              resolve: (value) => resolve(value as C[]),
            },
          ]);
        });
      }
    }

    async function runAgent() {
      const provider = flags.provider || "openai";
      const model = flags.model || "gpt-4o-mini";
      const inboxProvider = flags.gmail
        ? InboxServiceProvider.Gmail
        : InboxServiceProvider.Chroma;

      setAppStatus("Starting inbox agent...");

      const agent = new InboxAgent({
        llmConfig: {
          provider: LLMFactory.parseLLMProvider(provider),
          model,
        },
        inboxProvider,
        statusHandler: new CLIStatusHandler(),
        inputHandler: new CLIInputHandler(),
      });

      setAppStatus("Processing inbox...");

      const answer = await agent.run({
        signal: abortController.signal,
        maxPlanSize: flags.maxPlanSize,
      });

      setResult(answer);
      setAppStatus("Done!");
      setDone(true);
    }

    runAgent().catch((err) => {
      if (abortController.signal.aborted) {
        return;
      }
      const message =
        err instanceof AgentError
          ? `${err.message}${err.cause instanceof Error ? `: ${err.cause.message}` : ""}`
          : err instanceof Error
            ? err.message
            : "Unknown error";
      setError(message);
    });

    return () => {
      abortController.abort();
    };
  }, [flags]);

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const currentInputRequest = inputQueue[0] ?? null;

  const submitInput = useCallback(
    (value: string | (string | number)[]) => {
      if (inputQueue.length > 0) {
        const [current, ...rest] = inputQueue;
        current.resolve(value);
        setInputQueue(rest);
      }
    },
    [inputQueue],
  );

  return {
    appStatus,
    plan,
    assistantMessages,
    error,
    done,
    result,
    cancel,
    inputRequest: currentInputRequest,
    submitInput,
  };
}
