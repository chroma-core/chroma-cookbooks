import { HybridSearchTool } from "./hybrid-search";
import { LexicalSearchTool } from "./lexical-search";
import { SemanticSearchTool } from "./semantic-search";
import { Collection } from "chromadb";

export function searchToolsFactory(collection: Collection) {
  return [
    new SemanticSearchTool(collection),
    new LexicalSearchTool(collection),
    new HybridSearchTool(collection),
  ];
}

export * from "./chroma-tool";
