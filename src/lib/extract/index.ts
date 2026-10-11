import { extensionOf, titleFromFilename } from "@/lib/utils";
import { extractDocx } from "@/lib/extract/docx";
import { extractPdf } from "@/lib/extract/pdf";
import { extractPptx } from "@/lib/extract/pptx";
import { finalizeExtraction } from "@/lib/extract/chunk";
import type { ExtractedModule } from "@/lib/types";

export async function extractModule(input: {
  buffer: Buffer;
  filename: string;
  mime?: string;
}): Promise<ExtractedModule> {
  const ext = extensionOf(input.filename);
  const mime = input.mime ?? "";

  if (ext === "pdf" || mime.includes("pdf")) {
    return extractPdf(input.buffer, input.filename);
  }
  if (ext === "docx" || mime.includes("wordprocessingml") || mime.includes("msword")) {
    return extractDocx(input.buffer, input.filename);
  }
  if (ext === "pptx" || mime.includes("presentationml") || mime.includes("powerpoint")) {
    return extractPptx(input.buffer, input.filename);
  }
  if (ext === "txt" || mime.startsWith("text/plain")) {
    const text = input.buffer.toString("utf8").trim();
    if (!text) {
      throw new Error("That text file was empty.");
    }
    return finalizeExtraction({
      title: titleFromFilename(input.filename) || "Text module",
      sourceName: input.filename,
      chunks: [{ title: "Document", text }],
    });
  }

  throw new Error(
    "Unsupported file type. Upload a PDF, PowerPoint (PPTX), or Word (DOCX) module.",
  );
}
