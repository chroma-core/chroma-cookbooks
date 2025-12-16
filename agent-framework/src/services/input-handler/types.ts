export interface InputHandler {
  onInputRequest(message: string): Promise<string>;
}
