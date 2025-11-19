import { CLIView } from "@/components/cli-view";
import { ZodIssue } from "zod";

export function ConfigError({ issues }: { issues: ZodIssue[] }) {
  const errorMessages = issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("\n");

  return (
    <CLIView
      appStatus="Configuration Error"
      query={null}
      displayMessages={0}
      plan={[]}
      assistantMessages={[]}
      result={null}
      error={errorMessages}
    />
  );
}
