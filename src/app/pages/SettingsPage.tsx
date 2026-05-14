import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowDownCircle,
  ArrowLeft,
  ArrowUpCircle,
  CheckCircle2,
  Cloud,
  CloudOff,
  Keyboard,
  Loader2,
  LogOut,
  RotateCcw,
  User,
} from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { useStore } from '../store/StoreContext';
import {
  DEFAULT_VOCAB_REVIEW_SHORTCUTS,
  getShortcutLabel,
  loadVocabReviewShortcuts,
  normalizeShortcutKeyFromEvent,
  saveVocabReviewShortcuts,
  setVocabReviewShortcut,
  type VocabReviewShortcutAction,
  type VocabReviewShortcuts,
  VOCAB_REVIEW_SHORTCUTS_CHANGED_EVENT,
} from '../utils/vocabReviewShortcuts';

const shortcutOptions: Array<{ action: VocabReviewShortcutAction; label: string; hint: string }> = [
  { action: 'viewed', label: '已浏览', hint: '跳过但保留浏览记录' },
  { action: 'remembered', label: '记住了', hint: '通过当前词卡复习' },
  { action: 'struggled', label: '还不熟', hint: '降低掌握度并更早复习' },
];

function syncStatusLabel(status: ReturnType<typeof useStore>['syncStatus']): string {
  if (status === 'saving') return '正在上传';
  if (status === 'loading') return '正在下载';
  if (status === 'success') return '已同步';
  if (status === 'error') return '同步失败';
  return '待同步';
}

export function SettingsPage() {
  const navigate = useNavigate();
  const store = useStore();
  const { user, signOut } = useAuth();
  const [shortcuts, setShortcuts] = useState<VocabReviewShortcuts>(() => loadVocabReviewShortcuts());
  const [listeningAction, setListeningAction] = useState<VocabReviewShortcutAction | null>(null);

  useEffect(() => {
    const refresh = () => setShortcuts(loadVocabReviewShortcuts());
    const onChanged = (event: Event) => {
      const detail = (event as CustomEvent<VocabReviewShortcuts>).detail;
      setShortcuts(detail ?? loadVocabReviewShortcuts());
    };

    window.addEventListener('storage', refresh);
    window.addEventListener(VOCAB_REVIEW_SHORTCUTS_CHANGED_EVENT, onChanged);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener(VOCAB_REVIEW_SHORTCUTS_CHANGED_EVENT, onChanged);
    };
  }, []);

  useEffect(() => {
    if (!listeningAction) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setListeningAction(null);
        return;
      }

      if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault();
        const next = saveVocabReviewShortcuts(setVocabReviewShortcut(shortcuts, listeningAction, null));
        setShortcuts(next);
        setListeningAction(null);
        return;
      }

      const key = normalizeShortcutKeyFromEvent(event);
      if (!key) return;

      event.preventDefault();
      const next = saveVocabReviewShortcuts(setVocabReviewShortcut(shortcuts, listeningAction, key));
      setShortcuts(next);
      setListeningAction(null);
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [listeningAction, shortcuts]);

  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || '用户';
  const userEmail = user?.email || '';
  const syncing = store.syncStatus === 'saving' || store.syncStatus === 'loading';

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <div className="max-w-4xl mx-auto px-5 py-6 space-y-5">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          返回
        </button>

        <section className="rounded-[1.75rem] bg-[#0f172a] text-white p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-indigo-200">设置</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">账号、同步与快捷键</h1>
              <p className="mt-3 text-sm text-slate-300">
                这里放低频设置；主导航只保留学习入口。
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-white/8 border border-white/10 px-4 py-3">
              <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center">
                <User size={18} />
              </div>
              <div className="min-w-0">
                <div className="font-semibold truncate max-w-[12rem]">{userName}</div>
                <div className="text-xs text-slate-400 truncate max-w-[12rem]">{userEmail}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-slate-900 font-semibold">
                <Cloud size={18} className="text-indigo-500" />
                云同步
              </div>
              <p className="mt-2 text-sm text-slate-500">
                本地优先保存；需要跨设备时再手动上传或下载。
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-600">
              {syncing ? (
                <Loader2 size={14} className="animate-spin text-indigo-500" />
              ) : store.syncStatus === 'success' ? (
                <CheckCircle2 size={14} className="text-emerald-500" />
              ) : store.syncStatus === 'error' ? (
                <CloudOff size={14} className="text-red-500" />
              ) : (
                <Cloud size={14} className="text-slate-400" />
              )}
              {syncStatusLabel(store.syncStatus)}
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <div className="text-sm font-medium text-slate-900">自动同步</div>
              <div className="text-xs text-slate-500">数据变更后约 3 秒尝试同步。</div>
            </div>
            <button
              type="button"
              onClick={() => store.setAutoSyncEnabled(!store.autoSyncEnabled)}
              className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
                store.autoSyncEnabled
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-slate-50 text-slate-600'
              }`}
            >
              {store.autoSyncEnabled ? '已开启' : '已关闭'}
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={store.pushToCloud}
              disabled={syncing}
              className="inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
            >
              <ArrowUpCircle size={17} />
              手动上传
            </button>
            <button
              type="button"
              onClick={store.pullFromCloud}
              disabled={syncing}
              className="inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50"
            >
              <ArrowDownCircle size={17} />
              从云下载
            </button>
          </div>

          {store.syncError ? <p className="mt-3 text-sm text-red-600">{store.syncError}</p> : null}
          {store.lastSyncTime ? (
            <p className="mt-3 text-xs text-slate-400">
              上次同步：{new Date(store.lastSyncTime).toLocaleString('zh-CN')}
            </p>
          ) : null}
        </section>

        <section
          className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
          data-vocab-shortcut-settings
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-slate-900 font-semibold">
                <Keyboard size={18} className="text-violet-500" />
                词卡复习快捷键
              </div>
              <p className="mt-2 text-sm text-slate-500">
                只在词卡复习页生效。点击一个动作后按新键；Delete 清空，Esc 取消。
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const next = saveVocabReviewShortcuts(DEFAULT_VOCAB_REVIEW_SHORTCUTS);
                setShortcuts(next);
                setListeningAction(null);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100"
            >
              <RotateCcw size={15} />
              恢复默认
            </button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {shortcutOptions.map((option) => {
              const isListening = listeningAction === option.action;
              const shortcut = shortcuts[option.action];
              return (
                <button
                  key={option.action}
                  type="button"
                  onClick={() => setListeningAction(option.action)}
                  className={`rounded-2xl border p-4 text-left transition-colors ${
                    isListening
                      ? 'border-violet-300 bg-violet-50 text-violet-900 ring-2 ring-violet-100'
                      : 'border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{option.label}</span>
                    <span className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm font-bold text-slate-700">
                      {isListening ? '按键...' : getShortcutLabel(shortcut)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">{option.hint}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-red-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-semibold text-slate-900">账号操作</div>
              <p className="mt-1 text-sm text-slate-500">退出后本地学习数据仍保留在当前设备。</p>
            </div>
            <button
              type="button"
              onClick={async () => {
                await signOut();
              }}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100"
            >
              <LogOut size={16} />
              退出登录
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
