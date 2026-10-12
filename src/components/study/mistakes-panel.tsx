import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export type MistakePreview = {
  id: string;
  prompt: string;
  answer: string;
  yours?: string;
};

export function MistakesPanel({
  count,
  reviewing,
  previews,
  onReview,
  onStudyAll,
}: {
  count: number;
  reviewing: boolean;
  previews: MistakePreview[];
  onReview: () => void;
  onStudyAll: () => void;
}) {
  if (reviewing) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-border bg-accent/50 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p>Reviewing {count} mistake{count === 1 ? "" : "s"}</p>
        <Button variant="ghost" size="sm" className="self-start sm:self-auto" onClick={onStudyAll}>
          Study all
        </Button>
      </div>
    );
  }

  if (!count) return null;

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="font-display text-lg">Review mistakes</p>
            <p className="text-sm text-muted-foreground">
              {count} item{count === 1 ? "" : "s"} you missed. Drill them again.
            </p>
          </div>
          <Button className="w-full sm:w-auto" onClick={onReview}>
            Review mistakes
          </Button>
        </div>
        <ul className="space-y-3">
          {previews.map((item) => (
            <li key={item.id} className="rounded-md border border-border bg-background/70 px-3 py-2 text-sm">
              <p className="break-words font-medium">{item.prompt}</p>
              <p className="mt-1 break-words text-muted-foreground">Answer: {item.answer}</p>
              {item.yours ? (
                <p className="break-words text-destructive">Your answer: {item.yours}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
