import { IngestForm } from "@/components/ingest-form";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="max-w-2xl space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">
          Personal exam coach
        </p>
        <h1 className="font-display text-4xl leading-tight sm:text-5xl">
          Turn a module into flashcards, MCQs, and identification in one pass.
        </h1>
        <p className="text-muted-foreground">
          Paste a public Drive link or drop the file. Chard's Reviewer reads the
          lesson, writes a grounded study set, and keeps it on this device.
        </p>
      </section>
      <IngestForm />
    </div>
  );
}
