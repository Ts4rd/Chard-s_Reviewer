"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FlashcardsMode } from "@/components/study/flashcards-mode";
import { IdentificationMode } from "@/components/study/identification-mode";
import { McqMode } from "@/components/study/mcq-mode";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/utils";
import { getDeck } from "@/lib/store";
import type { ReviewerDeck, StudyMode } from "@/lib/types";

export function ReviewerHub({ id }: { id: string }) {
  const [deck, setDeck] = useState<ReviewerDeck | null | undefined>(undefined);

  useEffect(() => {
    void getDeck(id).then(setDeck);
  }, [id]);

  if (deck === undefined) {
    return <p className="text-sm text-muted-foreground">Opening reviewer…</p>;
  }

  if (!deck) {
    return (
      <div className="space-y-4">
        <p>That reviewer was not found on this device.</p>
        <Button asChild variant="outline">
          <Link href="/library">Back to library</Link>
        </Button>
      </div>
    );
  }

  const defaultMode: StudyMode = deck.flashcards.length
    ? "flashcards"
    : deck.multipleChoice.length
      ? "multipleChoice"
      : "identification";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
            <Link href="/library">
              <ArrowLeft />
              Library
            </Link>
          </Button>
          <h1 className="font-display text-3xl">{deck.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {deck.sourceName} · saved {formatDate(deck.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {deck.generator === "local" ? (
            <Badge variant="accent">Local demo generator</Badge>
          ) : (
            <Badge>Gemini</Badge>
          )}
          {deck.truncated ? <Badge variant="outline">Truncated source</Badge> : null}
          {deck.lastScore ? (
            <Badge variant="secondary">
              Last: {deck.lastScore.correct}/{deck.lastScore.total}
            </Badge>
          ) : null}
        </div>
      </div>

      <Tabs defaultValue={defaultMode}>
        <TabsList className="flex-wrap">
          {deck.flashcards.length ? (
            <TabsTrigger value="flashcards">
              Flashcards ({deck.flashcards.length})
            </TabsTrigger>
          ) : null}
          {deck.multipleChoice.length ? (
            <TabsTrigger value="multipleChoice">
              Multiple choice ({deck.multipleChoice.length})
            </TabsTrigger>
          ) : null}
          {deck.identification.length ? (
            <TabsTrigger value="identification">
              Identification ({deck.identification.length})
            </TabsTrigger>
          ) : null}
        </TabsList>
        {deck.flashcards.length ? (
          <TabsContent value="flashcards">
            <FlashcardsMode deckId={deck.id} cards={deck.flashcards} />
          </TabsContent>
        ) : null}
        {deck.multipleChoice.length ? (
          <TabsContent value="multipleChoice">
            <McqMode deckId={deck.id} items={deck.multipleChoice} />
          </TabsContent>
        ) : null}
        {deck.identification.length ? (
          <TabsContent value="identification">
            <IdentificationMode deckId={deck.id} items={deck.identification} />
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}
