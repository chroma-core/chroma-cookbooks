import {
  BaseAgentServices,
  BaseAgentTypes,
  OutcomeOf,
  StepOf,
} from "../../agent";
import { Memory } from "../memory";
import { BaseComponentConfig } from "../../components";

export interface Context<T extends BaseAgentTypes> {
  readonly plan: readonly StepOf<T>[];
  readonly query: string;
  readonly memory?: Memory<T>;
  history: OutcomeOf<T>[];
  addOutcomes(outcomes: OutcomeOf<T>[]): void;
}

export type ContextConfig<
  T extends BaseAgentTypes,
  S extends BaseAgentServices<T>,
> = BaseComponentConfig<T, S> & {
  query: string;
  history?: OutcomeOf<T>[];
  plan?: () => readonly StepOf<T>[];
  memory?: Memory<T>;
};
