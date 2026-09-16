export function makeId(): string {
  return Date.now().toString();
}

export function makeImportId(): string {
  return Date.now().toString() + Math.random().toString(36).slice(2, 6);
}
