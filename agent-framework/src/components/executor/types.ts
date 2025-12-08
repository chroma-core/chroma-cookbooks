import { z } from "zod";
import { Tool, ToolFactory } from "./tool";
import { Context } from "../../states/context";
import { ExecutorPrompts } from "../../services/prompts";
import { ExecutorStatusHandler } from "../../services/status-handler";
import { BaseComponentConfig } from "../base";
import {
  BaseAgentTypes,
  OutcomeOf,
  OutcomeSchemaOf,
  StepOf,
} from "../../agent";

export interface Executor<T extends BaseAgentTypes> {
  outcomeSchema: OutcomeSchemaOf<T>;
  tools: Tool[];
  run(config: {
    step: StepOf<T>;
    context: Context<T>;
    maxIterations: number;
  }): Promise<OutcomeOf<T>>;
}

export type BaseExecutorConfig<T extends BaseAgentTypes> =
  BaseComponentConfig<T> &
    Partial<{
      readonly outcomeSchema: OutcomeSchemaOf<T>;
      prompts: Partial<ExecutorPrompts<T>>;
      statusHandler: Partial<ExecutorStatusHandler<T>>;
      tools: (Tool | ToolFactory<T>)[];
    }>;
