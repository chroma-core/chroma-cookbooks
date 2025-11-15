export function stringifyToolArguments(args: Record<string, any>): string {
  return Object.entries(args)
    .map(([key, value]) => `${key}: "${value}"`)
    .join(", ");
}
