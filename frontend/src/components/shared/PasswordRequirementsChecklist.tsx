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
    <div className="mt-2.5 p-3 rounded-btn bg-surface-canvas border border-border space-y-1.5">
      <p className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1">
        Password Requirements
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {items.map((item) => {
          const isError = hasSubmitted && !item.satisfied;

          return (
            <div
              key={item.id}
              className={`flex items-center text-[12px] transition-colors duration-150 ${
                item.satisfied
                  ? "text-status-success font-medium"
                  : isError
                  ? "text-status-danger font-medium"
                  : "text-text-secondary"
              }`}
            >
              {item.satisfied ? (
                <div className="w-4 h-4 rounded-full bg-status-success/15 flex items-center justify-center mr-1.5 shrink-0 text-status-success">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              ) : isError ? (
                <div className="w-4 h-4 rounded-full bg-status-danger/15 flex items-center justify-center mr-1.5 shrink-0 text-status-danger">
                  <X className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              ) : (
                <div className="w-4 h-4 rounded-full bg-border flex items-center justify-center mr-1.5 shrink-0 text-text-muted">
                  <Circle className="w-2 h-2 fill-text-muted" />
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
