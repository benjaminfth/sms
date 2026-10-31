import React from "react";

export function LoadingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="w-full space-y-3 animate-pulse p-4">
      <div className="h-8 bg-slate-200 rounded-md w-1/4"></div>
      <div className="space-y-2 pt-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-12 bg-slate-100 rounded-lg w-full flex items-center px-4 space-x-4">
            <div className="h-4 bg-slate-200 rounded w-1/6"></div>
            <div className="h-4 bg-slate-200 rounded w-1/4"></div>
            <div className="h-4 bg-slate-200 rounded w-1/6"></div>
            <div className="h-4 bg-slate-200 rounded w-1/12 ml-auto"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
