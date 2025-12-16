import React, { useState } from "react";
import { Text, Box, Newline, useInput, useApp } from "ink";
import {
  BaseStepStatus,
  getStatusSymbol,
} from "@chroma-cookbooks/agent-framework";
import { Step, Answer } from "@agentic-memory/inbox-agent";
import { InputRequest } from "@/hooks/use-agent";

interface CLIProps {
  appStatus: string;
  plan: Step[];
  assistantMessages: string[];
  error: string | null;
  done: boolean;
  result: Answer | null;
  cancel: () => void;
  inputRequest: InputRequest | null;
  submitInput: (value: string | (string | number)[]) => void;
}

export function CLIView({
  appStatus,
  plan,
  assistantMessages,
  error,
  done,
  result,
  cancel,
  inputRequest,
  submitInput,
}: CLIProps) {
  const { exit } = useApp();
  const [textInput, setTextInput] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<Set<number>>(
    new Set(),
  );

  useInput((input, key) => {
    if (input === "q" && !inputRequest) {
      cancel();
      exit();
    }

    if (!inputRequest) return;

    if (inputRequest.type === "text") {
      if (key.return) {
        submitInput(textInput);
        setTextInput("");
      } else if (key.backspace || key.delete) {
        setTextInput((prev) => prev.slice(0, -1));
      } else if (!key.ctrl && !key.meta && input) {
        setTextInput((prev) => prev + input);
      }
    } else if (inputRequest.type === "selection" && inputRequest.options) {
      const num = parseInt(input, 10);
      if (num >= 1 && num <= inputRequest.options.length) {
        const newSelected = new Set(selectedOptions);
        if (newSelected.has(num - 1)) {
          newSelected.delete(num - 1);
        } else {
          newSelected.add(num - 1);
        }
        setSelectedOptions(newSelected);
      } else if (key.return && selectedOptions.size > 0) {
        const selected = Array.from(selectedOptions).map(
          (i) => inputRequest.options![i][0],
        );
        submitInput(selected);
        setSelectedOptions(new Set());
      }
    }
  });

  const lastMessages = assistantMessages.slice(-3);

  return (
    <Box padding={1} flexDirection="column">
      <Text color="cyan" bold>
        Inbox Agent CLI
      </Text>
      <Text color="gray">Status: {appStatus}</Text>
      <Newline />

      {plan.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold>Email Queue:</Text>
          {plan.map((step) => (
            <Text
              key={step.id}
              strikethrough={step.status === BaseStepStatus.Cancelled}
              dimColor={
                step.status === BaseStepStatus.Cancelled ||
                step.status === BaseStepStatus.Success
              }
            >
              {getStatusSymbol(step.status)} {step.title}
            </Text>
          ))}
        </Box>
      )}

      {lastMessages.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold>Activity:</Text>
          {lastMessages.map((msg, index) => (
            <Text key={index} dimColor>
              {`> ${msg}`}
            </Text>
          ))}
        </Box>
      )}

      {inputRequest && (
        <Box
          flexDirection="column"
          borderStyle="round"
          padding={1}
          marginBottom={1}
        >
          <Text color="yellow" bold>
            Input Required:
          </Text>
          <Text>{inputRequest.prompt}</Text>
          <Newline />
          {inputRequest.type === "text" ? (
            <Box>
              <Text color="green">{"> "}</Text>
              <Text>{textInput}</Text>
              <Text color="gray">_</Text>
            </Box>
          ) : (
            <Box flexDirection="column">
              {inputRequest.options?.map((option, i) => (
                <Text
                  key={i}
                  color={selectedOptions.has(i) ? "green" : undefined}
                >
                  {selectedOptions.has(i) ? "[x]" : "[ ]"} {i + 1}. {option[1]}
                </Text>
              ))}
              <Newline />
              <Text color="gray">Press number to toggle, Enter to confirm</Text>
            </Box>
          )}
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

      {done && !error && (
        <Box borderStyle="round" padding={1} flexDirection="column">
          <Text color="green" bold>
            Inbox processing complete!
          </Text>
          {result && (
            <>
              <Newline />
              <Text>{result.summary}</Text>
            </>
          )}
        </Box>
      )}

      <Newline />
      {!done && !error && !inputRequest && (
        <Text color="gray">Processing...</Text>
      )}
      <Text color="gray">
        {inputRequest ? "Waiting for input..." : "Press 'q' to quit"}
      </Text>
    </Box>
  );
}
