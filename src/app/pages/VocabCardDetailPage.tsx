import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import {
  BookMarked,
  Trash2,
  ArrowLeft,
  Check,
  ThumbsUp,
  HelpCircle,
  X,
  ChevronDown,
  ChevronUp,
  Languages,
} from 'lucide-react';
import { useStore } from '../store/StoreContext';
import { isVocabCardDue } from '../utils/vocabCardReview';
import { pickCollocationForCloze } from '../utils/reviewGate';
import { VocabReproducePanel } from '../components/VocabReproducePanel';

const QUESTION_PREVIEW_LEN = 100;

function truncatePreview(s: string, max = QUESTION_PREVIEW_LEN): string {
  const t = s.replace(/\s+/g, ' ').trim();
  if (!t) return '';
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function itemQuestionLine(it: { questionSnapshot: string; topic: string }): string {
  const q = it.questionSnapshot?.trim();
  if (q) return q;
  return it.topic ? `「${it.topic}」` : '口语题';
}

export function VocabCardDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const store = useStore();

  const card = useMemo(() => store.vocabCards.find(c => c.id === id), [store.vocabCards, id]);
  const [tagInput, setTagInput] = useState('');
  const [tagsEditingOpen, setTagsEditingOpen] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [zhOpenById, setZhOpenById] = useState<Record<string, boolean>>({});
  const [passedReproItemIds, setPassedReproItemIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setTagsEditingOpen(false);
    setTagInput('');
    setZhOpenById({});
    setPassedReproItemIds(new Set());
  }, [id]);

  const itemIdsKey = card?.items?.map(i => i.id).join('|') ?? '';

  useEffect(() => {
    if (!card?.items.length) {
      setExpandedItemId(null);
      return;
    }
    setExpandedItemId(prev =>
      prev && card.items.some(it => it.id === prev) ? prev : card.items[0].id
    );
  }, [card?.id, itemIdsKey]);

  const toggleZh = useCallback((itemId: string) => {
    setZhOpenById(m => ({ ...m, [itemId]: !m[itemId] }));
  }, []);

  useEffect(() => {
    setZhOpenById({});
  }, [expandedItemId]);

  if (!card) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <p className="text-gray-500 text-sm mb-4">找不到这张卡片</p>
        <Link to="/corpus?tab=cards" className="text-indigo-600 text-sm font-medium hover:underline">
          返回语料库
        </Link>
      </div>
    );
  }

  const saveTags = () => {
    const next = tagInput.split(/[,，]/).map(t => t.trim()).filter(Boolean);
    if (next.length === 0) return;
    store.updateVocabCard(card.id, { tags: Array.from(new Set([...card.tags, ...next])) });
    setTagInput('');
  };

  const closeTagEditor = () => {
    setTagsEditingOpen(false);
    setTagInput('');
  };

  const removeTag = (tagToRemove: string) => {
    store.updateVocabCard(card.id, {
      tags: card.tags.filter(t => t !== tagToRemove),
    });
  };

  const isDue = isVocabCardDue(card.nextDueAt);
  const anyReproPassed = passedReproItemIds.size > 0;
  const reproFooterBlocked = isDue && !anyReproPassed;
  const targetPhraseForItem = (it: (typeof card.items)[0]) =>
    pickCollocationForCloze(it.sentence, it.collocationsUsed) ||
    it.collocationsUsed[0] ||
    card.headword;

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden bg-gray-50">
      <div className="shrink-0 bg-white border-b border-gray-100 px-4 sm:px-6 py-3 sm:py-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-2"
        >
          <ArrowLeft size={16} />
          返回
        </button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <BookMarked size={22} className="text-violet-600 shrink-0" />
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{card.headword}</h1>
            </div>
            {card.sense && <p className="text-sm text-gray-500 mt-1">{card.sense}</p>}
            <p className="text-xs text-gray-400 mt-2">
              复习阶段 {card.reviewStage} · 下次提醒{' '}
              {card.nextDueAt
                ? new Date(card.nextDueAt).toLocaleString('zh-CN')
                : '未设置'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (confirm('确定删除整张单词卡片？')) {
                store.deleteVocabCard(card.id);
                navigate('/corpus?tab=cards');
              }
            }}
            className="flex items-center gap-1.5 text-sm text-red-600 px-3 py-2 rounded-lg hover:bg-red-50 border border-red-100"
          >
            <Trash2 size={15} />
            删除
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6 pb-8">
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium text-gray-500">应用场景</span>
              {!tagsEditingOpen ? (
                <button
                  type="button"
                  onClick={() => setTagsEditingOpen(true)}
                  className="text-xs font-medium text-violet-600 hover:text-violet-700 px-2 py-1 rounded-lg hover:bg-violet-50 transition-colors"
                >
                  编辑标签
                </button>
              ) : (
                <button
                  type="button"
                  onClick={closeTagEditor}
                  className="text-xs font-medium text-gray-600 hover:text-gray-800 px-2 py-1 rounded-lg hover:bg-gray-200/60 transition-colors"
                >
                  完成
                </button>
              )}
            </div>
            {!tagsEditingOpen ? (
              card.tags.length === 0 ? (
                <p className="text-xs text-gray-400 leading-relaxed">暂无标签。需要时点「编辑标签」添加。</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {card.tags.map((t, i) => (
                    <span
                      key={`${t}-${i}`}
                      className="text-xs px-2.5 py-1 rounded-full bg-white border border-gray-200 text-gray-700"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )
            ) : (
              <div className="space-y-3 pt-1">
                {card.tags.length === 0 ? (
                  <p className="text-xs text-gray-400">暂无标签，可在下方添加。</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {card.tags.map((t, i) => (
                      <span
                        key={`${t}-${i}`}
                        className="inline-flex items-center gap-0.5 text-xs pl-2.5 pr-1 py-1 rounded-full bg-white border border-gray-200 text-gray-700"
                      >
                        <span>{t}</span>
                        <button
                          type="button"
                          onClick={() => removeTag(t)}
                          className="p-0.5 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          aria-label={`删除标签 ${t}`}
                        >
                          <X size={14} strokeWidth={2} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    placeholder="追加应用场景，逗号分隔"
                    className="flex-1 min-w-[12rem] border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                  />
                  <button
                    type="button"
                    onClick={saveTags}
                    className="px-3 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-900"
                  >
                    添加
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h2 className="font-semibold text-gray-800 text-sm px-0.5">例句与题目</h2>
            <p className="text-xs text-gray-400 px-0.5 -mt-1 leading-relaxed">
              折叠时只看题干；点行展开。到期复习时须先完成「填空 + 造句」再查看例句并标记复习结果。同时只展开一条。
            </p>
            <div className="space-y-2">
              {card.items.map(it => {
                const open = expandedItemId === it.id;
                const questionText = itemQuestionLine(it);
                return (
                  <div
                    key={it.id}
                    className={`border rounded-xl bg-white shadow-sm overflow-hidden transition-colors ${
                      open ? 'border-violet-200 ring-1 ring-violet-100' : 'border-gray-100'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedItemId(open ? null : it.id)}
                      className="w-full flex items-start gap-2 text-left px-3 py-3 sm:px-4 hover:bg-gray-50/80 transition-colors"
                    >
                      <span className="text-xs font-medium bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded shrink-0">
                        Part {it.part}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="text-[11px] text-gray-400 block mb-0.5">{it.topic}</span>
                        <p
                          className={`text-gray-700 text-sm leading-snug font-normal ${
                            open ? '' : 'line-clamp-3'
                          }`}
                        >
                          {open ? questionText : truncatePreview(questionText)}
                        </p>
                      </div>
                      {open ? (
                        <ChevronUp size={18} className="text-gray-400 shrink-0 mt-0.5" />
                      ) : (
                        <ChevronDown size={18} className="text-gray-400 shrink-0 mt-0.5" />
                      )}
                    </button>
                    {open && (
                      <div className="px-3 sm:px-4 pb-4 pt-0 space-y-3 border-t border-gray-50">
                        {isDue && !anyReproPassed && (
                          <div className="pt-3">
                            <VocabReproducePanel
                              key={it.id}
                              referenceSentence={it.sentence}
                              targetCollocation={targetPhraseForItem(it)}
                              cueZh={it.chinese}
                              alreadyPassed={false}
                              onComplete={() =>
                                setPassedReproItemIds(prev => new Set(prev).add(it.id))
                              }
                            />
                          </div>
                        )}
                        {isDue && !anyReproPassed && (
                          <p className="text-[11px] text-violet-600 leading-relaxed">
                            完成上方再产出后即可查看例句；任一条目通过即可解锁全部例句与下方复习按钮。
                          </p>
                        )}
                        {(!isDue || anyReproPassed) && (
                          <>
                            <div className="pt-3">
                              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-2">例句</p>
                              <button
                                type="button"
                                onClick={() => it.chinese && toggleZh(it.id)}
                                className={`w-full text-left rounded-lg border px-3 py-3 text-sm leading-relaxed font-medium transition-colors ${
                                  it.chinese
                                    ? zhOpenById[it.id]
                                      ? 'border-violet-200 bg-violet-50/50 text-gray-900'
                                      : 'border-gray-200 bg-white text-gray-800 hover:border-violet-200 hover:bg-violet-50/30 cursor-pointer'
                                    : 'border-gray-200 bg-white text-gray-800 cursor-default'
                                }`}
                                aria-label={it.chinese ? (zhOpenById[it.id] ? '隐藏中文翻译' : '显示中文翻译') : undefined}
                              >
                                {it.sentence}
                                {it.chinese && !zhOpenById[it.id] && (
                                  <span className="mt-2 flex items-center gap-1 text-xs font-normal text-violet-600">
                                    <Languages size={12} />
                                    点击显示中文
                                  </span>
                                )}
                              </button>
                              {it.chinese && zhOpenById[it.id] && (
                                <p className="text-gray-600 text-sm leading-relaxed mt-2 pl-1 border-l-2 border-violet-200">
                                  {it.chinese}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1 pt-1">
                              {it.collocationsUsed.map(p => (
                                <span
                                  key={p}
                                  className="text-[11px] bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-100"
                                >
                                  {p}
                                </span>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-gray-200 bg-white/95 backdrop-blur-sm shadow-[0_-4px_24px_rgba(0,0,0,0.06)] px-4 sm:px-6 py-3 pb-safe sm:pb-3 z-10">
        <div className="max-w-3xl mx-auto space-y-2">
          <div className="text-xs font-medium text-gray-700">复习操作</div>
          <details className="group text-xs text-gray-500">
            <summary className="cursor-pointer text-violet-600 hover:text-violet-700 list-none flex items-center gap-1 [&::-webkit-details-marker]:hidden">
              <ChevronDown
                size={14}
                className="shrink-0 transition-transform group-open:rotate-180 text-violet-500"
              />
              三个按钮分别做什么？
            </summary>
            <p className="mt-2 pl-5 leading-relaxed text-gray-600 border-l-2 border-violet-100">
              <strong className="text-gray-700">已浏览</strong>
              ：按当前阶段推迟下次提醒（3 / 7 / 14 天）。
              <strong className="text-gray-700">记住了</strong>
              ：阶段 +1，间隔拉长。
              <strong className="text-gray-700">还不太熟</strong>
              ：回到阶段 0，约 1 天后再提醒。
              {isDue && (
                <span className="block mt-1 text-violet-700">
                  卡片到期时：须至少完成一条目下的「填空 + 造句批改」后，才能使用上述按钮。
                </span>
              )}
            </p>
          </details>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => store.markVocabCardViewed(card.id)}
              disabled={reproFooterBlocked}
              title={reproFooterBlocked ? '请先完成至少一条目的再产出' : undefined}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-violet-200 text-violet-800 text-sm font-medium hover:bg-violet-50 disabled:opacity-45 disabled:cursor-not-allowed"
            >
              <Check size={16} />
              已浏览
            </button>
            <button
              type="button"
              onClick={() => store.markVocabCardRemembered(card.id)}
              disabled={reproFooterBlocked}
              title={reproFooterBlocked ? '请先完成至少一条目的再产出' : undefined}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-45 disabled:cursor-not-allowed"
            >
              <ThumbsUp size={16} />
              记住了
            </button>
            <button
              type="button"
              onClick={() => store.markVocabCardStruggled(card.id)}
              disabled={reproFooterBlocked}
              title={reproFooterBlocked ? '请先完成至少一条目的再产出' : undefined}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-100 border border-amber-200 text-amber-900 text-sm font-medium hover:bg-amber-200/80 disabled:opacity-45 disabled:cursor-not-allowed"
            >
              <HelpCircle size={16} />
              还不太熟
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
