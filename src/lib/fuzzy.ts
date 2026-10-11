import { normalizeKey } from "@/lib/utils";

function levenshtein(a: string, b: string) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const row = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i += 1) {
    let prev = i - 1;
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const current = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = current;
    }
  }

  return row[b.length];
}

export function answersMatch(input: string, answer: string, aliases: string[] = []) {
  const guess = normalizeKey(input);
  if (!guess) return false;

  const candidates = [answer, ...aliases].map(normalizeKey).filter(Boolean);
  return candidates.some((candidate) => {
    if (guess === candidate) return true;
    if (candidate.includes(guess) && guess.length >= Math.min(6, candidate.length)) {
      return true;
    }
    const distance = levenshtein(guess, candidate);
    const allowed = candidate.length <= 5 ? 1 : candidate.length <= 12 ? 2 : 3;
    return distance <= allowed;
  });
}
