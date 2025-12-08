import { BaseAgentTypes, OutcomeOf, StepOf } from "../../agent/types";

export interface Context<T extends BaseAgentTypes> {
  readonly query: string;
  readonly plan: readonly StepOf<T>[];
  history: OutcomeOf<T>[];
  addOutcomes(outcomes: OutcomeOf<T>[]): void;
}

export interface ContextConfig<T extends BaseAgentTypes> {
  query: string;
  history?: OutcomeOf<T>[];
  plan?: () => readonly StepOf<T>[];
}
