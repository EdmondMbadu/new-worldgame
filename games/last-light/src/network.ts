/**
 * What the connection can comfortably carry. Browsers that expose the Network
 * Information API report data saving, the connection class and an estimated
 * downlink; the others (Safari, Firefox) report nothing, so unknown connections
 * get the light assets unless the device is clearly a desktop.
 */
type Connection = { saveData?: boolean; effectiveType?: string; downlink?: number };
const connection = (): Connection | undefined =>
  typeof navigator === 'undefined'
    ? undefined
    : (navigator as Navigator & { connection?: Connection }).connection;

/** A fast, unmetered connection: full-quality music and sharper textures. */
export function fastNetwork() {
  const c = connection();
  if (!c || c.saveData) return false;
  return c.effectiveType === '4g' && (c.downlink ?? 0) >= 5;
}
/** Optional extras (sharper textures) may stream in after a drive has started. */
export function allowHeavyDownloads() {
  const c = connection();
  if (c) return !c.saveData && c.effectiveType === '4g' && (c.downlink ?? 10) >= 2;
  return (
    typeof matchMedia !== 'undefined' && matchMedia('(pointer:fine)').matches
  );
}
