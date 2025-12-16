import { Collection, GetResult } from "chromadb";
import { AgentError, getCollection } from "@chroma-cookbooks/agent-framework";
import { Query, QueryRecordMetadata } from "./types";

const BROWSE_COMP_PLUS_COLLECTION_NAME = "browse-comp-plus";

export async function getBrowseCompPlusCollection() {
  return await getCollection({ name: BROWSE_COMP_PLUS_COLLECTION_NAME });
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
