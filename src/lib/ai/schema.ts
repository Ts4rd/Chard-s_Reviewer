import { z } from "zod";

export const generatedReviewerSchema = z.object({
  flashcards: z
    .array(
      z.object({
        front: z.string().min(1),
        back: z.string().min(1),
        source: z.string().min(1),
      }),
    )
    .default([]),
  multipleChoice: z
    .array(
      z.object({
        question: z.string().min(1),
        choices: z.array(z.string().min(1)).min(2).max(4),
        correctIndex: z.number().int().min(0).max(3),
        explanation: z.string().min(1),
        source: z.string().min(1),
      }),
    )
    .default([]),
  identification: z
    .array(
      z.object({
        prompt: z.string().min(1),
        answer: z.string().min(1),
        aliases: z.array(z.string()).default([]),
        source: z.string().min(1),
      }),
    )
    .default([]),
});

export type GeneratedReviewer = z.infer<typeof generatedReviewerSchema>;
