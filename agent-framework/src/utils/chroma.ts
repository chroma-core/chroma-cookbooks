import { ChromaClient, CloudClient } from "chromadb";
import { AgentError } from "../agent";

export interface ChromaConfig {
  apiKey: string;
  tenant: string;
  database: string;
}

export function getChromaClient(config?: Partial<ChromaConfig>): ChromaClient {
  const {
    apiKey = process.env.CHROMA_API_KEY,
    tenant = process.env.CHROMA_TENANT,
    database = process.env.CHROMA_DATABASE,
  } = config ?? {};

  if (!apiKey) {
    throw new AgentError(
      "Missing Chroma API key. Set your CHROMA_API_KEY environment variable",
    );
  }

  if (!tenant) {
    throw new AgentError(
      "Missing Chroma tenant information. Set your CHROMA_TENANT environment variable",
    );
  }

  if (!database) {
    throw new AgentError(
      "Missing Chroma DB name. Set your CHROMA_DATABASE environment variable",
    );
  }

  return new CloudClient({ apiKey, tenant, database });
}

export async function getCollection({ name }: { name: string }) {
  const client = getChromaClient();
  try {
    return await client.getOrCreateCollection({ name });
  } catch (error) {
    throw new AgentError(`Failed to get the ${name} collection.`, error);
  }
}
