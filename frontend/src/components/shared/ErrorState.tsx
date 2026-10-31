import React from "react";
import { AlertCircle } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-[#FDEDED]/40 border border-[#F8C6C6] rounded-[10px] my-4">
      <div className="w-9 h-9 bg-[#FDEDED] text-[#D14343] rounded-[8px] flex items-center justify-center mb-2.5">
        <AlertCircle className="w-5 h-5" />
      </div>
      <h3 className="text-[15px] font-semibold text-[#172033]">{title}</h3>
      <p className="text-[13px] text-[#64748B] max-w-md mt-1 leading-relaxed">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3.5 px-3.5 py-1.5 text-[13px] font-medium text-[#172033] bg-white border border-[#E5EAF1] hover:bg-[#F8FAFC] rounded-[8px] transition"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
