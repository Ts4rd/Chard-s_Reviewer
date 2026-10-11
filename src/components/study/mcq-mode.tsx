"use client";

import { useEffect, useState } from "react";
import { QuizSummary } from "@/components/study/quiz-summary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { updateDeckScore } from "@/lib/store";
import type { MultipleChoice } from "@/lib/types";

export function McqMode({
  deckId,
  items,
}: {
  deckId: string;
  items: MultipleChoice[];
}) {
  const [queue, setQueue] = useState(items);
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [misses, setMisses] = useState<MultipleChoice[]>([]);
  const [done, setDone] = useState(false);

  const item = queue[index];
  const locked = choice !== null;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (done || !item) return;
      const number = Number(event.key);
      if (number >= 1 && number <= item.choices.length && choice === null) {
        select(number - 1);
      }
      if ((event.key === "Enter" || event.key === " ") && locked) {
        event.preventDefault();
        next();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!item && !done) {
    return <p className="text-sm text-muted-foreground">No multiple-choice items in this deck.</p>;
  }

  function select(nextChoice: number) {
    if (!item || locked) return;
    setChoice(nextChoice);
    const isCorrect = nextChoice === item.correctIndex;
    if (isCorrect) setCorrect((value) => value + 1);
    else setMisses((value) => [...value, item]);
  }

  function finish(nextCorrect: number, total: number) {
    setDone(true);
    void updateDeckScore(deckId, {
      mode: "multipleChoice",
      correct: nextCorrect,
      total,
      at: new Date().toISOString(),
    });
  }

  function next() {
    if (!locked) return;
    if (index + 1 >= queue.length) {
      finish(correct, queue.length);
      return;
    }
    setIndex((value) => value + 1);
    setChoice(null);
  }

  function reset(nextItems = items) {
    setQueue(nextItems);
    setIndex(0);
    setChoice(null);
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
          Question {index + 1} of {queue.length}
        </span>
        <Badge variant="outline">{locked ? item.source : "Module section"}</Badge>
      </div>
      <Progress value={((index + (locked ? 1 : 0)) / queue.length) * 100} />

      <Card>
        <CardContent className="space-y-5 pt-6">
          <p className="font-display text-xl leading-snug">{item.question}</p>
          <div className="grid gap-3">
            {item.choices.map((option, optionIndex) => {
              const isCorrect = optionIndex === item.correctIndex;
              const isPicked = choice === optionIndex;
              return (
                <button
                  key={`${item.id}-${optionIndex}`}
                  type="button"
                  disabled={locked}
                  onClick={() => select(optionIndex)}
                  className={cn(
                    "rounded-lg border px-4 py-3 text-left text-sm transition-colors",
                    !locked && "hover:border-primary hover:bg-accent",
                    locked && isCorrect && "border-emerald-600 bg-emerald-50 text-emerald-950",
                    locked && isPicked && !isCorrect && "border-destructive bg-destructive/10",
                  )}
                >
                  <span className="mr-2 font-medium text-muted-foreground">
                    {optionIndex + 1}.
                  </span>
                  {option}
                </button>
              );
            })}
          </div>
          {locked ? (
            <div className="rounded-lg bg-secondary/70 px-4 py-3 text-sm">
              <p className="font-medium">
                {choice === item.correctIndex ? "Correct" : "Not quite"}
              </p>
              <p className="mt-1 text-muted-foreground">{item.explanation}</p>
            </div>
          ) : null}
          <Button onClick={next} disabled={!locked} className="w-full sm:w-auto">
            {index + 1 >= queue.length ? "See score" : "Next question"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
