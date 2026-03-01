function toBooleanFlag(value: string | undefined) {
  if (!value) return false;
  return value.trim().toLowerCase() === "true";
}

export function isSlackEnabled() {
  return toBooleanFlag(process.env.SLACK_ENABLED);
}
