import { z } from "zod";

export abstract class Tool {
  id: string;
  name: string;
  description: string;
  parameters: z.AnyZodObject;

  protected constructor(args: {
    id: string;
    name: string;
    description: string;
    parameters: z.AnyZodObject;
  }) {
    this.id = args.id;
    this.name = args.name;
    this.description = args.description;
    this.parameters = args.parameters.extend({
      reason: z
        .string()
        .describe(
          "The reason you chose this tool, written in first person. Reference previous tool calls if they influenced your decision.",
        ),
    });
  }

  abstract execute(parameters: any): Promise<string>;
}
