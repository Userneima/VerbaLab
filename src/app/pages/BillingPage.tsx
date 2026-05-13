import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Copy, CreditCard, Loader2, MessageCircle, QrCode, RefreshCw, ShieldCheck, Sparkles, WalletCards } from 'lucide-react';
import { getQuotaSummary, type AiQuotaSummary } from '../utils/api';
import { quotaSummarySchema } from '../utils/api/quota';
import { useAuth } from '../store/AuthContext';
import { BILLING_WECHAT_ID, BILLING_WECHAT_QR_URL } from '../config/billingContact';
import {
  isSessionPageCacheFresh,
  loadSessionPageCache,
  saveSessionPageCache,
} from '../utils/sessionPageCache';

const PLANS = [
  {
    id: 'monthly',
    name: '月卡 Pro',
    price: '¥19.9 / 月',
    quota: '每月 2000 次',
    note: '适合每天练表达、收词卡',
    badge: '推荐',
  },
  {
    id: 'yearly',
    name: '年卡 Pro',
    price: '¥99 / 年',
    quota: '每月 3000 次',
    note: '按月重置，长期使用更省',
    badge: '最划算',
  },
  {
    id: 'pack',
    name: '次数包',
    price: '¥9.9',
    quota: '300 次 AI 生成',
    note: '适合偶尔加量，不自动续费',
    badge: '',
  },
];

const BILLING_CACHE_KEY = 'ff_billing_summary_cache_v1';
const BILLING_CACHE_TTL_MS = 10 * 60 * 1000;

function loadBillingSummaryCache() {
  return loadSessionPageCache(BILLING_CACHE_KEY, (raw) => quotaSummarySchema.parse(raw), 'local');
}

function formatDate(value?: string): string {
  if (!value) return '无到期时间';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '无到期时间';
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatLedgerTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function BillingPage() {
  const { user } = useAuth();
  const cachedSummary = loadBillingSummaryCache();
  const [summary, setSummary] = useState<AiQuotaSummary | null>(cachedSummary?.value ?? null);
  const [loading, setLoading] = useState(!cachedSummary);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<(typeof PLANS)[number] | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

  const accountLabel = user?.email || user?.id || '当前账号';

  async function loadSummary(silent = false) {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const nextSummary = await getQuotaSummary();
      setSummary(nextSummary);
      saveSessionPageCache(BILLING_CACHE_KEY, nextSummary, 'local');
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载 AI 生成次数失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function copyWechatId() {
    try {
      await navigator.clipboard.writeText(BILLING_WECHAT_ID);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    } finally {
      window.setTimeout(() => setCopyState('idle'), 1800);
    }
  }

  useEffect(() => {
    if (!cachedSummary) {
      void loadSummary();
      return;
    }
    if (!isSessionPageCacheFresh(cachedSummary.cachedAt, BILLING_CACHE_TTL_MS)) {
      void loadSummary(true);
    }
  }, []);

  const quotaRows = useMemo(() => {
    if (!summary) return [];
    return [
      { label: '免费额度', value: `${summary.extraRemaining} 次` },
      { label: '额外可用', value: `${summary.extraRemaining} 次` },
      {
        label: summary.planType === 'free' ? '当前方案' : '本月 Pro',
        value: summary.planType === 'free'
          ? summary.planLabel
          : `${summary.planMonthlyRemaining} / ${summary.planMonthlyLimit}`,
      },
      { label: '到期时间', value: summary.planType === 'free' ? '暂无' : formatDate(summary.planExpiresAt) },
    ];
  }, [summary]);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="rounded-3xl bg-[#0f172a] text-white p-5 sm:p-7 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-1 text-sm font-medium text-emerald-200">
                <Sparkles size={15} />
                AI 生成次数
              </div>
              <h1 className="mt-4 text-2xl sm:text-3xl font-bold">网页端购买，小程序同账号可用</h1>
              <p className="mt-3 max-w-2xl text-sm sm:text-base leading-7 text-slate-300">
                额度绑定到你的 VerbaLab 账号。用同一个邮箱密码登录小程序后，表达指导、灵感生成和词卡生成会共用这份 AI 生成次数。
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 border border-white/10 p-4 min-w-[13rem]">
              <div className="text-sm text-slate-300">当前账号</div>
              <div className="mt-1 truncate text-base font-semibold">{accountLabel}</div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-5 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_1.25fr] gap-5">
          <section className="rounded-3xl bg-white border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">当前可用次数</h2>
                <p className="mt-1 text-sm text-slate-500">不显示 token，只按 AI 生成次数计。</p>
              </div>
              <button
                type="button"
                onClick={() => void loadSummary(true)}
                disabled={loading || refreshing}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw size={15} className={loading || refreshing ? 'animate-spin' : ''} />
                刷新
              </button>
            </div>

            {cachedSummary && (
              <div className="mt-3 text-xs text-slate-400">
                已记住上次结果，切回来会直接显示；后台会在需要时静默刷新。
              </div>
            )}

            {loading && !summary ? (
              <div className="mt-8 flex items-center justify-center py-12 text-slate-500">
                <Loader2 size={24} className="animate-spin mr-2" />
                加载中…
              </div>
            ) : summary ? (
              <>
                <div className="mt-6 rounded-3xl bg-emerald-50 border border-emerald-100 p-5">
                  <div className="text-sm font-medium text-emerald-700">{summary.planLabel}</div>
                  <div className="mt-2 text-5xl font-black tracking-tight text-emerald-700">
                    {summary.totalRemaining}
                  </div>
                  <div className="mt-2 text-sm text-emerald-800">当前可用 AI 生成次数</div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  {quotaRows.map((row) => (
                    <div key={row.label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="text-xs text-slate-500">{row.label}</div>
                      <div className="mt-1 text-base font-bold text-slate-900">{row.value}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-100 p-4 text-sm leading-6 text-slate-600">
                  <div className="font-semibold text-slate-900">消耗规则</div>
                  <div className="mt-2">表达指导 -1，不知道说什么 -1，词卡生成 -3。</div>
                  <div className="mt-1">查看资产、搜索、复制、同步基础学习数据和复习不扣次数。</div>
                </div>
              </>
            ) : null}
          </section>

          <section className="rounded-3xl bg-white border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <WalletCards size={20} className="text-emerald-600" />
              <h2 className="text-lg font-bold text-slate-900">购买更多生成次数</h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              购买后额度写入云端账号。小程序使用同一账号登录后，会自动读取这份额度。
            </p>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
              {PLANS.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedPlan(plan)}
                  className={`text-left rounded-3xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-md ${
                    plan.id === 'monthly'
                      ? 'border-emerald-200 bg-emerald-50/70'
                      : 'border-slate-200 bg-white hover:border-emerald-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-bold text-slate-900">{plan.name}</div>
                    {plan.badge && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                        {plan.badge}
                      </span>
                    )}
                  </div>
                  <div className="mt-4 text-2xl font-black text-slate-900">{plan.price}</div>
                  <div className="mt-2 text-sm font-semibold text-emerald-700">{plan.quota}</div>
                  <div className="mt-2 text-xs leading-5 text-slate-500">{plan.note}</div>
                </button>
              ))}
            </div>

            <div className="mt-5 rounded-2xl bg-white border border-emerald-100 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck size={19} className="mt-0.5 text-emerald-600 shrink-0" />
                <div className="text-sm leading-6 text-slate-600">
                  <div className="font-semibold text-slate-900">资产库不会因为不付费消失</div>
                  <div>已保存内容、搜索、复制和基础复习保持免费。付费只围绕 AI 生成成本。</div>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
              <div className="flex items-start gap-3">
                <MessageCircle size={19} className="mt-0.5 text-amber-700 shrink-0" />
                <div className="text-sm leading-6 text-amber-900">
                  <div className="font-semibold">内测阶段先用微信人工开通</div>
                  <div>联系管理员付款后，会手动为当前账号加额度；小程序同账号可用。</div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="mt-5 rounded-3xl bg-white border border-slate-200 p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">最近使用明细</h2>
          <p className="mt-1 text-sm text-slate-500">只展示最近 20 条额度变化，方便确认 Web 和小程序是否共用同一账号。</p>
          <div className="mt-4 divide-y divide-slate-100">
            {summary?.ledger?.length ? (
              summary.ledger.slice(0, 10).map((event) => (
                <div key={event.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{event.label}</div>
                    <div className="mt-0.5 text-xs text-slate-500">{formatLedgerTime(event.createdAt)}</div>
                  </div>
                  <div className={`text-sm font-bold ${event.delta > 0 ? 'text-emerald-600' : 'text-amber-700'}`}>
                    {event.delta > 0 ? `+${event.delta}` : event.delta}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                暂无使用明细。
              </div>
            )}
          </div>
        </section>
      </div>

      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
                <CreditCard size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">联系管理员开通额度</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  你选择的是 {selectedPlan.name}（{selectedPlan.quota}）。
                </p>
              </div>
            </div>
            <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-100 p-4 text-sm text-slate-600">
              联系管理员付款后，会手动为当前账号加额度。
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">微信号</div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="truncate text-lg font-bold text-slate-900">{BILLING_WECHAT_ID}</div>
                  <button
                    type="button"
                    onClick={copyWechatId}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Copy size={15} />
                    {copyState === 'copied' ? '已复制' : copyState === 'failed' ? '复制失败' : '复制'}
                  </button>
                </div>
                <div className="mt-2 text-xs leading-5 text-slate-500">
                  付款或沟通时请带上当前登录邮箱：{accountLabel}
                </div>
              </div>

              <div className="flex min-h-[9rem] items-center justify-center rounded-2xl border border-slate-200 bg-white p-3 sm:w-36">
                {BILLING_WECHAT_QR_URL ? (
                  <img
                    src={BILLING_WECHAT_QR_URL}
                    alt="微信二维码"
                    className="h-32 w-32 rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex h-32 w-32 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center text-xs leading-5 text-slate-500">
                    <QrCode size={24} className="mb-2 text-slate-400" />
                    二维码待配置
                  </div>
                )}
              </div>
            </div>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedPlan(null)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                先不买
              </button>
              <button
                type="button"
                onClick={() => setSelectedPlan(null)}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                <CheckCircle2 size={16} />
                知道了
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
