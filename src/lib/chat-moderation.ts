// Filtro server-side de intercambio de datos de contacto en el chat chef↔cliente.
// Se llama desde sendMessage / sendClientMessage ANTES de insert_message().
// Objetivo: atrapar la mayoría de intentos obvios + disuadir + registrar — no
// una imposibilidad total (ver análisis: la ofuscación total nunca se cubre 100%).

export type ModerationCategory = "phone" | "email" | "social" | "keyword" | "spelled_digits";

export type ModerationResult =
  | { blocked: false }
  | { blocked: true; category: ModerationCategory };

export const MODERATION_BLOCKED_MESSAGE =
  "Por tu seguridad, no compartas datos de contacto acá. Tu pago queda protegido y el servicio respaldado solo si todo se gestiona dentro de GetChef.";

export const MODERATION_PASSIVE_NOTICE =
  "🔒 Pagos protegidos dentro de GetChef hasta completar el servicio";

function stripAccents(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function normalize(text: string): string {
  return stripAccents(text).toLowerCase();
}

// ── Email ────────────────────────────────────────────────────────────────────

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;

function hasEmail(normalized: string): boolean {
  if (EMAIL_RE.test(normalized)) return true;
  // Variante hablada: "sebastian arroba gmail punto com"
  const spoken = normalized
    .replace(/\s+arroba\s+/g, "@")
    .replace(/\s+punto\s+/g, ".");
  return EMAIL_RE.test(spoken);
}

// ── Teléfono ─────────────────────────────────────────────────────────────────

// Corridas de dígitos con separadores de teléfono típicos (espacio, guion, punto).
// Deliberadamente NO incluye "/" para no chocar con fechas DD/MM/YYYY.
const DIGIT_RUN_RE = /\+?\d[\d .-]{5,13}\d/g;

const ISO_DATE_RE = /^\d{4}[.-]\d{2}[.-]\d{2}$/;
const DMY_DATE_RE = /^\d{2}[.-]\d{2}[.-]\d{4}$/;

function looksLikeDate(rawMatch: string): boolean {
  const trimmed = rawMatch.trim();
  return ISO_DATE_RE.test(trimmed) || DMY_DATE_RE.test(trimmed);
}

function hasPhoneNumber(original: string): boolean {
  const matches = original.match(DIGIT_RUN_RE);
  if (!matches) return false;
  for (const raw of matches) {
    if (looksLikeDate(raw)) continue;
    const digitsOnly = raw.replace(/\D/g, "");
    // NI: 8 dígitos locales, o 11 con código de país 505.
    if (digitsOnly.length === 7 || digitsOnly.length === 8 || digitsOnly.length === 11) {
      return true;
    }
  }
  return false;
}

// ── Dígitos deletreados ──────────────────────────────────────────────────────

const DIGIT_WORD = "(?:cero|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve)";
// 6+ palabras-número seguidas — umbral alto a propósito para no chocar con
// conteos normales de invitados ("dos, tres personas más").
const SPELLED_DIGITS_RE = new RegExp(`(?:\\b${DIGIT_WORD}\\b[\\s,-]+){5,}\\b${DIGIT_WORD}\\b`, "i");

function hasSpelledDigits(normalized: string): boolean {
  return SPELLED_DIGITS_RE.test(normalized);
}

// ── Redes sociales / apps de mensajería ──────────────────────────────────────

const SOCIAL_KEYWORDS_RE =
  /\b(whatsapp|wasap+|wasapp|wsp|wpp|instagram|insta|facebook|face|telegram|tiktok)\b/i;

// Handle suelto tipo "@mi_usuario" (la variante con dominio ya la cubre hasEmail).
const BARE_HANDLE_RE = /(?<![\w.@])@[a-z0-9_.]{2,}\b/i;

function hasSocialMention(normalized: string): boolean {
  return SOCIAL_KEYWORDS_RE.test(normalized) || BARE_HANDLE_RE.test(normalized);
}

// ── Frases de intercambio de contacto ────────────────────────────────────────

const EXCHANGE_PHRASES = [
  "mi numero",
  "mi celular",
  "llamame",
  "llamame al",
  "escribime a",
  "escribeme a",
  "contactame",
  "te paso mi",
  "pasame tu",
  "fuera de la plataforma",
  "fuera de getchef",
  "por fuera",
  "directo conmigo",
  "directamente conmigo",
  "nos vemos fuera",
];

function hasExchangePhrase(normalized: string): boolean {
  return EXCHANGE_PHRASES.some(phrase => normalized.includes(phrase));
}

// ── Entry point ──────────────────────────────────────────────────────────────

export function checkMessageContent(content: string): ModerationResult {
  const normalized = normalize(content);

  if (hasEmail(normalized)) return { blocked: true, category: "email" };
  if (hasPhoneNumber(content)) return { blocked: true, category: "phone" };
  if (hasSpelledDigits(normalized)) return { blocked: true, category: "spelled_digits" };
  if (hasSocialMention(normalized)) return { blocked: true, category: "social" };
  if (hasExchangePhrase(normalized)) return { blocked: true, category: "keyword" };

  return { blocked: false };
}
