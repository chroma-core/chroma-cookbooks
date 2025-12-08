export class AgentError extends Error {
  readonly cause?: any;

  constructor(message: string, cause?: any) {
    super(message);
    this.cause = cause;
    this.name = "AgentError";
  }
}

export class ContextError extends AgentError {
  constructor(message: string, cause?: any) {
    super(message, cause);
    this.name = "ContextError";
  }
}

export class EvaluatorError extends AgentError {
  constructor(message: string, cause?: any) {
    super(message, cause);
    this.name = "EvaluatorError";
  }
}

export class PlannerError extends AgentError {
  constructor(message: string, cause?: any) {
    super(message, cause);
    this.name = "PlannerError";
  }
}

export class ExecutorError extends AgentError {
  constructor(message: string, cause?: any) {
    super(message, cause);
    this.name = "ExecutorError";
  }
}
