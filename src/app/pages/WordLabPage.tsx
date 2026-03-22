import { useState, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router';
import { Sparkles, Loader2, Save, RefreshCw, BookOpen, Library, ChevronRight, BookMarked } from 'lucide-react';
import { IELTS_QUESTIONS, getDailyCollocations } from '../data/verbData';
import { aiGenerateVocabCard } from '../utils/api';
import { scenarioTagsFromVocabItems } from '../utils/vocabCardScenarioTags';
import { useStore } from '../store/StoreContext';
import type { VocabCardItem } from '../store/useStore';

/** 控制单次生成体量，避免 prompt 过大、等待过久 */
const VOCAB_LAB_QUESTION_COUNT = 3;
const VOCAB_LAB_COLLOCATION_COUNT = 28;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
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
  } | null>(null);
  const [extraTags, setExtraTags] = useState('');

  const recentVocabCards = useMemo(
    () => store.vocabCards.slice(0, 8),
    [store.vocabCards]
  );

  const runGenerate = useCallback(async () => {
    const hw = headword.trim();
    if (!hw) {
      setError('请输入要练习的单词或短语');
      return;
    }
    setLoading(true);
    setError(null);
    setPreview(null);
    try {
      const questions = shuffle([...IELTS_QUESTIONS]).slice(0, VOCAB_LAB_QUESTION_COUNT);
      const collocations = shuffle(getDailyCollocations())
        .slice(0, VOCAB_LAB_COLLOCATION_COUNT)
        .map(({ verb, collocation }) => ({
        phrase: collocation.phrase,
        meaning: collocation.meaning,
        verb: verb.verb,
      }));
      const res = await aiGenerateVocabCard({
        headword: hw,
        sense: sense.trim() || undefined,
        questions,
        collocations,
      });
      const qMap = new Map(questions.map(q => [q.id, q]));
      const items: VocabCardItem[] = res.items.map((it, i) => {
        const q = qMap.get(it.questionId);
        if (!q) {
          return {
            id: `tmp-${i}`,
            questionId: it.questionId,
            part: 1,
            topic: '',
            questionSnapshot: '',
            sentence: it.sentence,
            collocationsUsed: it.collocationsUsed,
            chinese: it.chinese,
          };
        }
        return {
          id: `tmp-${i}`,
          questionId: q.id,
          part: q.part,
          topic: q.topic,
          questionSnapshot: q.question,
          sentence: it.sentence,
          collocationsUsed: it.collocationsUsed,
          chinese: it.chinese,
        };
      });
      setPreview({ tags: scenarioTagsFromVocabItems(items), items });
    } catch (e: any) {
      setError(e?.message || '生成失败');
    } finally {
      setLoading(false);
    }
  }, [headword, sense]);

  const saveCard = useCallback(() => {
    if (!preview) return;
    const tags = [
      ...preview.tags,
      ...extraTags.split(/[,，]/).map(t => t.trim()).filter(Boolean),
    ];
    const uniq = Array.from(new Set(tags));
    store.addVocabCard({
      headword: headword.trim(),
      sense: sense.trim() || undefined,
      tags: uniq,
      items: preview.items,
    });
    navigate('/corpus?tab=cards');
  }, [preview, extraTags, headword, sense, store, navigate]);

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-wrap items-center gap-2">
            <Sparkles size={20} className="text-violet-500 shrink-0" />
            <h1 className="font-bold text-gray-800 text-base sm:text-lg">词卡工坊</h1>
          </div>
          <p className="text-gray-400 text-sm mt-0.5 max-w-2xl">
            输入目标词，AI 会结合实战仓雅思模拟题与资产区日常搭配，生成多条「一题一句」语料；保存后进入语料库的「单词卡片」并参与复习提醒。
          </p>
        </div>

        <div className="p-4 sm:p-6 pb-safe sm:pb-6 max-w-2xl space-y-5">
          <div className="bg-violet-50 border border-violet-100 rounded-xl p-4 text-sm text-violet-900">
            <div className="font-medium mb-1">每次生成</div>
            <p className="text-violet-800/90 text-xs leading-relaxed">
              每次随机抽取 {VOCAB_LAB_QUESTION_COUNT} 道雅思口语题与约 {VOCAB_LAB_COLLOCATION_COUNT} 条日常搭配作为白名单；模型为每道题写一句自然口语，并至少使用白名单中一个搭配。若结果不理想可点「重新生成」换一批题目与搭配。
            </p>
          </div>

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
            <label className="block text-sm font-medium text-gray-600 mb-1.5">义项提示（可选，中文或英文）</label>
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
              {loading ? '生成中…' : '生成语料卡片'}
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
              to="/corpus?tab=cards"
              className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white border border-violet-100 shadow-sm hover:border-violet-200 hover:bg-violet-50/40 transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                  <Library size={20} className="text-violet-600" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-800">单词卡片仓库</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    语料库 · 单词卡片 · 共 {store.vocabCards.length} 张
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

          {preview && (
            <div className="space-y-4 border border-gray-100 rounded-2xl p-4 sm:p-5 bg-white shadow-sm">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <BookOpen size={18} className="text-indigo-500" />
                预览 · {headword.trim()}
              </h2>
              <div>
                <p className="text-xs text-gray-500 mb-1.5">应用场景（按本题卡内的口语题自动归类）</p>
                <div className="flex flex-wrap gap-1.5">
                  {preview.tags.map(t => (
                    <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-violet-50 text-violet-800 border border-violet-100">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">追加应用场景（可选，逗号分隔）</label>
                <input
                  value={extraTags}
                  onChange={e => setExtraTags(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-400"
                  placeholder="如：面试、学术写作…"
                />
              </div>
              <div className="space-y-3 max-h-[min(55vh,28rem)] overflow-y-auto pr-1">
                {preview.items.map((it, idx) => (
                  <div key={it.id} className="border border-gray-100 rounded-xl p-3 bg-gray-50/80">
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span className="text-xs font-medium bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                        Part {it.part}
                      </span>
                      <span className="text-xs text-gray-500">{it.topic}</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-1.5 leading-relaxed">{it.questionSnapshot}</p>
                    <p className="text-sm text-gray-800 font-medium leading-relaxed">{it.sentence}</p>
                    {it.chinese && (
                      <p className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-200">{it.chinese}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {it.collocationsUsed.map(p => (
                        <span key={p} className="text-[11px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
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
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
              >
                <Save size={16} />
                保存到语料库（单词卡片）
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
