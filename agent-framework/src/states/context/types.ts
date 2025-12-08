import { BaseAgentTypes, OutcomeOf, StepOf } from "../../agent";
import { Memory } from "../memory";

export interface Context<T extends BaseAgentTypes> {
  readonly plan: readonly StepOf<T>[];
  readonly query: string;
  readonly memory?: Memory<T>;
  history: OutcomeOf<T>[];
  addOutcomes(outcomes: OutcomeOf<T>[]): void;
}

export interface ContextConfig<T extends BaseAgentTypes> {
  query: string;
  history?: OutcomeOf<T>[];
  plan?: () => readonly StepOf<T>[];
  memory?: Memory<T>;
}
