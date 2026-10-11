"use client";

import { del, get, keys, set } from "idb-keyval";
import type { LastScore, ReviewerDeck } from "@/lib/types";

const PREFIX = "deck:";

function deckKey(id: string) {
  return `${PREFIX}${id}`;
}

export async function saveDeck(deck: ReviewerDeck) {
  await set(deckKey(deck.id), deck);
}

export async function getDeck(id: string) {
  return (await get<ReviewerDeck>(deckKey(id))) ?? null;
}

export async function listDecks() {
  const allKeys = await keys();
  const decks = await Promise.all(
    allKeys
      .filter((key) => String(key).startsWith(PREFIX))
      .map((key) => get<ReviewerDeck>(key)),
  );

  return decks
    .filter((deck): deck is ReviewerDeck => Boolean(deck))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function deleteDeck(id: string) {
  await del(deckKey(id));
}

export async function updateDeckScore(id: string, lastScore: LastScore) {
  const deck = await getDeck(id);
  if (!deck) return null;
  const next = { ...deck, lastScore };
  await saveDeck(next);
  return next;
}
