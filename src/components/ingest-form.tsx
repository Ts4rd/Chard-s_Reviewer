"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { FileUp, Link2, Loader2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveDeck } from "@/lib/store";
import type { Difficulty, ExtractedModule, GenerateModes, ReviewerDeck } from "@/lib/types";

const MAX_FILE_BYTES = 200 * 1024 * 1024;

export function IngestForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [questionCount, setQuestionCount] = useState(18);
  const [difficulty, setDifficulty] = useState<Difficulty>("hard");
  const [modes, setModes] = useState<GenerateModes>({
    flashcards: true,
    multipleChoice: true,
    identification: true,
  });
  const [extracted, setExtracted] = useState<ExtractedModule | null>(null);
  const [busy, setBusy] = useState<"idle" | "extract" | "generate">("idle");
  const [error, setError] = useState("");

  function onFile(next: File | null) {
    setError("");
    setExtracted(null);
    if (!next) {
      setFile(null);
      return;
    }
    if (next.size > MAX_FILE_BYTES) {
      setError("File is larger than 200 MB. Split the module or export a smaller file.");
      return;
    }
    setFile(next);
  }

  async function extractModule(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!file && !url.trim()) {
      setError("Upload a module or paste a public Drive / Docs / Slides link.");
      return;
    }

    setBusy("extract");
    try {
      const form = new FormData();
      if (file) form.set("file", file);
      if (url.trim()) form.set("url", url.trim());
      const response = await fetch("/api/ingest", { method: "POST", body: form });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Could not read that module.");
      }
      setExtracted(payload as ExtractedModule);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that module.");
    } finally {
      setBusy("idle");
    }
  }

  async function generateReviewer() {
    if (!extracted) return;
    if (!modes.flashcards && !modes.multipleChoice && !modes.identification) {
      setError("Select at least one study mode.");
      return;
    }

    setBusy("generate");
    setError("");
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: extracted.title,
          sourceName: extracted.sourceName,
          truncated: extracted.truncated,
          chunks: extracted.chunks,
          questionCount,
          difficulty,
          modes,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Could not generate a reviewer.");
      }
      const deck = payload as ReviewerDeck;
      await saveDeck(deck);
      router.push(`/review/${deck.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate a reviewer.");
      setBusy("idle");
    }
  }

  return (
    <div className="grid min-w-0 gap-4 sm:gap-6 lg:grid-cols-2 xl:grid-cols-[1.15fr_0.85fr]">
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Drop a module in</CardTitle>
          <CardDescription>
            Upload is the reliable path. A public Drive, Docs, or Slides link also
            works when the file is shared with anyone who has the link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={extractModule}>
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragOver(false);
                onFile(event.dataTransfer.files?.[0] ?? null);
              }}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-7 text-center transition-colors sm:px-6 sm:py-10 ${
                dragOver
                  ? "border-primary bg-accent/70"
                  : "border-border bg-background/60 hover:border-primary/50"
              }`}
              onClick={() => fileRef.current?.click()}
            >
              <FileUp className="mb-3 h-8 w-8 text-primary" />
              <p className="max-w-full break-all font-medium sm:break-words">
                {file ? file.name : "Drag a PDF, PPTX, or DOCX here"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {file ? `${Math.ceil(file.size / 1024)} KB · click to replace` : "or click to browse · 200 MB max"}
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.docx,.pptx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                className="hidden"
                onChange={(event) => onFile(event.target.files?.[0] ?? null)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="drive-url" className="flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Google Drive link
              </Label>
              <Input
                id="drive-url"
                value={url}
                onChange={(event) => {
                  setUrl(event.target.value);
                  setExtracted(null);
                }}
                placeholder="https://drive.google.com/file/d/... or Docs / Slides"
              />
              <p className="text-xs text-muted-foreground">
                Private classroom files will fail. Download them and upload instead.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="count">Question count</Label>
                <select
                  id="count"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={questionCount}
                  onChange={(event) => setQuestionCount(Number(event.target.value))}
                >
                  <option value={9}>9 — quick drill</option>
                  <option value={18}>18 — standard</option>
                  <option value={30}>30 — long review</option>
                  <option value={45}>45 — exam pack</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty</Label>
                <select
                  id="difficulty"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={difficulty}
                  onChange={(event) =>
                    setDifficulty(event.target.value as Difficulty)
                  }
                >
                  <option value="easy">Easy</option>
                  <option value="mixed">Mixed</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Study modes</Label>
              <div className="flex flex-wrap gap-4">
                {(
                  [
                    ["flashcards", "Flashcards"],
                    ["multipleChoice", "Multiple choice"],
                    ["identification", "Identification"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={modes[key]}
                      onCheckedChange={(checked) =>
                        setModes((current) => ({
                          ...current,
                          [key]: checked === true,
                        }))
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {error ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <Button type="submit" disabled={busy !== "idle"} className="w-full sm:w-auto">
              {busy === "extract" ? (
                <>
                  <Loader2 className="animate-spin" />
                  Reading module…
                </>
              ) : (
                "Extract text"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="min-w-0 lg:min-h-[24rem] xl:min-h-[28rem]">
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <CardTitle>Extracted preview</CardTitle>
              <CardDescription>
                Check that the lesson text looks right before generating questions.
              </CardDescription>
            </div>
            {extracted?.truncated ? (
              <Badge variant="accent">Truncated</Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {extracted ? (
            <>
              <div>
                <p className="font-display break-words text-lg">{extracted.title}</p>
                <p className="break-all text-sm text-muted-foreground">
                  {extracted.sourceName} · {extracted.chunks.length} sections
                </p>
              </div>
              <Textarea
                readOnly
                value={extracted.text.slice(0, 4000)}
                className="h-48 font-mono text-xs sm:h-64"
              />
              <Button
                onClick={generateReviewer}
                disabled={busy !== "idle"}
                className="w-full"
              >
                {busy === "generate" ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Writing reviewer…
                  </>
                ) : (
                  <>
                    <Sparkles />
                    Generate reviewer
                  </>
                )}
              </Button>
            </>
          ) : (
            <div className="flex h-40 flex-col items-center justify-center rounded-lg border border-dashed border-border px-4 text-center text-sm text-muted-foreground sm:h-64">
              Extracted headings and pages will show up here.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
