import { v4 as uuidv4 } from "uuid";
import { BasePlannerConfig, Planner } from "./types";
import { BaseComponent } from "../base";
import { z } from "zod";
import { PlannerPrompts } from "../../services/prompts";
import { PlannerStatusHandler } from "../../services/status-handler";
import { LLMMessage, LLMRole } from "../../services/llms";
import {
  BaseAgentTypes,
  StepOf,
  StepSchemaOf,
  PlannerError,
  BaseStep,
  BaseStepStatus,
} from "../../agent";
import { Memory } from "../../states/memory";

export class BasePlanner<T extends BaseAgentTypes>
  extends BaseComponent<T>
  implements Planner<T>
{
  declare protected prompts: PlannerPrompts;
  declare protected statusHandler: PlannerStatusHandler<T>;
  readonly stepSchema: StepSchemaOf<T>;
  private _plan: StepOf<T>[] | undefined;

  constructor(config: BasePlannerConfig<T>) {
    super(config);
    this.stepSchema = config.stepSchema ?? config.agentSchemas.step;
  }

  private get plan(): StepOf<T>[] {
    if (!this._plan) {
      throw new PlannerError("Planner not initialized");
    }
    return this._plan;
  }

  private set plan(plan: StepOf<T>[]) {
    this._plan = plan;
  }

  getPlan = (): readonly StepOf<T>[] => {
    return this.plan;
  };

  async initialize({
    maxSize,
    query,
    memory,
  }: {
    maxSize: number;
    query: string;
    memory?: Memory<T>;
  }): Promise<void> {
    if (maxSize < 0) {
      throw new PlannerError("Plan size must be nonnegative");
    }

    this.statusHandler?.onAssistantUpdate?.("Generating query plan...");

    if (maxSize <= 1) {
      this.plan = this.singletonQueryPlan();
    } else {
      this.plan = await this.generate({ maxSize, query, memory });
    }
  }

  updateStepsStatus({
    steps,
    status,
  }: {
    steps: StepOf<T>[];
    status: BaseStepStatus;
  }): void {
    const stepIds = new Set(steps.map((s) => s.id));
    this.plan = this.plan.map((planStep) =>
      stepIds.has(planStep.id) ? { ...planStep, status } : planStep,
    );
    this.statusHandler?.onPlanUpdate?.(this.plan);
  }

  completed(): boolean {
    return this.getSteps(BaseStepStatus.Pending).length === 0;
  }

  availableBuffer(maxSize: number): number {
    const processed = this.processedSteps().length;
    return maxSize - processed - 1;
  }

  override(newSteps: StepOf<T>[]): void {
    const pendingIds = new Set(
      this.getSteps(BaseStepStatus.Pending).map((s) => s.id),
    );
    const cancelledPlan = this.plan.map((step) =>
      pendingIds.has(step.id)
        ? { ...step, status: BaseStepStatus.Cancelled }
        : step,
    );

    const existingIds = new Set(cancelledPlan.map((s) => s.id));
    const uniqueNewSteps = newSteps.filter((s) => !existingIds.has(s.id));

    const stepsToAdd = uniqueNewSteps.map((step) => ({
      ...step,
      status: BaseStepStatus.Pending,
    }));

    this.plan = [...cancelledPlan, ...stepsToAdd];
    this.statusHandler?.onPlanUpdate?.(this.plan);
  }

  cancel(): void {
    const pendingSteps: StepOf<T>[] = this.getSteps(BaseStepStatus.Pending);
    this.updateStepsStatus({
      steps: pendingSteps,
      status: BaseStepStatus.Cancelled,
    });
  }

  next(): IteratorResult<StepOf<T>[], any> {
    if (this.completed()) {
      return { done: true, value: undefined };
    }

    const processed = this.processedSteps().map((step) => step.id);

    const steps: StepOf<T>[] = this.getSteps(BaseStepStatus.Pending).filter(
      (step: StepOf<T>) =>
        !step.parents ||
        step.parents.filter((parent) => processed.includes(parent)).length ===
          step.parents.length,
    );

    this.updateStepsStatus({
      steps,
      status: BaseStepStatus.InProgress,
    });

    return { done: false, value: steps };
  }

  protected singletonQueryPlan(): StepOf<T>[] {
    const baseStep: BaseStep = {
      id: uuidv4(),
      title: "Solving the user's query",
      status: BaseStepStatus.Pending,
      parents: null,
    };
    // Defaults from extending types are filled in by Zod
    return [this.stepSchema.parse(baseStep)];
  }

  private async generate({
    maxSize,
    query,
    memory,
  }: {
    maxSize: number;
    query: string;
    memory?: Memory<T>;
  }): Promise<StepOf<T>[]> {
    let prompt = this.prompts.generatePlan(maxSize);
    if (memory && memory.forPlanning) {
      const memoryPrompt = await memory.forPlanning();
      prompt += "\n\n" + memoryPrompt;
    }

    const messages: LLMMessage[] = [
      {
        role: LLMRole.System,
        content: prompt,
      },
      { role: LLMRole.User, content: query },
    ];

    try {
      return (
        await this.llmService.getStructuredOutput<{ steps: StepOf<T>[] }>({
          messages,
          schema: z.object({ steps: z.array(this.stepSchema).min(1) }),
          schemaName: "query_plan",
        })
      ).steps;
    } catch (error) {
      throw new PlannerError("Failed to generate query plan", error);
    }
  }

  protected processedSteps(): StepOf<T>[] {
    return this.getSteps([
      BaseStepStatus.Success,
      BaseStepStatus.Timeout,
      BaseStepStatus.Failure,
    ]);
  }

  protected getSteps(status: BaseStepStatus | BaseStepStatus[]): StepOf<T>[] {
    let predicate: (step: StepOf<T>) => boolean;
    if (Array.isArray(status)) {
      predicate = (step: StepOf<T>) => status.includes(step.status);
    } else {
      predicate = (step: StepOf<T>) => step.status === status;
    }

    return this.plan.filter((step) => predicate(step));
  }

  [Symbol.iterator](): IterableIterator<StepOf<T>[]> {
    return this;
  }
}
