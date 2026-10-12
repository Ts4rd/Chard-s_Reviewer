"use client";

import { useEffect, useMemo, useState } from "react";
import { MistakesPanel, type MistakePreview } from "@/components/study/mistakes-panel";
import { QuizSummary } from "@/components/study/quiz-summary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { answersMatch } from "@/lib/fuzzy";
import {
  clearMissedIdentification,
  getDeck,
  updateDeckScore,
  upsertMissedIdentification,
} from "@/lib/store";
import type { Identification, MissedIdentificationRecord } from "@/lib/types";

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
  const [sessionMisses, setSessionMisses] = useState<
    { item: Identification; lastGuess: string }[]
  >([]);
  const [savedMisses, setSavedMisses] = useState<MissedIdentificationRecord[]>([]);
  const [reviewing, setReviewing] = useState(false);
  const [done, setDone] = useState(false);

  const item = queue[index];
  const atStart = !done && index === 0 && result === null && !reviewing;

  useEffect(() => {
    void getDeck(deckId).then((deck) => {
      setSavedMisses(deck?.missedIdentification ?? []);
    });
  }, [deckId]);

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

  const savedPreviews = useMemo(
    () => previewsFromRecords(items, savedMisses),
    [items, savedMisses],
  );
  const sessionPreviews = useMemo(
    () =>
      sessionMisses.map(({ item: missed, lastGuess }) => ({
        id: missed.id,
        prompt: missed.prompt,
        answer: missed.answer,
        yours: lastGuess,
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
    return <p className="text-sm text-muted-foreground">No identification items in this deck.</p>;
  }

  function check(event: React.FormEvent) {
    event.preventDefault();
    if (!item || result !== null) return;
    const ok = answersMatch(guess, item.answer, item.aliases);
    setResult(ok);
    if (ok) {
      setCorrect((value) => value + 1);
      void clearMissedIdentification(deckId, item.id).then(setSavedMisses);
      return;
    }
    setSessionMisses((value) => [...value, { item, lastGuess: guess }]);
    void upsertMissedIdentification(deckId, {
      id: item.id,
      lastGuess: guess,
    }).then(setSavedMisses);
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

  function studyAll() {
    setQueue(items);
    setIndex(0);
    setGuess("");
    setResult(null);
    setCorrect(0);
    setSessionMisses([]);
    setReviewing(false);
    setDone(false);
  }

  function startReview(
    records: MissedIdentificationRecord[] | { item: Identification }[],
  ) {
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
    setGuess("");
    setResult(null);
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
          Item {index + 1} of {queue.length}
        </span>
        <Badge variant="outline" className="max-w-[58%] truncate">
          {item.source}
        </Badge>
      </div>
      <Progress value={((index + (result !== null ? 1 : 0)) / queue.length) * 100} />

      <Card>
        <CardContent className="space-y-5 pt-6">
          <p className="font-display break-words text-lg leading-snug sm:text-xl">{item.prompt}</p>
          <form className="flex flex-col gap-3 sm:flex-row" onSubmit={check}>
            <Input
              value={guess}
              onChange={(event) => setGuess(event.target.value)}
              placeholder="Type the term or name"
              disabled={result !== null}
              autoFocus
              className="min-w-0"
            />
            <Button type="submit" className="w-full sm:w-auto" disabled={!guess.trim() || result !== null}>
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
          <Button onClick={next} disabled={result === null} className="w-full sm:w-auto">
            {index + 1 >= queue.length ? "See score" : "Next"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function previewsFromRecords(
  items: Identification[],
  records: MissedIdentificationRecord[],
): MistakePreview[] {
  return records
    .map((record) => {
      const item = items.find((entry) => entry.id === record.id);
      if (!item) return null;
      return {
        id: item.id,
        prompt: item.prompt,
        answer: item.answer,
        yours: record.lastGuess,
      };
    })
    .filter((item): item is MistakePreview => Boolean(item));
}
