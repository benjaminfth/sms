"use client";

import React from "react";
import { Check, X, Circle } from "lucide-react";
import { checkPasswordRequirements } from "@sms/shared";

interface PasswordRequirementsChecklistProps {
  password: string;
  hasSubmitted?: boolean;
}

export function PasswordRequirementsChecklist({
  password,
  hasSubmitted = false,
}: PasswordRequirementsChecklistProps) {
  const reqs = checkPasswordRequirements(password);

  const items = [
    {
      id: "length",
      label: "At least 9 characters",
      satisfied: reqs.hasMinLength,
    },
    {
      id: "uppercase",
      label: "One uppercase letter (A–Z)",
      satisfied: reqs.hasUppercase,
    },
    {
      id: "lowercase",
      label: "One lowercase letter (a–z)",
      satisfied: reqs.hasLowercase,
    },
    {
      id: "special",
      label: "One special character (spaces excluded)",
      satisfied: reqs.hasSpecialChar,
    },
  ];

  return (
    <div className="mt-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1.5">
      <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
        Password Requirements
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {items.map((item) => {
          const isError = hasSubmitted && !item.satisfied;

          return (
            <div
              key={item.id}
              className={`flex items-center text-xs transition-colors duration-150 ${
                item.satisfied
                  ? "text-emerald-600 font-medium"
                  : isError
                  ? "text-rose-600 font-medium"
                  : "text-slate-500"
              }`}
            >
              {item.satisfied ? (
                <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center mr-1.5 shrink-0 text-emerald-700">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              ) : isError ? (
                <div className="w-4 h-4 rounded-full bg-rose-100 flex items-center justify-center mr-1.5 shrink-0 text-rose-700">
                  <X className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              ) : (
                <div className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center mr-1.5 shrink-0 text-slate-400">
                  <Circle className="w-2 h-2 fill-slate-400" />
                </div>
              )}
              <span>{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
