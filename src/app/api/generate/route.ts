import { NextResponse } from "next/server";
import { z } from "zod";
import { generateReviewer } from "@/lib/ai/generateReviewer";

export const runtime = "nodejs";
export const maxDuration = 120;

const bodySchema = z.object({
  title: z.string().min(1),
  sourceName: z.string().min(1),
  truncated: z.boolean(),
  chunks: z
    .array(
      z.object({
        title: z.string(),
        text: z.string().min(1),
      }),
    )
    .min(1),
  questionCount: z.number().int().min(6).max(60),
  difficulty: z.enum(["easy", "mixed", "hard"]),
  modes: z.object({
    flashcards: z.boolean(),
    multipleChoice: z.boolean(),
    identification: z.boolean(),
  }),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const deck = await generateReviewer(body);
    const total =
      deck.flashcards.length +
      deck.multipleChoice.length +
      deck.identification.length;

    if (!total) {
      return NextResponse.json(
        { error: "The generator returned no study items. Try a longer module or fewer filters." },
        { status: 422 },
      );
    }

    return NextResponse.json(deck);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Generation request was invalid. Extract the module again." },
        { status: 400 },
      );
    }
    const message =
      error instanceof Error ? error.message : "Could not generate a reviewer.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
