import { useEffect, useMemo, useState } from 'react';
import { Copy, Loader2, RefreshCw, Sparkles, Ticket } from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import {
  generateInvites,
  getInviteInventory,
  updateInviteAssignment,
  type InviteGenerateResult,
  type InviteItem,
} from '../utils/api';
import { isInviteAdminEmail } from '../utils/inviteAdmin';

function formatTime(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}

export function InviteCodesPage() {
  const { user } = useAuth();
  const [invites, setInvites] = useState<InviteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(5);
  const [note, setNote] = useState('');
  const [generating, setGenerating] = useState(false);
  const [latestGenerated, setLatestGenerated] = useState<InviteGenerateResult['invites']>([]);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [assignmentSavingId, setAssignmentSavingId] = useState<string | null>(null);
  const [assignmentDrafts, setAssignmentDrafts] = useState<Record<string, string>>({});
  const [totalAvailable, setTotalAvailable] = useState(0);
  const [totalAssigned, setTotalAssigned] = useState(0);
  const [totalUsed, setTotalUsed] = useState(0);
  const canManageInvites = isInviteAdminEmail(user?.email);

  const loadInvites = async (options?: { silent?: boolean }) => {
    if (!canManageInvites) {
      setLoading(false);
      return;
    }
    const silent = options?.silent ?? false;
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const result = await getInviteInventory(60);
      setInvites(result.invites);
      setTotalAvailable(result.totalAvailable);
      setTotalAssigned(result.totalAssigned);
      setTotalUsed(result.totalUsed);
      setAssignmentDrafts((prev) => {
        const next = { ...prev };
        for (const invite of result.invites) {
          if (!(invite.id in next)) {
            next[invite.id] = invite.assigned_to || '';
          }
        }
        return next;
      });
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : '加载邀请码失败');
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canManageInvites) return;
    void loadInvites();
  }, [canManageInvites]);

  useEffect(() => {
    if (!copyMessage) return;
    const timer = window.setTimeout(() => setCopyMessage(null), 2200);
    return () => window.clearTimeout(timer);
  }, [copyMessage]);

  const availableInvites = useMemo(
    () => invites.filter((invite) => !invite.used_at && !invite.assigned_to),
    [invites],
  );

  const handleGenerate = async () => {
    if (!canManageInvites) return;
    setGenerating(true);
    setError(null);
    setCopyMessage(null);
    try {
      const result = await generateInvites({
        count,
        note: note.trim() || undefined,
      });
      setLatestGenerated(result.invites);
      await loadInvites({ silent: true });
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : '生成邀请码失败');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyCodes = async (codes: string[], message: string) => {
    if (!codes.length) return;
    try {
      await copyText(codes.join('\n'));
      setCopyMessage(message);
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : '复制失败');
    }
  };

  const handleSaveAssignment = async (invite: InviteItem, explicitAssignedTo?: string | null) => {
    const assignedTo = explicitAssignedTo === undefined
      ? (assignmentDrafts[invite.id] || '').trim()
      : (explicitAssignedTo || '').trim();
    setAssignmentSavingId(invite.id);
    setError(null);
    try {
      const result = await updateInviteAssignment({
        inviteId: invite.id,
        assignedTo: assignedTo || null,
      });
      setInvites((prev) =>
        prev.map((item) => (item.id === invite.id ? result.invite : item)),
      );
      setAssignmentDrafts((prev) => ({
        ...prev,
        [invite.id]: result.invite.assigned_to || '',
      }));

      const nextInvites = invites.map((item) => (item.id === invite.id ? result.invite : item));
      setTotalAvailable(nextInvites.filter((item) => !item.used_at && !item.assigned_to).length);
      setTotalAssigned(nextInvites.filter((item) => !item.used_at && !!item.assigned_to).length);
      setCopyMessage(assignedTo ? `已标记发送给 ${assignedTo}` : '已撤回发送标记');
    } catch (assignmentError) {
      setError(assignmentError instanceof Error ? assignmentError.message : '更新发送状态失败');
    } finally {
      setAssignmentSavingId(null);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 md:px-6">
        {!canManageInvites && (
          <section className="rounded-[28px] border border-amber-200 bg-white p-6 shadow-sm">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
              <Ticket size={15} />
              邀请码管理
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">当前账号没有访问权限</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              这里只有管理员账号 <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">wyc1186164839@gmail.com</code>{' '}
              可以进入。这样做是为了避免邀请码库存被所有内测用户随手生成和消耗。
            </p>
          </section>
        )}

        {canManageInvites && (
          <>
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
                <Ticket size={15} />
                邀请码管理
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">直接从线上库生成和发码</h1>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                这里显示的是当前线上真实可用的邀请码状态。以后不要再拿本地文档当准绳，直接从这里生成、复制、查看是否已被使用。
              </p>
            </div>
            <div className="grid shrink-0 grid-cols-3 gap-3">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                <div className="text-xs text-emerald-700">可用</div>
                <div className="mt-1 text-2xl font-bold text-emerald-700">{totalAvailable}</div>
              </div>
              <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
                <div className="text-xs text-amber-700">已发送</div>
                <div className="mt-1 text-2xl font-bold text-amber-700">{totalAssigned}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-xs text-slate-500">已用</div>
                <div className="mt-1 text-2xl font-bold text-slate-700">{totalUsed}</div>
              </div>
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3">
                <div className="text-xs text-indigo-600">总数</div>
                <div className="mt-1 text-2xl font-bold text-indigo-700">{totalAvailable + totalAssigned + totalUsed}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_1.35fr]">
          <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-slate-900">
              <Sparkles size={18} className="text-indigo-500" />
              <h2 className="text-lg font-semibold">生成新邀请码</h2>
            </div>
            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">数量</span>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 3, 5, 10].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setCount(value)}
                      className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                        count === value
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {value} 个
                    </button>
                  ))}
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">备注</span>
                <input
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="比如：朋友内测 / 面试英语群"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white"
                />
              </label>

              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                生成邀请码
              </button>
            </div>

            {latestGenerated.length > 0 && (
              <div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-indigo-800">刚生成的可用邀请码</div>
                    <div className="mt-1 text-xs text-indigo-600">这批已经写进线上库，可以直接发给别人注册。</div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      void handleCopyCodes(
                        latestGenerated.map((invite) => invite.code),
                        `已复制 ${latestGenerated.length} 个新邀请码`,
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100"
                  >
                    <Copy size={14} />
                    复制这批
                  </button>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {latestGenerated.map((invite) => (
                    <code
                      key={invite.id}
                      className="rounded-full border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-800"
                    >
                      {invite.code}
                    </code>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">当前邀请码库存</h2>
                <p className="mt-1 text-sm text-slate-500">优先以这里为准，不要再用本地清单猜哪些码还活着。</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                      void handleCopyCodes(
                        availableInvites.map((invite) => invite.code),
                        `已复制 ${availableInvites.length} 个可用邀请码`,
                      )
                    }
                  disabled={!availableInvites.length}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Copy size={14} />
                  复制全部可用
                </button>
                <button
                  type="button"
                  onClick={() => void loadInvites({ silent: true })}
                  disabled={refreshing}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                  刷新
                </button>
              </div>
            </div>

            {copyMessage && (
              <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {copyMessage}
              </div>
            )}
            {error && (
              <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex min-h-[16rem] items-center justify-center text-slate-500">
                <Loader2 size={18} className="mr-2 animate-spin" />
                加载邀请码中…
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {invites.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                    线上库里还没有邀请码，先在左侧生成一批。
                  </div>
                ) : (
                  invites.map((invite) => {
                    const available = !invite.used_at && !invite.assigned_to;
                    const assigned = !invite.used_at && !!invite.assigned_to;
                    return (
                      <div
                        key={invite.id}
                        className={`rounded-2xl border px-4 py-4 transition-colors ${
                          available
                            ? 'border-emerald-100 bg-emerald-50/50'
                            : assigned
                              ? 'border-amber-100 bg-amber-50/50'
                            : 'border-slate-200 bg-slate-50'
                        }`}
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <code className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-900 shadow-sm">
                                {invite.code}
                              </code>
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  available
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : assigned
                                      ? 'bg-amber-100 text-amber-700'
                                    : 'bg-slate-200 text-slate-600'
                                }`}
                              >
                                {available ? '可用' : assigned ? '已发送' : '已使用'}
                              </span>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
                              <span>创建于 {formatTime(invite.created_at)}</span>
                              <span>使用于 {formatTime(invite.used_at)}</span>
                              {invite.assigned_to && <span>已发给：{invite.assigned_to}</span>}
                              {invite.assigned_at && <span>发送于 {formatTime(invite.assigned_at)}</span>}
                              {invite.batch_note && <span>备注：{invite.batch_note}</span>}
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-col gap-2 md:items-end">
                            {!invite.used_at && (
                              <div className="flex flex-col gap-2 md:items-end">
                                <div className="flex flex-wrap items-center gap-2">
                                  <input
                                    value={assignmentDrafts[invite.id] ?? invite.assigned_to ?? ''}
                                    onChange={(event) =>
                                      setAssignmentDrafts((prev) => ({
                                        ...prev,
                                        [invite.id]: event.target.value,
                                      }))
                                    }
                                    placeholder="已发送给谁"
                                    className="w-44 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-amber-400"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => void handleSaveAssignment(invite)}
                                    disabled={assignmentSavingId === invite.id}
                                    className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-medium text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {assignmentSavingId === invite.id ? '保存中…' : '保存发送状态'}
                                  </button>
                                  {assigned && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setAssignmentDrafts((prev) => ({ ...prev, [invite.id]: '' }));
                                        void handleSaveAssignment(invite, null);
                                      }}
                                      disabled={assignmentSavingId === invite.id}
                                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      撤回发送
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                            {(available || assigned) && (
                              <button
                                type="button"
                                onClick={() => void handleCopyCodes([invite.code], `已复制 ${invite.code}`)}
                                className={`inline-flex items-center gap-1.5 rounded-xl border bg-white px-3 py-2 text-xs font-medium transition ${
                                  available
                                    ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                                    : 'border-amber-200 text-amber-700 hover:bg-amber-100'
                                }`}
                              >
                                <Copy size={14} />
                                复制
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </section>
          </>
        )}
      </div>
    </div>
  );
}
