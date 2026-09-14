/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useLayoutEffect, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

import { ERROR_RING, INPUT_CLASS, useCloseOnOutsideOrEscape } from './catalogUi';

/**
 * Bộ chọn ngày dạng lịch (một ngày hoặc một khoảng ngày), theo `.cal-popover`
 * của `docs/quan-ly-danh-muc_16.html` — file mẫu đầu tiên trong bộ này cần một
 * trường ngày thật (trước đó bảy màn hình danh mục chỉ có mã/tên/mô tả).
 *
 * Dùng `position:fixed` (đo qua `getBoundingClientRect`) thay vì `absolute`
 * trong khối `relative` như `ColumnsButton`: popup khoảng ngày rộng gần 480px,
 * trong khi khung popup nhập liệu (`ModalShell`) chỉ rộng 440px và tự cuộn dọc —
 * đặt `absolute` sẽ bị khung đó cắt mất phần tràn ra ngoài.
 */

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function toISO(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function parseISO(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/** `toLocaleDateString('vi-VN')` — cách hiển thị ngày dùng chung của toàn bộ ứng dụng. */
function formatVN(iso: string | null | undefined): string {
  const d = parseISO(iso);
  return d ? d.toLocaleDateString('vi-VN') : '';
}

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const MONTH_SHORT = Array.from({ length: 12 }, (_, i) => `Th ${i + 1}`);

interface DayCell {
  date: Date;
  inMonth: boolean;
}

function buildMonthCells(year: number, month: number): DayCell[] {
  const first = new Date(year, month, 1);
  const startWeekday = (first.getDay() + 6) % 7; // Thứ 2 = 0, giống file mẫu
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: DayCell[] = [];
  for (let i = startWeekday - 1; i >= 0; i -= 1) {
    cells.push({ date: new Date(year, month - 1, daysInPrevMonth - i), inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d += 1) {
    cells.push({ date: new Date(year, month, d), inMonth: true });
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date;
    cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), inMonth: false });
  }
  return cells;
}

/* ------------------------------------------------------------- popover shell */

function usePopoverPosition(open: boolean, triggerRef: React.RefObject<HTMLElement>) {
  const popRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({ visibility: 'hidden' });
  // Đổi mỗi khi bảng chọn tháng/năm bật tắt — kích thước popup thay đổi theo.
  const [sizeTick, setSizeTick] = useState(0);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setStyle({ visibility: 'hidden' });
      return;
    }
    const rect = triggerRef.current.getBoundingClientRect();
    const popEl = popRef.current;
    const width = popEl?.offsetWidth ?? 300;
    const height = popEl?.offsetHeight ?? 320;

    let left = rect.left;
    if (left + width > window.innerWidth - 16) left = window.innerWidth - width - 16;
    left = Math.max(16, left);

    let top = rect.bottom + 8;
    if (top + height > window.innerHeight - 16) {
      top = Math.max(16, rect.top - height - 8);
    }

    setStyle({ position: 'fixed', left, top, zIndex: 150 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sizeTick]);

  return { popRef, style, bumpSize: () => setSizeTick((t) => t + 1) };
}

/* ------------------------------------------------------------------ panel */

interface MonthPanelProps {
  year: number;
  month: number;
  quickPickOpen: boolean;
  quickPickYear: number;
  onToggleQuickPick: () => void;
  onQuickPickYear: (year: number) => void;
  onPickMonth: (year: number, month: number) => void;
  onNav: ((dir: -1 | 1) => void) | null;
  selStart: string | null;
  selEnd: string | null;
  onPickDay: (iso: string) => void;
}

const MonthPanel: React.FC<MonthPanelProps> = ({
  year,
  month,
  quickPickOpen,
  quickPickYear,
  onToggleQuickPick,
  onQuickPickYear,
  onPickMonth,
  onNav,
  selStart,
  selEnd,
  onPickDay,
}) => {
  const todayISO = toISO(new Date());
  const monthCells = buildMonthCells(year, month);

  return (
    <div className="w-56">
      <div className="mb-2 flex items-center justify-between">
        {onNav ? (
          <button
            type="button"
            onClick={() => onNav(-1)}
            className="flex h-6 w-6 items-center justify-center rounded-md text-[#525252] hover:bg-slate-100"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        ) : (
          <span className="h-6 w-6" />
        )}
        <button
          type="button"
          onClick={onToggleQuickPick}
          className="rounded-md px-2 py-0.5 text-[13.5px] font-bold text-[#292929] hover:bg-slate-100"
        >
          Tháng {pad2(month + 1)} {year}
        </button>
        {onNav ? (
          <button
            type="button"
            onClick={() => onNav(1)}
            className="flex h-6 w-6 items-center justify-center rounded-md text-[#525252] hover:bg-slate-100"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        ) : (
          <span className="h-6 w-6" />
        )}
      </div>

      {quickPickOpen ? (
        <div>
          <div className="mb-2 flex items-center justify-center gap-4 text-[13px] font-bold text-[#292929]">
            <button
              type="button"
              onClick={() => onQuickPickYear(quickPickYear - 1)}
              className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-slate-100"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span>{quickPickYear}</span>
            <button
              type="button"
              onClick={() => onQuickPickYear(quickPickYear + 1)}
              className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-slate-100"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {MONTH_SHORT.map((label, i) => (
              <button
                key={label}
                type="button"
                onClick={() => onPickMonth(quickPickYear, i)}
                className={`h-8 rounded-lg text-[11.5px] ${
                  quickPickYear === year && i === month
                    ? 'bg-[#008A4B] font-semibold text-white'
                    : 'bg-slate-50 text-[#292929] hover:border hover:border-[#009F5F]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {WEEKDAYS.map((w, i) => (
                <th
                  key={w}
                  className={`pb-1 text-center text-[11px] font-semibold ${
                    i === 6 ? 'text-[#802423]' : 'text-[#525252]'
                  }`}
                >
                  {w}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: monthCells.length / 7 }, (_, week) => {
              const cells = monthCells.slice(week * 7, week * 7 + 7);
              return (
                <tr key={week}>
                  {cells.map((c, ci) => {
                    const iso = toISO(c.date);
                    const isStart = selStart === iso;
                    const isEnd = selEnd === iso;
                    const inRange = !!(selStart && selEnd && iso > selStart && iso < selEnd);
                    let cls = 'h-7 w-7 rounded-full text-xs ';
                    if (isStart || isEnd) {
                      cls += 'bg-[#008A4B] font-bold text-white';
                    } else {
                      cls += !c.inMonth
                        ? 'text-slate-300 hover:bg-slate-50'
                        : ci === 6
                          ? 'text-[#802423] hover:bg-slate-100'
                          : 'text-[#292929] hover:bg-slate-100';
                      if (iso === todayISO) cls += ' font-bold bg-slate-100';
                    }
                    return (
                      <td key={iso} className={`p-px text-center ${inRange ? 'bg-[#E6F4EA]' : ''}`}>
                        <button type="button" onClick={() => onPickDay(iso)} className={cls}>
                          {c.date.getDate()}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

/* -------------------------------------------------------------- popover body */

interface PopoverBodyProps {
  mode: 'single' | 'range';
  initialStart: string | null;
  initialEnd: string | null;
  onApply: (start: string | null, end: string | null) => void;
  onClear: () => void;
  popRef: React.RefObject<HTMLDivElement>;
  style: React.CSSProperties;
  onSizeChange: () => void;
}

const PopoverBody: React.FC<PopoverBodyProps> = ({
  mode,
  initialStart,
  initialEnd,
  onApply,
  onClear,
  popRef,
  style,
  onSizeChange,
}) => {
  const base = parseISO(initialStart) ?? new Date();
  const [viewYear, setViewYear] = useState(base.getFullYear());
  const [viewMonth, setViewMonth] = useState(base.getMonth());
  const [selStart, setSelStart] = useState<string | null>(initialStart);
  const [selEnd, setSelEnd] = useState<string | null>(mode === 'range' ? initialEnd : null);
  const [quickPickSide, setQuickPickSide] = useState<'left' | 'right' | null>(null);
  const [quickPickYear, setQuickPickYear] = useState(base.getFullYear());

  const navMonth = (dir: -1 | 1) => {
    setQuickPickSide(null);
    let m = viewMonth + dir;
    let y = viewYear;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setViewMonth(m);
    setViewYear(y);
  };

  const pickDay = (iso: string) => {
    if (mode === 'single') {
      setSelStart(iso);
      return;
    }
    if (!selStart || (selStart && selEnd)) {
      setSelStart(iso);
      setSelEnd(null);
    } else if (iso < selStart) {
      setSelStart(iso);
      setSelEnd(null);
    } else {
      setSelEnd(iso);
    }
  };

  const rightDate = new Date(viewYear, viewMonth + 1, 1);

  const openQuickPick = (side: 'left' | 'right') => {
    if (quickPickSide === side) {
      setQuickPickSide(null);
    } else {
      setQuickPickSide(side);
      setQuickPickYear(side === 'left' ? viewYear : rightDate.getFullYear());
    }
    onSizeChange();
  };

  const pickMonth = (side: 'left' | 'right', year: number, month: number) => {
    if (side === 'left') {
      setViewYear(year);
      setViewMonth(month);
    } else {
      const leftDate = new Date(year, month - 1, 1);
      setViewYear(leftDate.getFullYear());
      setViewMonth(leftDate.getMonth());
    }
    setQuickPickSide(null);
    onSizeChange();
  };

  const selText =
    mode === 'range'
      ? selStart && selEnd
        ? `${formatVN(selStart)} - ${formatVN(selEnd)}`
        : selStart
          ? `${formatVN(selStart)} - ...`
          : 'Chưa chọn ngày'
      : selStart
        ? formatVN(selStart)
        : 'Chưa chọn ngày';

  const applyDisabled = mode === 'range' && !!selStart && !selEnd;

  return (
    <div ref={popRef} style={style} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
      <div className="flex gap-5">
        <MonthPanel
          year={viewYear}
          month={viewMonth}
          quickPickOpen={quickPickSide === 'left'}
          quickPickYear={quickPickYear}
          onToggleQuickPick={() => openQuickPick('left')}
          onQuickPickYear={(y) => setQuickPickYear(y)}
          onPickMonth={(y, m) => pickMonth('left', y, m)}
          onNav={navMonth}
          selStart={selStart}
          selEnd={selEnd}
          onPickDay={pickDay}
        />
        {mode === 'range' && (
          <MonthPanel
            year={rightDate.getFullYear()}
            month={rightDate.getMonth()}
            quickPickOpen={quickPickSide === 'right'}
            quickPickYear={quickPickYear}
            onToggleQuickPick={() => openQuickPick('right')}
            onQuickPickYear={(y) => setQuickPickYear(y)}
            onPickMonth={(y, m) => pickMonth('right', y, m)}
            onNav={null}
            selStart={selStart}
            selEnd={selEnd}
            onPickDay={pickDay}
          />
        )}
      </div>

      <div className="mt-3.5 flex items-center justify-between gap-3 border-t border-slate-200 pt-3.5">
        <div className="text-[12.5px] text-[#525252]">{selText}</div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => {
              setSelStart(null);
              setSelEnd(null);
              onClear();
            }}
            className="inline-flex h-8 items-center rounded-lg border border-slate-300 bg-white px-3 text-[12.5px] font-medium text-[#292929] hover:bg-slate-50"
          >
            Xóa
          </button>
          <button
            type="button"
            disabled={applyDisabled}
            onClick={() => onApply(selStart, mode === 'range' ? selEnd : null)}
            className="inline-flex h-8 items-center rounded-lg border border-transparent bg-[linear-gradient(90deg,#003F27_0%,#00663D_33%,#009F5F_66%,#22AF73_100%)] px-3 text-[12.5px] font-medium text-white hover:brightness-110 disabled:cursor-default disabled:opacity-40"
          >
            Áp dụng
          </button>
        </div>
      </div>
    </div>
  );
};

/* --------------------------------------------------------------- trigger btn */

const TriggerButton = React.forwardRef<
  HTMLButtonElement,
  { display: string; placeholder: boolean; hasError?: boolean; onClick: () => void }
>(({ display, placeholder, hasError, onClick }, ref) => (
  <button
    ref={ref}
    type="button"
    onClick={onClick}
    className={`${INPUT_CLASS} flex cursor-pointer items-center justify-between gap-2 text-left ${
      hasError ? ERROR_RING : ''
    }`}
  >
    <span className={`truncate ${placeholder ? 'text-slate-400' : ''}`}>{display}</span>
    <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
  </button>
));
TriggerButton.displayName = 'TriggerButton';

/* -------------------------------------------------------------------- public */

interface DateFieldProps {
  /** Ngày đang chọn, `null` khi chưa chọn. */
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  hasError?: boolean;
}

/** Trường một ngày — dùng cho "Lịch làm bù" (không bắt buộc). */
export const DateField: React.FC<DateFieldProps> = ({
  value,
  onChange,
  placeholder = 'Chọn ngày',
  hasError,
}) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { popRef, style, bumpSize } = usePopoverPosition(open, triggerRef);

  useCloseOnOutsideOrEscape(open, () => setOpen(false), wrapRef);

  return (
    <div ref={wrapRef}>
      <TriggerButton
        ref={triggerRef}
        display={value ? formatVN(value) : placeholder}
        placeholder={!value}
        hasError={hasError}
        onClick={() => setOpen((v) => !v)}
      />
      {open && (
        <PopoverBody
          mode="single"
          initialStart={value}
          initialEnd={null}
          popRef={popRef}
          style={style}
          onSizeChange={bumpSize}
          onClear={() => {
            onChange(null);
            setOpen(false);
          }}
          onApply={(start) => {
            onChange(start);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
};

interface DateRangeFieldProps {
  startValue: string | null;
  endValue: string | null;
  onChange: (start: string | null, end: string | null) => void;
  placeholder?: string;
  hasError?: boolean;
}

/** Trường khoảng ngày — dùng cho "Từ ngày - Đến ngày" (bắt buộc, FR-053 AC-053-1). */
export const DateRangeField: React.FC<DateRangeFieldProps> = ({
  startValue,
  endValue,
  onChange,
  placeholder = 'Chọn khoảng ngày',
  hasError,
}) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { popRef, style, bumpSize } = usePopoverPosition(open, triggerRef);

  useCloseOnOutsideOrEscape(open, () => setOpen(false), wrapRef);

  const hasBoth = !!(startValue && endValue);

  return (
    <div ref={wrapRef}>
      <TriggerButton
        ref={triggerRef}
        display={hasBoth ? `${formatVN(startValue)} - ${formatVN(endValue)}` : placeholder}
        placeholder={!hasBoth}
        hasError={hasError}
        onClick={() => setOpen((v) => !v)}
      />
      {open && (
        <PopoverBody
          mode="range"
          initialStart={startValue}
          initialEnd={endValue}
          popRef={popRef}
          style={style}
          onSizeChange={bumpSize}
          onClear={() => {
            onChange(null, null);
            setOpen(false);
          }}
          onApply={(start, end) => {
            onChange(start, end);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
};
