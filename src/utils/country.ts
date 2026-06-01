const DEFAULT_COUNTRY = "UY";

// Maps IANA timezone → ISO 3166-1 alpha-2 country code.
// Covers LATAM + common regions. Extend as needed.
const TZ_COUNTRY: Record<string, string> = {
  "America/Montevideo": "UY",
  "America/Buenos_Aires": "AR",
  "America/Argentina/Buenos_Aires": "AR",
  "America/Argentina/Cordoba": "AR",
  "America/Argentina/Mendoza": "AR",
  "America/Sao_Paulo": "BR",
  "America/Manaus": "BR",
  "America/Fortaleza": "BR",
  "America/Santiago": "CL",
  "America/Bogota": "CO",
  "America/Lima": "PE",
  "America/Caracas": "VE",
  "America/Mexico_City": "MX",
  "America/Monterrey": "MX",
  "America/Tijuana": "MX",
  "America/Asuncion": "PY",
  "America/La_Paz": "BO",
  "America/Guayaquil": "EC",
  "America/Panama": "PA",
  "America/Costa_Rica": "CR",
  "America/Guatemala": "GT",
  "America/Tegucigalpa": "HN",
  "America/Managua": "NI",
  "America/El_Salvador": "SV",
  "America/Santo_Domingo": "DO",
  "America/Havana": "CU",
  "America/New_York": "US",
  "America/Chicago": "US",
  "America/Denver": "US",
  "America/Los_Angeles": "US",
  "America/Toronto": "CA",
  "America/Vancouver": "CA",
  "Europe/Madrid": "ES",
  "Europe/London": "GB",
  "Europe/Paris": "FR",
  "Europe/Berlin": "DE",
  "Europe/Rome": "IT",
  "Europe/Lisbon": "PT",
};

/**
 * Server Component: reads country from host-injected IP headers.
 * Must only be called in server context (Server Components, Route Handlers, Server Actions).
 */
export async function getUserCountryServer(): Promise<string> {
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    const country =
      h.get("x-vercel-ip-country") ??
      h.get("cf-ipcountry") ??
      h.get("x-country");
    return country && country !== "XX" ? country : DEFAULT_COUNTRY;
  } catch {
    return DEFAULT_COUNTRY;
  }
}

/**
 * Client Component: infers country from the browser's IANA timezone.
 * Safe to call synchronously on the client.
 */
export function getUserCountryClient(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return TZ_COUNTRY[tz] ?? DEFAULT_COUNTRY;
  } catch {
    return DEFAULT_COUNTRY;
  }
}

/**
 * Universal: picks the right strategy based on the execution context.
 * - Server → IP header (accurate)
 * - Client → Intl timezone (approximate)
 * Always resolves; never throws.
 */
export async function getUserCountry(): Promise<string> {
  if (typeof window === "undefined") {
    return getUserCountryServer();
  }
  return getUserCountryClient();
}
