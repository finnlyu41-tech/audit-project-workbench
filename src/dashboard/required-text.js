// Mirrors the existing non-blank name constraint without rewriting user text.
export const REQUIRED_TEXT_PATTERN = ".*\\S.*";
export function hasRequiredText(value) {
  return typeof value === "string" && value.trim().length > 0;
}
