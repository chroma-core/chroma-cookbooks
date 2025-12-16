import {
  BaseAgentConfig,
  BaseAgentServices,
  BaseAgentTypes,
  PromptsService,
  RunConfig as BaseRunConfig,
} from "@chroma-cookbooks/agent-framework";
import {
  answerSchema,
  evaluationSchema,
  outcomeSchema,
  stepSchema,
} from "./schemas";
import { InboxInputHandler } from "./input-handler";
import { InboxService } from "./inbox-service";

export interface InboxAgentTypes extends BaseAgentTypes {
  step: typeof stepSchema;
  outcome: typeof outcomeSchema;
  evaluation: typeof evaluationSchema;
  answer: typeof answerSchema;
}

export interface InboxAgentServices extends BaseAgentServices<InboxAgentTypes> {
  inputHandler: InboxInputHandler;
  prompts: InboxAgentPrompts;
  inboxService: InboxService;
}

export interface InboxAgentPrompts extends PromptsService<InboxAgentTypes> {
  runQuery(): string;
}

export interface InboxAgentConfig extends BaseAgentConfig<
  InboxAgentTypes,
  InboxAgentServices
> {
  inboxService: InboxService;
}

export type RunConfig = Omit<
  BaseRunConfig,
  "maxStepIterations" | "maxPlanSize" | "query"
>;

export enum Confirmation {
  Yes,
  EmailAll,
  ToolAll,
  No,
}
