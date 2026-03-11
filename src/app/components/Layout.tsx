import { NavLink, Outlet, useLocation } from 'react-router';
import { BookOpen, FlaskConical, Zap, Library, AlertCircle, Home, Cloud, CloudOff, Loader2, CheckCircle2, ArrowUpCircle, ArrowDownCircle, LogOut, User } from 'lucide-react';
import { useStore, StoreProvider } from '../store/StoreContext';
import { AuthProvider, useAuth } from '../store/AuthContext';
import { AuthPage } from '../pages/AuthPage';
import { useState } from 'react';

const navItems = [
  { to: '/', label: '概览', icon: Home, exact: true },
  { to: '/foundry', label: '资产区', icon: BookOpen, subtitle: 'The Foundry', exact: false },
  { to: '/lab', label: '实验室', icon: FlaskConical, subtitle: 'The Lab', exact: false },
  { to: '/field', label: '实战仓', icon: Zap, subtitle: 'The Field', exact: false },
  { to: '/corpus', label: '语料库', icon: Library, subtitle: 'Corpus', exact: false },
  { to: '/errors', label: '错题集', icon: AlertCircle, subtitle: 'Error Bank', exact: false },
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
  const store = useStore();
  const { user, signOut } = useAuth();
  const [showSyncPanel, setShowSyncPanel] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || '用户';
  const userEmail = user?.email || '';

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0f172a] flex flex-col shrink-0 border-r border-slate-800">
        {/* Logo */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-sm">FF</span>
            </div>
            <div>
              <div className="text-white font-bold text-sm leading-tight">FluentFlow</div>
              <div className="text-slate-400 text-xs">v2.0 · 动词驱动</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = item.exact
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon size={18} className="shrink-0" />
                <div>
                  <div className="text-sm font-medium">{item.label}</div>
                  {item.subtitle && (
                    <div className={`text-xs ${isActive ? 'text-indigo-200' : 'text-slate-500 group-hover:text-slate-400'}`}>
                      {item.subtitle}
                    </div>
                  )}
                </div>
              </NavLink>
            );
          })}
        </nav>

        {/* Cloud Sync */}
        <div className="px-4 pb-2">
          <button
            onClick={() => setShowSyncPanel(!showSyncPanel)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-sm"
          >
            {store.syncStatus === 'saving' || store.syncStatus === 'loading' ? (
              <Loader2 size={15} className="animate-spin text-indigo-400" />
            ) : store.syncStatus === 'success' ? (
              <CheckCircle2 size={15} className="text-emerald-400" />
            ) : store.syncStatus === 'error' ? (
              <CloudOff size={15} className="text-red-400" />
            ) : (
              <Cloud size={15} />
            )}
            <span>云同步</span>
            {store.syncStatus === 'saving' ? (
              <span className="ml-auto text-xs text-indigo-400">同步中...</span>
            ) : store.lastSyncTime ? (
              <span className="ml-auto text-xs text-slate-500">
                {new Date(store.lastSyncTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            ) : null}
          </button>

          {showSyncPanel && (
            <div className="mt-1 mb-2 bg-slate-800 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="text-xs text-slate-500">
                  自动同步（数据变更后 3 秒延迟）
                </div>
                <button
                  onClick={() => store.setAutoSyncEnabled(!store.autoSyncEnabled)}
                  className={`text-xs px-2 py-1 rounded-md border transition-colors ${
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
                  onClick={store.pushToCloud}
                  disabled={store.syncStatus === 'saving' || store.syncStatus === 'loading'}
                  className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  <ArrowUpCircle size={13} />
                  手动上传
                </button>
                <button
                  onClick={store.pullFromCloud}
                  disabled={store.syncStatus === 'saving' || store.syncStatus === 'loading'}
                  className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 bg-slate-700 text-slate-200 rounded-lg text-xs font-medium hover:bg-slate-600 transition-colors disabled:opacity-50"
                >
                  <ArrowDownCircle size={13} />
                  从云下载
                </button>
              </div>
              {store.syncError && (
                <p className="text-red-400 text-xs">{store.syncError}</p>
              )}
              {store.lastSyncTime && (
                <p className="text-slate-500 text-xs text-center">
                  上次同步: {new Date(store.lastSyncTime).toLocaleString('zh-CN')}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Stats at bottom */}
        <div className="p-4 border-t border-slate-700 space-y-2">
          <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">学习进度</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-800 rounded-lg p-2.5 text-center">
              <div className="text-indigo-400 font-bold text-lg leading-tight">{store.stats.totalLearned}</div>
              <div className="text-slate-500 text-xs">已学搭配</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-2.5 text-center">
              <div className="text-emerald-400 font-bold text-lg leading-tight">{store.stats.corpusSize}</div>
              <div className="text-slate-500 text-xs">语料库</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-2.5 text-center">
              <div className="text-red-400 font-bold text-lg leading-tight">{store.stats.errorCount}</div>
              <div className="text-slate-500 text-xs">错题</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-2.5 text-center">
              <div className="text-amber-400 font-bold text-lg leading-tight">{store.stats.stuckCount}</div>
              <div className="text-slate-500 text-xs">卡壳点</div>
            </div>
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

        {/* User info */}
        <div className="px-4 pb-4 border-t border-slate-700 pt-3">
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800 transition-all"
            >
              <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center shrink-0">
                <User size={14} className="text-white" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="text-sm font-medium truncate">{userName}</div>
                <div className="text-xs text-slate-500 truncate">{userEmail}</div>
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-hidden">
                <button
                  onClick={async () => {
                    setShowUserMenu(false);
                    await signOut();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-red-400 hover:bg-slate-700 transition-colors text-sm"
                >
                  <LogOut size={15} />
                  退出登录
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}
