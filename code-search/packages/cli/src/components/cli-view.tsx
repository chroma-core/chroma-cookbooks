import React from "react";
import { Text, Box, Newline, useInput, useApp } from "ink";
import { Answer, Step } from "@code-search/code-agent";
import {
  BaseStepStatus,
  getStatusSymbol,
} from "@chroma-cookbooks/agent-framework";

interface CLIProps {
  appStatus: string;
  query: string;
  plan: Step[];
  assistantMessages: string[];
  result: Answer | null;
  error: string | null;
  cancel: () => void;
}

export function CLIView({
  appStatus,
  query,
  plan,
  assistantMessages,
  result,
  error,
  cancel,
}: CLIProps) {
  const { exit } = useApp();

  useInput((input) => {
    if (input === "q") {
      cancel();
      exit();
    }
  });

  const lastMessages = assistantMessages.slice(-1);

  return (
    <Box padding={1} flexDirection="column">
      <Text color="cyan">Code Search Agent</Text>
      <Text color="gray">Status: {appStatus}</Text>
      <Newline />

      <Box flexDirection="column" marginBottom={1}>
        <Text bold>Query:</Text>
        <Text>{query}</Text>
      </Box>

      {plan.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold>Query Plan:</Text>
          {plan.map((step) => (
            <Text
              key={step.id}
              strikethrough={step.status === BaseStepStatus.Cancelled}
              dimColor={step.status === BaseStepStatus.Cancelled}
            >
              {getStatusSymbol(step.status)} {step.title}
            </Text>
          ))}
        </Box>
      )}

      {lastMessages.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold>Agent Thoughts:</Text>
          {lastMessages.map((msg, index) => (
            <Text key={index} dimColor>
              {`> ${msg}`}
            </Text>
          ))}
        </Box>
      )}

      {result && (
        <Box flexDirection="column" borderStyle="round" padding={1}>
          <Text color="green" bold>
            Answer:
          </Text>
          <Text>{result.answer}</Text>
          <Newline />
          <Text color="gray" bold>
            Reason:
          </Text>
          <Text color="gray">{result.reason}</Text>
        </Box>
      )}

      {error && (
        <Box borderStyle="round" padding={1} flexDirection="column">
          <Text color="red" bold>
            Error
          </Text>
          <Text>{error}</Text>
        </Box>
      )}

      <Newline />
      {appStatus !== "Done!" && !error && <Text color="gray">Running...</Text>}
      <Text color="gray">Press 'q' to quit</Text>
    </Box>
  );
}
