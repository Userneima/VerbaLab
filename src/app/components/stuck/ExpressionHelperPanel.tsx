import { BookPlus, Loader2, PlusCircle, Sparkles } from 'lucide-react';
import type { StuckSuggestionResult } from '../../utils/grammarCheck';

type Props = {
  chineseThought: string;
  onChineseThoughtChange: (value: string) => void;
  loading: boolean;
  error: string | null;
  result: StuckSuggestionResult | null;
  customSentence: string;
  onCustomSentenceChange: (value: string) => void;
  onSubmit: () => void;
  onUseExampleSentence: (sentence: string) => void;
  onSaveExampleToCorpus: (sentence: string, chinese?: string) => void;
  onSaveCustomSentence: () => void;
  savingSentence: string | null;
  saveMessage: string | null;
};

export function ExpressionHelperPanel({
  chineseThought,
  onChineseThoughtChange,
  loading,
  error,
  result,
  customSentence,
  onCustomSentenceChange,
  onSubmit,
  onUseExampleSentence,
  onSaveExampleToCorpus,
  onSaveCustomSentence,
  savingSentence,
  saveMessage,
}: Props) {
  return (
    <section className="rounded-2xl border border-amber-100 bg-white shadow-sm p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 shrink-0">
          <Sparkles size={20} />
        </div>
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800">想说但不会说</h2>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            把你脑子里的中文先丢进来。AI 会给出更自然的表达方向和几条例句，你可以直接收进语料库，或者改成自己的句子再保存。
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <textarea
          value={chineseThought}
          onChange={(event) => onChineseThoughtChange(event.target.value)}
          placeholder="例如：我想说‘这件事让我很有压力，但我还是得硬着头皮继续做下去’"
          className="w-full min-h-[7.5rem] rounded-xl border border-gray-200 px-4 py-3 text-sm leading-relaxed focus:outline-none focus:border-amber-400"
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onSubmit}
            disabled={!chineseThought.trim() || loading}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            生成表达指导
          </button>
          {saveMessage ? <span className="text-sm text-emerald-700">{saveMessage}</span> : null}
        </div>
        {error ? (
          <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </div>

      {result ? (
        <div className="mt-5 space-y-4">
          <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-4">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-xs px-2 py-1 rounded-full bg-white border border-amber-100 text-amber-700 font-medium">
                {result.type === 'corpus' ? '优先复用语料' : result.type === 'verb' ? '优先套核心搭配' : '先用简单说法'}
              </span>
            </div>
            {result.guidanceZh ? (
              <p className="text-sm text-gray-700 leading-relaxed">{result.guidanceZh}</p>
            ) : result.suggestion ? (
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{result.suggestion}</p>
            ) : null}
          </div>

          {result.examples.length > 0 ? (
            <div className="space-y-3">
              <div className="text-sm font-medium text-gray-700">可直接拿来用的例句</div>
              <div className="grid grid-cols-1 gap-3">
                {result.examples.map((example, index) => (
                  <div key={`${example.sentence}-${index}`} className="rounded-xl border border-gray-200 bg-gray-50/70 p-4">
                    <p className="text-[15px] font-medium text-gray-900 leading-relaxed">{example.sentence}</p>
                    {example.chinese ? (
                      <p className="mt-2 text-sm text-gray-600 leading-relaxed pl-3 border-l-2 border-amber-200">
                        {example.chinese}
                      </p>
                    ) : null}
                    {example.noteZh ? (
                      <p className="mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 leading-relaxed">
                        {example.noteZh}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onSaveExampleToCorpus(example.sentence, example.chinese)}
                        disabled={savingSentence === example.sentence}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                      >
                        {savingSentence === example.sentence ? <Loader2 size={14} className="animate-spin" /> : <BookPlus size={14} />}
                        收进语料库
                      </button>
                      <button
                        type="button"
                        onClick={() => onUseExampleSentence(example.sentence)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <PlusCircle size={14} />
                        填到下方自己改
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-sm font-medium text-gray-700 mb-2">自己整理一句再保存</div>
            <textarea
              value={customSentence}
              onChange={(event) => onCustomSentenceChange(event.target.value)}
              placeholder="你也可以参考上面的建议，自己整理成一句英文再收录。"
              className="w-full min-h-[6rem] rounded-xl border border-gray-200 px-4 py-3 text-sm leading-relaxed focus:outline-none focus:border-amber-400"
            />
            <div className="mt-3">
              <button
                type="button"
                onClick={onSaveCustomSentence}
                disabled={!customSentence.trim() || savingSentence === '__custom__'}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingSentence === '__custom__' ? <Loader2 size={14} className="animate-spin" /> : <BookPlus size={14} />}
                保存这句到语料库
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
