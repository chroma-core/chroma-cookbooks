#!/usr/bin/env node

import { cli, CLIFlags } from "@/cli";
import { useArgent } from "@/hooks/use-agent";
import { CLIView } from "@/components/cli-view";
import { render } from "ink";
import { configResult } from "@/config";
import { ConfigError } from "@/components/config-error";

function App({ queryId, flags }: { queryId: string; flags: CLIFlags }) {
  const { appStatus, query, queryPlan, assistantMessages, result, error } =
    useArgent({
      queryId,
      flags,
    });

  return (
    <CLIView
      appStatus={appStatus}
      query={query}
      plan={queryPlan}
      assistantMessages={assistantMessages}
      result={result}
      error={error}
    />
  );
}

if (cli.input.length === 0) {
  cli.showHelp(0);
} else if (!configResult.success) {
  render(<ConfigError issues={configResult.error.issues} />);
} else {
  render(<App queryId={cli.input[0]} flags={cli.flags} />);
}
