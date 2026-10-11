import { NextResponse } from "next/server";
import { extractModule } from "@/lib/extract";
import { fetchDriveSource, parseDriveLink } from "@/lib/extract/drive";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_BYTES = 200 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const url = String(form.get("url") ?? "").trim();

    let buffer: Buffer;
    let filename: string;
    let mime = "";

    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_FILE_BYTES) {
        return NextResponse.json(
          { error: "File is larger than 200 MB. Try a smaller module or split it." },
          { status: 400 },
        );
      }
      buffer = Buffer.from(await file.arrayBuffer());
      filename = file.name || "upload";
      mime = file.type;
    } else if (url) {
      if (!parseDriveLink(url) && !url.includes("drive.google.com") && !url.includes("docs.google.com")) {
        return NextResponse.json(
          { error: "Paste a Google Drive, Docs, or Slides link — or upload the file." },
          { status: 400 },
        );
      }
      const fetched = await fetchDriveSource(url);
      if (fetched.buffer.length > MAX_FILE_BYTES) {
        return NextResponse.json(
          { error: "That Drive file is larger than 200 MB. Download and upload a smaller export." },
          { status: 400 },
        );
      }
      buffer = fetched.buffer;
      filename = fetched.filename;
      mime = fetched.mime;
    } else {
      return NextResponse.json(
        { error: "Upload a PDF, PPTX, or DOCX, or paste a public Drive link." },
        { status: 400 },
      );
    }

    const extracted = await extractModule({ buffer, filename, mime });
    if (!extracted.chunks.length) {
      return NextResponse.json(
        { error: "No readable text was found in that module." },
        { status: 422 },
      );
    }

    return NextResponse.json(extracted);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not read that module.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
