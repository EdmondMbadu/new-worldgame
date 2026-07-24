const ENGLISH_IMAGE_ASSET =
  '(?:image|picture|photo(?:graph)?|illustration|artwork|visual|graphic|diagram|infographic|poster|logo|wallpaper|mockup|render)';
const ENGLISH_IMAGE_ACTION =
  '(?:generate|create|make|draw|paint|sketch|design|render|produce|craft|illustrate|visualize)';
const FRENCH_IMAGE_ASSET =
  '(?:image|photo(?:graphie)?|illustration|visuel|graphique|diagramme|infographie|affiche|logo|fond\\s+d(?:ecran|\\x27ecran)|maquette|rendu)';
const FRENCH_IMAGE_ACTION =
  '(?:generer|creer|faire|dessiner|peindre|esquisser|concevoir|rendre|produire|illustrer|visualiser)';
const TOKEN_GAP = "(?:\\s+[a-z0-9][a-z0-9'-]*){0,8}";

const META_OR_NEGATED_IMAGE_REQUESTS = [
  new RegExp(
    `\\b(?:do\\s+not|dont|never|avoid|stop)\\s+(?:[a-z0-9'-]+\\s+){0,2}${ENGLISH_IMAGE_ACTION}\\b`
  ),
  new RegExp(
    `\\b(?:ne\\s+pas|n\\x27?essaie\\s+pas|jamais|evite|evitez|arrete|arretez)\\s+(?:[a-z0-9'-]+\\s+){0,2}${FRENCH_IMAGE_ACTION}\\b`
  ),
  /\b(?:how\s+(?:do|can|could|would|should)\s+(?:i|we|you)|how\s+to)\s+(?:generate|create|make|draw|design|render|produce)\b/,
  /\b(?:comment)\s+(?:puis-je|peut-on|faire|generer|creer|dessiner|concevoir)\b/,
  /\b(?:explain|describe|discuss|teach\s+me|tell\s+me\s+about)\s+(?:how\s+to\s+)?(?:image|picture|photo|illustration|image\s+generation)\b/,
  /\b(?:explique|expliquer|decris|decrire|parle-moi)\s+(?:de\s+|comment\s+)?(?:generer|creer|image|photo|illustration)\b/,
  /\b(?:generate|create|make|write|draft|improve|suggest)\s+(?:me\s+)?(?:an?\s+|the\s+)?(?:good\s+|better\s+)?prompt\b/,
  /\b(?:generer|creer|ecrire|rediger|ameliorer|suggerer)\s+(?:moi\s+)?(?:un\s+|le\s+)?(?:bon\s+|meilleur\s+)?prompt\b/,
];

const IMAGE_REQUEST_PATTERNS = [
  // Direct requests: "generate for me an image", "please make a picture", etc.
  new RegExp(
    `^(?:(?:please|kindly)\\s+)?${ENGLISH_IMAGE_ACTION}\\b${TOKEN_GAP}\\s+(?:an?\\s+|the\\s+|some\\s+)?${ENGLISH_IMAGE_ASSET}\\b`
  ),
  new RegExp(
    `\\b(?:can|could|would|will)\\s+you${TOKEN_GAP}\\s+${ENGLISH_IMAGE_ACTION}\\b${TOKEN_GAP}\\s+(?:an?\\s+|the\\s+|some\\s+)?${ENGLISH_IMAGE_ASSET}\\b`
  ),
  new RegExp(
    `\\bplease${TOKEN_GAP}\\s+${ENGLISH_IMAGE_ACTION}\\b${TOKEN_GAP}\\s+(?:an?\\s+|the\\s+|some\\s+)?${ENGLISH_IMAGE_ASSET}\\b`
  ),

  // Desire and delivery phrasing: "I'd like an illustration", "give me a visual".
  new RegExp(
    `\\b(?:i\\s+want|i\\s+need|i\\s+would\\s+like|i\\x27d\\s+like|can\\s+i\\s+(?:get|have)|could\\s+i\\s+(?:get|have)|give\\s+me|show\\s+me)\\b${TOKEN_GAP}\\s+(?:an?\\s+|the\\s+|some\\s+)?${ENGLISH_IMAGE_ASSET}\\b`
  ),

  // Visual creation verbs are unambiguous even without saying "image".
  /^(?:(?:please|kindly)\s+)?(?:draw|paint|sketch|illustrate|visualize)\b/,
  /\b(?:can|could|would|will)\s+you(?:\s+please)?\s+(?:draw|paint|sketch|illustrate|visualize)\b/,

  // Short composer-style requests: "an image of a solar city", "picture of... please".
  new RegExp(
    `^(?:please\\s+)?(?:an?\\s+|the\\s+)?${ENGLISH_IMAGE_ASSET}\\s+(?:of|for|showing|depicting|illustrating)\\b`
  ),

  // French equivalents.
  new RegExp(
    `^(?:(?:s\\x27il\\s+te\\s+plait|s\\x27il\\s+vous\\s+plait)\\s+)?${FRENCH_IMAGE_ACTION}\\b${TOKEN_GAP}\\s+(?:une?\\s+|la\\s+|le\\s+|des\\s+)?${FRENCH_IMAGE_ASSET}\\b`
  ),
  new RegExp(
    `\\b(?:peux-tu|pouvez-vous|pourrais-tu|pourriez-vous)${TOKEN_GAP}\\s+${FRENCH_IMAGE_ACTION}\\b${TOKEN_GAP}\\s+(?:une?\\s+|la\\s+|le\\s+|des\\s+)?${FRENCH_IMAGE_ASSET}\\b`
  ),
  new RegExp(
    `\\b(?:je\\s+veux|j\\x27aimerais|je\\s+voudrais|j\\x27ai\\s+besoin|donne-moi|montre-moi)\\b${TOKEN_GAP}\\s+(?:une?\\s+|la\\s+|le\\s+|des\\s+)?${FRENCH_IMAGE_ASSET}\\b`
  ),
  /^(?:(?:s'il\s+te\s+plait|s'il\s+vous\s+plait)\s+)?(?:dessine|peins|esquisse|illustre|visualise)\b/,
  new RegExp(
    `^(?:une?\\s+|la\\s+|le\\s+)?${FRENCH_IMAGE_ASSET}\\s+(?:de|du|des|pour|montrant|illustrant)\\b`
  ),
];

function normalizeImageRequestText(prompt: string): string {
  return String(prompt || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘]/g, "'")
    .replace(/[^\p{L}\p{N}'-]+/gu, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Recognizes clear image-creation intent without requiring a magic prefix.
 * Meta questions, prompt-writing requests, and negated requests remain text chat.
 */
export function isImageGenerationRequest(prompt: string): boolean {
  const normalized = normalizeImageRequestText(prompt);
  if (!normalized) return false;

  if (META_OR_NEGATED_IMAGE_REQUESTS.some((pattern) => pattern.test(normalized))) {
    return false;
  }

  return IMAGE_REQUEST_PATTERNS.some((pattern) => pattern.test(normalized));
}
