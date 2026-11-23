import { AlertCircle, RotateCcw } from 'lucide-react';

export function RecipeListSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4" aria-busy="true" aria-label="레시피를 불러오는 중">
      {[0, 1, 2, 3].map((idx) => (
        <div
          key={idx}
          className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1B1D1B] p-5 space-y-4 animate-pulse"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-zinc-200 dark:bg-zinc-800 shrink-0" />
              <div className="space-y-2">
                <div className="h-5 w-36 rounded-md bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-3.5 w-24 rounded-md bg-zinc-100 dark:bg-zinc-800/70" />
              </div>
            </div>
            <div className="h-5 w-14 rounded-md bg-zinc-200 dark:bg-zinc-800" />
          </div>
          <div className="h-4 w-full rounded-md bg-zinc-100 dark:bg-zinc-800/70" />
          <div className="h-4 w-3/4 rounded-md bg-zinc-100 dark:bg-zinc-800/70" />
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-between">
            <div className="h-3.5 w-28 rounded-md bg-zinc-100 dark:bg-zinc-800/70" />
            <div className="h-3.5 w-16 rounded-md bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PhotoRecognitionSkeleton() {
  return (
    <div
      className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1B1D1B] p-5 space-y-3 animate-pulse"
      aria-busy="true"
      aria-label="사진 속 식재료를 분석하는 중"
    >
      <div className="h-4 w-44 rounded-md bg-zinc-200 dark:bg-zinc-800" />
      <div className="flex flex-wrap gap-2">
        {[0, 1, 2, 3, 4, 5].map((idx) => (
          <div key={idx} className="h-10 w-24 rounded-xl bg-zinc-100 dark:bg-zinc-800" />
        ))}
      </div>
    </div>
  );
}

export function MenuAnalysisSkeleton() {
  return (
    <div className="space-y-4 animate-pulse" aria-busy="true" aria-label="메뉴 재료를 비교 분석하는 중">
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1B1D1B] p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
          <div className="space-y-2 flex-1">
            <div className="h-5 w-40 rounded-md bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-4 w-64 rounded-md bg-zinc-100 dark:bg-zinc-800/70" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[0, 1, 2].map((col) => (
          <div
            key={col}
            className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1B1D1B] p-5 space-y-3"
          >
            <div className="h-5 w-32 rounded-md bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-14 w-full rounded-xl bg-zinc-100 dark:bg-zinc-800/70" />
            <div className="h-14 w-full rounded-xl bg-zinc-100 dark:bg-zinc-800/70" />
          </div>
        ))}
      </div>
    </div>
  );
}

interface ErrorRetryCardProps {
  title?: string;
  message: string;
  onRetry: () => void;
}

export function ErrorRetryCard({
  title = '요청을 처리하지 못했습니다',
  message,
  onRetry,
}: ErrorRetryCardProps) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50/70 dark:bg-red-950/30 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-red-900 dark:text-red-200">{title}</p>
          <p className="text-sm text-red-700 dark:text-red-300">{message}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
      >
        <RotateCcw className="w-4 h-4" />
        다시 시도
      </button>
    </div>
  );
}
