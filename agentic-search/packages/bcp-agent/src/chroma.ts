import { ChromaClient, CloudClient, Collection, GetResult } from "chromadb";
import { AgentError } from "@chroma-cookbooks/agent-framework";
import { Query, QueryRecordMetadata } from "./types";

const BROWSE_COMP_PLUS_COLLECTION_NAME = "browse-comp-plus";

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
}): Promise<Query> {
  let queryRecord: GetResult<QueryRecordMetadata> | null = null;
  try {
    queryRecord = await collection.get<QueryRecordMetadata>({
      where: { query_id: queryId },
    });
  } catch (error) {
    throw new AgentError(`Failed to get record for query ${queryId}`, error);
  }

  if (!queryRecord || queryRecord.ids.length === 0) {
    throw new AgentError(`Query ${queryId} not found`);
  }

  if (queryRecord.ids.length > 1) {
    throw new AgentError(`Multiple records with query ID ${queryId}`);
  }

  const query = queryRecord.rows()[0];

  if (!query.document || !query.metadata?.answer) {
    throw new AgentError(
      `Corrupted record for query ${queryId} has no content (record ID ${query.id})`,
    );
  }

  return {
    id: query.metadata.query_id,
    content: query.document,
    answer: query.metadata.answer,
  };
}
