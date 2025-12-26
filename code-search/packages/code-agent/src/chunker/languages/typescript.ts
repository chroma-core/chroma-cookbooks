import { LanguageConfig } from "./types";
import TSLang from "tree-sitter-typescript";
import { Language } from "tree-sitter";

export const typescriptConfig: LanguageConfig = {
  language: () => TSLang.typescript as Language,
  name: "typescript",
  targetNodes: new Set<string>([
    "class_declaration",
    "interface_declaration",
    "enum_declaration",
    "type_alias_declaration",
    "function_declaration",
    "method_definition",
    "arrow_function",
    "internal_module",
  ]),
};

export const tsxConfig: LanguageConfig = {
  language: () => TSLang.tsx as Language,
  name: typescriptConfig.name,
  targetNodes: typescriptConfig.targetNodes,
};
