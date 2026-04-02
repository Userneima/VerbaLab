import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };

type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Route error boundary:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 p-8 bg-slate-50 text-center">
          <p className="text-slate-800 font-medium">页面出错了</p>
          <p className="text-slate-500 text-sm max-w-md">{this.state.error.message}</p>
          <button
            type="button"
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
            onClick={() => {
              this.setState({ error: null });
              window.location.assign('/');
            }}
          >
            返回首页
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
