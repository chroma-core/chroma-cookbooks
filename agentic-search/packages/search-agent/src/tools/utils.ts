import { QueryResult, SearchResult } from "chromadb";

export type RecordMetadata = { doc_id: string };

export function processRecords(
  records: QueryResult<RecordMetadata> | SearchResult,
) {
  if (records.ids[0].length === 0) {
    return "No records found";
  }

  return records
    .rows()[0]
    .map(
      (record) =>
        `// Document ${record.id}\n${record.metadata ? `// Corpus ID: ${record.metadata.doc_id}\n` : ""}\n${record.document}`,
    )
    .join("\n\n");
}
