import JSZip from "jszip";
import { decodeXml, titleFromFilename } from "@/lib/utils";
import { finalizeExtraction } from "@/lib/extract/chunk";
import type { ExtractedModule } from "@/lib/types";

export async function extractPptx(
  buffer: Buffer,
  filename: string,
): Promise<ExtractedModule> {
  const zip = await JSZip.loadAsync(buffer);
  const slideNames = Object.keys(zip.files)
    .filter((name) => /ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a, b) => slideNumber(a) - slideNumber(b));

  if (!slideNames.length) {
    throw new Error("No slides could be read from this PowerPoint file.");
  }

  const chunks = [];
  for (const name of slideNames) {
    const xml = await zip.files[name].async("string");
    const texts = [...xml.matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g)].map((match) =>
      decodeXml(match[1] ?? "").trim(),
    );
    const unique = texts.filter(Boolean);
    const text = unique.join(" ").replace(/\s+/g, " ").trim();
    if (!text) continue;
    const number = slideNumber(name);
    chunks.push({
      title: unique[0] ? `Slide ${number}: ${unique[0].slice(0, 70)}` : `Slide ${number}`,
      text,
    });
  }

  if (!chunks.length) {
    throw new Error("This PowerPoint file did not contain readable text.");
  }

  return finalizeExtraction({
    title: titleFromFilename(filename) || "Slides module",
    sourceName: filename,
    chunks,
  });
}

function slideNumber(name: string) {
  return Number(name.match(/slide(\d+)/i)?.[1] ?? 0);
}
