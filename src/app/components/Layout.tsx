import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import {
  BookOpen,
  FlaskConical,
  Zap,
  Library,
  AlertCircle,
  Home,
  Cloud,
  CloudOff,
  Loader2,
  CheckCircle2,
  ArrowUpCircle,
  ArrowDownCircle,
  LogOut,
  User,
  LifeBuoy,
  Menu,
  X,
  Sparkles,
  BookMarked,
  Ticket,
  type LucideIcon,
} from 'lucide-react';
import type { AppStore } from '../store/useStore';
import { useStore, StoreProvider } from '../store/StoreContext';
import { AuthProvider, useAuth } from '../store/AuthContext';
import { isInviteAdminEmail } from '../utils/inviteAdmin';
import { AuthPage } from '../pages/AuthPage';
import { Suspense, useState, useEffect, useRef } from 'react';
import { ErrorBoundary } from './ErrorBoundary';

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  subtitle?: string;
  exact?: boolean;
  badge?: (s: AppStore) => number;
};

const navItems: NavItem[] = [
  { to: '/', label: '概览', icon: Home, exact: true },
  { to: '/foundry', label: '资产区', icon: BookOpen, subtitle: 'The Foundry', exact: false },
  { to: '/lab', label: '实验室', icon: FlaskConical, subtitle: 'The Lab', exact: false },
  { to: '/field', label: '实战仓', icon: Zap, subtitle: 'The Field', exact: false },
  { to: '/word-lab', label: '词卡工坊', icon: Sparkles, subtitle: 'Word Lab', exact: false },
  {
    to: '/vocab-review',
    label: '单词卡片',
    icon: BookMarked,
    subtitle: '全部词卡',
    exact: false,
    badge: s => s.stats.vocabDueCount,
  },
];

export function Layout() {
  return (
    <AuthProvider>
      <StoreProvider>
        <AuthGate />
      </StoreProvider>
    </AuthProvider>
  );
}

function AuthGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-indigo-400 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">加载中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return <LayoutInner />;
}

function LayoutInner() {
  const location = useLocation();
  const navigate = useNavigate();
  const store = useStore();
  const { user, signOut } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!showUserMenu) return;
    const close = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [showUserMenu]);

  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || '用户';
  const userEmail = user?.email || '';
  const canManageInvites = isInviteAdminEmail(user?.email);

  const progressLinkClass = (isActive: boolean) =>
    `flex flex-col items-center justify-center rounded-lg p-2.5 text-center transition-all border ${
      isActive
        ? 'bg-indigo-600/25 border-indigo-500/40 text-white ring-1 ring-indigo-400/30'
        : 'bg-slate-800 border-slate-700/80 text-slate-300 hover:bg-slate-700/60 hover:border-slate-600'
    }`;

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] flex-col md:flex-row bg-gray-50 overflow-hidden">
      {/* 移动端顶栏 */}
      <header className="md:hidden shrink-0 flex items-center justify-between gap-2 min-h-[3.5rem] px-3 pt-safe bg-[#0f172a] border-b border-slate-700">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="p-2.5 -ml-1 rounded-xl text-white hover:bg-slate-800 active:bg-slate-700 touch-manipulation"
          aria-label="打开导航菜单"
        >
          <Menu size={22} strokeWidth={2} />
        </button>
        <span className="font-semibold text-white text-sm truncate flex-1 text-center">VerbaLab</span>
        <span className="w-11 shrink-0" aria-hidden />
      </header>

      {/* 抽屉遮罩 */}
      {drawerOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 md:hidden touch-manipulation"
          aria-label="关闭菜单"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Sidebar: 小屏抽屉，md+ 固定侧栏 */}
      <aside
        className={`fixed md:static z-50 md:z-0 inset-y-0 left-0 flex flex-col min-h-0 w-[min(19rem,90vw)] md:w-64 max-w-[min(19rem,90vw)] md:max-w-none bg-[#0f172a] border-r border-slate-800 transition-transform duration-200 ease-out md:translate-x-0 ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="p-4 md:p-6 border-b border-slate-700 shrink-0 flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 bg-indigo-500 rounded-xl flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-sm">VL</span>
            </div>
            <div className="min-w-0">
              <div className="text-white font-bold text-sm leading-tight">VerbaLab</div>
              <div className="text-slate-400 text-xs">v2.0 · 动词驱动</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 touch-manipulation shrink-0"
            aria-label="关闭"
          >
            <X size={22} />
          </button>
        </div>

        {/* 主导航：可滚动 */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-1">
          <nav className="space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = item.exact
                ? location.pathname === item.to
                : location.pathname.startsWith(item.to);
              const n = item.badge?.(store) ?? 0;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon size={18} className="shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{item.label}</div>
                    {item.subtitle && (
                      <div className={`text-xs ${isActive ? 'text-indigo-200' : 'text-slate-500 group-hover:text-slate-400'}`}>
                        {item.subtitle}
                      </div>
                    )}
                  </div>
                  {n > 0 && (
                    <span className="shrink-0 text-[10px] font-semibold bg-amber-500 text-white min-w-[1.25rem] h-5 px-1 rounded-full flex items-center justify-center">
                      {n > 99 ? '99+' : n}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* 学习进度：语料库 / 错题 / 卡壳点入口 */}
        <div className="p-4 border-t border-slate-700 space-y-2 shrink-0 bg-[#0f172a]">
          <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">学习进度</div>
          <div className="grid grid-cols-2 gap-2">
            <NavLink
              to="/vocab-review"
              className={({ isActive }) =>
                progressLinkClass(
                  isActive ||
                    location.pathname.startsWith('/vocab/') ||
                    location.pathname === '/word-lab'
                )
              }
            >
              <BookMarked size={14} className="text-violet-400 mb-0.5 opacity-90" />
              <div className="text-violet-400 font-bold text-lg leading-tight">{store.stats.vocabCardCount}</div>
              <div className="text-slate-500 text-[11px] leading-tight mt-0.5">词卡</div>
            </NavLink>
            <NavLink to="/corpus" className={({ isActive }) => progressLinkClass(isActive)}>
              <Library size={14} className="text-emerald-400 mb-0.5 opacity-90" />
              <div className="text-emerald-400 font-bold text-lg leading-tight">{store.stats.corpusSize}</div>
              <div className="text-slate-500 text-[11px] leading-tight mt-0.5">语料库</div>
            </NavLink>
            <NavLink to="/errors" className={({ isActive }) => progressLinkClass(isActive)}>
              <AlertCircle size={14} className="text-red-400 mb-0.5 opacity-90" />
              <div className="text-red-400 font-bold text-lg leading-tight">{store.stats.errorCount}</div>
              <div className="text-slate-500 text-[11px] leading-tight mt-0.5">错题</div>
            </NavLink>
            <NavLink to="/stuck" className={({ isActive }) => progressLinkClass(isActive)}>
              <LifeBuoy size={14} className="text-amber-400 mb-0.5 opacity-90" />
              <div className="text-amber-400 font-bold text-lg leading-tight">{store.stats.stuckCount}</div>
              <div className="text-slate-500 text-[11px] leading-tight mt-0.5">卡壳点</div>
            </NavLink>
          </div>
          <div className="mt-2">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>总进度</span>
              <span>{store.stats.totalLearned}/200</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-1.5">
              <div
                className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (store.stats.totalLearned / 200) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* User info — 固定在侧栏底部 */}
        <div className="px-4 pb-safe md:pb-4 border-t border-slate-700 pt-3 shrink-0 bg-[#0f172a]">
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800 transition-all text-left"
              aria-expanded={showUserMenu}
              aria-haspopup="true"
            >
              <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center shrink-0">
                <User size={14} className="text-white" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="text-sm font-medium truncate">{userName}</div>
                <div className="text-xs text-slate-500 truncate">{userEmail}</div>
              </div>
              <div className="shrink-0 flex items-center gap-1.5 text-slate-500">
                {store.syncStatus === 'saving' || store.syncStatus === 'loading' ? (
                  <Loader2 size={14} className="animate-spin text-indigo-400" aria-hidden />
                ) : store.syncStatus === 'success' ? (
                  <CheckCircle2 size={14} className="text-emerald-400" aria-hidden />
                ) : store.syncStatus === 'error' ? (
                  <CloudOff size={14} className="text-red-400" aria-hidden />
                ) : (
                  <Cloud size={14} aria-hidden />
                )}
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-hidden z-[60] max-h-[min(70vh,26rem)] overflow-y-auto">
                <div className="p-3 border-b border-slate-700">
                  <div className="flex items-center gap-2 text-slate-200 text-sm font-medium mb-3">
                    <Cloud size={16} className="text-indigo-400 shrink-0" />
                    云同步
                  </div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="text-xs text-slate-500 leading-snug">自动同步（数据变更后约 3 秒）</div>
                    <button
                      type="button"
                      onClick={() => store.setAutoSyncEnabled(!store.autoSyncEnabled)}
                      className={`text-xs px-2 py-1 rounded-md border transition-colors shrink-0 ${
                        store.autoSyncEnabled
                          ? 'bg-emerald-600/20 border-emerald-700 text-emerald-300 hover:bg-emerald-600/30'
                          : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                      }`}
                      title={store.autoSyncEnabled ? '点击关闭自动同步' : '点击开启自动同步'}
                    >
                      {store.autoSyncEnabled ? '已开启' : '已关闭'}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={store.pushToCloud}
                      disabled={store.syncStatus === 'saving' || store.syncStatus === 'loading'}
                      className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                      <ArrowUpCircle size={13} />
                      手动上传
                    </button>
                    <button
                      type="button"
                      onClick={store.pullFromCloud}
                      disabled={store.syncStatus === 'saving' || store.syncStatus === 'loading'}
                      className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 bg-slate-700 text-slate-200 rounded-lg text-xs font-medium hover:bg-slate-600 transition-colors disabled:opacity-50"
                    >
                      <ArrowDownCircle size={13} />
                      从云下载
                    </button>
                  </div>
                  {store.syncError && <p className="text-red-400 text-xs mt-2">{store.syncError}</p>}
                  {store.lastSyncTime && (
                    <p className="text-slate-500 text-xs text-center mt-2">
                      上次同步：{new Date(store.lastSyncTime).toLocaleString('zh-CN')}
                    </p>
                  )}
                </div>
                {canManageInvites && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      navigate('/invites');
                    }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-slate-200 hover:bg-slate-700/80 transition-colors text-sm border-b border-slate-700"
                  >
                    <Ticket size={15} className="text-amber-400" />
                    邀请码管理
                  </button>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    setShowUserMenu(false);
                    await signOut();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-red-400 hover:bg-slate-700/80 transition-colors text-sm"
                >
                  <LogOut size={15} />
                  退出登录
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-hidden flex flex-col min-w-0 min-h-0 pb-safe md:pb-0">
        <ErrorBoundary>
          <Suspense
            fallback={
              <div className="flex flex-1 min-h-[40vh] items-center justify-center text-slate-500 text-sm">
                加载中…
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
}
