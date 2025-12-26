import meow from "meow";

const helpText = `
    Usage:
        $ code-search <query> [options]

    Arguments:
        query                  The question to ask about the codebase

    Options:
        --path, -p             Path to the repository to search (Default: current directory)

        --provider             Specify the LLM provider to use (Default: openai)

        --model, -m            Specify the model to use from your provider
                               (Default: gpt-4o-mini)

        --max-plan-size        Set the max number of steps in the query plan
                               (Default: 10)

        --max-step-iterations  Set the max number of iterations for each step
                               (Default: 5)

    Examples:
        $ code-search "How is authentication implemented?"
        $ code-search "Where is the database connection configured?" --path ./my-project
        $ code-search "What does the UserService class do?" -m gpt-4o
`;

export const cli = meow(helpText, {
  importMeta: import.meta,
  flags: {
    path: {
      type: "string",
      shortFlag: "p",
    },
    provider: {
      type: "string",
    },
    model: {
      type: "string",
      shortFlag: "m",
    },
    maxPlanSize: {
      type: "number",
    },
    maxStepIterations: {
      type: "number",
    },
  },
});

export type CLIFlags = typeof cli.flags;
