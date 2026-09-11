import React from 'react';

export const CardSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xs border border-slate-100 dark:border-slate-700/60 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded-md" />
      <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700" />
    </div>
    <div className="mt-4 h-8 w-36 bg-slate-200 dark:bg-slate-700 rounded-md" />
    <div className="mt-2 h-3 w-20 bg-slate-100 dark:bg-slate-700/50 rounded-md" />
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xs border border-slate-100 dark:border-slate-700/60 p-4 animate-pulse">
    <div className="h-10 bg-slate-100 dark:bg-slate-700 rounded-xl mb-4 w-full" />
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 py-3 border-b border-slate-100 dark:border-slate-700/50">
        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700" />
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-md w-1/4" />
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-md w-1/6" />
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-md w-1/6" />
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-md w-1/8 ml-auto" />
      </div>
    ))}
  </div>
);
