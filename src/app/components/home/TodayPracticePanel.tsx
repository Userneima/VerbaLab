import { ArrowRight, BookMarked, CheckCircle2, Circle, FlaskConical, RotateCcw, Sparkles, Zap } from 'lucide-react';
import type { DailyPracticeSummary, DailyPracticeTask } from '../../utils/dailyPractice';

type Props = {
  userName: string;
  summary: DailyPracticeSummary;
  onNavigate: (path: string) => void;
};

function iconForTask(taskId: DailyPracticeTask['id']) {
  if (taskId === 'lab') return FlaskConical;
  if (taskId === 'field') return Zap;
  if (taskId === 'vocab') return BookMarked;
  return RotateCcw;
}

export function TodayPracticePanel({ userName, summary, onNavigate }: Props) {
  const { tasks, completedCount, remainingCount, focusTask, resumeActivity, todayActivityCount } = summary;
  const isNewUser = summary.learningActivities.length === 0;

  return (
    <section className="rounded-[28px] bg-[#111827] text-white p-5 sm:p-6 shadow-lg">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-indigo-100">
              <Sparkles size={14} className="text-indigo-300" />
              每日雅思练习闭环
            </div>
            <h2 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight">
              {isNewUser ? `${userName}，先完成今天这 4 步` : `${userName}，今天先把这条主线走完`}
            </h2>
            <p className="mt-2 max-w-3xl text-sm sm:text-base text-slate-300 leading-relaxed">
              先热身一句，再答 1 道雅思题，随后清掉今日词卡和错题。练完的内容会自动沉淀到语料、错题和复习系统里。
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:min-w-[22rem]">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="text-xs text-slate-400">今日完成</div>
              <div className="mt-2 text-2xl font-semibold">{completedCount}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="text-xs text-slate-400">剩余任务</div>
              <div className="mt-2 text-2xl font-semibold">{remainingCount}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="text-xs text-slate-400">今日沉淀</div>
              <div className="mt-2 text-2xl font-semibold">{todayActivityCount}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base sm:text-lg font-semibold">今日任务</h3>
                <p className="text-sm text-slate-400 mt-1">按顺序走完，避免一进来就自己分配注意力。</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate((focusTask ?? tasks[0]).path)}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 transition-colors"
              >
                {focusTask ? '先做当前重点' : '查看今日复盘'}
                <ArrowRight size={15} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {tasks.map((task, index) => {
                const Icon = iconForTask(task.id);
                const done = task.status === 'done';
                return (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => onNavigate(task.path)}
                    className={`rounded-2xl border p-4 text-left transition-all ${
                      done
                        ? 'border-emerald-300/30 bg-emerald-400/10 hover:bg-emerald-400/15'
                        : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-indigo-300/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl ${done ? 'bg-emerald-400/15 text-emerald-200' : 'bg-indigo-400/15 text-indigo-200'}`}>
                          <Icon size={18} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">0{index + 1}</span>
                            <span className="text-xs rounded-full border border-white/10 px-2 py-0.5 text-slate-300">
                              {task.sceneLabel}
                            </span>
                          </div>
                          <h4 className="mt-2 text-base font-semibold text-white">{task.title}</h4>
                          <p className="mt-1 text-sm leading-relaxed text-slate-300">{task.description}</p>
                        </div>
                      </div>
                      {done ? (
                        <CheckCircle2 size={18} className="shrink-0 text-emerald-300" />
                      ) : (
                        <Circle size={18} className="shrink-0 text-slate-500" />
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="text-xs text-slate-300">
                        <span className="font-medium text-white">
                          {task.totalUnits > 0 ? `${task.completedUnits}/${task.totalUnits}` : '0/0'}
                        </span>
                        <span className="ml-2 text-slate-400">{task.progressLabel}</span>
                      </div>
                      <span className={`text-xs font-medium ${done ? 'text-emerald-200' : 'text-indigo-200'}`}>
                        {done ? '已完成' : `目标 ${task.targetLabel}`}
                      </span>
                    </div>

                    {task.previewItems.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {task.previewItems.map((item) => (
                          <span
                            key={`${task.id}-${item}`}
                            className="rounded-full bg-white/8 px-2.5 py-1 text-xs text-slate-200"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/20 via-white/5 to-white/5 p-4 sm:p-5">
              <div className="text-sm font-semibold text-white">今天先补哪里</div>
              {focusTask ? (
                <>
                  <div className="mt-3 rounded-2xl bg-black/10 p-4">
                    <div className="text-xs text-indigo-100/80">{focusTask.sceneLabel}</div>
                    <div className="mt-1 text-lg font-semibold">{focusTask.title}</div>
                    <p className="mt-2 text-sm text-slate-200 leading-relaxed">{focusTask.description}</p>
                    <button
                      type="button"
                      onClick={() => onNavigate(focusTask.path)}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100 transition-colors"
                    >
                      继续这一步
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </>
              ) : (
                <div className="mt-3 rounded-2xl bg-emerald-400/10 p-4 text-sm text-emerald-100 leading-relaxed">
                  今天该做的主线已经走完了。现在更适合回看日历、补一张词卡，或者继续往语料库里加一条自己满意的表达。
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-5">
              <div className="text-sm font-semibold text-white">从上次继续</div>
              {resumeActivity ? (
                <button
                  type="button"
                  onClick={() => onNavigate(resumeActivity.path)}
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-slate-300">
                      {resumeActivity.sceneLabel}
                    </span>
                    <ArrowRight size={15} className="text-slate-400" />
                  </div>
                  <div className="mt-3 text-base font-semibold text-white">{resumeActivity.title}</div>
                  <p className="mt-2 text-sm text-slate-300 leading-relaxed">{resumeActivity.detail}</p>
                </button>
              ) : (
                <div className="mt-3 rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-slate-300 leading-relaxed">
                  你还没有开始第一轮练习。最顺的起步方式是：
                  <div className="mt-3 space-y-2 text-slate-200">
                    <div>1. 先去实验室造一句。</div>
                    <div>2. 再去实战仓答 1 题。</div>
                    <div>3. 回来清掉今天出现的词卡和错题。</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
