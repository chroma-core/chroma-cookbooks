import { LanguageConfig } from "./types";
import { tsxConfig, typescriptConfig } from "./typescript";

export type { LanguageConfig } from "./types";

export const languageConfigs: Record<string, LanguageConfig> = {
  ".ts": typescriptConfig,
  ".tsx": tsxConfig,
};
