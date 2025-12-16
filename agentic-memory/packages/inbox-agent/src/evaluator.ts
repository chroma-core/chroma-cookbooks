import {
  BaseEvaluationDecision,
  BaseEvaluator,
  Context,
  SystemEvaluationOf,
} from "@chroma-cookbooks/agent-framework";
import { InboxAgentTypes } from "./types";

export class InboxEvaluator extends BaseEvaluator<InboxAgentTypes> {
  override async evaluatePlan(config: {
    query: string;
    maxNewSteps: number;
    context: Context<InboxAgentTypes>;
  }): Promise<SystemEvaluationOf<InboxAgentTypes>> {
    return {
      decision: BaseEvaluationDecision.Continue,
      reason: "Process the next email",
      planOverride: null,
    };
  }
}
