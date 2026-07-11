export function validateOwner(value: string): boolean {
  if (value.length < 3) return false;
  if (!value.includes("@")) return false;
  return true;
}

export function validateReviewer(value: string): boolean {
  if (value.length < 3) return false;
  if (!value.includes("@")) return false;
  return true;
}
