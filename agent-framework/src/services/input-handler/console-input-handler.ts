import * as readline from "readline";
import { InputHandler } from "./types";

export class ConsoleInputHandler implements InputHandler {
  async onInputRequest(message: string): Promise<string> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      rl.question(`${message}\n> `, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });
  }
}
