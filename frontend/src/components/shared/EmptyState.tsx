import React from "react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-[#E5EAF1] rounded-[10px] my-4 shadow-xs">
      <div className="w-11 h-11 rounded-[8px] bg-[#F8FAFC] border border-[#E5EAF1] text-[#94A3B8] flex items-center justify-center mb-3.5">
        {icon || <Inbox className="w-5 h-5" />}
      </div>
      <h3 className="text-[15px] font-semibold text-[#172033]">{title}</h3>
      <p className="text-[13px] text-[#64748B] max-w-sm mt-1 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-3.5 py-1.5 text-[13px] font-medium text-white bg-[#315CF5] hover:bg-[#2549D8] rounded-[8px] transition"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
