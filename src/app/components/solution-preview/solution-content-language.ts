export type SupportedContentLanguage = 'en' | 'fr';

const SAMPLE_CHARACTER_LIMIT = 50_000;
const MINIMUM_TOKEN_COUNT = 8;

const ENGLISH_WORDS = new Set([
  'about',
  'after',
  'also',
  'and',
  'are',
  'because',
  'been',
  'before',
  'between',
  'both',
  'but',
  'can',
  'could',
  'does',
  'each',
  'for',
  'from',
  'had',
  'has',
  'have',
  'how',
  'into',
  'its',
  'more',
  'most',
  'not',
  'our',
  'should',
  'than',
  'that',
  'the',
  'their',
  'them',
  'there',
  'these',
  'they',
  'this',
  'those',
  'through',
  'was',
  'were',
  'what',
  'when',
  'where',
  'which',
  'while',
  'who',
  'will',
  'with',
  'would',
  'you',
  'your',
]);

const FRENCH_WORDS = new Set([
  'ainsi',
  'alors',
  'après',
  'aussi',
  'aux',
  'avec',
  'avant',
  'avoir',
  'car',
  'cela',
  'ces',
  'cette',
  'comme',
  'dans',
  'des',
  'donc',
  'elle',
  'elles',
  'entre',
  'est',
  'être',
  'faire',
  'ils',
  'leurs',
  'mais',
  'nous',
  'notre',
  'nos',
  'ont',
  'par',
  'pas',
  'peut',
  'plus',
  'pour',
  'quand',
  'que',
  'quel',
  'quelle',
  'qui',
  'sans',
  'sera',
  'serait',
  'ses',
  'sont',
  'sur',
  'tous',
  'tout',
  'très',
  'une',
  'vous',
  'votre',
  'vos',
]);

const ENGLISH_STRONG_WORDS = new Set([
  'and',
  'because',
  'from',
  'should',
  'that',
  'the',
  'their',
  'these',
  'they',
  'this',
  'those',
  'through',
  'what',
  'when',
  'which',
  'while',
  'with',
  'would',
]);

const FRENCH_STRONG_WORDS = new Set([
  'ainsi',
  'aux',
  'avec',
  'cela',
  'cette',
  'dans',
  'des',
  'donc',
  'elles',
  'leurs',
  'nous',
  'pour',
  'quand',
  'quelle',
  'sont',
  'très',
  'une',
  'vous',
]);

const decodeHtmlEntity = (entity: string): string => {
  const normalized = entity.toLowerCase();
  const namedEntities: Record<string, string> = {
    '&amp;': '&',
    '&apos;': "'",
    '&gt;': '>',
    '&lt;': '<',
    '&nbsp;': ' ',
    '&quot;': '"',
  };
  const named = namedEntities[normalized];
  if (named !== undefined) return named;

  const hexadecimal = normalized.match(/^&#x([0-9a-f]+);$/);
  const decimal = normalized.match(/^&#([0-9]+);$/);
  const codePoint = hexadecimal
    ? Number.parseInt(hexadecimal[1], 16)
    : decimal
      ? Number.parseInt(decimal[1], 10)
      : Number.NaN;
  return Number.isInteger(codePoint) &&
    codePoint > 0 &&
    codePoint <= 0x10ffff
    ? String.fromCodePoint(codePoint)
    : ' ';
};

const plainTextSample = (values: readonly unknown[]): string =>
  values
    .map((value) => String(value || ''))
    .join(' ')
    .slice(0, SAMPLE_CHARACTER_LIMIT)
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(?:#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, decodeHtmlEntity)
    .replace(/\u00a0/g, ' ')
    .normalize('NFKC')
    .toLowerCase();

export const normalizeSupportedContentLanguage = (
  language: unknown
): SupportedContentLanguage | null => {
  const normalized = String(language || '').trim().toLowerCase();
  if (normalized === 'en' || normalized.startsWith('en-')) return 'en';
  if (normalized === 'fr' || normalized.startsWith('fr-')) return 'fr';
  return null;
};

/**
 * Detects English or French without a network request.
 *
 * The detector intentionally returns null when evidence is weak or mixed.
 * Callers should keep translation available for null rather than risk hiding
 * it for content written in another language.
 */
export const detectSupportedContentLanguage = (
  values: readonly unknown[]
): SupportedContentLanguage | null => {
  const sample = plainTextSample(values);
  const tokens = sample.match(/\p{L}+(?:['’]\p{L}+)*/gu) || [];
  if (tokens.length < MINIMUM_TOKEN_COUNT) return null;

  let englishScore = 0;
  let frenchScore = 0;

  for (const token of tokens) {
    if (ENGLISH_STRONG_WORDS.has(token)) {
      englishScore += 2;
    } else if (ENGLISH_WORDS.has(token)) {
      englishScore += 1;
    }

    if (FRENCH_STRONG_WORDS.has(token)) {
      frenchScore += 2;
    } else if (FRENCH_WORDS.has(token)) {
      frenchScore += 1;
    }

    if (/[àâæçéèêëîïôœùûüÿ]/u.test(token)) {
      frenchScore += 1;
    }
    if (/^(?:c|d|j|l|m|n|qu|s|t)['’]\p{L}+/u.test(token)) {
      frenchScore += 2;
    }
    if (/\p{L}+(?:n't|'re|'ve|'ll|'m)$/u.test(token)) {
      englishScore += 2;
    }
  }

  const winningScore = Math.max(englishScore, frenchScore);
  const losingScore = Math.min(englishScore, frenchScore);
  const requiredMargin = Math.max(
    3,
    Math.ceil((winningScore + losingScore) * 0.2)
  );
  if (winningScore < 4 || winningScore - losingScore < requiredMargin) {
    return null;
  }

  return englishScore > frenchScore ? 'en' : 'fr';
};

export const shouldOfferContentTranslation = (
  sourceLanguage: unknown,
  targetLanguage: SupportedContentLanguage,
  alreadyInTargetLanguage = false
): boolean => {
  if (alreadyInTargetLanguage) return false;
  const source = normalizeSupportedContentLanguage(sourceLanguage);
  return source === null || source !== targetLanguage;
};
