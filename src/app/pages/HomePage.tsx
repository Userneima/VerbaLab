import { useNavigate } from 'react-router';
import { BookOpen, FlaskConical, Zap, Target, Library, AlertCircle, LifeBuoy, ArrowRight, Flame, Sparkles, BookMarked } from 'lucide-react';
import { useStore } from '../store/StoreContext';
import { useAuth } from '../store/AuthContext';
import { VERBS } from '../data/verbData';

export function HomePage() {
  const navigate = useNavigate();
  const store = useStore();
  const { user } = useAuth();

  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || '同学';

  const totalCollocations = VERBS.reduce((sum, v) => sum + v.collocations.length, 0);
  const learnedCount = store.stats.totalLearned;
  const progressPercent = Math.min(100, Math.round((learnedCount / totalCollocations) * 100));

  // Calculate per-verb progress
  const verbProgress = VERBS.map(verb => {
    const learned = verb.collocations.filter(c => store.learnedCollocations.has(c.id)).length;
    return { verb: verb.verb, meaning: verb.meaning, total: verb.collocations.length, learned };
  });

  const modules = [
    {
      icon: BookOpen,
      color: 'bg-indigo-500',
      bgLight: 'bg-indigo-50',
      textColor: 'text-indigo-700',
      label: '资产区',
      subtitle: 'The Foundry',
      desc: '浏览 20 个核心动词及其搭配，建立语言认知模型',
      path: '/foundry',
      stat: `${learnedCount}/${totalCollocations} 已学`,
    },
    {
      icon: FlaskConical,
      color: 'bg-violet-500',
      bgLight: 'bg-violet-50',
      textColor: 'text-violet-700',
      label: '实验室',
      subtitle: 'The Lab',
      desc: '随机或搜索内置搭配造句，AI 语法校验，积累私人语料库',
      path: '/lab',
      stat: `${store.stats.corpusSize} 句语料`,
    },
    {
      icon: Zap,
      color: 'bg-amber-500',
      bgLight: 'bg-amber-50',
      textColor: 'text-amber-700',
      label: '实战仓',
      subtitle: 'The Field',
      desc: '雅思口语模拟练习，遇卡壳时 AI 智能调度平替',
      path: '/field',
      stat: `${store.stats.stuckCount} 卡壳点`,
    },
    {
      icon: Sparkles,
      color: 'bg-fuchsia-500',
      bgLight: 'bg-fuchsia-50',
      textColor: 'text-fuchsia-700',
      label: '词卡工坊',
      subtitle: 'Word Lab',
      desc: '输入单词，AI 用语体判断与内置搭配白名单生成例句，入库并参与复习提醒',
      path: '/word-lab',
      stat: `${store.stats.vocabCardCount} 张卡片`,
    },
  ];

  const recentCorpus = store.corpus.slice(0, 5);

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="bg-[#0f172a] text-white px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold mb-1">{userName}，欢迎回来 👋</h1>
              <p className="text-slate-400 text-sm sm:text-base">开始今天的英语动词训练，建立属于你的弹药库</p>
            </div>
            <div className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-xl shrink-0 self-start sm:self-auto">
              <Flame size={16} className="text-orange-400" />
              <span className="text-sm text-slate-300">连续学习 <span className="text-white font-bold">1</span> 天</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-6 bg-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-300">总体学习进度</span>
              <span className="text-sm font-medium text-indigo-400">{learnedCount} / {totalCollocations} 搭配</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-indigo-500 to-violet-500 h-3 rounded-full transition-all duration-700"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-slate-500">
              <span>0%</span>
              <span className="text-indigo-400 font-medium">{progressPercent}% 完成</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-safe sm:pb-6 space-y-6">
        {store.stats.vocabDueCount > 0 && (
          <button
            type="button"
            onClick={() => navigate('/vocab-review')}
            className="w-full text-left flex items-center justify-between gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 hover:bg-amber-100/80 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-amber-200 flex items-center justify-center shrink-0">
                <BookMarked size={20} className="text-amber-800" />
              </div>
              <div>
                <div className="font-semibold text-amber-900">有 {store.stats.vocabDueCount} 张单词卡片待复习</div>
                <div className="text-sm text-amber-800/80">打开单词卡片 · 已浏览可推迟提醒</div>
              </div>
            </div>
            <ArrowRight size={18} className="text-amber-700 shrink-0" />
          </button>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            {
              label: '已学搭配',
              path: '/foundry',
              value: store.stats.totalLearned,
              icon: Target,
              color: 'text-indigo-600',
              bg: 'bg-indigo-50',
            },
            {
              label: '个人语料库',
              path: '/corpus',
              value: store.stats.corpusSize,
              icon: Library,
              color: 'text-emerald-600',
              bg: 'bg-emerald-50',
            },
            {
              label: '语法错误',
              path: '/errors',
              value: store.stats.errorCount,
              icon: AlertCircle,
              color: 'text-red-500',
              bg: 'bg-red-50',
            },
            {
              label: '卡壳点',
              path: '/stuck',
              value: store.stats.stuckCount,
              icon: LifeBuoy,
              color: 'text-amber-500',
              bg: 'bg-amber-50',
            },
          ].map(stat => (
            <button
              key={stat.label}
              type="button"
              onClick={() => navigate(stat.path)}
              className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-left w-full hover:shadow-md hover:border-gray-200 transition-all group focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className={`w-9 h-9 ${stat.bg} rounded-lg flex items-center justify-center`}>
                  <stat.icon size={18} className={stat.color} />
                </div>
                <ArrowRight
                  size={16}
                  className="text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all shrink-0 mt-1"
                  aria-hidden
                />
              </div>
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-gray-500 text-sm mt-0.5">{stat.label}</div>
            </button>
          ))}
        </div>

        {/* Module cards */}
        <div>
          <h2 className="text-gray-800 font-semibold mb-3">学习模块</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {modules.map(mod => {
              const Icon = mod.icon;
              return (
                <button
                  key={mod.path}
                  onClick={() => navigate(mod.path)}
                  className="bg-white border border-gray-100 rounded-xl p-5 text-left hover:shadow-md hover:border-gray-200 transition-all group"
                >
                  <div className={`w-10 h-10 ${mod.color} rounded-xl flex items-center justify-center mb-4`}>
                    <Icon size={20} className="text-white" />
                  </div>
                  <div className="font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors">
                    {mod.label}
                    <span className="text-gray-400 font-normal text-sm ml-0 sm:ml-2 block sm:inline mt-0.5 sm:mt-0">{mod.subtitle}</span>
                  </div>
                  <p className="text-gray-500 text-sm mt-1 leading-relaxed">{mod.desc}</p>
                  <div className={`mt-3 text-xs font-medium ${mod.textColor} ${mod.bgLight} inline-block px-2 py-1 rounded-md`}>
                    {mod.stat}
                  </div>
                  <div className="flex items-center gap-1 mt-3 text-xs text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>进入</span>
                    <ArrowRight size={12} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Verb progress */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-gray-800 font-semibold mb-4">动词学习进度</h2>
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {verbProgress.map(vp => (
                <div key={vp.verb} className="flex items-center gap-3">
                  <div className="w-14 shrink-0">
                    <span className="text-sm font-medium text-gray-700">{vp.verb}</span>
                  </div>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${vp.learned === vp.total ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                      style={{ width: `${(vp.learned / vp.total) * 100}%` }}
                    />
                  </div>
                  <div className="w-10 text-right text-xs text-gray-500 shrink-0">
                    {vp.learned}/{vp.total}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent corpus */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-gray-800 font-semibold mb-4">最近的语料库</h2>
            {recentCorpus.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <BookOpen size={20} className="text-gray-400" />
                </div>
                <p className="text-gray-400 text-sm">语料库为空</p>
                <p className="text-gray-400 text-xs mt-1">在实验室中造句后将自动积累</p>
                <button
                  onClick={() => navigate('/lab')}
                  className="mt-3 text-indigo-600 text-sm font-medium hover:underline"
                >
                  前往实验室 →
                </button>
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {recentCorpus.map(entry => (
                  <div key={entry.id} className="border border-gray-100 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-gray-700 leading-relaxed">{entry.userSentence}</p>
                      <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded shrink-0">✓</span>
                    </div>
                    <div className="mt-1 flex gap-2">
                      <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{entry.collocation}</span>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => navigate('/corpus')}
                  className="text-indigo-600 text-sm font-medium hover:underline w-full text-center pt-1"
                >
                  查看全部语料库 →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}