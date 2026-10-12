import { IngestForm } from "@/components/ingest-form";

export default function HomePage() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="max-w-2xl space-y-3 xl:max-w-3xl">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary sm:text-sm">
          Personal exam coach
        </p>
        <h1 className="font-display text-3xl leading-tight sm:text-4xl lg:text-5xl">
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
