import { BaseAgentTypes } from "../../agent";
import { Context } from "../context";
import { Tool } from "../../components/executor";

export type Memory<T extends BaseAgentTypes> = Partial<{
  tools: Tool[];
  forPlanning(): Promise<string>;
  forExecution(config: { context: Context<T> }): Promise<string>;
  forEvaluation(config: { context: Context<T> }): Promise<string>;
  forAnswer(config: { context: Context<T> }): Promise<string>;
}>;
