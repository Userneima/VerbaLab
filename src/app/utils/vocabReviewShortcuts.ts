import { getAppStorage } from '../platform/storage';

export type VocabReviewShortcutAction = 'viewed' | 'remembered' | 'struggled';

export type VocabReviewShortcuts = Record<VocabReviewShortcutAction, string | null>;

export const VOCAB_REVIEW_SHORTCUTS_CHANGED_EVENT = 'verbalab:vocab-review-shortcuts-changed';

const STORAGE_KEY = 'ff_vocab_review_shortcuts_v1';

export const DEFAULT_VOCAB_REVIEW_SHORTCUTS: VocabReviewShortcuts = {
  viewed: '1',
  remembered: '2',
  struggled: '3',
};

const SHORTCUT_ACTIONS: VocabReviewShortcutAction[] = ['viewed', 'remembered', 'struggled'];

export function normalizeShortcutKey(rawKey: string): string | null {
  if (rawKey === ' ') return 'Space';
  const key = rawKey.trim();
  if (!key) return null;
  if (key.length === 1) return key.toUpperCase();
  if (key === 'ArrowLeft' || key === 'ArrowRight' || key === 'ArrowUp' || key === 'ArrowDown') {
    return key;
  }
  if (key === 'Enter' || key === 'Space' || key === 'Tab') return key;
  return null;
}

export function normalizeShortcutKeyFromEvent(event: KeyboardEvent): string | null {
  if (event.metaKey || event.ctrlKey || event.altKey) return null;
  return normalizeShortcutKey(event.key);
}

export function getShortcutLabel(key: string | null): string {
  if (!key) return '未设置';
  if (key === 'Space') return '空格';
  if (key === 'Enter') return '回车';
  if (key === 'Tab') return 'Tab';
  if (key === 'ArrowLeft') return '←';
  if (key === 'ArrowRight') return '→';
  if (key === 'ArrowUp') return '↑';
  if (key === 'ArrowDown') return '↓';
  return key;
}

function sanitizeShortcuts(value: Partial<VocabReviewShortcuts> | null | undefined): VocabReviewShortcuts {
  const next: VocabReviewShortcuts = { ...DEFAULT_VOCAB_REVIEW_SHORTCUTS };
  const used = new Set<string>();

  for (const action of SHORTCUT_ACTIONS) {
    const normalized = value?.[action] ? normalizeShortcutKey(String(value[action])) : null;
    if (!normalized || used.has(normalized)) {
      next[action] = null;
      continue;
    }
    next[action] = normalized;
    used.add(normalized);
  }

  return next;
}

export function loadVocabReviewShortcuts(): VocabReviewShortcuts {
  try {
    const raw = getAppStorage().getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_VOCAB_REVIEW_SHORTCUTS };
    const parsed = JSON.parse(raw) as Partial<VocabReviewShortcuts>;
    return sanitizeShortcuts(parsed);
  } catch {
    return { ...DEFAULT_VOCAB_REVIEW_SHORTCUTS };
  }
}

export function saveVocabReviewShortcuts(shortcuts: VocabReviewShortcuts): VocabReviewShortcuts {
  const next = sanitizeShortcuts(shortcuts);
  getAppStorage().setItem(STORAGE_KEY, JSON.stringify(next));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(VOCAB_REVIEW_SHORTCUTS_CHANGED_EVENT, { detail: next }));
  }
  return next;
}

export function setVocabReviewShortcut(
  shortcuts: VocabReviewShortcuts,
  action: VocabReviewShortcutAction,
  key: string | null,
): VocabReviewShortcuts {
  const normalized = key ? normalizeShortcutKey(key) : null;
  const next: VocabReviewShortcuts = { ...shortcuts, [action]: normalized };

  if (normalized) {
    for (const otherAction of SHORTCUT_ACTIONS) {
      if (otherAction !== action && next[otherAction] === normalized) {
        next[otherAction] = null;
      }
    }
  }

  return sanitizeShortcuts(next);
}

export function shouldIgnoreShortcutTarget(target: EventTarget | null): boolean {
  if (typeof HTMLElement === 'undefined') return false;
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if (target.isContentEditable) return true;
  return Boolean(target.closest('[data-vocab-shortcut-settings]'));
}
