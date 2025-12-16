import { InboxAgent, InboxServiceProvider } from "./src";
import { LLMProvider } from "@chroma-cookbooks/agent-framework/src";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

async function main() {
  const agent = new InboxAgent({
    llmConfig: { provider: LLMProvider.OpenAI, model: "gpt-4o-mini" },
    inboxProvider: InboxServiceProvider.Chroma,
  });
  await agent.run();
}

main().catch(console.error);
