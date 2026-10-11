import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function QuizSummary({
  correct,
  total,
  onRetryAll,
  onRetryMisses,
  missCount,
}: {
  correct: number;
  total: number;
  missCount: number;
  onRetryAll: () => void;
  onRetryMisses: () => void;
}) {
  const percent = total ? Math.round((correct / total) * 100) : 0;

  return (
    <Card className="mx-auto max-w-xl text-center">
      <CardHeader>
        <CardTitle>Session complete</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="font-display text-5xl text-primary">{percent}%</p>
        <p className="text-muted-foreground">
          {correct} of {total} correct
          {missCount ? ` · ${missCount} to review` : ""}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={onRetryAll}>
            <RotateCcw />
            Study again
          </Button>
          {missCount ? (
            <Button variant="outline" onClick={onRetryMisses}>
              Review misses
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
