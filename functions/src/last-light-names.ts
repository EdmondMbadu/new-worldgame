/** Account names are public display text, never email-derived identifiers. */
export function cleanAccountName(value: unknown): string {
  if (typeof value !== 'string') return '';
  const name = value.normalize('NFKC').replace(/[\p{Cc}\p{Cf}]/gu, '')
    .trim().replace(/\s+/g, ' ');
  return name && !/[<>@]/.test(name) ? [...name].slice(0, 160).join('') : '';
}

export function accountDisplayName(profile: Record<string, unknown> = {}): string {
  const fullName = [profile.firstName, profile.lastName]
    .filter((part): part is string => typeof part === 'string').join(' ');
  return cleanAccountName(fullName) || cleanAccountName(profile.displayName);
}

// Both historic generators used these words plus a two-digit suffix. A choice
// explicitly saved as custom always wins, even if it resembles a default.
const generatedAlias = /^(Steady|Bright|Careful|Swift|Quiet|Brave|Patient|Golden|Kind|Evening|Gentle|Keen) (Baobab|Kingfisher|Lantern|Acacia|Heron|Sunbird|Firefly|Palm|River|Ridge|Weaver|Hornbill) [1-9][0-9]$/;
export function hasCustomPlayerName(player: { name?: string; nameSource?: string }): boolean {
  return !!player.name && (player.nameSource === 'custom' ||
    (!player.nameSource && !generatedAlias.test(player.name)));
}
