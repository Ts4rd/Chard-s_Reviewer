import { normalizeKey } from "@/lib/utils";
import type { GeneratedReviewer } from "@/lib/ai/schema";

const PLACEHOLDER =
  /^(related concept|option|choice|answer|none of the above|all of the above)\b/i;

export function hardenMultipleChoice(
  items: GeneratedReviewer["multipleChoice"],
): GeneratedReviewer["multipleChoice"] {
  return items
    .map((item, index) => sanitizeOne(item, index))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

function sanitizeOne(
  item: GeneratedReviewer["multipleChoice"][number],
  seed: number,
) {
  const rawChoices = item.choices.map((choice) => choice.trim()).filter(Boolean);
  const correct = rawChoices[item.correctIndex];
  if (!correct) return null;

  const others = rawChoices
    .filter((_, index) => index !== item.correctIndex)
    .filter((choice) => !PLACEHOLDER.test(choice))
    .filter((choice) => normalizeKey(choice) !== normalizeKey(correct));

  if (others.length < 2) return null;

  const balanced = [correct, ...others.slice(0, 3)].map((choice) =>
    matchChoiceShape(choice, correct),
  );
  const shuffled = shuffle(balanced, seed + balanced.join("").length);
  const correctIndex = shuffled.findIndex(
    (choice) => normalizeKey(choice) === normalizeKey(correct),
  );
  if (correctIndex < 0) return null;

  return {
    ...item,
    question: hideAnswerInStem(item.question, correct),
    choices: shuffled,
    correctIndex,
    source: hideAnswerInStem(item.source, correct),
  };
}

function hideAnswerInStem(text: string, answer: string) {
  const escaped = answer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!escaped) return text;
  return text.replace(new RegExp(`\\b${escaped}\\b`, "ig"), "______");
}

function matchChoiceShape(choice: string, correct: string) {
  const trimmed = choice.replace(/[.\s]+$/, "");
  const correctEndedWithPeriod = /\.$/.test(correct.trim());
  if (correctEndedWithPeriod && !/\.$/.test(trimmed)) return `${trimmed}.`;
  if (!correctEndedWithPeriod) return trimmed.replace(/\.$/, "");
  return trimmed;
}

function shuffle<T>(items: T[], seed: number) {
  const copy = [...items];
  let state = seed + 1;
  for (let i = copy.length - 1; i > 0; i -= 1) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const j = state % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
