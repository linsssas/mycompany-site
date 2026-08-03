// Pro-лицензия v1 для статического сайта: ключ формата IVM-XXXX-XXXX с
// контрольной суммой, проверяется локально. Ключи выпускает scripts/generate-license.mjs,
// выдача — вручную/через Gumroad после оплаты. При переходе на Supabase заменить
// на серверную проверку (см. docs/business/02-business-plan.md).

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function isValidLicense(key: string): boolean {
  const m = /^IVM-([A-Z2-9]{4})-([A-Z2-9]{4})$/.exec(key.trim().toUpperCase());
  if (!m) return false;
  const chars = (m[1] + m[2]).split("");
  const sum = chars.reduce((acc, ch) => acc + ALPHABET.indexOf(ch), 0);
  return chars.every((ch) => ALPHABET.includes(ch)) && sum % 31 === 7;
}

export const LICENSE_STORAGE_KEY = "invomat.license";
