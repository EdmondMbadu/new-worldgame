/** Use the same unique, non-empty references for tournament cards and counts. */
export function tournamentEntryIds(ids: string[] = []): string[] {
  return Array.from(new Set(ids.map((id) => String(id || '').trim()).filter(Boolean)));
}
