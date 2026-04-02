const PREFIX = 'ff_err_repro_draft_';

export function readErrorReviewProduceDraft(errorId: string): string {
  try {
    return localStorage.getItem(PREFIX + errorId) ?? '';
  } catch {
    return '';
  }
}

export function writeErrorReviewProduceDraft(errorId: string, text: string): void {
  try {
    const t = text.trim();
    if (!t) {
      localStorage.removeItem(PREFIX + errorId);
      return;
    }
    localStorage.setItem(PREFIX + errorId, text);
  } catch {
    /* ignore quota */
  }
}

export function clearErrorReviewProduceDraft(errorId: string): void {
  try {
    localStorage.removeItem(PREFIX + errorId);
  } catch {
    /* ignore */
  }
}
