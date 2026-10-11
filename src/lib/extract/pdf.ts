import { extractText } from "unpdf";
import { titleFromFilename } from "@/lib/utils";
import { finalizeExtraction } from "@/lib/extract/chunk";
import type { ExtractedModule } from "@/lib/types";

export async function extractPdf(
  buffer: Buffer,
  filename: string,
): Promise<ExtractedModule> {
  const data = new Uint8Array(buffer);
  const result = await extractText(data, { mergePages: false });
  const pages = Array.isArray(result.text) ? result.text : [result.text];

  const chunks = pages.map((page, index) => ({
    title: `Page ${index + 1}`,
    text: String(page ?? "").trim(),
  }));

  if (!chunks.some((chunk) => chunk.text)) {
    throw new Error(
      "No text could be read from this PDF. It may be scanned images — upload a text-based file instead.",
    );
  }

  return finalizeExtraction({
    title: titleFromFilename(filename) || "PDF module",
    sourceName: filename,
    chunks,
  });
}
