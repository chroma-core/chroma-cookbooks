#!/usr/bin/env node

import React from "react";
import { render } from "ink";
import { cli, CLIFlags } from "@/cli";
import { configResult } from "@/config";
import { useAgent } from "@/hooks/use-agent";
import { CLIView } from "@/components/cli-view";
import { ConfigError } from "@/components/config-error";

function App({ flags }: { flags: CLIFlags }) {
  const {
    appStatus,
    plan,
    assistantMessages,
    error,
    done,
    result,
    cancel,
    inputRequest,
    submitInput,
  } = useAgent({ flags });

  return (
    <CLIView
      appStatus={appStatus}
      plan={plan}
      assistantMessages={assistantMessages}
      error={error}
      done={done}
      result={result}
      cancel={cancel}
      inputRequest={inputRequest}
      submitInput={submitInput}
    />
  );
}

if (!configResult.success) {
  render(<ConfigError issues={configResult.error.issues} />);
} else {
  render(<App flags={cli.flags} />);
}
