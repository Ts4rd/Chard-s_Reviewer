import type { Difficulty, GenerateModes, TextChunk } from "@/lib/types";
import type { GeneratedReviewer } from "@/lib/ai/schema";

const STOP = new Set([
  "the",
  "and",
  "for",
  "that",
  "with",
  "this",
  "from",
  "are",
  "was",
  "were",
  "have",
  "has",
  "been",
  "into",
  "their",
  "they",
  "them",
  "which",
  "what",
  "when",
  "your",
  "about",
]);

export function generateLocalReviewer(input: {
  chunks: TextChunk[];
  questionCount: number;
  difficulty: Difficulty;
  modes: GenerateModes;
}): GeneratedReviewer {
  const sentences = input.chunks.flatMap((chunk) =>
    splitSentences(chunk.text).map((sentence) => ({
      sentence,
      source: chunk.title,
    })),
  );

  const terms = unique(
    input.chunks.flatMap((chunk) => extractTerms(chunk.text)),
  );

  const usable = sentences.filter((item) => item.sentence.length > 40);
  const pool = usable.length ? usable : sentences;
  const perMode = splitCount(input.questionCount, input.modes);
  const hard = input.difficulty === "hard";

  return {
    flashcards: input.modes.flashcards
      ? take(pool, perMode.flashcards).map((item, index) => {
          const term = terms[index % Math.max(terms.length, 1)] || firstPhrase(item.sentence);
          return {
            front: hard ? `Explain: ${term}` : term,
            back: item.sentence,
            source: item.source,
          };
        })
      : [],
    multipleChoice: input.modes.multipleChoice
      ? take(pool, perMode.multipleChoice)
          .map((item, index) => {
            const answer =
              termInSentence(item.sentence, terms) ||
              terms[index % Math.max(terms.length, 1)] ||
              firstPhrase(item.sentence);
            const distractors = similarTerms(answer, [
              ...terms,
              ...pool.map((entry) => firstPhrase(entry.sentence)),
            ], 3);
            if (distractors.length < 3) return null;
            const choices = shuffleStable([answer, ...distractors], index + answer.length);
            const blanked = hideTerm(item.sentence, answer);
            return {
              question: hard
                ? `Which option correctly completes this idea? "${clip(blanked, 160)}"`
                : `Which term belongs in the blank? "${clip(blanked, 150)}"`,
              choices,
              correctIndex: Math.max(
                0,
                choices.findIndex(
                  (choice) => choice.toLowerCase() === answer.toLowerCase(),
                ),
              ),
              explanation: item.sentence,
              source: item.source,
            };
          })
          .filter((item): item is NonNullable<typeof item> => Boolean(item))
      : [],
    identification: input.modes.identification
      ? take(pool, perMode.identification).map((item, index) => {
          const answer = terms[index % Math.max(terms.length, 1)] || firstPhrase(item.sentence);
          return {
            prompt: hard
              ? `Name the concept described: ${clip(item.sentence, 180)}`
              : `Identify the key term from ${item.source}: ${clip(item.sentence, 160)}`,
            answer,
            aliases: [],
            source: item.source,
          };
        })
      : [],
  };
}

function splitCount(total: number, modes: GenerateModes) {
  const enabled = (
    ["flashcards", "multipleChoice", "identification"] as const
  ).filter((mode) => modes[mode]);
  const base = Math.floor(total / Math.max(enabled.length, 1));
  let leftover = total - base * enabled.length;
  const counts = { flashcards: 0, multipleChoice: 0, identification: 0 };
  for (const mode of enabled) {
    counts[mode] = base + (leftover > 0 ? 1 : 0);
    leftover -= leftover > 0 ? 1 : 0;
  }
  return counts;
}

function splitSentences(text: string) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 20);
}

function extractTerms(text: string) {
  const titled = text.match(/\b[A-Z][a-zA-Z]{3,}(?:\s+[A-Z][a-zA-Z]{3,}){0,3}\b/g) ?? [];
  const defined =
    text.match(/\b([A-Z][a-zA-Z]{3,})\s+(?:is|are|means|refers to)\b/g)?.map((match) =>
      match.replace(/\s+(?:is|are|means|refers to)$/i, ""),
    ) ?? [];
  return [...titled, ...defined]
    .map((term) => term.trim())
    .filter((term) => !STOP.has(term.toLowerCase()));
}

function firstPhrase(sentence: string) {
  return sentence.split(/\s+/).slice(0, 4).join(" ").replace(/[.,;:]+$/, "");
}

function termInSentence(sentence: string, terms: string[]) {
  const lower = sentence.toLowerCase();
  return (
    [...terms]
      .filter((term) => lower.includes(term.toLowerCase()))
      .sort((a, b) => b.length - a.length)[0] || ""
  );
}

function hideTerm(sentence: string, term: string) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const blanked = escaped
    ? sentence.replace(new RegExp(`\\b${escaped}\\b`, "ig"), "______")
    : sentence;
  return blanked;
}

function similarTerms(answer: string, terms: string[], needed: number) {
  const target = answer.length;
  return unique(terms)
    .filter((term) => term.toLowerCase() !== answer.toLowerCase())
    .sort((a, b) => Math.abs(a.length - target) - Math.abs(b.length - target))
    .slice(0, needed);
}

function take<T>(items: T[], count: number) {
  if (!items.length || count <= 0) return [];
  return Array.from({ length: count }, (_, index) => items[index % items.length]);
}

function unique(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

function shuffleStable<T>(items: T[], seed: number) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = (seed * 17 + i * 31) % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function clip(value: string, max: number) {
  return value.length <= max ? value : `${value.slice(0, max - 1).trim()}…`;
}
