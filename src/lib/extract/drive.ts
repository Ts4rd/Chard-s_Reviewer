export type FetchedSource = {
  buffer: Buffer;
  filename: string;
  mime: string;
};

type DriveKind = "file" | "doc" | "slides" | "folder";

type ParsedDriveLink = {
  kind: DriveKind;
  id: string;
};

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";

export function parseDriveLink(raw: string): ParsedDriveLink | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");
  const path = url.pathname;

  if (host === "drive.google.com" && /\/folders\//.test(path)) {
    const id = path.match(/\/folders\/([a-zA-Z0-9_-]+)/)?.[1];
    return id ? { kind: "folder", id } : null;
  }

  if (host === "docs.google.com" && /\/document\//.test(path)) {
    const id = path.match(/\/document\/d\/([a-zA-Z0-9_-]+)/)?.[1];
    return id ? { kind: "doc", id } : null;
  }

  if (host === "docs.google.com" && /\/presentation\//.test(path)) {
    const id = path.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/)?.[1];
    return id ? { kind: "slides", id } : null;
  }

  if (host === "drive.google.com") {
    const fromPath = path.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1];
    const fromQuery = url.searchParams.get("id");
    const id = fromPath || fromQuery;
    return id ? { kind: "file", id } : null;
  }

  return null;
}

export async function fetchDriveSource(rawUrl: string): Promise<FetchedSource> {
  const parsed = parseDriveLink(rawUrl);
  if (!parsed) {
    throw new Error(
      "That does not look like a Google Drive, Docs, or Slides link.",
    );
  }

  if (parsed.kind === "folder") {
    throw new Error(
      "Folder links are not supported yet. Open a single file, or download the module and upload it.",
    );
  }

  const targets =
    parsed.kind === "doc"
      ? [
          `https://docs.google.com/document/d/${parsed.id}/export?format=txt`,
          `https://docs.google.com/document/d/${parsed.id}/export?format=docx`,
        ]
      : parsed.kind === "slides"
        ? [
            `https://docs.google.com/presentation/d/${parsed.id}/export/pptx`,
            `https://docs.google.com/presentation/d/${parsed.id}/export/txt`,
          ]
        : [
            `https://drive.google.com/uc?export=download&id=${parsed.id}&confirm=t`,
            `https://drive.google.com/uc?export=download&id=${parsed.id}`,
          ];

  let lastError = "Could not download that Drive file.";
  for (const target of targets) {
    try {
      return await downloadPublicFile(target, parsed.kind, parsed.id);
    } catch (error) {
      lastError = error instanceof Error ? error.message : lastError;
    }
  }

  throw new Error(lastError);
}

async function downloadPublicFile(
  target: string,
  kind: Exclude<DriveKind, "folder">,
  id: string,
): Promise<FetchedSource> {
  const response = await fetch(target, {
    redirect: "follow",
    headers: { "User-Agent": BROWSER_UA, Accept: "*/*" },
  });

  if (response.status === 401 || response.status === 403) {
    throw privateFileError();
  }

  if (!response.ok) {
    throw new Error(
      `Drive returned ${response.status}. If the file is private, download it and upload instead.`,
    );
  }

  const mime = response.headers.get("content-type") ?? "";
  const buffer = Buffer.from(await response.arrayBuffer());
  const asText = looksLikeText(mime, buffer)
    ? buffer.subarray(0, 800).toString("utf8")
    : "";

  if (mime.includes("text/html") || asText.includes("<!DOCTYPE html") || asText.includes("<html")) {
    if (/sign in|accounts\.google|virus scan warning|you need access/i.test(asText)) {
      throw privateFileError();
    }
    throw privateFileError();
  }

  const filename =
    filenameFromDisposition(response.headers.get("content-disposition")) ||
    defaultFilename(kind, id, mime);

  return { buffer, filename, mime };
}

function privateFileError() {
  return new Error(
    "This Drive file looks private or blocked. Download it and upload the PDF, PPTX, or DOCX instead.",
  );
}

function looksLikeText(mime: string, buffer: Buffer) {
  return mime.startsWith("text/") || buffer.subarray(0, 15).toString("utf8").includes("<");
}

function filenameFromDisposition(header: string | null) {
  if (!header) return "";
  const utf = header.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (utf) return decodeURIComponent(utf);
  const plain = header.match(/filename="?([^"]+)"?/i)?.[1];
  return plain ?? "";
}

function defaultFilename(
  kind: Exclude<DriveKind, "folder">,
  id: string,
  mime: string,
) {
  if (kind === "doc") {
    return mime.includes("word") ? `module-${id}.docx` : `module-${id}.txt`;
  }
  if (kind === "slides") {
    return mime.includes("text") ? `module-${id}.txt` : `module-${id}.pptx`;
  }
  if (mime.includes("pdf")) return `module-${id}.pdf`;
  if (mime.includes("word") || mime.includes("docx")) return `module-${id}.docx`;
  if (mime.includes("presentation") || mime.includes("pptx")) {
    return `module-${id}.pptx`;
  }
  return `module-${id}`;
}
