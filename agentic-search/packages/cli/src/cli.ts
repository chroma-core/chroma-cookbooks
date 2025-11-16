import meow from "meow";

const helpText = `
    Usage:
        $ agentic-search <query-id>
    
    Options:
        --provider, -p         Specify the provider to use (Default: openai)
        
        --model, -m            Specify the model to use from your provider
                               (Default: gpt-5-nano)
        
        --max-plan-size        Set the max number of steps in the query plan
                               (Default: 10)
        
        --max-step-iterations  Set the max number of iterations for each step in the query plan
                               (Default: 5)
`;

export const cli = meow(helpText, {
  importMeta: import.meta,
  flags: {
    provider: {
      type: "string",
      shortFlag: "p",
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
