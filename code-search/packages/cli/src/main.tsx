#!/usr/bin/env node

import React from "react";
import { cli, CLIFlags } from "@/cli";
import { useAgent } from "@/hooks/use-agent";
import { CLIView } from "@/components/cli-view";
import { render } from "ink";
import { configResult } from "@/config";
import { ConfigError } from "@/components/config-error";

function App({ query, flags }: { query: string; flags: CLIFlags }) {
  const { appStatus, queryPlan, assistantMessages, result, error, cancel } =
    useAgent({
      query,
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
      cancel={cancel}
    />
  );
}

if (cli.input.length === 0) {
  cli.showHelp(0);
} else if (!configResult.success) {
  render(<ConfigError issues={configResult.error.issues} />);
} else {
  render(<App query={cli.input[0]} flags={cli.flags} />);
}
