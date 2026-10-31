import React from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
}

export function PageHeader({ title, description, children, actions, badge }: PageHeaderProps) {
  const actionContent = actions || children;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-5 mb-6 border-b border-[#E5EAF1] gap-4">
      <div>
        <div className="flex items-center space-x-3">
          <h1 className="text-[26px] font-semibold tracking-tight text-[#172033] leading-tight">
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p className="mt-1 text-[13px] text-[#64748B] max-w-3xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actionContent && (
        <div className="flex items-center flex-wrap gap-2.5 shrink-0">
          {actionContent}
        </div>
      )}
    </div>
  );
}
