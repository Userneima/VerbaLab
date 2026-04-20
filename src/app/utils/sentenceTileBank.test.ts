import { describe, expect, it } from 'vitest';
import {
  buildShuffledChunkTilePool,
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

  it('shuffles chunk tiles without changing the sentence content set', () => {
    const sentence =
      'Problem-solving skills are important because students will face new situations that cannot be solved by memorizing facts alone.';
    const chunkTiles = tokenizeSentenceToChunkedTiles(sentence);
    const shuffled = buildShuffledChunkTilePool(sentence);

    expect(shuffled).toHaveLength(chunkTiles.length);
    expect(shuffled.map(tile => tile.text).sort()).toEqual(chunkTiles.map(tile => tile.text).sort());
  });
});
