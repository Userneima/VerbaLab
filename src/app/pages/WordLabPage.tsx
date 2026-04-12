import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router';
import { Sparkles, Loader2, Save, RefreshCw, BookOpen, Library, ChevronRight, BookMarked, HelpCircle } from 'lucide-react';
import { aiGenerateVocabCard, aiGenerateVocabCardRegisterGuide } from '../utils/api';
import { pickWordLabCollocations } from '../utils/wordLabCollocations';
import {
  buildWordLabTags,
} from '../utils/vocabCardScenarioTags';
import { useStore } from '../store/StoreContext';
import type { VocabCardItem, VocabCardRegisterGuide } from '../store/useStore';
import { VocabRegisterGuideCard } from '../components/VocabRegisterGuideCard';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

function hasDetailedRegisterGuide(input: {
  registerNoteZh?: string;
  registerGuide?: VocabCardRegisterGuide;
}): boolean {
  const guide = input.registerGuide;
  const alternativesWithUsage = guide?.alternatives?.filter((alt) => alt.usageZh?.trim()) || [];
  return Boolean(
    input.registerNoteZh?.trim() &&
      guide?.anchorZh?.trim() &&
      alternativesWithUsage.length >= 2 &&
      guide?.compareExamples?.original?.trim() &&
      guide?.compareExamples?.spoken?.trim() &&
      (guide?.pitfalls?.length ?? 0) >= 1 &&
      (guide?.coreCollocations?.length ?? 0) >= 2
  );
}

export function WordLabPage() {
  const navigate = useNavigate();
  const store = useStore();
  const [headword, setHeadword] = useState('');
  const [sense, setSense] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    tags: string[];
    items: VocabCardItem[];
    spokenPracticePhrase: string;
    writtenSupplement: string | null;
    registerNoteZh?: string;
    registerGuide?: VocabCardRegisterGuide;
    spokenAlternatives: string[];
    isCommonInSpokenEnglish: boolean;
  } | null>(null);
  const [senseHelpOpen, setSenseHelpOpen] = useState(false);
  const [dupPromptOpen, setDupPromptOpen] = useState(false);
  const [dupExistingCardId, setDupExistingCardId] = useState<string | null>(null);
  const [dupPromptMode, setDupPromptMode] = useState<'generate' | 'save'>('generate');
  const [confirmedDuplicateKey, setConfirmedDuplicateKey] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const recentVocabCards = useMemo(
    () => store.vocabCards.slice(0, 8),
    [store.vocabCards]
  );

  const normalizeCardInput = useCallback((s: string) => s.trim().toLowerCase(), []);

  const buildDuplicateKey = useCallback((hw: string, se: string) => {
    return `${normalizeCardInput(hw)}\0${normalizeCardInput(se)}`;
  }, [normalizeCardInput]);

  const findExistingCard = useCallback((hw: string, se: string) => {
    const normalizedHeadword = normalizeCardInput(hw);
    const normalizedSense = normalizeCardInput(se);
    return store.vocabCards.find(c =>
      normalizeCardInput(c.headword) === normalizedHeadword &&
      normalizeCardInput(c.sense ?? '') === normalizedSense
    );
  }, [store.vocabCards, normalizeCardInput]);

  const runGenerateDirect = useCallback(async () => {
    const hw = headword.trim();
    if (!hw) {
      setError('请输入要练习的单词或短语');
      return;
    }
    setLoading(true);
    setError(null);
    setPreview(null);
    try {
      const collocations = pickWordLabCollocations();
      const res = await aiGenerateVocabCard({
        headword: hw,
        sense: sense.trim() || undefined,
        collocations,
      });
      const registerRes = hasDetailedRegisterGuide(res)
        ? res
        : await aiGenerateVocabCardRegisterGuide({
            headword: hw,
            sense: sense.trim() || undefined,
          });
      const mergedRegisterGuide = registerRes.registerGuide ?? res.registerGuide;
      const mergedRegisterNoteZh = registerRes.registerNoteZh ?? res.registerNoteZh;
      const mergedSpokenAlternatives = registerRes.spokenAlternatives?.length
        ? registerRes.spokenAlternatives
        : res.spokenAlternatives;
      const mergedSpokenPracticePhrase = registerRes.spokenPracticePhrase || res.spokenPracticePhrase;
      const mergedWrittenSupplement =
        registerRes.writtenSupplement != null ? registerRes.writtenSupplement : res.writtenSupplement;
      const mergedIsCommon =
        typeof registerRes.isCommonInSpokenEnglish === 'boolean'
          ? registerRes.isCommonInSpokenEnglish
          : res.isCommonInSpokenEnglish;
      const items: VocabCardItem[] = res.items.map((it, i) => ({
        id: `tmp-${i}`,
        questionId: 'daily',
        part: 0,
        topic: i === 0 ? '日常用语' : '原词日常',
        questionSnapshot: '',
        sentence: it.sentence,
        collocationsUsed: it.collocationsUsed,
        chinese: it.chinese,
      }));
      setPreview({
        tags: buildWordLabTags({
          headword: hw,
          items,
          isCommonInSpokenEnglish: mergedIsCommon,
          registerGuide: mergedRegisterGuide,
        }),
        items,
        spokenPracticePhrase: mergedSpokenPracticePhrase,
        writtenSupplement: mergedWrittenSupplement,
        registerNoteZh: mergedRegisterNoteZh,
        registerGuide: mergedRegisterGuide,
        spokenAlternatives: mergedSpokenAlternatives,
        isCommonInSpokenEnglish: mergedIsCommon,
      });
    } catch (e: any) {
      setError(e?.message || '生成失败');
    } finally {
      setLoading(false);
    }
  }, [headword, sense]);

  const runGenerate = useCallback(() => {
    const hw = headword.trim();
    if (!hw) {
      setError('请输入要练习的单词或短语');
      return;
    }
    const key = buildDuplicateKey(hw, sense);
    const existing = findExistingCard(hw, sense);
    if (existing && confirmedDuplicateKey !== key) {
      setDupExistingCardId(existing.id);
      setDupPromptMode('generate');
      setDupPromptOpen(true);
      return;
    }
    void runGenerateDirect();
  }, [headword, sense, buildDuplicateKey, findExistingCard, confirmedDuplicateKey, runGenerateDirect]);

  const saveCardDirect = useCallback(() => {
    if (!preview) return;
    const newCard = store.addVocabCard({
      headword: headword.trim(),
      sense: sense.trim() || undefined,
      tags: preview.tags,
      items: preview.items,
      spokenPracticePhrase: preview.spokenPracticePhrase,
      writtenSupplement: preview.writtenSupplement ?? undefined,
      registerNoteZh: preview.registerNoteZh,
      registerGuide: preview.registerGuide,
      spokenAlternatives: preview.spokenAlternatives,
      isCommonInSpokenEnglish: preview.isCommonInSpokenEnglish,
    });
    navigate(`/vocab/${newCard.id}`);
  }, [preview, headword, sense, store, navigate]);

  useEffect(() => {
    const currentKey = buildDuplicateKey(headword, sense);
    setConfirmedDuplicateKey(prev => (prev === currentKey ? prev : null));
  }, [headword, sense, buildDuplicateKey]);

  useEffect(() => {
    if (!previewRef.current) return;
    const t = window.requestAnimationFrame(() => {
      previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => window.cancelAnimationFrame(t);
  }, [preview]);

  const saveCard = useCallback(() => {
    if (!preview) return;
    const key = buildDuplicateKey(headword, sense);
    const existing = findExistingCard(headword, sense);
    if (existing && confirmedDuplicateKey !== key) {
      setDupExistingCardId(existing.id);
      setDupPromptMode('save');
      setDupPromptOpen(true);
      return;
    }
    saveCardDirect();
  }, [preview, headword, sense, buildDuplicateKey, findExistingCard, confirmedDuplicateKey, saveCardDirect]);

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden bg-white">
      <div className="shrink-0 border-b border-gray-100 px-4 sm:px-6 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Sparkles size={20} className="text-violet-500 shrink-0" />
          <h1 className="font-bold text-gray-800 text-base sm:text-lg">词卡工坊</h1>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
        {/* 左：新建 */}
        <div className="min-h-0 overflow-y-auto p-4 sm:p-6 pb-safe">
          <div className="space-y-4 max-w-xl lg:max-w-none">
            <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">目标词 / 短语（英文）</label>
            <input
              value={headword}
              onChange={e => setHeadword(e.target.value)}
              placeholder="e.g. resilience, make an impact"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-400"
            />
            </div>
            <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <label className="block text-sm font-medium text-gray-600">多义词约束（可选，中文或英文）</label>
              <button
                type="button"
                onClick={() => setSenseHelpOpen(true)}
                className="inline-flex items-center text-violet-600 hover:text-violet-700"
                aria-label="查看多义词约束说明"
                title="查看多义词约束说明"
              >
                <HelpCircle size={14} />
              </button>
            </div>
            <input
              value={sense}
              onChange={e => setSense(e.target.value)}
              placeholder="例如：心理韧性；或 which sense you want"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-400"
            />
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={runGenerate}
                disabled={loading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {loading ? '生成中…' : '生成单词卡片'}
              </button>
              {preview && (
                <button
                  type="button"
                  onClick={runGenerate}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  <RefreshCw size={16} />
                  重新生成
                </button>
              )}
            </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 space-y-3">
            <Link
              to="/vocab-review"
              className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white border border-violet-100 shadow-sm hover:border-violet-200 hover:bg-violet-50/40 transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                  <Library size={20} className="text-violet-600" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-800">单词卡片仓库</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    全部词卡瀑布流 · 共 {store.vocabCards.length} 张
                  </div>
                </div>
              </div>
              <ChevronRight size={18} className="text-gray-400 shrink-0 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all" />
            </Link>

            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 px-0.5">
                最近添加
              </div>
              {recentVocabCards.length === 0 ? (
                <p className="text-xs text-gray-400 px-3 py-2 rounded-lg bg-white/60 border border-dashed border-gray-200">
                  暂无记录；保存生成的卡片后会显示在此，可一键打开详情。
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {recentVocabCards.map(card => (
                    <li key={card.id}>
                      <Link
                        to={`/vocab/${card.id}`}
                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white border border-gray-100 hover:border-violet-200 hover:bg-white transition-colors text-left group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <BookMarked size={14} className="text-violet-500 shrink-0 opacity-80" />
                          <span className="text-sm font-medium text-gray-800 truncate">{card.headword}</span>
                          <span className="text-xs text-gray-400 shrink-0">
                            {card.items.length} 句
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[11px] text-gray-400">
                            {new Date(card.timestamp).toLocaleString('zh-CN', {
                              month: 'numeric',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <ChevronRight size={14} className="text-gray-300 group-hover:text-violet-400" />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          </div>
        </div>

        {/* 右：预览（各占一半宽度） */}
        <div className="min-h-0 overflow-y-auto p-4 sm:p-6 pb-safe bg-slate-50/80">
          {!preview ? (
            <div
              ref={previewRef}
              className="h-full min-h-[12rem] flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white/80 px-4 py-8 text-center"
            >
              <BookOpen size={28} className="text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">在左侧输入目标词并生成后，预览将显示在此</p>
            </div>
          ) : (
            <div ref={previewRef} className="space-y-3 border border-gray-200 rounded-xl p-3 sm:p-4 bg-white shadow-sm">
              <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <BookOpen size={16} className="text-indigo-500 shrink-0" />
                预览 · {headword.trim()}
              </h2>
              <div className="rounded-lg border border-gray-100 bg-gray-50/90 px-3 py-2.5 text-[13px] leading-snug space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      preview.isCommonInSpokenEnglish
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    {preview.isCommonInSpokenEnglish ? '口语常用' : '偏书面/少口语'}
                  </span>
                </div>
                <VocabRegisterGuideCard
                  headword={headword.trim()}
                  spokenPracticePhrase={preview.spokenPracticePhrase}
                  registerGuide={preview.registerGuide}
                  registerNoteZh={preview.registerNoteZh}
                  spokenAlternatives={preview.spokenAlternatives}
                  compact
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {preview.tags.map(t => (
                  <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-violet-50 text-violet-800 border border-violet-100">
                    {t}
                  </span>
                ))}
              </div>
              <div className="text-[13px] text-gray-800 leading-relaxed border border-gray-100 rounded-lg p-2.5 bg-gray-50/80 space-y-3">
                {preview.items.map((it, idx) => (
                  <div key={it.id} className={idx > 0 ? 'pt-2 border-t border-gray-200/80' : ''}>
                    <span
                      className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full mb-1.5 ${
                        it.topic === '原词日常'
                          ? 'bg-amber-50 text-amber-900 border border-amber-100'
                          : 'bg-slate-100 text-slate-700 border border-slate-200/80'
                      }`}
                    >
                      {it.topic === '原词日常' ? '原词·日常说法' : '口语示范'}
                    </span>
                    <p className="font-medium">{it.sentence}</p>
                    {it.chinese && <p className="text-gray-500 text-xs mt-1">{it.chinese}</p>}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {it.collocationsUsed.map(p => (
                        <span key={p} className="text-[10px] bg-emerald-100/90 text-emerald-900 px-1 py-0.5 rounded">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={saveCard}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
              >
                <Save size={16} />
                保存单词卡片
              </button>
            </div>
          )}
        </div>
      </div>
      <Dialog open={senseHelpOpen} onOpenChange={setSenseHelpOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>多义词约束说明</DialogTitle>
            <DialogDescription asChild>
              <div className="text-sm text-gray-600 leading-relaxed space-y-2">
                <p>
                  这个输入框用于指定你想练的<strong>词义方向</strong>。当目标词有多个常见含义时，模型会优先按这里的约束生成句子。
                </p>
                <p>
                  例如：<code>issue</code> 可约束为“问题（problem，不是发布）”；<code>charge</code> 可约束为“收费（不是指控）”。
                </p>
                <p>不填也能生成，但多义词时更容易偏到你不想练的义项。</p>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
      <Dialog open={dupPromptOpen} onOpenChange={setDupPromptOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>检测到重复卡片</DialogTitle>
            <DialogDescription>
              {dupPromptMode === 'generate'
                ? '当前已有此单词/短语卡片。继续生成会再次请求 AI 并消耗一次生成额度，是否继续？'
                : '当前已有此单词/短语卡片，是否还要创建？'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setDupPromptOpen(false)}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
            >
              否
            </button>
            <button
              type="button"
              onClick={() => {
                setDupPromptOpen(false);
                const key = buildDuplicateKey(headword, sense);
                setConfirmedDuplicateKey(key);
                if (dupPromptMode === 'generate') {
                  void runGenerateDirect();
                  return;
                }
                saveCardDirect();
              }}
              className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm hover:bg-violet-700"
            >
              {dupPromptMode === 'generate' ? '继续生成' : '仍创建'}
            </button>
            <button
              type="button"
              onClick={() => {
                if (!dupExistingCardId) return;
                setDupPromptOpen(false);
                navigate(`/vocab/${dupExistingCardId}`);
              }}
              disabled={!dupExistingCardId}
              className="px-4 py-2 rounded-lg border border-violet-200 text-violet-700 text-sm hover:bg-violet-50 disabled:opacity-50"
            >
              跳转到已有卡片
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
