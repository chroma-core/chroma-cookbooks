import { Context } from "../../states/context";
import { BaseAgentTypes, StepOf } from "../../agent/types";

export interface PlannerPrompts {
  generatePlan(maxSize: number): string;
}

export interface ExecutorPrompts<T extends BaseAgentTypes> {
  executeStepSystemPrompt(): string;
  executeStepUserPrompt(args: { step: StepOf<T>; context: Context<T> }): string;
  evaluateStepUserPrompt(args: {
    step: StepOf<T>;
    context: Context<T>;
  }): string;
  finalizeStepPrompt: () => string;
}

export interface EvaluatorPrompts<T extends BaseAgentTypes> {
  evaluatePlanSystemPrompt(maxNewSteps: number): string;
  evaluatePlanUserPrompt(args: { context: Context<T> }): string;
  finalAnswerSystemPrompt(): string;
  finalAnswerUserPrompt(args: { context: Context<T> }): string;
}

export type PromptsService<T extends BaseAgentTypes> = PlannerPrompts &
  ExecutorPrompts<T> &
  EvaluatorPrompts<T>;
