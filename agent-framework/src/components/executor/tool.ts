import { z } from "zod";
import { BaseAgentServices, BaseAgentTypes } from "../../agent";
import { BaseComponentConfig } from "../base";

export interface Tool<P = unknown, R = unknown> {
  id: string;
  name: string;
  description: string;
  parametersSchema: z.ZodObject<any>;
  resultSchema: z.ZodTypeAny;
  execute(parameters: P): Promise<R>;
  format(result: R): string | undefined;
}

export type ToolFactoryConfig<
  T extends BaseAgentTypes,
  S extends BaseAgentServices<T>,
> = BaseComponentConfig<T, S>;

export type ToolFactory<
  T extends BaseAgentTypes,
  S extends BaseAgentServices<T>,
  P = unknown,
  R = unknown,
> = (config: ToolFactoryConfig<T, S>) => Tool<P, R>;
