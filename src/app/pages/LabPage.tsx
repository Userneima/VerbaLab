import { useState, useCallback } from 'react';
import { FlaskConical, RefreshCw, Send, CheckCircle2, XCircle, Loader2, BookOpen, AlertTriangle, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import { getAllCollocations, getIELTSContextForPhrase } from '../data/verbData';
import { checkGrammar, checkChinglish, GrammarError } from '../utils/grammarCheck';
import { useStore } from '../store/StoreContext';

type TestState = 'idle' | 'checking' | 'correct' | 'incorrect';

/** 造句语境：匹配 IELTS 主题，覆盖尽量多的雅思考题 */
function getRandomContext(phrase: string): string {
  return getIELTSContextForPhrase(phrase);
}

function getRandomCollocation() {
  const all = getAllCollocations();
  return all[Math.floor(Math.random() * all.length)];
}

export function LabPage() {
  const store = useStore();
  const [currentItem, setCurrentItem] = useState(() => getRandomCollocation());
  const [chineseContext] = useState(() => getRandomContext(currentItem.collocation.phrase));
  const [contextStr, setContextStr] = useState(chineseContext);
  const [userInput, setUserInput] = useState('');
  const [testState, setTestState] = useState<TestState>('idle');
  const [errors, setErrors] = useState<GrammarError[]>([]);
  const [overallHint, setOverallHint] = useState('');
  const [showExamples, setShowExamples] = useState(false);
  const [expandedError, setExpandedError] = useState<number | null>(null);
  const [submissionCount, setSubmissionCount] = useState(0);

  const loadNew = useCallback(() => {
    const next = getRandomCollocation();
    setCurrentItem(next);
    setContextStr(getRandomContext(next.collocation.phrase));
    setUserInput('');
    setTestState('idle');
    setErrors([]);
    setOverallHint('');
    setShowExamples(false);
    setSubmissionCount(0);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!userInput.trim()) return;
    setTestState('checking');
    setShowExamples(false);

    const result = await checkGrammar(userInput, currentItem.collocation.phrase);
    setSubmissionCount(s => s + 1);

    if (result.isCorrect) {
      setErrors([]);
      const trimmed = userInput.trim();
      const chinglish = await checkChinglish(trimmed, currentItem.collocation.phrase);
      if (chinglish.isChinglish && (chinglish.nativeVersion || chinglish.nativeThinking)) {
        store.addToCorpus({
          verbId: currentItem.verb.id,
          verb: currentItem.verb.verb,
          collocationId: currentItem.collocation.id,
          collocation: currentItem.collocation.phrase,
          userSentence: trimmed,
          isCorrect: true,
          mode: 'test',
          tags: [currentItem.verb.verb.toLowerCase(), currentItem.collocation.phrase.toLowerCase()],
          nativeVersion: chinglish.nativeVersion,
          nativeThinking: chinglish.nativeThinking,
          isChinglish: true,
        });
        store.addToErrorBank({
          verbId: currentItem.verb.id,
          verb: currentItem.verb.verb,
          collocationId: currentItem.collocation.id,
          collocation: currentItem.collocation.phrase,
          originalSentence: trimmed,
          errorTypes: ['chinglish'],
          errorCategory: 'chinglish',
          diagnosis: '语法正确但表达偏中式，母语者会换一种更自然的说法。',
          hint: chinglish.nativeVersion ? `母语者常说：${chinglish.nativeVersion}` : (chinglish.nativeThinking || ''),
          grammarPoints: [],
          nativeVersion: chinglish.nativeVersion,
          nativeThinking: chinglish.nativeThinking,
        });
        setOverallHint(chinglish.nativeVersion ? `母语者说法：${chinglish.nativeVersion}` : '');
        setTestState('incorrect');
      } else {
        setTestState('correct');
        store.addToCorpus({
          verbId: currentItem.verb.id,
          verb: currentItem.verb.verb,
          collocationId: currentItem.collocation.id,
          collocation: currentItem.collocation.phrase,
          userSentence: trimmed,
          isCorrect: true,
          mode: 'test',
          tags: [currentItem.verb.verb.toLowerCase(), currentItem.collocation.phrase.toLowerCase()],
        });
        store.markAsLearned(currentItem.collocation.id);
      }
    } else {
      setTestState('incorrect');
      setErrors(result.errors);
      setOverallHint(result.overallHint);
      // Save to error bank
      store.addToErrorBank({
        verbId: currentItem.verb.id,
        verb: currentItem.verb.verb,
        collocationId: currentItem.collocation.id,
        collocation: currentItem.collocation.phrase,
        originalSentence: userInput.trim(),
        errorTypes: result.errors.map(e => e.type),
        errorCategory: 'grammar',
        diagnosis: result.errors.map((e, i) => `${i + 1}. ${e.description}`).join('\n'),
        hint: result.overallHint,
        grammarPoints: result.errors.map(e => e.grammarPoint),
      });
    }
  }, [userInput, currentItem, store]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSubmit();
    }
  };

  const isLearned = store.learnedCollocations.has(currentItem.collocation.id);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main lab area */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        <div className="max-w-2xl mx-auto space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FlaskConical size={20} className="text-violet-600" />
              <h1 className="font-bold text-gray-800">实验室 · 语法校验</h1>
              <span className="text-xs text-gray-400">· 用搭配造句，AI 实时诊断</span>
            </div>
            <button
              onClick={loadNew}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-indigo-50"
            >
              <RefreshCw size={14} />
              换一题
            </button>
          </div>

          {/* Test Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Card header */}
            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-5 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-violet-200 text-xs uppercase tracking-wide mb-1">目标搭配</div>
                  <div className="text-2xl font-bold">{currentItem.collocation.phrase}</div>
                  <div className="text-violet-200 mt-1">{currentItem.collocation.meaning}</div>
                </div>
                <div className="text-right">
                  <div className="bg-white/20 rounded-lg px-3 py-1 text-sm font-medium">
                    {currentItem.verb.verb}
                  </div>
                  {isLearned && (
                    <div className="mt-2 text-xs text-violet-200">✓ 已标记学习</div>
                  )}
                </div>
              </div>
            </div>

            {/* Task */}
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-amber-700 text-xs font-bold">题</span>
                </div>
                <div>
                  <p className="text-gray-700 text-sm font-medium">{contextStr}</p>
                  <p className="text-gray-400 text-xs mt-1">请用搭配 <strong className="text-indigo-600">{currentItem.collocation.phrase}</strong> 写一个完整的英文句子</p>
                </div>
              </div>
            </div>

            {/* Input area */}
            <div className="p-5">
              <textarea
                value={userInput}
                onChange={e => setUserInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Write a sentence using "${currentItem.collocation.phrase}"...`}
                rows={3}
                disabled={testState === 'checking' || testState === 'correct'}
                className={`w-full border rounded-xl px-4 py-3 text-sm resize-none focus:outline-none transition-colors ${
                  testState === 'correct'
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                    : testState === 'incorrect'
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-200 focus:border-indigo-400 bg-white'
                }`}
              />
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-gray-400">
                  {userInput.length > 0 ? `${userInput.length} 字符` : '提示：Ctrl+Enter 快速提交'}
                  {submissionCount > 0 && <span className="ml-2 text-violet-500">第 {submissionCount} 次提交</span>}
                </span>
                <button
                  onClick={handleSubmit}
                  disabled={!userInput.trim() || testState === 'checking' || testState === 'correct'}
                  className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-all ${
                    testState === 'correct'
                      ? 'bg-emerald-100 text-emerald-700 cursor-not-allowed'
                      : testState === 'checking'
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50'
                  }`}
                >
                  {testState === 'checking' ? (
                    <><Loader2 size={15} className="animate-spin" /> AI 检查中...</>
                  ) : testState === 'correct' ? (
                    <><CheckCircle2 size={15} /> 已通过</>
                  ) : (
                    <><Send size={15} /> 提交检查</>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Feedback area */}
          {testState === 'correct' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 size={20} className="text-emerald-600" />
                <span className="text-emerald-800 font-semibold">语法正确！已存入个人语料库 ✨</span>
              </div>
              <div className="bg-white border border-emerald-100 rounded-xl p-4 mb-4">
                <p className="text-gray-700 text-sm">"{userInput}"</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={loadNew}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors"
                >
                  <ArrowRight size={15} />
                  下一题
                </button>
                <button
                  onClick={() => setShowExamples(!showExamples)}
                  className="flex items-center gap-2 px-4 py-2.5 border border-emerald-200 text-emerald-700 rounded-xl text-sm hover:bg-emerald-100 transition-colors"
                >
                  <BookOpen size={15} />
                  {showExamples ? '隐藏' : '查看'}参考例句
                </button>
              </div>
            </div>
          )}

          {testState === 'incorrect' && errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <XCircle size={20} className="text-red-500" />
                <span className="text-red-800 font-semibold">发现 {errors.length} 个语法问题</span>
              </div>

              <div className="space-y-2">
                {errors.map((err, i) => (
                  <div key={i} className="bg-white border border-red-100 rounded-xl overflow-hidden">
                    <button
                      className="w-full flex items-start justify-between gap-3 p-4 text-left hover:bg-red-50 transition-colors"
                      onClick={() => setExpandedError(expandedError === i ? null : i)}
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-red-600 text-xs font-bold">{i + 1}</span>
                        </div>
                        <div>
                          <p className="text-gray-800 text-sm font-medium">{err.description}</p>
                          <p className="text-gray-500 text-xs mt-0.5">语法点：{err.grammarPoint}</p>
                        </div>
                      </div>
                      {expandedError === i
                        ? <ChevronUp size={16} className="text-gray-400 mt-0.5 shrink-0" />
                        : <ChevronDown size={16} className="text-gray-400 mt-0.5 shrink-0" />
                      }
                    </button>
                    {expandedError === i && (
                      <div className="px-4 pb-4 pt-0">
                        <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <span className="text-amber-500 shrink-0">💡</span>
                            <p className="text-amber-800 text-sm">{err.hint}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {overallHint && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-amber-800 text-sm">{overallHint}</p>
                </div>
              )}

              <div className="pt-1">
                <p className="text-red-700 text-sm font-medium mb-2">❌ 严禁直接给你答案——请根据提示自己修改！</p>
                <p className="text-gray-500 text-xs">修改句子后重新提交，正确后将存入你的语料库</p>
              </div>
            </div>
          )}

          {/* Reference examples (shown after correct answer) */}
          {showExamples && testState === 'correct' && (
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <BookOpen size={16} className="text-indigo-500" />
                参考例句 — {currentItem.collocation.phrase}
              </h3>
              <div className="space-y-3">
                {currentItem.collocation.examples.map((ex, i) => (
                  <div key={i} className="border border-gray-100 rounded-xl p-3.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      ex.scenario === 'daily' ? 'bg-blue-100 text-blue-700' :
                      ex.scenario === 'zju' ? 'bg-purple-100 text-purple-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {ex.scenario === 'daily' ? '日常' : ex.scenario === 'zju' ? '校园' : '设计'}
                    </span>
                    <p className="text-gray-700 text-sm mt-2">{ex.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right sidebar - recent activity */}
      <div className="w-64 bg-white border-l border-gray-100 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-700 text-sm">最近活动</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {store.corpus.slice(0, 10).map(entry => (
            <div key={entry.id} className="border border-gray-100 rounded-lg p-2.5">
              <div className="flex items-center gap-1 mb-1">
                <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                <span className="text-xs text-indigo-600 font-medium truncate">{entry.collocation}</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{entry.userSentence}</p>
            </div>
          ))}
          {store.errorBank.slice(0, 5).map(entry => (
            <div key={entry.id} className="border border-red-100 rounded-lg p-2.5 bg-red-50">
              <div className="flex items-center gap-1 mb-1">
                <AlertTriangle size={12} className="text-red-400 shrink-0" />
                <span className="text-xs text-red-600 font-medium truncate">{entry.collocation}</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{entry.originalSentence}</p>
            </div>
          ))}
          {store.corpus.length === 0 && store.errorBank.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-xs">
              <FlaskConical size={24} className="mx-auto mb-2 opacity-50" />
              开始造句，这里会显示你的活动记录
            </div>
          )}
        </div>
        <div className="p-3 border-t border-gray-100 bg-gray-50 grid grid-cols-2 gap-2 text-center">
          <div>
            <div className="text-base font-bold text-emerald-600">{store.stats.corpusSize}</div>
            <div className="text-xs text-gray-500">语料库</div>
          </div>
          <div>
            <div className="text-base font-bold text-red-500">{store.stats.errorCount}</div>
            <div className="text-xs text-gray-500">错题</div>
          </div>
        </div>
      </div>
    </div>
  );
}
