import { describe, expect, it } from 'vitest';
import {
  buildSentenceReviewChunkTiles,
  buildShuffledChunkTilePool,
  normalizeSentenceReviewChunks,
  sentenceSupportsWordDifficultyUpgrade,
  tokenizeSentenceToChunkedTiles,
  tokenizeSentenceToTiles,
  verifyReconstructedSentence,
} from './sentenceTileBank';

describe('sentenceTileBank chunked helpers', () => {
  it('keeps short sentences as single-word tiles', () => {
    const tiles = tokenizeSentenceToChunkedTiles('I enjoy traveling a lot.');
    expect(tiles.map(tile => tile.text)).toEqual(['I', 'enjoy', 'traveling', 'a', 'lot.']);
  });

  it('groups long sentences into fewer phrase-like chunks', () => {
    const sentence =
      'I would like to go there because I want to experience a different pace of life and see something new.';
    const wordTiles = tokenizeSentenceToTiles(sentence);
    const chunkTiles = tokenizeSentenceToChunkedTiles(sentence);

    expect(chunkTiles.length).toBeLessThan(wordTiles.length);
    expect(chunkTiles.length).toBeGreaterThanOrEqual(4);
    expect(verifyReconstructedSentence(chunkTiles, sentence)).toBe(true);
  });

  it('avoids awkward mid-clause splits for punctuation + connector patterns', () => {
    const sentence =
      "I can't find my keys; they might be in the drawer, so let's keep things simple and check there first.";
    const chunkTiles = tokenizeSentenceToChunkedTiles(sentence);

    expect(chunkTiles.map((tile) => tile.text)).toEqual([
      "I can't find my keys;",
      'they might be in the drawer,',
      "so let's keep things simple",
      'and check there first.',
    ]);
  });

  it('shuffles chunk tiles without changing the sentence content set', () => {
    const sentence =
      'Problem-solving skills are important because students will face new situations that cannot be solved by memorizing facts alone.';
    const chunkTiles = tokenizeSentenceToChunkedTiles(sentence);
    const shuffled = buildShuffledChunkTilePool(sentence);

    expect(shuffled).toHaveLength(chunkTiles.length);
    expect(shuffled.map(tile => tile.text).sort()).toEqual(chunkTiles.map(tile => tile.text).sort());
  });

  it('uses AI-provided lexical chunks when they reconstruct the sentence exactly', () => {
    const sentence =
      'I think you have a point about the denim jacket being too casual for the presentation.';
    const reviewChunks = [
      'I think',
      'you have a point',
      'about the denim jacket',
      'being too casual',
      'for the presentation.',
    ];

    const tiles = buildSentenceReviewChunkTiles(sentence, {
      reviewChunks,
      protectedPhrases: ['have a point'],
    });

    expect(tiles.map((tile) => tile.text)).toEqual(reviewChunks);
    expect(verifyReconstructedSentence(tiles, sentence)).toBe(true);
  });

  it('rejects AI chunks that split a protected collocation', () => {
    const sentence = 'I think you have a point about this.';

    expect(
      normalizeSentenceReviewChunks(
        sentence,
        ['I think you have a', 'point about this.'],
        ['have a point'],
      ),
    ).toBeNull();
  });

  it('rejects oversized AI chunks so the UI can fall back to local chunking', () => {
    const sentence =
      'I think you have a point about the denim jacket being too casual for the presentation.';

    expect(
      normalizeSentenceReviewChunks(
        sentence,
        ['I think you have a point about the denim jacket', 'being too casual for the presentation.'],
        ['have a point'],
      ),
    ).toBeNull();
  });

  it('reports whether a sentence can be upgraded to word difficulty', () => {
    expect(sentenceSupportsWordDifficultyUpgrade('I enjoy traveling a lot.')).toBe(false);
    expect(
      sentenceSupportsWordDifficultyUpgrade(
        'I would like to go there because I want to experience a different pace of life and see something new.',
      ),
    ).toBe(true);
  });
});
