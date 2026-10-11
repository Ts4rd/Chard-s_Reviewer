"use client";

import { useEffect, useState } from "react";
import { QuizSummary } from "@/components/study/quiz-summary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { answersMatch } from "@/lib/fuzzy";
import { updateDeckScore } from "@/lib/store";
import type { Identification } from "@/lib/types";

export function IdentificationMode({
  deckId,
  items,
}: {
  deckId: string;
  items: Identification[];
}) {
  const [queue, setQueue] = useState(items);
  const [index, setIndex] = useState(0);
  const [guess, setGuess] = useState("");
  const [result, setResult] = useState<null | boolean>(null);
  const [correct, setCorrect] = useState(0);
  const [misses, setMisses] = useState<Identification[]>([]);
  const [done, setDone] = useState(false);

  const item = queue[index];

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (done) return;
      if (event.key === "Enter" && result !== null) {
        event.preventDefault();
        next();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!item && !done) {
    return <p className="text-sm text-muted-foreground">No identification items in this deck.</p>;
  }

  function check(event: React.FormEvent) {
    event.preventDefault();
    if (!item || result !== null) return;
    const ok = answersMatch(guess, item.answer, item.aliases);
    setResult(ok);
    if (ok) setCorrect((value) => value + 1);
    else setMisses((value) => [...value, item]);
  }

  function finish(nextCorrect: number, total: number) {
    setDone(true);
    void updateDeckScore(deckId, {
      mode: "identification",
      correct: nextCorrect,
      total,
      at: new Date().toISOString(),
    });
  }

  function next() {
    if (result === null) return;
    if (index + 1 >= queue.length) {
      finish(correct, queue.length);
      return;
    }
    setIndex((value) => value + 1);
    setGuess("");
    setResult(null);
  }

  function reset(nextItems = items) {
    setQueue(nextItems);
    setIndex(0);
    setGuess("");
    setResult(null);
    setCorrect(0);
    setMisses([]);
    setDone(false);
  }

  if (done) {
    return (
      <QuizSummary
        correct={correct}
        total={queue.length}
        missCount={misses.length}
        onRetryAll={() => reset(items)}
        onRetryMisses={() => reset(misses)}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>
          Item {index + 1} of {queue.length}
        </span>
        <Badge variant="outline">{item.source}</Badge>
      </div>
      <Progress value={((index + (result !== null ? 1 : 0)) / queue.length) * 100} />

      <Card>
        <CardContent className="space-y-5 pt-6">
          <p className="font-display text-xl leading-snug">{item.prompt}</p>
          <form className="flex flex-col gap-3 sm:flex-row" onSubmit={check}>
            <Input
              value={guess}
              onChange={(event) => setGuess(event.target.value)}
              placeholder="Type the term or name"
              disabled={result !== null}
              autoFocus
            />
            <Button type="submit" disabled={!guess.trim() || result !== null}>
              Check
            </Button>
          </form>
          {result !== null ? (
            <div className="rounded-lg bg-secondary/70 px-4 py-3 text-sm">
              <p className="font-medium">{result ? "Correct" : "Close — here's the answer"}</p>
              <p className="mt-1 text-muted-foreground">{item.answer}</p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Close spelling still counts. Capitalization does not matter.
            </p>
          )}
          <Button onClick={next} disabled={result === null}>
            {index + 1 >= queue.length ? "See score" : "Next"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
