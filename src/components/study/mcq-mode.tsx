"use client";

import { useEffect, useMemo, useState } from "react";
import { MistakesPanel, type MistakePreview } from "@/components/study/mistakes-panel";
import { QuizSummary } from "@/components/study/quiz-summary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  clearMissedMcq,
  getDeck,
  updateDeckScore,
  upsertMissedMcq,
} from "@/lib/store";
import type { MissedMcqRecord, MultipleChoice } from "@/lib/types";
import { cn } from "@/lib/utils";

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
  const [sessionMisses, setSessionMisses] = useState<
    { item: MultipleChoice; lastChoice: number }[]
  >([]);
  const [savedMisses, setSavedMisses] = useState<MissedMcqRecord[]>([]);
  const [reviewing, setReviewing] = useState(false);
  const [done, setDone] = useState(false);

  const item = queue[index];
  const locked = choice !== null;
  const atStart = !done && index === 0 && !locked && !reviewing;

  useEffect(() => {
    void getDeck(deckId).then((deck) => {
      setSavedMisses(deck?.missedMultipleChoice ?? []);
    });
  }, [deckId]);

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

  const savedPreviews = useMemo(
    () => previewsFromRecords(items, savedMisses),
    [items, savedMisses],
  );
  const sessionPreviews = useMemo(
    () =>
      sessionMisses.map(({ item: missed, lastChoice }) => ({
        id: missed.id,
        prompt: missed.question,
        answer: missed.choices[missed.correctIndex] ?? "",
        yours: missed.choices[lastChoice],
      })),
    [sessionMisses],
  );

  if (!item && !done) {
    if (savedMisses.length) {
      return (
        <MistakesPanel
          count={savedMisses.length}
          reviewing={false}
          previews={savedPreviews}
          onReview={() => startReview(savedMisses)}
          onStudyAll={studyAll}
        />
      );
    }
    return <p className="text-sm text-muted-foreground">No multiple-choice items in this deck.</p>;
  }

  function select(nextChoice: number) {
    if (!item || locked) return;
    setChoice(nextChoice);
    const isCorrect = nextChoice === item.correctIndex;
    if (isCorrect) {
      setCorrect((value) => value + 1);
      void clearMissedMcq(deckId, item.id).then(setSavedMisses);
      return;
    }
    setSessionMisses((value) => [...value, { item, lastChoice: nextChoice }]);
    void upsertMissedMcq(deckId, { id: item.id, lastChoice: nextChoice }).then(
      setSavedMisses,
    );
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

  function studyAll() {
    setQueue(items);
    setIndex(0);
    setChoice(null);
    setCorrect(0);
    setSessionMisses([]);
    setReviewing(false);
    setDone(false);
  }

  function startReview(records: MissedMcqRecord[] | { item: MultipleChoice }[]) {
    const ids = new Set(
      records.map((record) => ("item" in record ? record.item.id : record.id)),
    );
    const nextItems = items.filter((entry) => ids.has(entry.id));
    if (!nextItems.length) {
      studyAll();
      return;
    }
    setQueue(nextItems);
    setIndex(0);
    setChoice(null);
    setCorrect(0);
    setSessionMisses([]);
    setReviewing(true);
    setDone(false);
  }

  if (done) {
    const reviewSource = sessionMisses.length ? sessionMisses : savedMisses;
    return (
      <div className="space-y-4">
        <QuizSummary
          correct={correct}
          total={queue.length}
          missCount={sessionMisses.length}
          mistakes={sessionPreviews}
          onRetryAll={studyAll}
          onRetryMisses={() => startReview(reviewSource)}
        />
        {!sessionMisses.length && savedMisses.length ? (
          <MistakesPanel
            count={savedMisses.length}
            reviewing={false}
            previews={savedPreviews}
            onReview={() => startReview(savedMisses)}
            onStudyAll={studyAll}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {atStart ? (
        <MistakesPanel
          count={savedMisses.length}
          reviewing={false}
          previews={savedPreviews}
          onReview={() => startReview(savedMisses)}
          onStudyAll={studyAll}
        />
      ) : null}
      {reviewing ? (
        <MistakesPanel
          count={queue.length}
          reviewing
          previews={[]}
          onReview={() => startReview(savedMisses)}
          onStudyAll={studyAll}
        />
      ) : null}
      <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
        <span className="shrink-0">
          Question {index + 1} of {queue.length}
        </span>
        <Badge variant="outline" className="max-w-[58%] truncate">
          {locked ? item.source : "Module section"}
        </Badge>
      </div>
      <Progress value={((index + (locked ? 1 : 0)) / queue.length) * 100} />

      <Card>
        <CardContent className="space-y-5 pt-6">
          <p className="font-display break-words text-lg leading-snug sm:text-xl">{item.question}</p>
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
                    "rounded-lg border px-3 py-3 text-left text-sm break-words transition-colors sm:px-4",
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

function previewsFromRecords(
  items: MultipleChoice[],
  records: MissedMcqRecord[],
): MistakePreview[] {
  return records
    .map((record) => {
      const item = items.find((entry) => entry.id === record.id);
      if (!item) return null;
      return {
        id: item.id,
        prompt: item.question,
        answer: item.choices[item.correctIndex] ?? "",
        yours: item.choices[record.lastChoice],
      };
    })
    .filter((item): item is MistakePreview => Boolean(item));
}
