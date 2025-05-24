// src/ai/flows/customize-translation-prompt.ts
'use server';

/**
 * @fileOverview A flow to translate text with a customizable prompt.
 *
 * - translateText - A function that translates the input text using a customizable prompt.
 * - TranslateTextInput - The input type for the translateText function.
 * - TranslateTextOutput - The return type for the translateText function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TranslateTextInputSchema = z.object({
  text: z.string().describe('The text to translate.'),
  targetLanguage: z.string().describe('The target language for the translation.'),
  customPrompt: z
    .string()
    .optional()
    .describe('Optional custom prompt to override the default translation behavior.'),
});
export type TranslateTextInput = z.infer<typeof TranslateTextInputSchema>;

const TranslateTextOutputSchema = z.object({
  translatedText: z.string().describe('The translated text.'),
});
export type TranslateTextOutput = z.infer<typeof TranslateTextOutputSchema>;

export async function translateText(input: TranslateTextInput): Promise<TranslateTextOutput> {
  return translateTextFlow(input);
}

const defaultPrompt = `Translate the following text to {{{targetLanguage}}}:\n\n{{{text}}}`;

const translateTextPrompt = ai.definePrompt({
  name: 'translateTextPrompt',
  input: {schema: TranslateTextInputSchema},
  output: {schema: TranslateTextOutputSchema},
  prompt: `{{#if customPrompt}}{{{customPrompt}}}\n\nOriginal request:\n${defaultPrompt}{{else}}${defaultPrompt}{{/if}}`,
});

const translateTextFlow = ai.defineFlow(
  {
    name: 'translateTextFlow',
    inputSchema: TranslateTextInputSchema,
    outputSchema: TranslateTextOutputSchema,
  },
  async input => {
    const {output} = await translateTextPrompt(input);
    return output!;
  }
);
