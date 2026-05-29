import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // @types/react 미설치 환경 — 클래스 컴포넌트(이 파일 유일)에서만 React.Component 상속 멤버
  // 타입이 유실되므로 사용 멤버만 국소 선언한다. @types/react 정식 도입 시 두 declare 제거 가능.
  declare props: ErrorBoundaryProps;
  declare setState: (state: Partial<ErrorBoundaryState>) => void;
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] 화면 렌더 중 예외:', error, info.componentStack);
  }

  private handleReset = () => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        role="alert"
        className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-950 px-6 text-center text-white"
      >
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">예상치 못한 오류가 발생했습니다</h1>
          <p className="max-w-md text-sm text-gray-400">
            화면을 그리는 중 문제가 발생했습니다. 메뉴로 돌아가거나 페이지를 새로고침해 주세요. 진행 상황은 자동 저장되어 있습니다.
          </p>
        </div>

        {import.meta.env.DEV && this.state.error && (
          <pre className="max-w-lg overflow-auto rounded bg-gray-900 p-3 text-left text-xs text-red-300">
            {this.state.error.message}
          </pre>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={this.handleReset}
            className="rounded bg-white px-4 py-2 font-semibold text-gray-950 transition hover:bg-gray-200"
          >
            메뉴로 돌아가기
          </button>
          <button
            type="button"
            onClick={this.handleReload}
            className="rounded border border-gray-600 px-4 py-2 font-semibold text-white transition hover:bg-gray-800"
          >
            새로고침
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
