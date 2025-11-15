import { ChromaClient, CloudClient, Collection, GetResult } from "chromadb";
import { AgentError } from "@agentic-search/base-agent";

const BROWSE_COMP_PLUS_COLLECTION_NAME = "browse-comp-plus";

export function getChromaClient(): ChromaClient {
  if (!process.env.CHROMA_API_KEY) {
    throw new AgentError(
      "Missing Chroma API key. Set your CHROMA_API_KEY environment variable",
    );
  }

  if (!process.env.CHROMA_TENANT) {
    throw new AgentError(
      "Missing Chroma tenant information. Set your CHROMA_TENANT environment variable",
    );
  }

  if (!process.env.CHROMA_DATABASE) {
    throw new AgentError(
      "Missing Chroma DB name. Set your CHROMA_DATABASE environment variable",
    );
  }

  return new CloudClient();
}

export async function getBrowseCompPlusCollection() {
  const client = getChromaClient();
  try {
    return await client.getCollection({
      name: BROWSE_COMP_PLUS_COLLECTION_NAME,
    });
  } catch (error) {
    throw new AgentError(
      `Failed to get the ${BROWSE_COMP_PLUS_COLLECTION_NAME} collection.`,
      error,
    );
  }
}

export async function getQuery({
  collection,
  queryId,
}: {
  collection: Collection;
  queryId: string;
}): Promise<string> {
  let queryRecord: GetResult | null = null;
  try {
    queryRecord = await collection.get({ where: { query_id: queryId } });
  } catch (error) {
    throw new AgentError(`Failed to get record for query ${queryId}`, error);
  }

  if (!queryRecord || queryRecord.ids.length === 0) {
    throw new AgentError(`Query ${queryId} not found.`);
  }

  if (queryRecord.ids.length > 1) {
    throw new AgentError(`Multiple records with query ID ${queryId}`);
  }

  if (!queryRecord.documents[0]) {
    throw new AgentError(
      `Corrupted record for query ${queryId} has no content (record ID ${queryRecord.ids[0]})`,
    );
  }

  return queryRecord.documents[0];
}
