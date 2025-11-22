import React from "react";
import { Text, Box, Newline, useInput, useApp } from "ink";
import {
  FinalAnswer,
  getStatusSymbol,
  PlanStep,
  PlanStepStatus,
  Query,
} from "@agentic-search/search-agent";

interface CLIProps {
  appStatus: string;
  query: Query | null;
  plan: PlanStep[];
  assistantMessages: string[];
  result: FinalAnswer | null;
  error: string | null;
}

export function CLIView({
  appStatus,
  query,
  plan,
  assistantMessages,
  result,
  error,
}: CLIProps) {
  const { exit } = useApp();

  useInput((input) => {
    if (input === "q") {
      exit();
      // Give Ink time to clean up before exiting
      setTimeout(() => process.exit(0), 100);
    }
  });

  const lastMessages = assistantMessages.slice(-1);

  return (
    <Box padding={1} flexDirection="column">
      <Text color="cyan">Agentic Search CLI</Text>
      <Text color="gray">Status: {appStatus}</Text>
      <Newline />

      {query && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold>{`Query ${query.id}:`}</Text>
          <Text>{query.content}</Text>
        </Box>
      )}

      {plan.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold>Query Plan:</Text>
          {plan.map((step) => (
            <Text
              key={step.id}
              strikethrough={step.status === PlanStepStatus.Cancelled}
              dimColor={step.status === PlanStepStatus.Cancelled}
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
            Final Answer:
          </Text>
          <Text>{result.answer}</Text>
          <Text color="gray">Confidence: {result.confidence * 100}%</Text>
          <Text color="gray">Reason: {result.reason}</Text>
          <Text color="gray">Evidence: {result.evidence.join(", ")}</Text>
          {query && <Text color="gray">Correct answer: {query.answer}</Text>}
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
