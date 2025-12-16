import React from "react";
import { Text, Box, Newline } from "ink";
import { ZodIssue } from "zod";

export function ConfigError({ issues }: { issues: ZodIssue[] }) {
  const errorMessages = issues.map(
    (issue) => `${issue.path.join(".")}: ${issue.message}`
  );

  return (
    <Box padding={1} flexDirection="column">
      <Text color="cyan" bold>Inbox Agent CLI</Text>
      <Text color="gray">Status: Configuration Error</Text>
      <Newline />

      <Box borderStyle="round" padding={1} flexDirection="column">
        <Text color="red" bold>Configuration Error</Text>
        <Newline />
        {errorMessages.map((msg, i) => (
          <Text key={i}>{msg}</Text>
        ))}
      </Box>
    </Box>
  );
}
