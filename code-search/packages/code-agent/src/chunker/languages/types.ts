import { Language } from "tree-sitter";

export interface LanguageConfig {
  language(): Language;
  name: string;
  targetNodes: Set<string>;
}
