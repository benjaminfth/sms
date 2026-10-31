import React from "react";

export function LoadingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="w-full space-y-3 animate-pulse">
      <div className="h-6 bg-[#E5EAF1] rounded-[6px] w-1/4"></div>
      <div className="space-y-2 pt-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-10 bg-[#F8FAFC] border border-[#E5EAF1] rounded-[8px] w-full flex items-center px-4 space-x-4">
            <div className="h-3.5 bg-[#E5EAF1] rounded-[4px] w-1/6"></div>
            <div className="h-3.5 bg-[#E5EAF1] rounded-[4px] w-1/4"></div>
            <div className="h-3.5 bg-[#E5EAF1] rounded-[4px] w-1/6"></div>
            <div className="h-3.5 bg-[#E5EAF1] rounded-[4px] w-1/12 ml-auto"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
