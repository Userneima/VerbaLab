import { useState } from 'react';
import { useAuth } from '../store/AuthContext';
import { Eye, EyeOff, Loader2, Mail, Lock, User } from 'lucide-react';

export function AuthPage() {
  const { signIn, signUp, error, loading } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSubmitting(true);

    if (mode === 'signup') {
      if (password.length < 6) {
        setLocalError('密码至少需要 6 个字符');
        setSubmitting(false);
        return;
      }
      const ok = await signUp(email, password, name);
      if (!ok) setSubmitting(false);
    } else {
      const ok = await signIn(email, password);
      if (!ok) setSubmitting(false);
    }
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-500 rounded-2xl mb-4">
            <span className="text-white font-bold text-2xl">FF</span>
          </div>
          <h1 className="text-white text-2xl font-bold">FluentFlow 2.0</h1>
          <p className="text-slate-400 text-sm mt-1">动词驱动 · 建立你的英语弹药库</p>
        </div>

        {/* Auth Card */}
        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-slate-700">
          {/* Tabs */}
          <div className="flex bg-slate-900 rounded-xl p-1 mb-6">
            <button
              onClick={() => { setMode('login'); setLocalError(null); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === 'login'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              登录
            </button>
            <button
              onClick={() => { setMode('signup'); setLocalError(null); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === 'signup'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              注册
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-slate-300 text-sm mb-1.5">昵称</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="输入你的昵称"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-slate-300 text-sm mb-1.5">邮箱</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 text-sm mb-1.5">密码</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? '至少 6 个字符' : '输入密码'}
                  required
                  minLength={6}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-11 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {displayError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                <p className="text-red-400 text-sm">{displayError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {mode === 'login' ? '登录中...' : '注册中...'}
                </>
              ) : (
                mode === 'login' ? '登录' : '创建账号'
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-slate-500 text-xs">
              {mode === 'login' ? '还没有账号？' : '已有账号？'}
              <button
                onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setLocalError(null); }}
                className="text-indigo-400 hover:text-indigo-300 ml-1"
              >
                {mode === 'login' ? '立即注册' : '去登录'}
              </button>
            </p>
          </div>
        </div>

        {/* Feature highlights */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            { emoji: '📖', label: '10个核心动词' },
            { emoji: '🧪', label: 'AI语法校验' },
            { emoji: '⚡', label: '云端同步' },
          ].map(f => (
            <div key={f.label} className="bg-slate-800/30 rounded-xl p-3 text-center">
              <div className="text-lg mb-1">{f.emoji}</div>
              <div className="text-slate-400 text-xs">{f.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
