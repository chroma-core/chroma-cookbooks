import {
  BasePlanner,
  BasePlannerConfig,
  BaseStepStatus,
  Memory,
} from "@chroma-cookbooks/agent-framework";
import { InboxAgentTypes } from "./types";
import { InboxService } from "./inbox-service";

export interface InboxPlannerConfig extends BasePlannerConfig<InboxAgentTypes> {
  inboxService: InboxService;
}

export class InboxPlanner extends BasePlanner<InboxAgentTypes> {
  private inboxService: InboxService;

  constructor({ inboxService, ...config }: InboxPlannerConfig) {
    super(config);
    this.inboxService = inboxService;
  }

  override async initialize(config: {
    maxSize: number;
    query: string;
    memory?: Memory<InboxAgentTypes>;
  }): Promise<void> {
    await this.inboxService.authenticate();

    const emails = await this.inboxService.getUnread();

    this.plan = emails.map((email, i) => ({
      id: `step-${i + 1}`,
      status: BaseStepStatus.Pending,
      title: `Processing email ${email.id}: ${email.subject.substring(0, 100)}${email.subject.length > 100 ? "..." : ""}`,
      email,
      parents: i > 0 ? [`step-${i}`] : undefined,
    }));
  }
}
