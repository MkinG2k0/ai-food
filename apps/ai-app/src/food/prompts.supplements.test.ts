import { describe, expect, it } from 'vitest';
import {
  SUPPLEMENTS_TEXT_PROMPT_RULE,
  buildAnalyzeTextUserPrompt,
  selectAnalyzeSystemPrompt,
} from './prompts.js';

describe('text prompts: vitamin/supplement intake («Описать»)', () => {
  it('exports supplements rule with human foodName and D3 IU example', () => {
    expect(SUPPLEMENTS_TEXT_PROMPT_RULE).toMatch(/Витамин D3 5000 МЕ/);
    expect(SUPPLEMENTS_TEXT_PROMPT_RULE).toMatch(/5000ue D3/);
    expect(SUPPLEMENTS_TEXT_PROMPT_RULE).toMatch(/НЕ noFood/);
    expect(SUPPLEMENTS_TEXT_PROMPT_RULE).toMatch(/foodType = snack/);
  });

  it('text system prompt includes supplements section; vision does not', () => {
    const text = selectAnalyzeSystemPrompt(false);
    const vision = selectAnalyzeSystemPrompt(true);

    expect(text).toContain(SUPPLEMENTS_TEXT_PROMPT_RULE);
    expect(text).toMatch(/витамин\/БАД/);
    expect(text).toMatch(/1 IU = 0\.025 µg/);
    expect(vision).not.toContain(SUPPLEMENTS_TEXT_PROMPT_RULE);
  });

  it('text user prompt asks to normalize vitamin foodName', () => {
    const prompt = buildAnalyzeTextUserPrompt('5000ue D3', false);
    expect(prompt).toMatch(/витамин\/БАД/);
    expect(prompt).toMatch(/Витамин D3 5000 МЕ/);
    expect(prompt).toContain('5000ue D3');
  });
});
