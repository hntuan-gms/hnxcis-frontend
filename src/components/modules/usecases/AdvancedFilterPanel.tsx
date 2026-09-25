/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { ChevronDown, Filter } from 'lucide-react';

import { DateField, DateRangeField } from './CalendarDatePicker';
import { BTN_OUTLINE, BTN_PRIMARY, INPUT_CLASS, useCloseOnOutsideOrEscape } from './catalogUi';

/**
 * Panel "Lọc nâng cao" — bản dịch của `renderAdvFilterPanel` /
 * `.adv-filter-panel` trong `docs/quan-ly-danh-muc_80.html`.
 *
 * Bốn màn nhóm "Quản lý hồ sơ" (Tổ chức phát hành, Nhà đầu tư, Danh sách trái
 * phiếu, Tổ chức liên quan) đều có `hasAdvancedFilter:true` trong file mẫu:
 * panel ẩn mặc định, mở bằng nút "Lọc nâng cao" (có số đếm điều kiện đang áp),
 * và các trường lọc chỉ có hiệu lực khi bấm "Áp dụng" — không lọc ngay khi gõ
 * hay chọn, khác hẳn ô từ khóa/trạng thái của `CatalogToolbar`.
 *
 * Không dùng lại `<select>` gốc: dựng một dropdown dạng nút + danh sách bật lên
 * (không có ô tìm kiếm bên trong, vì mỗi danh sách lựa chọn ở đây chỉ khoảng
 * 5–10 mục) để giữ đúng hình dạng nút bo góc + chevron của `.adv-select-btn`.
 */

export interface AdvFilterOption {
  readonly value: string;
  readonly label: string;
}

export type AdvFilterField =
  | { key: string; label: string; type: 'text'; placeholder?: string }
  | { key: string; label: string; type: 'select'; allLabel?: string; options: readonly AdvFilterOption[] }
  | { key: string; label: string; type: 'date' }
  | { key: string; label: string; type: 'daterange'; startKey: string; endKey: string };

export type AdvFilterValues = Record<string, string>;

function emptyValues(fields: readonly AdvFilterField[]): AdvFilterValues {
  const v: AdvFilterValues = {};
  fields.forEach((f) => {
    if (f.type === 'daterange') {
      v[f.startKey] = '';
      v[f.endKey] = '';
    } else {
      v[f.key] = f.type === 'select' ? 'all' : '';
    }
  });
  return v;
}

function countActive(fields: readonly AdvFilterField[], values: AdvFilterValues): number {
  let n = 0;
  fields.forEach((f) => {
    if (f.type === 'daterange') {
      if (values[f.startKey] || values[f.endKey]) n += 1;
      return;
    }
    const v = values[f.key];
    if (v && v !== 'all') n += 1;
  });
  return n;
}

export interface AdvancedFilterState {
  readonly open: boolean;
  readonly toggle: () => void;
  readonly count: number;
  /** Điều kiện ĐANG lọc danh sách — chỉ đổi khi bấm "Áp dụng". */
  readonly applied: AdvFilterValues;
  /** Điều kiện đang gõ/chọn dở trong panel, chưa áp dụng. */
  readonly draft: AdvFilterValues;
  readonly setField: (key: string, value: string) => void;
  readonly apply: () => void;
  readonly reset: () => void;
}

/**
 * `ui.advFilters` / `ui.advFiltersDraft` / `ui.filterPanelOpen` của file mẫu,
 * gộp vào một hook cho mỗi màn hình dùng.
 */
export function useAdvancedFilter(fields: readonly AdvFilterField[]): AdvancedFilterState {
  const initial = emptyValues(fields);
  const [applied, setApplied] = useState<AdvFilterValues>(initial);
  const [draft, setDraft] = useState<AdvFilterValues>(initial);
  const [open, setOpen] = useState(false);

  return {
    open,
    toggle: () =>
      setOpen((prev) => {
        if (!prev) setDraft(applied);
        return !prev;
      }),
    count: countActive(fields, applied),
    applied,
    draft,
    setField: (key, value) => setDraft((prev) => ({ ...prev, [key]: value })),
    apply: () => {
      setApplied(draft);
      setOpen(false);
    },
    reset: () => {
      setDraft(initial);
      setApplied(initial);
    },
  };
}

interface SelectFilterDropdownProps {
  value: string;
  allLabel: string;
  ariaLabel: string;
  options: readonly AdvFilterOption[];
  onChange: (value: string) => void;
}

const SelectFilterDropdown: React.FC<SelectFilterDropdownProps> = ({ value, allLabel, ariaLabel, options, onChange }) => {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  useCloseOnOutsideOrEscape(open, () => setOpen(false), boxRef);

  const current = value === 'all' ? allLabel : (options.find((o) => o.value === value)?.label ?? allLabel);
  const allOptions: readonly AdvFilterOption[] = [{ value: 'all', label: allLabel }, ...options];

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={ariaLabel}
        className={`${INPUT_CLASS} flex cursor-pointer items-center justify-between gap-2 text-left`}
      >
        <span className="truncate">{current}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      </button>
      {open && (
        <div className="absolute right-0 left-0 z-30 mt-1.5 max-h-70 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
          {allOptions.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={`block w-full rounded-md px-2.5 py-2 text-left text-[13px] ${
                o.value === value ? 'bg-[#E6F4EA] font-medium text-[#1E7A42]' : 'text-[#292929] hover:bg-slate-50'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

interface AdvancedFilterButtonProps {
  active: boolean;
  count: number;
  onClick: () => void;
}

/** `#filterBtn` — viền/chữ chuyển sang xanh thương hiệu khi panel đang mở. */
export const AdvancedFilterButton: React.FC<AdvancedFilterButtonProps> = ({ active, count, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-expanded={active}
    className={`${BTN_OUTLINE} ${active ? 'border-[#009F5F] text-[#00663D]' : ''}`}
  >
    <Filter className="h-4 w-4" />
    Lọc nâng cao
    {count > 0 && (
      <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#00663D] px-1 text-[10px] font-semibold text-white">
        {count}
      </span>
    )}
  </button>
);

interface AdvancedFilterPanelProps {
  fields: readonly AdvFilterField[];
  draft: AdvFilterValues;
  onChange: (key: string, value: string) => void;
  onApply: () => void;
  onReset: () => void;
}

/** `.adv-filter-panel` — lưới 4 cột, mỗi trường một ô, ô cuối là hai nút thao tác. */
export const AdvancedFilterPanel: React.FC<AdvancedFilterPanelProps> = ({ fields, draft, onChange, onApply, onReset }) => (
  <div className="mb-4 grid grid-cols-1 gap-x-5 gap-y-4 rounded-[10px] border border-[#F1F1F1] bg-[#F9FAFB] p-4.5 sm:grid-cols-2 lg:grid-cols-4">
    {fields.map((f) => (
      <div key={f.type === 'daterange' ? `${f.startKey}-${f.endKey}` : f.key} className="flex min-w-0 flex-col gap-1.5">
        <label className="text-[12.5px] font-medium text-[#525252]">{f.label}</label>
        {f.type === 'text' && (
          <input
            type="text"
            aria-label={f.label}
            value={draft[f.key] ?? ''}
            onChange={(e) => onChange(f.key, e.target.value)}
            placeholder={f.placeholder ?? `Nhập ${f.label.toLowerCase()}`}
            className={INPUT_CLASS}
          />
        )}
        {f.type === 'select' && (
          <SelectFilterDropdown
            value={draft[f.key] ?? 'all'}
            allLabel={f.allLabel ?? `Tất cả ${f.label.toLowerCase()}`}
            ariaLabel={f.label}
            options={f.options}
            onChange={(v) => onChange(f.key, v)}
          />
        )}
        {f.type === 'date' && (
          <div role="group" aria-label={f.label}>
            <DateField value={draft[f.key] || null} placeholder={`Chọn ${f.label.toLowerCase()}`} onChange={(v) => onChange(f.key, v ?? '')} />
          </div>
        )}
        {f.type === 'daterange' && (
          <div role="group" aria-label={f.label}>
            <DateRangeField
              startValue={draft[f.startKey] || null}
              endValue={draft[f.endKey] || null}
              placeholder={`Chọn ${f.label.toLowerCase()}`}
              onChange={(start, end) => {
                onChange(f.startKey, start ?? '');
                onChange(f.endKey, end ?? '');
              }}
            />
          </div>
        )}
      </div>
    ))}
    <div className="flex flex-col gap-1.5">
      {/* Nhãn vô hình để ô nút thẳng hàng với các ô trường khác — `.adv-filter-actions-field label{visibility:hidden}` của file mẫu. */}
      <label className="invisible text-[12.5px] font-medium">Thao tác</label>
      <div className="flex h-9 items-center gap-2">
        <button type="button" onClick={onReset} className={BTN_OUTLINE}>
          Xoá lọc
        </button>
        <button type="button" onClick={onApply} className={BTN_PRIMARY}>
          Áp dụng
        </button>
      </div>
    </div>
  </div>
);
