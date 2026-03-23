export function buildAnswer(
  dataAnomalyIds: Set<string>,
  noteAnomalyIds: Set<string>
): string[] {
  const allIds = new Set([...dataAnomalyIds, ...noteAnomalyIds]);
  return [...allIds].sort();
}
