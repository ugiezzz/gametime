import * as Localization from 'expo-localization';
import type { CountryCode } from 'libphonenumber-js';
import { AsYouType, parsePhoneNumberFromString } from 'libphonenumber-js';

export type NormalizedPhone = {
  e164: string | null;
  region: string | null;
  national: string | null;
  isValid: boolean;
  error?: string;
};

export function getDefaultRegion(): string {
  // Use getLocales() which is the current API in expo-localization
  const locales = Localization.getLocales();
  const region = locales[0]?.regionCode?.toUpperCase();
  return region && /^[A-Z]{2}$/.test(region) ? region : 'US';
}

export function normalizePhoneNumber(
  input: string,
  region?: string,
): NormalizedPhone {
  try {
    const raw = (input || '').trim();
    if (!raw)
      return {
        e164: null,
        region: region || getDefaultRegion(),
        national: null,
        isValid: false,
        error: 'empty',
      };

    const hasPlus = raw.startsWith('+');
    const effectiveRegion = (region || getDefaultRegion()) as CountryCode;

    const parsed = hasPlus
      ? parsePhoneNumberFromString(raw)
      : parsePhoneNumberFromString(raw, effectiveRegion);

    if (!parsed || !parsed.isValid()) {
      return {
        e164: null,
        region: parsed?.country || effectiveRegion || null,
        national: null,
        isValid: false,
        error: 'invalid',
      };
    }

    return {
      e164: parsed.number, // E.164
      region: parsed.country || null,
      national: parsed.formatNational(),
      isValid: true,
    };
  } catch (e) {
    return {
      e164: null,
      region: region || getDefaultRegion(),
      national: null,
      isValid: false,
      error: 'exception',
    };
  }
}

export function formatExamplePlaceholder(region?: string): string {
  const r = (region || getDefaultRegion()) as CountryCode;
  // Lightweight placeholder using AsYouType with a fake sequence
  const formatter = new AsYouType(r);
  // Push common mobile length digits to get a plausible example
  const sample = '5551234567';
  formatter.input(sample);
  const out = formatter.getTemplate() || formatter.getNumberValue() || sample;
  return out.replace(/\d/g, (d) => d).trim();
}
