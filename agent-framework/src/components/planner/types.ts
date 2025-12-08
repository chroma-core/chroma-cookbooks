import { z } from "zod";
import { PlannerPrompts } from "../../services/prompts";
import { PlannerStatusHandler } from "../../services/status-handler";
import { BaseComponentConfig } from "../base";
import { BaseAgentTypes, StepOf, StepSchemaOf } from "../../agent/types";
import { BaseStepStatus } from "../../agent/schemas";
import { Memory } from "../../states/memory";

export interface Planner<T extends BaseAgentTypes> extends IterableIterator<
  StepOf<T>[]
> {
  readonly stepSchema: StepSchemaOf<T>;
  getPlan(): readonly StepOf<T>[];
  initialize(config: {
    maxSize: number;
    query: string;
    memory?: Memory<T>;
  }): Promise<void>;
  updateStepsStatus(config: {
    steps: StepOf<T>[];
    status: BaseStepStatus;
  }): void;
  completed(): boolean;
  availableBuffer(maxSize: number): number;
  override(newSteps: StepOf<T>[]): void;
  cancel(): void;
}

export type BasePlannerConfig<T extends BaseAgentTypes> =
  BaseComponentConfig<T> &
    Partial<{
      stepSchema: StepSchemaOf<T>;
      prompts: Partial<PlannerPrompts>;
      statusHandler: Partial<PlannerStatusHandler<T>>;
    }>;
