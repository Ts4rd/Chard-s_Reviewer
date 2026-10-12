import { LibraryList } from "@/components/library-list";

export default function LibraryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl">Library</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reviewers stay in this browser. No account required.
        </p>
      </div>
      <LibraryList />
    </div>
  );
}
