"use client";

import React from "react";
import { PaginationMeta } from "@sms/shared";
import { ChevronLeft, ChevronRight, Inbox } from "lucide-react";

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
  className?: string;
  align?: "left" | "center" | "right";
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  pagination?: PaginationMeta | null;
  onPageChange?: (newPage: number) => void;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function DataTable<T extends { id?: string }>({
  columns,
  data,
  pagination,
  onPageChange,
  loading,
  emptyTitle = "No records found",
  emptyDescription = "There are no entries matching your current filters.",
}: DataTableProps<T>) {
  return (
    <div className="bg-white border border-[#E5EAF1] rounded-[10px] overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-[13px]">
          <thead>
            <tr className="bg-[#F8FAFC] border-b border-[#E5EAF1] text-[11px] font-medium uppercase tracking-wider text-[#64748B]">
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={`py-2.5 px-4 font-medium ${
                    col.align === "right"
                      ? "text-right"
                      : col.align === "center"
                      ? "text-center"
                      : "text-left"
                  } ${col.className || ""}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5EAF1]">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-[#94A3B8]">
                  <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-[#315CF5] border-t-transparent" />
                  <p className="mt-2 text-[12px] font-medium text-[#64748B]">Loading records...</p>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 px-4 text-center">
                  <div className="max-w-xs mx-auto text-center">
                    <div className="w-10 h-10 rounded-[8px] bg-[#F8FAFC] border border-[#E5EAF1] flex items-center justify-center mx-auto text-[#94A3B8] mb-2.5">
                      <Inbox className="w-5 h-5" />
                    </div>
                    <p className="text-[13px] font-medium text-[#172033]">{emptyTitle}</p>
                    <p className="text-[12px] text-[#64748B] mt-0.5">{emptyDescription}</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((item, rowIdx) => (
                <tr
                  key={item.id || rowIdx}
                  className="hover:bg-[#F8FAFC]/80 transition-colors group"
                >
                  {columns.map((col, colIdx) => (
                    <td
                      key={colIdx}
                      className={`py-3 px-4 text-[#172033] align-middle ${
                        col.align === "right"
                          ? "text-right"
                          : col.align === "center"
                          ? "text-center"
                          : "text-left"
                      } ${col.className || ""}`}
                    >
                      {col.cell
                        ? col.cell(item)
                        : col.accessorKey
                        ? String(item[col.accessorKey] ?? "—")
                        : null}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-2.5 bg-[#F8FAFC] border-t border-[#E5EAF1] text-[12px] text-[#64748B] gap-2">
          <div>
            Showing <span className="font-medium text-[#172033]">{(pagination.page - 1) * pagination.pageSize + 1}</span> to{" "}
            <span className="font-medium text-[#172033]">
              {Math.min(pagination.page * pagination.pageSize, pagination.total)}
            </span>{" "}
            of <span className="font-medium text-[#172033]">{pagination.total}</span> entries
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => onPageChange?.(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-1 px-2 rounded-[6px] border border-[#E5EAF1] bg-white text-[#172033] hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed transition text-[12px] font-medium flex items-center space-x-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
            <span className="px-2 text-[12px] font-medium text-[#172033]">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => onPageChange?.(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="p-1 px-2 rounded-[6px] border border-[#E5EAF1] bg-white text-[#172033] hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed transition text-[12px] font-medium flex items-center space-x-1"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
