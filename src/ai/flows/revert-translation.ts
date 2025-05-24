// src/ai/flows/revert-translation.ts
'use server';

/**
 * @fileOverview This file contains the Genkit flow for reverting a translation back to the original text.
 *
 * - revertTranslation - A function that handles the reversion of translated text to its original form.
 * - RevertTranslationInput - The input type for the revertTranslation function.
 * - RevertTranslationOutput - The return type for the revertTranslation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RevertTranslationInputSchema = z.object({
  originalText: z.string().describe('The original text before translation.'),
  translatedText: z.string().describe('The translated text to be reverted.'),
  shouldRevert: z.boolean().describe('A flag indicating whether to revert to the original text.'),
});

export type RevertTranslationInput = z.infer<typeof RevertTranslationInputSchema>;

const RevertTranslationOutputSchema = z.object({
  displayedText: z.string().describe('The text to be displayed, either the original or translated text.'),
});

export type RevertTranslationOutput = z.infer<typeof RevertTranslationOutputSchema>;

export async function revertTranslation(input: RevertTranslationInput): Promise<RevertTranslationOutput> {
  return revertTranslationFlow(input);
}

const revertTranslationFlow = ai.defineFlow({
    name: 'revertTranslationFlow',
    inputSchema: RevertTranslationInputSchema,
    outputSchema: RevertTranslationOutputSchema,
  },
  async input => {
    const {
      originalText,
      translatedText,
      shouldRevert
    } = input;

    const displayedText = shouldRevert ? originalText : translatedText;

    return {displayedText};
  }
);
