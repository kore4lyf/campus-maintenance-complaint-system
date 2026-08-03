/**
 * Capitalize the first letter of a string. Returns the original string
 * if it is empty or already starts with an uppercase letter.
 */
export function capitalize(value: string | null | undefined): string {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}
