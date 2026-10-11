import mammoth from "mammoth";
import { titleFromFilename } from "@/lib/utils";
import { finalizeExtraction } from "@/lib/extract/chunk";
import type { ExtractedModule, TextChunk } from "@/lib/types";

export async function extractDocx(
  buffer: Buffer,
  filename: string,
): Promise<ExtractedModule> {
  const result = await mammoth.convertToHtml({ buffer });
  const html = result.value || "";
  const chunks = chunksFromHtml(html);

  if (!chunks.length) {
    const raw = await mammoth.extractRawText({ buffer });
    const text = raw.value.trim();
    if (!text) {
      throw new Error("No text could be read from this Word document.");
    }
    chunks.push({ title: "Document", text });
  }

  return finalizeExtraction({
    title: titleFromFilename(filename) || "Word module",
    sourceName: filename,
    chunks,
  });
}

function chunksFromHtml(html: string): TextChunk[] {
  const headingSplit = html.split(/<h[1-3][^>]*>/i);
  if (headingSplit.length <= 1) {
    const text = stripHtml(html);
    return text ? [{ title: "Document", text }] : [];
  }

  const chunks: TextChunk[] = [];
  for (const part of headingSplit) {
    if (!part.trim()) continue;
    const close = part.match(/<\/h[1-3]>/i);
    let title = "Section";
    let body = part;
    if (close) {
      title = stripHtml(part.slice(0, close.index)).slice(0, 80) || "Section";
      body = part.slice((close.index ?? 0) + close[0].length);
    }
    const text = stripHtml(body);
    if (text) chunks.push({ title, text });
  }
  return chunks;
}

function stripHtml(value: string) {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
