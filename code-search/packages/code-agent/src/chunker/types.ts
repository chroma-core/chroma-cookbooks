export interface Chunk {
  id: string;
  document: string;
  startLine: number;
  endLine: number;
  language: string;
  filePath: string;
  symbol?: string;
}
