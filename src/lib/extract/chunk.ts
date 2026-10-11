import type { ExtractedModule, TextChunk } from "@/lib/types";

export const MAX_MODULE_CHARS = 200_000;
const TARGET_CHUNK_CHARS = 3_500;
const MIN_CHUNK_CHARS = 280;

export function finalizeExtraction(input: {
  title: string;
  sourceName: string;
  chunks: TextChunk[];
}): ExtractedModule {
  const merged: TextChunk[] = [];

  for (const chunk of input.chunks) {
    const text = chunk.text.replace(/\s+/g, " ").trim();
    if (!text) continue;

    const last = merged.at(-1);
    if (text.length < MIN_CHUNK_CHARS && last && last.text.length < TARGET_CHUNK_CHARS) {
      last.text = `${last.text} ${text}`.trim();
      continue;
    }

    if (text.length <= TARGET_CHUNK_CHARS * 1.4) {
      merged.push({ title: chunk.title, text });
      continue;
    }

    merged.push(...splitLongChunk(chunk.title, text));
  }

  let used = 0;
  const capped: TextChunk[] = [];
  for (const chunk of merged) {
    if (used >= MAX_MODULE_CHARS) break;
    const available = MAX_MODULE_CHARS - used;
    if (chunk.text.length <= available) {
      capped.push(chunk);
      used += chunk.text.length;
    } else if (available > MIN_CHUNK_CHARS) {
      capped.push({ ...chunk, text: chunk.text.slice(0, available) });
      used += available;
    }
  }

  const text = capped.map((chunk) => `## ${chunk.title}\n${chunk.text}`).join("\n\n");
  const truncated =
    used >= MAX_MODULE_CHARS ||
    input.chunks.some((chunk) => chunk.text.length > 0) &&
      capped.length < merged.length;

  return {
    title: input.title,
    sourceName: input.sourceName,
    text,
    chunks: capped,
    truncated,
  };
}

function splitLongChunk(title: string, text: string): TextChunk[] {
  const parts: TextChunk[] = [];
  let start = 0;
  let index = 1;

  while (start < text.length) {
    let end = Math.min(start + TARGET_CHUNK_CHARS, text.length);
    if (end < text.length) {
      const window = text.slice(start, end);
      const breakAt = Math.max(
        window.lastIndexOf(". "),
        window.lastIndexOf("\n"),
        window.lastIndexOf("? "),
      );
      if (breakAt > TARGET_CHUNK_CHARS * 0.5) {
        end = start + breakAt + 1;
      }
    }

    parts.push({
      title: parts.length === 0 ? title : `${title} (${index})`,
      text: text.slice(start, end).trim(),
    });
    start = end;
    index += 1;
  }

  return parts.filter((part) => part.text);
}
