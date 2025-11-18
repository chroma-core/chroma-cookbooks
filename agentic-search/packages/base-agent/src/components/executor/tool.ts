import { z } from "zod";
import { ToolArgs } from "./types";

export abstract class Tool<R = any> {
  id: string;
  name: string;
  description: string;
  parameters: z.AnyZodObject;
  resultSchema?: z.ZodType<R>;

  protected constructor(args: ToolArgs<R>) {
    this.id = args.id;
    this.name = args.name;
    this.description = args.description;
    this.resultSchema = args.resultSchema;
    this.parameters = args.parameters.extend({
      reason: z
        .string()
        .describe(
          "The reason you chose this tool, written in first person. Reference previous tool calls if they influenced your decision.",
        ),
    });
  }

  abstract execute(parameters: any): Promise<R>;

  format(result: R): string {
    return JSON.stringify(result);
  }
}
