import { RotateCcw } from "lucide-react";
import type { MistakePreview } from "@/components/study/mistakes-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function QuizSummary({
  correct,
  total,
  onRetryAll,
  onRetryMisses,
  missCount,
  mistakes = [],
}: {
  correct: number;
  total: number;
  missCount: number;
  onRetryAll: () => void;
  onRetryMisses: () => void;
  mistakes?: MistakePreview[];
}) {
  const percent = total ? Math.round((correct / total) * 100) : 0;

  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader className="text-center">
        <CardTitle>Session complete</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="text-center">
          <p className="font-display text-5xl text-primary">{percent}%</p>
          <p className="mt-2 text-muted-foreground">
            {correct} of {total} correct
            {missCount ? ` · ${missCount} to review` : ""}
          </p>
        </div>
        {mistakes.length ? (
          <ul className="space-y-3 text-left">
            {mistakes.map((item) => (
              <li
                key={item.id}
                className="rounded-md border border-border bg-background/70 px-3 py-2 text-sm"
              >
                <p className="break-words font-medium">{item.prompt}</p>
                <p className="mt-1 break-words text-muted-foreground">Answer: {item.answer}</p>
                {item.yours ? (
                  <p className="break-words text-destructive">Your answer: {item.yours}</p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-3">
          <Button className="w-full sm:w-auto" onClick={onRetryAll}>
            <RotateCcw />
            Study again
          </Button>
          {missCount ? (
            <Button variant="outline" className="w-full sm:w-auto" onClick={onRetryMisses}>
              Review mistakes
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
