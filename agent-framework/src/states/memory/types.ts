import { BaseAgentTypes } from "../../agent";
import { Context } from "../context";
import { Tool } from "../../components/executor";

export type Memory<T extends BaseAgentTypes, R = unknown> = Partial<{
  tools: Tool[];
  forPlanning(config: { query: string }): Promise<string>;
  forExecution(config: { context: Context<T> }): Promise<string>;
  forEvaluation(config: { context: Context<T> }): Promise<string>;
  forAnswer(config: { context: Context<T> }): Promise<string>;
  extractFromRun(config: { context: Context<T> }): Promise<void>;
  addMemoryRecords(config: { records: R[] }): Promise<void>;
}>;
