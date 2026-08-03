// Генератор Pro-ключей Invomat: node scripts/generate-license.mjs [количество]
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomKey() {
  while (true) {
    const chars = Array.from({ length: 8 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]);
    const sum = chars.reduce((acc, ch) => acc + ALPHABET.indexOf(ch), 0);
    if (sum % 31 === 7) {
      return `IVM-${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`;
    }
  }
}

const count = Number(process.argv[2] ?? 1);
for (let i = 0; i < count; i++) console.log(randomKey());
