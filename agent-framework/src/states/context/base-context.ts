import { Context, ContextConfig } from "./types";
import {
  BaseAgentTypes,
  OutcomeOf,
  StepOf,
  ContextError,
  BaseAgentServices,
} from "../../agent";
import { Memory } from "../memory";

export class BaseContext<
  T extends BaseAgentTypes,
  S extends BaseAgentServices<T>,
> implements Context<T> {
  private readonly _query: string;
  private readonly _plan: (() => readonly StepOf<T>[]) | undefined;
  private readonly _memory: Memory<T> | undefined;
  private _history: OutcomeOf<T>[];

  constructor({ query, history, plan, memory }: ContextConfig<T, S>) {
    this._query = query;
    this._history = history ?? [];
    this._plan = plan;
    this._memory = memory;
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

  get memory(): Memory<T> | undefined {
    return this._memory;
  }

  addOutcomes(outcomes: OutcomeOf<T>[]) {
    this._history = [...this._history, ...outcomes];
  }
}
