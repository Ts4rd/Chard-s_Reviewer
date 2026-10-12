"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { QuizSummary } from "@/components/study/quiz-summary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { updateDeckScore } from "@/lib/store";
import type { Flashcard } from "@/lib/types";

export function FlashcardsMode({
  deckId,
  cards,
}: {
  deckId: string;
  cards: Flashcard[];
}) {
  const [queue, setQueue] = useState(cards);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  const [misses, setMisses] = useState<Flashcard[]>([]);
  const [done, setDone] = useState(false);

  const card = queue[index];
  const progress = queue.length ? ((index + (done ? 1 : 0)) / queue.length) * 100 : 0;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (done) return;
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        setFlipped((value) => !value);
      }
      if (event.key === "ArrowRight") next();
      if (event.key === "ArrowLeft") prev();
      if (event.key === "1") mark(true);
      if (event.key === "2") mark(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const remainingMisses = useMemo(() => misses, [misses]);

  if (!card && !done) {
    return <p className="text-sm text-muted-foreground">No flashcards in this deck.</p>;
  }

  function finish(nextKnown: number, nextMisses: Flashcard[], total: number) {
    setDone(true);
    void updateDeckScore(deckId, {
      mode: "flashcards",
      correct: nextKnown,
      total,
      at: new Date().toISOString(),
    });
    setMisses(nextMisses);
  }

  function mark(knew: boolean) {
    if (!card || done) return;
    const nextKnown = knew ? known + 1 : known;
    const nextMisses = knew ? misses : [...misses, card];
    setKnown(nextKnown);
    setMisses(nextMisses);
    if (index + 1 >= queue.length) {
      finish(nextKnown, nextMisses, queue.length);
      return;
    }
    setIndex((value) => value + 1);
    setFlipped(false);
  }

  function next() {
    if (index + 1 < queue.length) {
      setIndex((value) => value + 1);
      setFlipped(false);
    }
  }

  function prev() {
    if (index > 0) {
      setIndex((value) => value - 1);
      setFlipped(false);
    }
  }

  function reset(nextCards = cards) {
    setQueue(nextCards);
    setIndex(0);
    setFlipped(false);
    setKnown(0);
    setMisses([]);
    setDone(false);
  }

  if (done) {
    return (
      <QuizSummary
        correct={known}
        total={queue.length}
        missCount={remainingMisses.length}
        onRetryAll={() => reset(cards)}
        onRetryMisses={() => reset(remainingMisses)}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
        <span className="shrink-0">
          Card {index + 1} of {queue.length}
        </span>
        <Badge variant="outline" className="max-w-[60%] truncate">
          {card.source}
        </Badge>
      </div>
      <Progress value={progress} />

      <button
        type="button"
        className="flash-scene w-full"
        onClick={() => setFlipped((value) => !value)}
        aria-label="Flip flashcard"
      >
        <div className={`flash-card ${flipped ? "is-flipped" : ""}`}>
          <div className="flash-face flash-front">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Prompt
            </p>
            <p className="font-display mt-3 break-words text-xl leading-snug sm:mt-4 sm:text-3xl">
              {card.front}
            </p>
          </div>
          <div className="flash-face flash-back">
            <p className="text-xs uppercase tracking-[0.2em] text-primary-foreground/70">
              Answer
            </p>
            <p className="mt-3 break-words text-base leading-relaxed sm:mt-4 sm:text-xl">{card.back}</p>
          </div>
        </div>
      </button>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex justify-center gap-2 sm:justify-start">
          <Button variant="outline" size="icon" onClick={prev} disabled={index === 0}>
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={next}
            disabled={index === queue.length - 1}
          >
            <ChevronRight />
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => mark(false)}>
            Still learning
          </Button>
          <Button className="w-full sm:w-auto" onClick={() => mark(true)}>
            I knew it
          </Button>
        </div>
      </div>
      <p className="hidden text-xs text-muted-foreground sm:block">
        Space flips · 1 knew it · 2 still learning
      </p>
    </div>
  );
}
