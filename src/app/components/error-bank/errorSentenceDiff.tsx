type DiffRenderToken = {
  text: string;
  isSpace: boolean;
  changed: boolean;
  wordLike: boolean;
};

type SentenceDiff = {
  correctedTokens: DiffRenderToken[];
  originalTokens: DiffRenderToken[];
  keyPhrases: string[];
};

const SENTENCE_TOKEN_PATTERN = /\s+|[A-Za-z]+(?:['’][A-Za-z]+)?|[0-9]+(?:[.,][0-9]+)?|[^\sA-Za-z0-9]/g;

export function normalizeSentenceForCompare(sentence: string): string {
  return sentence.replace(/\s+/g, ' ').trim().toLowerCase();
}

function tokenizeSentence(sentence: string): Array<{
  text: string;
  isSpace: boolean;
  normalized: string;
  wordLike: boolean;
}> {
  const tokens = sentence.match(SENTENCE_TOKEN_PATTERN) ?? [sentence];
  return tokens.map((text) => ({
    text,
    isSpace: /^\s+$/.test(text),
    normalized: text.replace(/’/g, "'").toLowerCase(),
    wordLike: /[A-Za-z0-9]/.test(text),
  }));
}

function buildLcsKeepMap(source: string[], target: string[]) {
  const dp = Array.from({ length: source.length + 1 }, () =>
    Array<number>(target.length + 1).fill(0)
  );

  for (let i = 1; i <= source.length; i += 1) {
    for (let j = 1; j <= target.length; j += 1) {
      if (source[i - 1] === target[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const sourceKeep = Array<boolean>(source.length).fill(false);
  const targetKeep = Array<boolean>(target.length).fill(false);
  let i = source.length;
  let j = target.length;

  while (i > 0 && j > 0) {
    if (source[i - 1] === target[j - 1]) {
      sourceKeep[i - 1] = true;
      targetKeep[j - 1] = true;
      i -= 1;
      j -= 1;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i -= 1;
    } else {
      j -= 1;
    }
  }

  return { sourceKeep, targetKeep };
}

function createRenderTokens(
  tokens: Array<{ text: string; isSpace: boolean; wordLike: boolean }>,
  keepMap: boolean[]
): DiffRenderToken[] {
  let visibleIndex = 0;
  return tokens.map((token) => {
    if (token.isSpace) {
      return {
        text: token.text,
        isSpace: true,
        changed: false,
        wordLike: false,
      };
    }

    const changed = !keepMap[visibleIndex];
    visibleIndex += 1;
    return {
      text: token.text,
      isSpace: false,
      changed,
      wordLike: token.wordLike,
    };
  });
}

function extractChangedPhrases(tokens: DiffRenderToken[]): string[] {
  const phrases: string[] = [];
  let current: string[] = [];

  const pushCurrent = () => {
    if (current.length === 0) return;
    const phrase = current
      .join(' ')
      .replace(/\s+([,.;:!?])/g, '$1')
      .trim();
    if (phrase && /[A-Za-z0-9]/.test(phrase) && !phrases.includes(phrase)) {
      phrases.push(phrase);
    }
    current = [];
  };

  for (const token of tokens) {
    if (token.isSpace) continue;
    if (token.changed) {
      if (token.wordLike || current.length > 0) current.push(token.text);
    } else {
      pushCurrent();
    }
  }

  pushCurrent();
  return phrases.slice(0, 4);
}

export function analyzeSentenceDiff(
  originalSentence: string,
  correctedSentence: string
): SentenceDiff | null {
  const originalTokens = tokenizeSentence(originalSentence);
  const correctedTokens = tokenizeSentence(correctedSentence);
  const originalVisible = originalTokens
    .filter((token) => !token.isSpace)
    .map((token) => token.normalized);
  const correctedVisible = correctedTokens
    .filter((token) => !token.isSpace)
    .map((token) => token.normalized);

  if (originalVisible.length === 0 || correctedVisible.length === 0) return null;

  const { sourceKeep, targetKeep } = buildLcsKeepMap(originalVisible, correctedVisible);
  const renderedOriginalTokens = createRenderTokens(originalTokens, sourceKeep);
  const renderedCorrectedTokens = createRenderTokens(correctedTokens, targetKeep);
  const keyPhrases = extractChangedPhrases(renderedCorrectedTokens);

  if (!renderedCorrectedTokens.some((token) => token.changed)) return null;

  return {
    correctedTokens: renderedCorrectedTokens,
    originalTokens: renderedOriginalTokens,
    keyPhrases,
  };
}

export function renderSentenceWithDiff(
  tokens: DiffRenderToken[],
  tone: 'correct' | 'original'
) {
  return tokens.map((token, index) => {
    if (token.isSpace) {
      return <span key={`space-${index}`}>{token.text}</span>;
    }

    const changedClassName =
      tone === 'correct'
        ? 'rounded-sm bg-lime-200/80 px-0.5 text-slate-900 shadow-[inset_0_-0.18em_0_rgba(190,242,100,0.7)]'
        : 'rounded-sm bg-rose-100/70 px-0.5 text-rose-500 decoration-rose-300';

    return (
      <span key={`${tone}-${index}`} className={token.changed ? changedClassName : undefined}>
        {token.text}
      </span>
    );
  });
}
