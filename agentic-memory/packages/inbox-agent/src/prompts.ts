import {
  Context,
  PromptsService,
  StepOf,
} from "@chroma-cookbooks/agent-framework";
import { InboxAgentTypes } from "./types";
import { Step } from "./schemas";
import { createBasePrompts } from "@chroma-cookbooks/agent-framework/src/services/prompts/base-prompts";

function executeStepSystemPrompt(): string {
  return `You are an inbox assistant processing one unread email.

STRICT RULES - FOLLOW EXACTLY:
1. Search memory for email processing rules relevant to this email.
2. ONLY take actions that are EXPLICITLY specified by a matching rule.
3. NEVER add extra actions beyond what rules specify (e.g., if rule says "flag", ONLY flag - do NOT also archive or mark read).
4. BEFORE taking any action, check the email's current state:
   - If "flagged: true" and rule says to flag → SKIP (already done)
   - If "archived: true" and rule says to archive → SKIP (already done)
   - If email has the label and rule says to add that label → SKIP (already done)
5. If no relevant rule exists, use the input tool to ask the user. Include: sender and 1-sentence summary.
6. If a rule matches but the email already satisfies it, take NO action and report the email was already processed.

FORBIDDEN:
- Taking actions not specified by rules
- "Helpfully" adding extra actions like mark_read or archive unless explicitly in a rule
- Assuming what the user wants`;
}

function executeStepUserPrompt(args: {
  step: Step;
  context: Context<InboxAgentTypes>;
}): string {
  const email = args.step.email;
  const currentState = [
    `flagged: ${email.flagged ?? false}`,
    `archived: ${email.archived ?? false}`,
    `labels: ${email.labels?.map((l) => l.name).join(", ") || "none"}`,
  ].join(", ");

  return `Process this email:
${JSON.stringify(email, null, 2)}

CURRENT STATE: ${currentState}
(Check this before taking any action - skip actions if state already matches)

Existing rules from this session:
${args.context.history.map((outcome) => outcome.derivedRules?.join("\n")).join("\n") || "None yet"}

Search memory if no relevant rules were derived in this session yet.
`;
}

function finalizeStepPrompt(): string {
  return `Now finalize this step. If you weren't able to process the email mark the step as failed and mention why. If 
during processing you requested input from the user for processing the rule, derive processing rules for future runs. 
The rules should be specific to this type of email or sender, based on what the user specified. 
Include enough information from the user input and email to make the rule explicit and useful for future runs.
Rules should ALWAYS be written as "If X, do Y"
`;
}

function finalAnswerSystemPrompt(): string {
  return `You are a helpful inbox assistant. You have just processed all the unread emails from the user's inbox. Your 
job now is to produce a summary of the process, based on the steps provided by the user. If no steps has been taken, it 
means that the inbox was already processed and there were no unread emails.`;
}

function finalAnswerUserPrompt(args: {
  context: Context<InboxAgentTypes>;
}): string {
  return `These are the steps you have taken:
${args.context.history.map((outcome) => outcome.summary).join("\n\n")}.`;
}

export const inboxAgentPrompts: PromptsService<InboxAgentTypes> = {
  ...createBasePrompts(),
  executeStepSystemPrompt,
  executeStepUserPrompt,
  finalizeStepPrompt,
  finalAnswerSystemPrompt,
  finalAnswerUserPrompt,
};
