import { AgentError } from "../../agent/errors";

export class LLMServiceError extends AgentError {
  readonly retryable?: boolean;

  constructor(
    message: string,
    options?: Partial<{ cause: any; retryable: boolean }>,
  ) {
    const { cause, retryable } = options || {};
    super(message, cause);
    this.retryable = retryable;
    this.name = "LLMServiceError";
  }
}
