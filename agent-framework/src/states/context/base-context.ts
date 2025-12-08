import { Context, ContextConfig } from "./types";
import { BaseAgentTypes, OutcomeOf, StepOf } from "../../agent/types";
import { ContextError } from "../../agent/errors";

export class BaseContext<T extends BaseAgentTypes> implements Context<T> {
  private readonly _query: string;
  private _history: OutcomeOf<T>[];
  private readonly _plan: (() => readonly StepOf<T>[]) | undefined;

  constructor({ query, history, plan }: ContextConfig<T>) {
    this._query = query;
    this._history = history ?? [];
    this._plan = plan;
  }

  get query(): string {
    return this._query;
  }

  get plan(): readonly StepOf<T>[] {
    if (!this._plan) {
      throw new ContextError("No plan configured for Context");
    }
    return this._plan();
  }

  get history(): OutcomeOf<T>[] {
    return this._history;
  }

  addOutcomes(outcomes: OutcomeOf<T>[]) {
    this._history = [...this._history, ...outcomes];
  }
}
