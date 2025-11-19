import { QueryResult, SearchResult } from "chromadb";
import { ChromaRecord } from "./chroma-tool";

export type RecordMetadata = { doc_id: string };

export function processSearchResults(
  records: QueryResult<RecordMetadata> | SearchResult,
): ChromaRecord[] {
  return records.rows()[0].map((record) => ({
    id: record.id,
    docId: (record.metadata?.doc_id as string) || "Not found",
    document: record.document || "Corrupted",
  }));
}
