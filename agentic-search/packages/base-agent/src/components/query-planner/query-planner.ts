import { v4 as uuidv4 } from "uuid";
import {
  CreateQueryPlannerConfig,
  PlanStep,
  PlanStepStatus,
  QueryPlan,
  QueryPlannerConfig,
  queryPlanSchema,
} from "./types";
import { AgentError } from "../../errors";
import { LLMMessage } from "../../llms";
import { AgentStatusHandler } from "../status-handler";

export class QueryPlanner implements IterableIterator<PlanStep[]> {
  private readonly maxPlanSize: number;
  private statusHandler: AgentStatusHandler | undefined;
  public plan: PlanStep[];

  constructor({ plan, maxPlanSize, statusHandler }: QueryPlannerConfig) {
    this.plan = plan;
    this.maxPlanSize = maxPlanSize;
    this.statusHandler = statusHandler;
    this.updateStepsStatus({ steps: plan, status: PlanStepStatus.Pending });
  }

  public static async create(
    config: CreateQueryPlannerConfig,
  ): Promise<QueryPlanner> {
    const { maxPlanSize } = config;

    if (maxPlanSize < 0) {
      throw new AggregateError("Plan size must be nonnegative");
    }

    config.statusHandler?.onAssistantUpdate?.("Generating query plan...");

    let plan: QueryPlan;

    if (maxPlanSize <= 1) {
      plan = QueryPlanner.singletonQueryPlan();
    } else {
      plan = await QueryPlanner.generate(config);
    }

    config.statusHandler?.onAssistantUpdate?.("Executing query plan...");

    return new QueryPlanner({ plan: plan.steps, ...config });
  }

  private static singletonQueryPlan(): QueryPlan {
    return {
      steps: [
        {
          id: uuidv4(),
          title: "Solving the user's query",
          description:
            "Break the user's query into individual steps and call tools to solve them",
          status: PlanStepStatus.InProgress,
          parent: null,
        },
      ],
    };
  }

  private static async generate({
    query,
    maxPlanSize,
    llmService,
    prompts,
  }: CreateQueryPlannerConfig): Promise<QueryPlan> {
    const messages: LLMMessage[] = [
      {
        role: "system",
        content: prompts.generateQueryPlan(maxPlanSize),
      },
      { role: "user", content: query },
    ];

    try {
      return await llmService.getStructuredOutput<QueryPlan>({
        messages,
        schema: queryPlanSchema,
        schemaName: "query_plan",
      });
    } catch (error) {
      throw new AgentError("Failed to generate query plan", error);
    }
  }

  public updateStepsStatus({
    steps,
    status,
  }: {
    steps: PlanStep[];
    status: PlanStepStatus;
  }) {
    steps.forEach((step) => {
      step.status = status;
    });
    this.statusHandler?.onQueryPlanUpdate?.(this.plan);
  }

  private getSteps(status: PlanStepStatus | PlanStepStatus[]): PlanStep[] {
    let predicate: (step: PlanStep) => boolean;
    if (Array.isArray(status)) {
      predicate = (step: PlanStep) => status.includes(step.status);
    } else {
      predicate = (step: PlanStep) => step.status === status;
    }

    return this.plan.filter((step) => predicate(step));
  }

  public completed(): boolean {
    return this.getSteps(PlanStepStatus.Pending).length === 0;
  }

  private processedSteps(): PlanStep[] {
    return this.getSteps([
      PlanStepStatus.Success,
      PlanStepStatus.Timeout,
      PlanStepStatus.Failure,
    ]);
  }

  public availableBuffer(): number {
    const processed = this.processedSteps().length;
    return this.maxPlanSize - processed - 1;
  }

  public overridePlan(newSteps: PlanStep[]): void {
    const pendingSteps: PlanStep[] = this.getSteps(PlanStepStatus.Pending);
    this.updateStepsStatus({
      steps: pendingSteps,
      status: PlanStepStatus.Cancelled,
    });

    this.plan.push(...newSteps);
    this.updateStepsStatus({ steps: newSteps, status: PlanStepStatus.Pending });
  }

  public cancelPlan(): void {
    const pendingSteps: PlanStep[] = this.getSteps(PlanStepStatus.Pending);
    this.updateStepsStatus({
      steps: pendingSteps,
      status: PlanStepStatus.Cancelled,
    });
  }

  public next(): IteratorResult<PlanStep[]> {
    if (this.completed()) {
      return { done: true, value: undefined };
    }

    const processed = this.processedSteps().map((step) => step.id);
    const steps: PlanStep[] = this.getSteps(PlanStepStatus.Pending).filter(
      (step: PlanStep) => !step.parent || processed.includes(step.parent),
    );

    this.updateStepsStatus({ steps, status: PlanStepStatus.InProgress });

    return { done: false, value: steps };
  }

  [Symbol.iterator](): IterableIterator<PlanStep[]> {
    return this;
  }
}
