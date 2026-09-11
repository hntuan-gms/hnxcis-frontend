/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Inbox,
  Search,
  SlidersHorizontal,
  Trash2,
  Upload,
  X,
} from 'lucide-react';

import { CatalogRecord, Flag, STATUS_OPTIONS } from './catalogTypes';

/**
 * Các thành phần giao diện dùng chung cho màn hình quản lý danh mục.
 *
 * Đây là bản dịch sang Tailwind của các class trong `docs/quan-ly-danh-muc_2.html`
 * (`.badge`, `th.sortable`, `.table-footer`, `.pagination`, `.modal`, `.field`,
 * `.toast`, `.empty-state`). Gom vào một file vì bảy màn hình danh mục trong
 * `docs/srs/` dùng chung đúng bộ này: dựng lại từng màn hình một sẽ tạo bảy chỗ
 * để lệch màu badge và lệch logic phân trang.
 *
 * Ở đây CHỈ có phần trình bày — không có dữ liệu, không có luật nghiệp vụ. Luật
 * của từng danh mục nằm ở màn hình tương ứng.
 */

/*
 * BẢNG MÀU — Figma chuẩn, áp riêng cho /ims.
 *
 *   Primary          #008A4B  nút chính, số trang đang chọn, ring khi focus
 *   Primary hover    #00733E  hover của nút chính
 *   Sidebar          #004D28  nền sidebar /ims (đặt ở Sidebar.tsx)
 *   Sidebar active   #006B38  khối bo góc của mục menu đang chọn
 *   Success          #E6F4EA nền · #1E7A42 chữ/dot — badge "Đang hoạt động"
 *   Warning          #FDF1E0 nền · #B9691B chữ/dot — badge "Ngừng hoạt động"
 *   Danger           #802423  nút Xóa, viền trường lỗi, chữ lỗi, icon toast lỗi
 *   Text Primary     #292929  chữ chính, nhãn, ô nhập, tiêu đề bảng
 *   Text Secondary   #525252  chữ phụ, chân bảng phân trang
 *   Canvas           #EBEBEB  nền trang (đặt ở App.tsx)
 *
 * Dải xanh olive cũ (`hnx-*` trong `index.css`: #123a0a → #6fae55) KHÔNG còn
 * dùng ở /ims. Không sửa `index.css` vì 23 file module khác đang dựa vào nó —
 * đổi ở đó là đổi màu cả /icds. Vì vậy hex viết thẳng vào className; Tailwind
 * quét chuỗi trong mã nguồn nên không thể đưa vào hằng số rồi nội suy.
 *
 * Success/Warning giờ có mã nền RIÊNG (#E6F4EA / #FDF1E0) thay vì lấy màu chữ ở
 * 10% như trước. Đo thực tế: #1E7A42 trên #E6F4EA đạt 4,72:1 — qua chuẩn WCAG AA
 * cho chữ nhỏ, so với 2,25:1 của cặp màu cũ. Nhưng #B9691B trên #FDF1E0 chỉ đạt
 * 3,69:1, CHƯA đạt AA cho chữ 12px; đây là mã màu do thiết kế chốt nên giữ nguyên,
 * đã báo lại để cân nhắc làm đậm màu chữ badge "Ngừng hoạt động".
 */

/* ------------------------------------------------------------------ input */

/**
 * Class dùng chung cho input/select/textarea trong form (`.field input` ở file
 * mẫu). Xuất ra dưới dạng chuỗi class thay vì bọc thành component: bọc lại chỉ
 * để đặt className sẽ chắn mất các thuộc tính gốc (maxLength, autoFocus,
 * inputMode...) mà form nào cũng cần.
 */
export const INPUT_CLASS =
  'w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-[13px] text-[#292929] outline-none ' +
  'focus:border-[#008A4B] focus:ring-3 focus:ring-[#008A4B]/20';

export const SELECT_CLASS = `${INPUT_CLASS} cursor-pointer pr-8`;

export const TEXTAREA_CLASS =
  'w-full min-h-19 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-[13px] text-[#292929] ' +
  'outline-none resize-y focus:border-[#008A4B] focus:ring-3 focus:ring-[#008A4B]/20';

/** Viền đỏ khi trường có lỗi (`.field.has-error` ở file mẫu). */
export const ERROR_RING = 'border-[#802423] focus:border-[#802423] focus:ring-[#802423]/15';

/* ------------------------------------------------------------------ button */

export const BTN_BASE =
  'inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-lg text-[13px] font-medium ' +
  'whitespace-nowrap border transition-colors disabled:opacity-40 disabled:cursor-default';

export const BTN_PRIMARY = `${BTN_BASE} border-transparent bg-[linear-gradient(90deg,#003F27_0%,#00663D_33%,#009F5F_66%,#22AF73_100%)] text-white hover:brightness-110 shadow-xs`;
export const BTN_OUTLINE = `${BTN_BASE} border-slate-300 bg-white text-[#292929] hover:bg-slate-50`;
export const BTN_DANGER = `${BTN_BASE} border-transparent bg-[#802423] text-white hover:bg-[#802423]`;
/** `.btn-ghost` của file mẫu — dùng cho hành động phụ như "Bỏ chọn". */
export const BTN_GHOST = `${BTN_BASE} border-transparent bg-transparent text-[#525252] hover:bg-slate-100`;

/* ------------------------------------------------------------------ badge */

/**
 * Pill trạng thái hoạt động của một mục danh mục.
 *
 * KHÔNG dùng `common/StatusBadge` ở đây: component đó phục vụ các picklist
 * nghiệp vụ (trạng thái chứng khoán, hồ sơ CBTT, diện giám sát) với hàng chục mã
 * riêng. Trạng thái danh mục chỉ là cờ bật/tắt một bản ghi cấu hình — nhồi nó
 * vào cùng một switch sẽ trộn hai khái niệm không liên quan.
 */
export const StatusPill: React.FC<{ active: boolean }> = ({ active }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
      active ? 'bg-[#E6F4EA] text-[#1E7A42]' : 'bg-[#FDF1E0] text-[#B9691B]'
    }`}
  >
    <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-[#1E7A42]' : 'bg-[#B9691B]'}`} />
    {active ? 'Đang hoạt động' : 'Ngừng hoạt động'}
  </span>
);

/* ------------------------------------------------------------------ table */

export const TH_CLASS =
  'px-3 py-2.5 text-left text-[13px] font-semibold text-[#292929] border-b border-slate-200 whitespace-nowrap';

export const TD_CLASS = 'px-3 py-3.5 text-sm text-[#292929] border-b border-slate-100 align-top';

export interface SortState {
  readonly key: string;
  readonly dir: 'asc' | 'desc';
}

/**
 * Bấm một lần sắp xếp tăng, bấm lại cột đó thì đảo chiều — không có trạng thái
 * thứ ba "bỏ sắp xếp", vì danh sách luôn phải có một thứ tự xác định (SRS: mặc
 * định mới nhất theo CREATED_DATE).
 */
export function nextSort(current: SortState | null, key: string): SortState {
  if (current && current.key === key) {
    return { key, dir: current.dir === 'asc' ? 'desc' : 'asc' };
  }
  return { key, dir: 'asc' };
}

interface SortableThProps {
  label: string;
  sortKey: string;
  sort: SortState | null;
  onSort: (key: string) => void;
  className?: string;
}

export const SortableTh: React.FC<SortableThProps> = ({
  label,
  sortKey,
  sort,
  onSort,
  className = '',
}) => {
  const sorted = sort !== null && sort.key === sortKey;
  const dir = sorted ? sort.dir : null;

  return (
    <th
      scope="col"
      aria-sort={dir === null ? 'none' : dir === 'asc' ? 'ascending' : 'descending'}
      className={`${TH_CLASS} ${className}`}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex cursor-pointer select-none items-center gap-1.5 hover:text-[#008A4B]"
      >
        {label}
        {dir === null && <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 opacity-60" />}
        {dir === 'asc' && <ArrowUp className="h-3.5 w-3.5 text-[#008A4B]" />}
        {dir === 'desc' && <ArrowDown className="h-3.5 w-3.5 text-[#008A4B]" />}
      </button>
    </th>
  );
};

export const EmptyRow: React.FC<{ colSpan: number; title: string; hint: string }> = ({
  colSpan,
  title,
  hint,
}) => (
  <tr>
    <td colSpan={colSpan}>
      <div className="px-5 py-15 text-center text-slate-500">
        <Inbox className="mx-auto mb-2.5 h-10 w-10 opacity-50" />
        <div className="mb-1 text-sm font-medium text-[#525252]">{title}</div>
        <div className="text-[13px]">{hint}</div>
      </div>
    </td>
  </tr>
);

/* --------------------------------------------------- hiển thị / ẩn cột */

/**
 * Một cột có thể bật/tắt trên menu `Columns` của thanh công cụ.
 *
 * `key` là khóa nội bộ do màn hình tự đặt (không nhất thiết trùng khóa sắp xếp);
 * `label` là nhãn hiện trên menu, nên viết y như nhãn trên đầu bảng để người
 * dùng nhận ra mình đang tắt cột nào.
 */
export interface ColumnSpec {
  readonly key: string;
  readonly label: string;
}

export interface ColumnVisibility {
  readonly specs: readonly ColumnSpec[];
  readonly isVisible: (key: string) => boolean;
  /** Số cột dữ liệu đang hiện — dùng cho `colSpan` của dòng "không có dữ liệu". */
  readonly visibleCount: number;
  readonly toggle: (key: string) => void;
  readonly showAll: () => void;
}

/**
 * Trạng thái ẩn/hiện cột của MỘT bảng.
 *
 * Chỉ là chuyện trình bày: cột bị ẩn vẫn nằm trong dữ liệu, vẫn được tìm kiếm và
 * vẫn ra file khi bấm Xuất File — người dùng ẩn cột để đọc bảng cho gọn, không
 * phải để loại dữ liệu.
 *
 * Không lưu xuống localStorage: file mẫu cũng chỉ giữ trong phiên, và lưu lại sẽ
 * làm người dùng mở màn hình lần sau thấy thiếu cột mà không hiểu vì sao.
 */
export function useColumnVisibility(specs: readonly ColumnSpec[]): ColumnVisibility {
  const [hidden, setHidden] = useState<readonly string[]>([]);

  const isVisible = useCallback((key: string) => !hidden.includes(key), [hidden]);

  return {
    specs,
    isVisible,
    visibleCount: specs.filter((c) => isVisible(c.key)).length,
    toggle: (key: string) =>
      setHidden((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key])),
    showAll: () => setHidden([]),
  };
}

/**
 * Nút `Columns` + menu tick chọn cột, đúng như `.columns-menu` của file mẫu.
 *
 * Cột cuối cùng còn hiện thì bị chặn không cho tắt: một bảng chỉ còn cột "Hành
 * động" là một bảng vô nghĩa.
 */
/**
 * Đóng một menu thả xuống khi bấm ra ngoài hoặc nhấn Esc.
 *
 * Dùng chung cho mọi dropdown không có lớp phủ (`Columns`, lọc trạng thái...) —
 * nếu không tự đóng, chúng sẽ nằm chắn trên bảng suốt cả phiên làm việc.
 */
export function useCloseOnOutsideOrEscape(
  open: boolean,
  onClose: () => void,
  ref: React.RefObject<HTMLElement>,
) {
  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, ref]);
}

export const ColumnsButton: React.FC<{ columns: ColumnVisibility }> = ({ columns }) => {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useCloseOnOutsideOrEscape(open, () => setOpen(false), boxRef);

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className={BTN_OUTLINE}
      >
        <SlidersHorizontal className="h-4 w-4" />
        Cột
        <ChevronDown className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-1.5 max-h-80 w-55 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
          <div className="px-2 pt-1.5 pb-1 text-xs font-semibold text-slate-500">Hiển thị cột</div>

          {columns.specs.map((col) => {
            const shown = columns.isVisible(col.key);
            return (
              <label
                key={col.key}
                className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] text-[#292929] hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={shown}
                  disabled={shown && columns.visibleCount <= 1}
                  onChange={() => columns.toggle(col.key)}
                  className="h-3.5 w-3.5 cursor-pointer accent-[#008A4B]"
                />
                {col.label}
              </label>
            );
          })}

          <div className="mx-1 my-1.5 h-px bg-slate-200" />
          <button
            type="button"
            onClick={columns.showAll}
            className="w-full rounded-md px-2 py-1.5 text-left text-[12.5px] text-[#525252] hover:bg-slate-50 hover:text-[#292929]"
          >
            Hiển thị tất cả
          </button>
        </div>
      )}
    </div>
  );
};

/* --------------------------------------------------------- thanh công cụ */

/** Giá trị của ô lọc trạng thái; `'all'` là không lọc. */
export type StatusValue = 'all' | Flag;

/**
 * Nút + menu lọc trạng thái, thay cho `<select>` thường.
 *
 * Bản dịch của `.status-select-btn`/`.status-menu` trong file mẫu: mỗi lựa chọn
 * có một chấm màu (xám/xanh/vàng) để nhận trạng thái ngay trong menu, không phải
 * đợi đọc chữ. Về hành vi thì tương đương hệt `<select>` cũ — đổi là lọc ngay,
 * không cần bấm thêm nút nào — nên các màn hình gọi `CatalogToolbar` không phải
 * đổi gì khi component này thay thế `<select>` bên trong.
 */
const STATUS_FILTER_OPTIONS: ReadonlyArray<{ value: StatusValue; label: string; dotClass: string }> = [
  { value: 'all', label: 'Tất cả trạng thái', dotClass: 'bg-slate-300' },
  ...STATUS_OPTIONS.map((opt) => ({
    value: opt.value,
    label: opt.label,
    dotClass: opt.value === 1 ? 'bg-[#1E7A42]' : 'bg-[#B9691B]',
  })),
];

const StatusFilterDropdown: React.FC<{ value: StatusValue; onChange: (value: StatusValue) => void }> = ({
  value,
  onChange,
}) => {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useCloseOnOutsideOrEscape(open, () => setOpen(false), boxRef);

  const current = STATUS_FILTER_OPTIONS.find((o) => o.value === value) ?? STATUS_FILTER_OPTIONS[0];

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Lọc theo trạng thái"
        className="inline-flex h-9 items-center justify-between gap-2.5 rounded-lg border border-slate-300 bg-white px-3 text-[13px] text-[#292929] hover:border-slate-400"
      >
        {current.label}
        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
      </button>

      {open && (
        <div className="absolute left-0 z-30 mt-1.5 w-50 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] ${
                opt.value === value
                  ? 'bg-[#E6F4EA] font-medium text-[#1E7A42]'
                  : 'text-[#292929] hover:bg-slate-50'
              }`}
            >
              <span className={`h-1.75 w-1.75 shrink-0 rounded-full ${opt.dotClass}`} />
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

interface CatalogToolbarProps {
  /**
   * Ô từ khóa. Bỏ trống ba prop này khi màn hình không dùng một ô tìm kiếm gộp
   * (IMS-015 có sáu tiêu chí riêng thay cho nó).
   */
  keyword?: string;
  onKeyword?: (value: string) => void;
  searchPlaceholder?: string;
  /** Chạy tìm kiếm — gọi khi nhấn Enter hoặc bấm vào kính lúp. */
  onSearch?: () => void;
  /** Ô lọc trạng thái. Đổi là lọc ngay, không cần bấm thêm nút nào. */
  status: StatusValue;
  onStatus: (value: StatusValue) => void;
  columns: ColumnVisibility;
  onExport: () => void;
  /**
   * Hiện nút "Nhập Excel" — LUÔN Ở TRẠNG THÁI MỜ.
   *
   * Nạp hàng loạt cần thư viện đọc .xlsx và cần backend validate từng dòng
   * trước khi ghi — chưa có ở giai đoạn UI tĩnh này. Bốn màn hình danh mục dùng
   * chung đúng một nút mờ với đúng một câu giải thích, thay vì màn hình giả vờ
   * đọc được file (tự phân tích .xlsx ngay trên trình duyệt mà không ai validate
   * dữ liệu) trong khi ba màn khác lại không có gì.
   */
  showImportExcel?: boolean;
  /** Bộ lọc riêng của màn hình, xếp cùng hàng bên trái (VD: Tỉnh/Thành). */
  children?: React.ReactNode;
}

/**
 * Một hàng ngang duy nhất: bộ lọc dồn bên trái, `Columns` và `Xuất File` dồn bên
 * phải — theo `.filters-row` của `docs/quan-ly-danh-muc_2.html`.
 *
 * KHÔNG còn hai nút "Tìm kiếm" / "Làm mới" như bản trước. Luật của SRS ("danh
 * sách chỉ lọc lại khi bấm Tìm kiếm hoặc Enter") vẫn giữ nguyên cho ô từ khóa:
 * gõ dở dang không làm bảng nhảy, Enter hoặc bấm kính lúp mới lọc. Riêng các ô
 * chọn (trạng thái, cấp cha) lọc ngay khi đổi, vì một dropdown không có trạng
 * thái "đang gõ dở" để phải chờ.
 */
export const CatalogToolbar: React.FC<CatalogToolbarProps> = ({
  keyword,
  onKeyword,
  searchPlaceholder,
  onSearch,
  status,
  onStatus,
  columns,
  onExport,
  showImportExcel,
  children,
}) => (
  <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5">
    <div className="flex flex-1 flex-wrap items-center gap-2.5">
      {keyword !== undefined && onKeyword && (
        <div className="flex h-9 min-w-65 flex-1 items-center gap-2 rounded-lg border border-slate-300 bg-[#F9FAFB] px-3 sm:max-w-85">
          <button
            type="button"
            onClick={onSearch}
            aria-label="Tìm kiếm"
            title="Tìm kiếm (Enter)"
            className="shrink-0 text-slate-400 hover:text-[#008A4B]"
          >
            <Search className="h-4 w-4" />
          </button>
          <input
            type="text"
            value={keyword}
            onChange={(e) => onKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSearch?.();
            }}
            placeholder={searchPlaceholder}
            aria-label="Từ khóa tìm kiếm"
            className="w-full border-none bg-transparent text-[13px] text-[#292929] outline-none placeholder:text-slate-400"
          />
        </div>
      )}

      {children}

      <StatusFilterDropdown value={status} onChange={onStatus} />
    </div>

    <div className="flex shrink-0 items-center gap-2.5">
      <ColumnsButton columns={columns} />

      {showImportExcel && (
        <button
          type="button"
          disabled
          title="Cần backend để đọc và validate file — chưa khả dụng ở giai đoạn UI tĩnh"
          className={BTN_OUTLINE}
        >
          <Upload className="h-4 w-4" />
          Nhập Excel
        </button>
      )}

      <button type="button" onClick={onExport} className={BTN_OUTLINE}>
        <Download className="h-4 w-4" />
        Xuất File
      </button>
    </div>
  </div>
);

/* ---------------------------------------------------------- breadcrumb */

/**
 * Cấp đầu của breadcrumb — hằng số, giống nhau ở cả bảy màn hình.
 *
 * Đây là nhóm menu đang chứa bảy màn hình này ở sidebar, nên breadcrumb đọc
 * đúng như đường người dùng vừa bấm để tới đây.
 */
const CATALOG_ROOT = 'Quản lý danh mục';

/**
 * Breadcrumb hai cấp: `Quản lý danh mục › <tên danh mục>`.
 *
 * Lấy nguyên `.breadcrumb` của `docs/quan-ly-danh-muc_2.html`:
 *
 *     <div class="breadcrumb">Quản lý danh mục <span>›</span>
 *       <span class="current">Quốc gia</span></div>
 *
 *     .breadcrumb          { font-size:12px; gap:6px; margin-bottom:16px }
 *     .breadcrumb .current { color: <đậm hơn chặng đầu> }
 *
 * ĐÚNG HAI CẤP. Bản trước dùng đường dẫn ba cấp của SRS §2.1 ("Quản lý Hệ thống
 * → Danh mục dùng chung → Quốc gia"), dài gần gấp đôi và có cấp giữa không tương
 * ứng với bất kỳ mục nào trên sidebar — bấm vào cũng chẳng đi đâu được. Hai cấp
 * khớp đúng cây menu thật: nhóm `Quản lý Danh mục` rồi tới màn hình.
 *
 * `mx-1.5` = 6px mỗi bên dấu phân cách, đúng bằng `gap:6px` của file mẫu. Màu cơ
 * bản đặt ở `<nav>` để chặng đầu và dấu `›` cùng tông; chỉ chặng cuối ghi đè —
 * đúng cách file mẫu dựng bằng `.breadcrumb` + `.current`.
 */
export const CatalogBreadcrumb: React.FC<{ current: string }> = ({ current }) => (
  <nav aria-label="Đường dẫn" className="mb-4 flex items-center text-xs text-slate-500">
    <span>{CATALOG_ROOT}</span>
    {/* `aria-hidden`: dấu trang trí, trình đọc màn hình không cần đọc "›". */}
    <span aria-hidden="true" className="mx-1.5">
      ›
    </span>
    <span aria-current="page" className="font-medium text-slate-800">
      {current}
    </span>
  </nav>
);

/* --------------------------------------------------------- khung màn hình */

interface CatalogPageProps {
  /**
   * Tên danh mục — chặng cuối của breadcrumb.
   *
   * Truyền `UC.menuLabel` để đúng một chuỗi lo cả nhãn sidebar và chặng cuối
   * breadcrumb; hai chỗ đó luôn phải đọc giống nhau vì cùng chỉ một màn hình.
   */
  catalogName: string;
  heading: string;
  /** Câu mô tả dưới tiêu đề. Nhận ReactNode để màn hình gắn thêm chip kỹ thuật. */
  subtitle: React.ReactNode;
  /** Nút hành động chính của màn hình (Thêm mới, Import...). */
  actions: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Khung chung của bảy màn hình danh mục: đệm `p-6`, thẻ trắng bo góc `rounded-xl`,
 * breadcrumb, rồi hàng tiêu đề + nút hành động.
 *
 * Trước đây bảy màn hình tự dựng lại đúng bộ này — bảy chỗ để lệch đệm, lệch bo
 * góc và lệch cỡ chữ tiêu đề.
 */
export const CatalogPage: React.FC<CatalogPageProps> = ({
  catalogName,
  heading,
  subtitle,
  actions,
  children,
}) => (
  <div className="p-6">
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <CatalogBreadcrumb current={catalogName} />

      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#292929]">{heading}</h1>
          <p className="mt-1 text-[13px] text-[#525252]">{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">{actions}</div>
      </div>

      {children}
    </div>
  </div>
);

/* -------------------------------------------------------------- phân trang */

/**
 * Dãy số trang có dấu `…` khi nhiều trang, theo đúng cách file mẫu dựng: luôn
 * giữ trang đầu và trang cuối, cộng thêm một trang mỗi bên trang hiện tại.
 */
export function pageItems(page: number, totalPages: number): Array<number | 'gap'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const items: Array<number | 'gap'> = [1];
  if (page > 3) items.push('gap');
  for (let p = Math.max(2, page - 1); p <= Math.min(totalPages - 1, page + 1); p += 1) {
    items.push(p);
  }
  if (page < totalPages - 2) items.push('gap');
  items.push(totalPages);
  return items;
}

interface TablePagerProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
}

export const TablePager: React.FC<TablePagerProps> = ({
  page,
  totalPages,
  total,
  pageSize,
  onPage,
  onPageSize,
}) => (
  <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3.5">
    <div className="text-[13px] text-[#525252]">Tổng danh sách : {total}</div>

    <div className="flex items-center gap-3.5 text-[13px] text-[#525252]">
      <label className="flex items-center gap-2">
        Hiển thị
        <select
          value={pageSize}
          onChange={(e) => onPageSize(Number(e.target.value))}
          className="h-8 cursor-pointer rounded-md border border-slate-300 bg-slate-100 px-2 text-[13px] text-[#525252]"
        >
          {[10, 20, 50].map((n) => (
            <option key={n} value={n}>
              {n} bản ghi
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          aria-label="Trang trước"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#525252] hover:bg-slate-100 disabled:cursor-default disabled:opacity-35 disabled:hover:bg-transparent"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {pageItems(page, totalPages).map((item, idx) =>
          item === 'gap' ? (
            <span key={`gap-${idx}`} className="px-0.5 text-slate-500">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPage(item)}
              aria-current={item === page ? 'page' : undefined}
              className={`h-7 min-w-7 rounded-md px-1.5 text-[13px] ${
                item === page
                  ? 'bg-[#008A4B] font-semibold text-white'
                  : 'bg-slate-100 text-[#525252] hover:bg-slate-200'
              }`}
            >
              {item}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          aria-label="Trang sau"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#525252] hover:bg-slate-100 disabled:cursor-default disabled:opacity-35 disabled:hover:bg-transparent"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
);

/* ------------------------------------------------------------------- modal */

interface ModalShellProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
  /** Popup xác nhận hẹp hơn popup form (`.confirm-modal .modal` ở file mẫu). */
  width?: 'form' | 'confirm';
}

export const ModalShell: React.FC<ModalShellProps> = ({
  title,
  onClose,
  children,
  footer,
  width = 'form',
}) => {
  // Esc đóng popup — bàn phím là cách nhanh nhất để thoát, và người nhập liệu
  // danh mục cả ngày sẽ dùng nó thay vì đưa tay ra chuột.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`max-h-[calc(100vh-3rem)] w-full overflow-y-auto rounded-xl bg-white shadow-2xl ${
          width === 'confirm' ? 'max-w-95' : 'max-w-110'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3 className="text-base font-semibold text-[#292929]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-[#292929]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {children}

        <div className="flex justify-end gap-2.5 border-t border-slate-200 px-5 py-4">{footer}</div>
      </div>
    </div>
  );
};

/** Thân popup xác nhận xóa — dùng chung cho xóa một dòng và xóa nhiều dòng. */
const ConfirmDeleteBody: React.FC<{ message: React.ReactNode; note: string }> = ({ message, note }) => (
  <div className="flex gap-3.5 px-5 pt-5 pb-1.5">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#802423]/10 text-[#802423]">
      <AlertTriangle className="h-5 w-5" />
    </div>
    <div>
      <div className="mb-1 text-sm font-semibold text-[#292929]">{message}</div>
      <div className="text-[13px] text-slate-500">{note}</div>
    </div>
  </div>
);

interface ConfirmDeleteDialogProps {
  /** Tên bản ghi, để người dùng thấy rõ mình đang xóa cái gì. */
  recordLabel: string;
  note: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ConfirmDeleteDialog: React.FC<ConfirmDeleteDialogProps> = ({
  recordLabel,
  note,
  onCancel,
  onConfirm,
}) => (
  <ModalShell
    title="Xóa bản ghi"
    onClose={onCancel}
    width="confirm"
    footer={
      <>
        <button type="button" className={BTN_OUTLINE} onClick={onCancel}>
          Hủy
        </button>
        <button type="button" className={BTN_DANGER} onClick={onConfirm}>
          Xóa
        </button>
      </>
    }
  >
    <ConfirmDeleteBody message={<>Bạn có chắc chắn muốn xóa “{recordLabel}”?</>} note={note} />
  </ModalShell>
);

interface ConfirmDeleteManyDialogProps {
  /** Số dòng đang được chọn để xóa. */
  count: number;
  note: string;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Xác nhận xóa hàng loạt — cùng khung với `ConfirmDeleteDialog`, chỉ khác câu
 * hỏi (số lượng thay vì tên một bản ghi). Theo đúng file mẫu: xóa nhiều dùng lại
 * y hệt popup xóa một dòng, không phải một luồng riêng.
 */
export const ConfirmDeleteManyDialog: React.FC<ConfirmDeleteManyDialogProps> = ({
  count,
  note,
  onCancel,
  onConfirm,
}) => (
  <ModalShell
    title="Xóa bản ghi"
    onClose={onCancel}
    width="confirm"
    footer={
      <>
        <button type="button" className={BTN_OUTLINE} onClick={onCancel}>
          Hủy
        </button>
        <button type="button" className={BTN_DANGER} onClick={onConfirm}>
          Xóa
        </button>
      </>
    }
  >
    <ConfirmDeleteBody
      message={`Bạn có chắc chắn muốn xóa ${count} bản ghi đã chọn?`}
      note={note}
    />
  </ModalShell>
);

/* --------------------------------------------------------- chọn hàng loạt */

/**
 * Trạng thái chọn nhiều dòng để xóa hàng loạt, theo `.bulk-bar` của file mẫu.
 *
 * `activeRows` phải là tập bản ghi CÒN HỢP LỆ để chọn (đã lọc `deleteFlg === 0`
 * ở màn hình gọi) — hook tự rớt khỏi lựa chọn những id không còn trong tập này,
 * để thanh hành động không đếm nhầm dòng vừa bị xóa mềm bởi nút Xóa từng dòng.
 *
 * "Chọn tất cả" chỉ áp cho TRANG ĐANG XEM, đúng hành vi của file mẫu — không
 * phải toàn bộ kết quả lọc, nên `isAllSelected`/`toggleAll` nhận `pageRows` làm
 * tham số thay vì tự biết toàn bộ danh sách.
 */
export interface BulkSelection {
  readonly count: number;
  readonly selectedIds: ReadonlySet<number>;
  isSelected(id: number): boolean;
  toggle(id: number): void;
  isAllSelected(pageRows: readonly { id: number }[]): boolean;
  toggleAll(pageRows: readonly { id: number }[]): void;
  clear(): void;
}

export function useBulkSelection<T extends CatalogRecord>(activeRows: readonly T[]): BulkSelection {
  const [selected, setSelected] = useState<ReadonlySet<number>>(new Set());

  useEffect(() => {
    setSelected((prev) => {
      if (prev.size === 0) return prev;
      const validIds = new Set(activeRows.map((r) => r.id));
      const next = new Set([...prev].filter((id) => validIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [activeRows]);

  return {
    count: selected.size,
    selectedIds: selected,
    isSelected: (id) => selected.has(id),
    toggle: (id) =>
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    isAllSelected: (pageRows) => pageRows.length > 0 && pageRows.every((r) => selected.has(r.id)),
    toggleAll: (pageRows) =>
      setSelected((prev) => {
        const allSelected = pageRows.length > 0 && pageRows.every((r) => prev.has(r.id));
        const next = new Set(prev);
        pageRows.forEach((r) => (allSelected ? next.delete(r.id) : next.add(r.id)));
        return next;
      }),
    clear: () => setSelected(new Set()),
  };
}

/** Checkbox đầu bảng — đặt trong `<th>`/`<td>` của màn hình gọi. */
export const BULK_CHECKBOX_CLASS = 'h-4 w-4 cursor-pointer accent-[#008A4B]';

interface BulkActionBarProps {
  count: number;
  onClear: () => void;
  onDelete: () => void;
}

/**
 * Thanh "Đã chọn N mục" — theo `.bulk-bar` của file mẫu. Tự ẩn khi chưa chọn
 * dòng nào, giống cách `ToastStack` tự ẩn khi rỗng — màn hình gọi không cần tự
 * kiểm tra `count > 0` trước khi render.
 */
export const BulkActionBar: React.FC<BulkActionBarProps> = ({ count, onClear, onDelete }) => {
  if (count === 0) return null;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2.5 rounded-lg border border-[#22AF73] bg-[#E6F4EA] px-3.5 py-2 text-[13px] text-[#1E7A42]">
      <span>
        Đã chọn <b className="font-bold">{count}</b> mục
      </span>
      <div className="flex-1" />
      <button type="button" onClick={onClear} className={BTN_GHOST}>
        Bỏ chọn
      </button>
      <button type="button" onClick={onDelete} className={BTN_DANGER}>
        <Trash2 className="h-4 w-4" />
        Xóa đã chọn
      </button>
    </div>
  );
};

/* ------------------------------------------------------------------- field */

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  required,
  error,
  hint,
  children,
}) => (
  <div>
    <label className="mb-1.5 block text-[13px] font-medium text-[#292929]">
      {label}
      {required && <span className="ml-0.5 text-[#802423]">*</span>}
    </label>
    {children}
    {error ? (
      <p className="mt-1 text-xs text-[#802423]">{error}</p>
    ) : (
      hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>
    )}
  </div>
);

/* ------------------------------------------------------------------- toast */

export type ToastKind = 'success' | 'danger';

export interface ToastItem {
  readonly id: number;
  readonly kind: ToastKind;
  readonly message: string;
}

/**
 * Toast tự tắt sau ~2,6 giây, đúng như file mẫu. SRS yêu cầu "hiển thị thông báo
 * Lưu thành công theo tài liệu quy chuẩn hệ thống" — đây là phần hiển thị đó.
 */
export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef<number[]>([]);

  // Rời màn hình khi toast chưa tắt thì timer còn treo và sẽ setState trên một
  // component đã unmount.
  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t));
    },
    [],
  );

  const pushToast = useCallback((kind: ToastKind, message: string) => {
    const id = nextId.current;
    nextId.current += 1;

    setToasts((prev) => [...prev, { id, kind, message }]);
    timers.current.push(
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 2600),
    );
  }, []);

  return { toasts, pushToast };
}

export const ToastStack: React.FC<{ toasts: readonly ToastItem[] }> = ({ toasts }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-100 flex flex-col gap-2" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="flex min-w-60 items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-4 py-3 text-[13px] text-[#292929] shadow-md"
        >
          {t.kind === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#1E7A42]" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0 text-[#802423]" />
          )}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
};
