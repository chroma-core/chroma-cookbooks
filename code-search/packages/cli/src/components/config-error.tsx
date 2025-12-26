import React from "react";
import { Text, Box, Newline } from "ink";
import { ZodIssue } from "zod";

export function ConfigError({ issues }: { issues: ZodIssue[] }) {
  const errorMessages = issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("\n");

  return (
    <Box padding={1} flexDirection="column">
      <Text color="cyan">Code Search Agent</Text>
      <Text color="gray">Status: Configuration Error</Text>
      <Newline />

      <Box borderStyle="round" padding={1} flexDirection="column">
        <Text color="red" bold>
          Missing Configuration
        </Text>
        <Newline />
        <Text>{errorMessages}</Text>
        <Newline />
        <Text color="gray">
          Please create a .env file with the required variables.
        </Text>
      </Box>
    </Box>
  );
}
