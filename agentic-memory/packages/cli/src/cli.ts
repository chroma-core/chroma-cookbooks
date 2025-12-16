import meow from "meow";

const helpText = `
    Usage:
        $ inbox-agent

    Options:
        --provider, -p         Specify the LLM provider to use (Default: openai)
        --model, -m            Specify the model to use from your provider
                               (Default: gpt-4o-mini)
        --max-plan-size        Set the max number of emails to process in one run
                               (Default: all unread emails)
        --gmail, -g            Use Gmail API as the inbox provider
                               (Default: false, uses mock Chroma provider)
        --authorize, -a        Auto-authorize all agent actions without prompting
                               (Default: false)

    Examples:
        $ inbox-agent
        $ inbox-agent --gmail
        $ inbox-agent --provider openai --model gpt-4o
        $ inbox-agent --max-plan-size 5 --authorize
`;

export const cli = meow(helpText, {
  importMeta: import.meta,
  flags: {
    provider: { type: "string", shortFlag: "p" },
    model: { type: "string", shortFlag: "m" },
    maxPlanSize: { type: "number" },
    gmail: { type: "boolean", shortFlag: "g", default: false },
    authorize: { type: "boolean", shortFlag: "a", default: false },
  },
});

export type CLIFlags = typeof cli.flags;
