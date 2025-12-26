import { LanguageConfig } from "./types";
import { tsxConfig, typescriptConfig } from "./typescript";

export { LanguageConfig } from "./types";

export const languageConfigs: Record<string, LanguageConfig> = {
  ".ts": typescriptConfig,
  ".tsx": tsxConfig,
};
