import {
  ConsoleInputHandler,
  InputHandler,
  Tool,
} from "@chroma-cookbooks/agent-framework";
import { z, ZodTypeAny } from "zod";
import readline from "readline";
import { InboxAgentError } from "./errors";

export interface InboxInputHandler extends InputHandler {
  onSelectionRequest<C extends string | number>(config: {
    prompt: string;
    options: [C, string][];
  }): Promise<C[]>;
}

export const inputToolParamsSchema = z.object({
  prompt: z
    .string()
    .describe("The prompt given to the user to request information"),
});

export type InputToolParams = z.infer<typeof inputToolParamsSchema>;

export class InputTool implements Tool<InputToolParams, string> {
  private inputHandler: InboxInputHandler;
  id: string;
  name: string;
  description: string;
  parametersSchema: z.ZodObject<any>;
  resultSchema: ZodTypeAny;

  constructor({ inputHandler }: { inputHandler: InboxInputHandler }) {
    this.id = "input_tool";
    this.name = "Input Tool";
    this.description = "Use this tool to request input from the user";
    this.parametersSchema = inputToolParamsSchema;
    this.resultSchema = z.string();
    this.inputHandler = inputHandler;
  }

  async execute(parameters: InputToolParams): Promise<string> {
    return await this.inputHandler.onInputRequest(parameters.prompt);
  }

  format(result: string): string | undefined {
    return result;
  }
}

export class ConsoleInboxInputHandler
  extends ConsoleInputHandler
  implements InboxInputHandler
{
  async onSelectionRequest<C extends string | number>(config: {
    prompt: string;
    options: [C, string][];
  }): Promise<C[]> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const message = `${config.prompt}\n\n(Choose 1-${config.options.length})\n${config.options.map((option, i) => `${i + 1}. ${option[1]}`).join("\n")}`;

    return new Promise((resolve) => {
      rl.question(`${message}\n `, (answer) => {
        rl.close();

        const result = new Array(
          ...new Set(
            ...answer
              .split(",")
              .map((input) => input.trim())
              .filter(
                (input) =>
                  input !== "" &&
                  !isNaN(Number(input)) &&
                  Number(input) > 0 &&
                  Number(input) <= config.options.length,
              ),
          ),
        );

        if (result.length === 0) {
          throw new InboxAgentError(`Invalid selections: ${answer}`);
        }

        resolve(result.map((option) => config.options[Number(option) - 1][0]));
      });
    });
  }
}
