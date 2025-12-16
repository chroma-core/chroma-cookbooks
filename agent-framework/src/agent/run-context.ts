import { AsyncLocalStorage } from "node:async_hooks";
import { AgentError } from "./errors";

export interface RunContextStore {
  signal?: AbortSignal;
}

export const runContext = new AsyncLocalStorage<RunContextStore>();

export function getRunContext(): RunContextStore | undefined {
  return runContext.getStore();
}

export function isAborted(): boolean {
  return getRunContext()?.signal?.aborted ?? false;
}

export function throwIfAborted(): void {
  if (isAborted()) {
    throw new RunAbortedError();
  }
}

export class RunAbortedError extends AgentError {
  constructor() {
    super("Run was aborted");
    this.name = "RunAbortedError";
  }
}
