import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router';
import { Activity, AlertTriangle, BarChart3, Loader2, RefreshCw, Shield, Ticket, Unlock, type LucideIcon } from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { isInviteAdminEmail } from '../utils/inviteAdmin';
import {
  getAdminAlerts,
  getAdminInviteUsage,
  getAdminOverview,
  resolveAdminAlert,
  unblockAdminUser,
  type AdminAlert,
  type AdminInviteUsageRow,
  type AdminOverview,
} from '../utils/api';
import { InviteCodesPage } from './InviteCodesPage';

type AdminTab = 'overview' | 'invites' | 'usage' | 'alerts';

const TABS: Array<{ key: AdminTab; label: string; icon: LucideIcon }> = [
  { key: 'overview', label: '产品指标', icon: BarChart3 },
  { key: 'invites', label: '邀请码', icon: Ticket },
  { key: 'usage', label: '账号用量', icon: Activity },
  { key: 'alerts', label: '异常报警', icon: AlertTriangle },
];

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat('zh-CN').format(Number(value || 0));
}

function formatTime(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function metricLabel(eventName: string) {
  const map: Record<string, string> = {
    lab_attempt_submitted: '实验室提交',
    lab_success_saved_to_corpus: '实验室成功入库',
    lab_error_saved: '实验室错题沉淀',
    field_answer_submitted: '实战仓提交',
    field_answer_evaluated: '实战仓完成评价',
    vocab_card_generated: '词卡生成',
    vocab_card_saved: '词卡保存',
    vocab_card_reviewed: '词卡复习',
    error_created: '错题创建',
    error_resolved: '错题解决',
    stuck_helper_generated: '卡壳点生成',
    stuck_example_saved_to_corpus: '卡壳例句入库',
    corpus_entry_created: '语料新增',
  };
  return map[eventName] || eventName;
}

function OverviewPanel({ overview }: { overview: AdminOverview | null }) {
  if (!overview) return null;
  const cards = [
    { label: '今日 token', value: overview.summary.tokensToday },
    { label: '7 日 token', value: overview.summary.tokens7d },
    { label: '7 日请求', value: overview.summary.requests7d },
    { label: '7 日活跃账号', value: overview.summary.activeUsers7d },
    { label: '未处理报警', value: overview.summary.openAlerts },
    { label: '当前冻结', value: overview.summary.activeBlocks },
  ];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {cards.map(card => (
          <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold text-slate-500">{card.label}</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(card.value)}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-slate-900">AI token 花在哪里</h2>
          <div className="mt-4 space-y-3">
            {overview.tokenByFeature.length === 0 ? (
              <p className="text-sm text-slate-500">暂无 AI 用量记录。</p>
            ) : overview.tokenByFeature.slice(0, 8).map(item => (
              <div key={item.feature}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-700">{item.feature}</span>
                  <span className="text-slate-500">{formatNumber(item.tokens)} tokens · {item.requests} 次</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-indigo-500"
                    style={{ width: `${Math.min(100, (item.tokens / Math.max(1, overview.summary.tokens7d)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-slate-900">学习动作是否发生</h2>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {overview.productEvents.length === 0 ? (
              <p className="text-sm text-slate-500">暂无产品事件。</p>
            ) : overview.productEvents.slice(0, 12).map(item => (
              <div key={item.eventName} className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
                <div className="text-xs text-slate-500">{metricLabel(item.eventName)}</div>
                <div className="text-lg font-bold text-slate-900">{formatNumber(item.count)}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function UsagePanel({
  rows,
  onUnblock,
  actionLoading,
}: {
  rows: AdminInviteUsageRow[];
  onUnblock: (userId: string) => void;
  actionLoading: string | null;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-base font-bold text-slate-900">邀请码背后的账号用量</h2>
        <p className="mt-1 text-sm text-slate-500">按邀请码查看账号、token、主要消耗功能和冻结状态。</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3">邀请码 / 发送给</th>
              <th className="px-5 py-3">账号</th>
              <th className="px-5 py-3">今日 token</th>
              <th className="px-5 py-3">7 日 token</th>
              <th className="px-5 py-3">主要功能</th>
              <th className="px-5 py-3">状态</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(row => (
              <tr key={row.inviteId} className="align-top">
                <td className="px-5 py-4">
                  <div className="font-mono text-xs font-semibold text-slate-900">{row.code}</div>
                  <div className="mt-1 text-xs text-slate-500">{row.assignedTo || '未标记发送对象'}</div>
                </td>
                <td className="px-5 py-4">
                  <div className="font-semibold text-slate-800">{row.userEmail || '未使用'}</div>
                  <div className="mt-1 text-xs text-slate-400">最近：{formatTime(row.lastUsedAt)}</div>
                </td>
                <td className="px-5 py-4 font-semibold text-slate-800">{formatNumber(row.tokensToday)}</td>
                <td className="px-5 py-4">
                  <div className="font-semibold text-slate-800">{formatNumber(row.tokens7d)}</div>
                  <div className="text-xs text-slate-400">{row.requests7d} 次请求</div>
                </td>
                <td className="px-5 py-4 text-slate-600">{row.topFeature || '—'}</td>
                <td className="px-5 py-4">
                  {row.blockedUntil && row.userId ? (
                    <div className="space-y-2">
                      <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                        冻结至 {formatTime(row.blockedUntil)}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUnblock(row.userId!)}
                        disabled={actionLoading === row.userId}
                        className="inline-flex items-center gap-1 rounded-full border border-emerald-200 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                      >
                        {actionLoading === row.userId ? <Loader2 size={12} className="animate-spin" /> : <Unlock size={12} />}
                        解除
                      </button>
                    </div>
                  ) : (
                    <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      正常
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AlertsPanel({
  alerts,
  onResolve,
  onUnblock,
  actionLoading,
}: {
  alerts: AdminAlert[];
  onResolve: (alertId: string) => void;
  onUnblock: (userId: string) => void;
  actionLoading: string | null;
}) {
  return (
    <div className="space-y-3">
      {alerts.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          暂无报警。
        </div>
      ) : alerts.map(alert => (
        <section key={alert.id} className="rounded-3xl border border-amber-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                  {alert.severity}
                </span>
                <span className="text-xs text-slate-500">{alert.type} · {formatTime(alert.created_at)}</span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  alert.status === 'open' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                }`}>
                  {alert.status === 'open' ? '未处理' : '已处理'}
                </span>
              </div>
              <h2 className="mt-3 text-base font-bold text-slate-900">{alert.message}</h2>
              <p className="mt-1 text-sm text-slate-500">{alert.user_email || alert.user_id || '未知账号'}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {alert.user_id && (
                <button
                  type="button"
                  onClick={() => onUnblock(alert.user_id!)}
                  disabled={actionLoading === alert.user_id}
                  className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                >
                  {actionLoading === alert.user_id ? <Loader2 size={14} className="animate-spin" /> : <Unlock size={14} />}
                  解除冻结
                </button>
              )}
              {alert.status === 'open' && (
                <button
                  type="button"
                  onClick={() => onResolve(alert.id)}
                  disabled={actionLoading === alert.id}
                  className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  标记已处理
                </button>
              )}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

export function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const [params, setParams] = useSearchParams();
  const tabParam = params.get('tab') as AdminTab | null;
  const activeTab: AdminTab = tabParam && TABS.some(tab => tab.key === tabParam) ? tabParam : 'overview';
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [usageRows, setUsageRows] = useState<AdminInviteUsageRow[]>([]);
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canManage = isInviteAdminEmail(user?.email);

  const loadAdminData = useCallback(async (silent = false) => {
    if (!canManage) return;
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [nextOverview, nextUsage, nextAlerts] = await Promise.all([
        getAdminOverview(),
        getAdminInviteUsage(),
        getAdminAlerts(),
      ]);
      setOverview(nextOverview);
      setUsageRows(nextUsage.rows);
      setAlerts(nextAlerts.alerts);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '加载管理员后台失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [canManage]);

  useEffect(() => {
    if (authLoading) return;
    if (!canManage) {
      setLoading(false);
      return;
    }
    void loadAdminData();
  }, [authLoading, canManage, loadAdminData]);

  const openAlerts = useMemo(() => alerts.filter(alert => alert.status === 'open').length, [alerts]);

  const handleTabChange = (tab: AdminTab) => {
    const next = new URLSearchParams(params);
    next.set('tab', tab);
    setParams(next, { replace: true });
  };

  const handleResolve = async (alertId: string) => {
    setActionLoading(alertId);
    try {
      await resolveAdminAlert(alertId);
      await loadAdminData(true);
    } catch (resolveError) {
      setError(resolveError instanceof Error ? resolveError.message : '处理报警失败');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnblock = async (userId: string) => {
    setActionLoading(userId);
    try {
      await unblockAdminUser(userId);
      await loadAdminData(true);
    } catch (unblockError) {
      setError(unblockError instanceof Error ? unblockError.message : '解除冻结失败');
    } finally {
      setActionLoading(null);
    }
  };

  if (!authLoading && !canManage) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 md:px-6">
        <header className="rounded-[32px] border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-slate-200">
                <Shield size={15} />
                管理员后台
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight">邀请、用量、报警和产品指标</h1>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">
                这里看的是服务端可信账本：每个账号的 AI token 消耗、异常冻结、以及产品链路是否真的产生学习资产。
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadAdminData(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-bold text-slate-900 hover:bg-slate-100 disabled:opacity-60"
            >
              {refreshing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              刷新后台
            </button>
          </div>
        </header>

        <nav className="flex flex-wrap gap-2 rounded-3xl border border-slate-200 bg-white p-2 shadow-sm">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabChange(tab.key)}
                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-colors ${
                  active ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon size={16} />
                {tab.label}
                {tab.key === 'alerts' && openAlerts > 0 && (
                  <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs text-white">{openAlerts}</span>
                )}
              </button>
            );
          })}
        </nav>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center rounded-3xl border border-slate-200 bg-white text-slate-500">
            <Loader2 size={22} className="mr-2 animate-spin" />
            正在加载管理员数据…
          </div>
        ) : (
          <>
            {activeTab === 'overview' && <OverviewPanel overview={overview} />}
            {activeTab === 'invites' && <InviteCodesPage embedded />}
            {activeTab === 'usage' && (
              <UsagePanel rows={usageRows} onUnblock={handleUnblock} actionLoading={actionLoading} />
            )}
            {activeTab === 'alerts' && (
              <AlertsPanel
                alerts={alerts}
                onResolve={handleResolve}
                onUnblock={handleUnblock}
                actionLoading={actionLoading}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
