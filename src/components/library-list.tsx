"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { deleteDeck, listDecks } from "@/lib/store";
import type { ReviewerDeck } from "@/lib/types";

export function LibraryList() {
  const [decks, setDecks] = useState<ReviewerDeck[] | null>(null);

  async function refresh() {
    setDecks(await listDecks());
  }

  useEffect(() => {
    void refresh();
  }, []);

  if (!decks) {
    return <p className="text-sm text-muted-foreground">Loading library…</p>;
  }

  if (!decks.length) {
    return (
      <Card>
        <CardContent className="flex min-h-56 flex-col items-center justify-center gap-3 text-center">
          <p className="font-display text-xl">No reviewers yet</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Extract a module on the home page and generate a deck. It will stay in
            this browser until you delete it.
          </p>
          <Button asChild>
            <Link href="/">Create one</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {decks.map((deck) => {
        const total =
          deck.flashcards.length +
          deck.multipleChoice.length +
          deck.identification.length;
        return (
          <Card key={deck.id} className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-2xl">{deck.title}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {deck.sourceName} · {formatDate(deck.createdAt)}
              </p>
            </CardHeader>
            <CardContent className="mt-auto flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{total} items</Badge>
                <Badge variant="outline">{deck.flashcards.length} cards</Badge>
                <Badge variant="outline">{deck.multipleChoice.length} MCQ</Badge>
                <Badge variant="outline">{deck.identification.length} ID</Badge>
                {deck.lastScore ? (
                  <Badge>
                    Last {deck.lastScore.correct}/{deck.lastScore.total}
                  </Badge>
                ) : null}
              </div>
              <div className="flex gap-2">
                <Button asChild className="flex-1">
                  <Link href={`/review/${deck.id}`}>Study</Link>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={`Delete ${deck.title}`}
                  onClick={async () => {
                    await deleteDeck(deck.id);
                    await refresh();
                  }}
                >
                  <Trash2 />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
