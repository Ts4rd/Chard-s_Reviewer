import {
  GoogleGenerativeAI,
  SchemaType,
  type ObjectSchema,
} from "@google/generative-ai";
import { hardenMultipleChoice } from "@/lib/ai/hardenMcq";
import { generateLocalReviewer } from "@/lib/ai/localFallback";
import { generatedReviewerSchema, type GeneratedReviewer } from "@/lib/ai/schema";
import { newId, normalizeKey } from "@/lib/utils";
import type {
  Flashcard,
  GenerateRequest,
  Identification,
  MultipleChoice,
  ReviewerDeck,
} from "@/lib/types";

const MODELS = ["gemini-2.0-flash", "gemini-1.5-flash"];

export async function generateReviewer(request: GenerateRequest): Promise<ReviewerDeck> {
  const modes = request.modes;
  if (!modes.flashcards && !modes.multipleChoice && !modes.identification) {
    throw new Error("Select at least one study mode to generate.");
  }

  const chunks = request.chunks.filter((chunk) => chunk.text.trim().length >= 80);
  if (!chunks.length) {
    throw new Error("The module text is too short to build a reviewer.");
  }

  const allocations = allocate(request.questionCount, chunks.length, modes);
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const forceLocal = process.env.USE_LOCAL_GENERATOR === "1";
  let usedGemini = false;
  const parts: GeneratedReviewer[] = [];

  for (const [index, chunk] of chunks.entries()) {
    const allocation = allocations[index];
    if (!allocation) continue;
    if (
      allocation.flashcards + allocation.multipleChoice + allocation.identification <=
      0
    ) {
      continue;
    }

    if (apiKey && !forceLocal) {
      try {
        parts.push(
          await generateWithGemini({
            apiKey,
            chunk,
            difficulty: request.difficulty,
            allocation,
          }),
        );
        usedGemini = true;
        continue;
      } catch {
        // Fall through to the local generator for this section.
      }
    }

    parts.push(
      generateLocalReviewer({
        chunks: [chunk],
        questionCount:
          allocation.flashcards +
          allocation.multipleChoice +
          allocation.identification,
        difficulty: request.difficulty,
        modes: {
          flashcards: allocation.flashcards > 0,
          multipleChoice: allocation.multipleChoice > 0,
          identification: allocation.identification > 0,
        },
      }),
    );
  }

  const generator: ReviewerDeck["generator"] = usedGemini ? "gemini" : "local";

  const merged = mergeAndDedup(parts);
  return {
    id: newId(),
    title: request.title || "Untitled module",
    sourceName: request.sourceName,
    createdAt: new Date().toISOString(),
    truncated: request.truncated,
    generator,
    flashcards: merged.flashcards,
    multipleChoice: merged.multipleChoice,
    identification: merged.identification,
  };
}

type Allocation = {
  flashcards: number;
  multipleChoice: number;
  identification: number;
};

function allocate(
  questionCount: number,
  chunkCount: number,
  modes: GenerateRequest["modes"],
) {
  const enabled = (
    ["flashcards", "multipleChoice", "identification"] as const
  ).filter((mode) => modes[mode]);
  const perMode = splitEven(questionCount, enabled.length);
  const byMode = {
    flashcards: 0,
    multipleChoice: 0,
    identification: 0,
  };
  enabled.forEach((mode, index) => {
    byMode[mode] = perMode[index] ?? 0;
  });

  return Array.from({ length: chunkCount }, (_, chunkIndex) => {
    const allocation: Allocation = {
      flashcards: 0,
      multipleChoice: 0,
      identification: 0,
    };
    for (const mode of enabled) {
      allocation[mode] = share(byMode[mode], chunkCount, chunkIndex);
    }
    return allocation;
  });
}

function splitEven(total: number, parts: number) {
  if (parts <= 0) return [];
  const base = Math.floor(total / parts);
  let leftover = total - base * parts;
  return Array.from({ length: parts }, () => {
    const extra = leftover > 0 ? 1 : 0;
    leftover -= extra;
    return base + extra;
  });
}

function share(total: number, parts: number, index: number) {
  const base = Math.floor(total / parts);
  const leftover = total % parts;
  return base + (index < leftover ? 1 : 0);
}

async function generateWithGemini(input: {
  apiKey: string;
  chunk: GenerateRequest["chunks"][number];
  difficulty: GenerateRequest["difficulty"];
  allocation: Allocation;
}): Promise<GeneratedReviewer> {
  const client = new GoogleGenerativeAI(input.apiKey);
  let lastError: unknown;

  for (const modelName of MODELS) {
    try {
      const model = client.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: input.difficulty === "easy" ? 0.4 : 0.65,
          responseMimeType: "application/json",
          responseSchema: geminiSchema(),
        },
      });

      const prompt = [
        "You are a strict exam writer creating reviewer items from ONE section of a student module.",
        "Use only facts from the provided text. Do not invent names, dates, or claims.",
        `Difficulty: ${input.difficulty}. Write ${input.difficulty === "easy" ? "fair recall" : "application, comparison, and exception"} questions.`,
        `Create exactly ${input.allocation.flashcards} flashcards, ${input.allocation.multipleChoice} multiple-choice questions, and ${input.allocation.identification} identification items.`,
        [
          "HARD MULTIPLE-CHOICE RULES:",
          "- The question stem must NOT contain the correct answer's wording.",
          "- Do not quote a sentence that already names the answer.",
          "- All 4 choices must be the same kind of thing, same grammar, and similar length (within a few words).",
          "- Distractors must be plausible mix-ups from THIS module (nearby terms, opposite processes, common student errors).",
          "- Never use All/None of the above, jokes, numbered placeholders, or obviously wrong filler.",
          "- Do not make the correct choice longer, more detailed, or more formal than the others.",
          "- Place the correct answer in a random slot. Do not prefer A.",
        ].join("\n"),
        "Identification answers must be short terms, names, or concepts. Include aliases for common variants.",
        "Each item needs a short source tag using the section title, without repeating the answer.",
        `Section title: ${input.chunk.title}`,
        "Section text:",
        input.chunk.text,
      ].join("\n\n");

      const result = await model.generateContent(prompt);
      const parsed = generatedReviewerSchema.parse(
        JSON.parse(result.response.text()),
      );
      return parsed;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Gemini could not generate this section.");
}

function geminiSchema(): ObjectSchema {
  const item: ObjectSchema = {
    type: SchemaType.OBJECT,
    properties: {
      front: { type: SchemaType.STRING },
      back: { type: SchemaType.STRING },
      source: { type: SchemaType.STRING },
    },
    required: ["front", "back", "source"],
  };

  return {
    type: SchemaType.OBJECT,
    properties: {
      flashcards: { type: SchemaType.ARRAY, items: item },
      multipleChoice: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            question: { type: SchemaType.STRING },
            choices: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            correctIndex: { type: SchemaType.INTEGER },
            explanation: { type: SchemaType.STRING },
            source: { type: SchemaType.STRING },
          },
          required: [
            "question",
            "choices",
            "correctIndex",
            "explanation",
            "source",
          ],
        },
      },
      identification: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            prompt: { type: SchemaType.STRING },
            answer: { type: SchemaType.STRING },
            aliases: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            source: { type: SchemaType.STRING },
          },
          required: ["prompt", "answer", "source"],
        },
      },
    },
    required: ["flashcards", "multipleChoice", "identification"],
  };
}

function mergeAndDedup(parts: GeneratedReviewer[]) {
  const flashcards: Flashcard[] = [];
  const multipleChoice: MultipleChoice[] = [];
  const identification: Identification[] = [];
  const seen = new Set<string>();

  for (const part of parts) {
    for (const card of part.flashcards) {
      const key = `f:${normalizeKey(card.front)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      flashcards.push({ ...card, id: newId() });
    }
    for (const item of hardenMultipleChoice(part.multipleChoice)) {
      const key = `m:${normalizeKey(item.question)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      multipleChoice.push({
        ...item,
        id: newId(),
      });
    }
    for (const item of part.identification) {
      const key = `i:${normalizeKey(item.prompt)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      identification.push({ ...item, aliases: item.aliases ?? [], id: newId() });
    }
  }

  return { flashcards, multipleChoice, identification };
}
