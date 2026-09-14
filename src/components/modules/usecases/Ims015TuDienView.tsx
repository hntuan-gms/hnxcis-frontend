/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';

import { findImsUseCaseByCode } from '../../../lib/imsRoutes';
import { exportToCsv } from '../../../lib/exportCsv';
import {
  BTN_PRIMARY,
  CatalogPage,
  CatalogToolbar,
  ColumnSpec,
  ConfirmDeleteDialog,
  EmptyRow,
  INPUT_CLASS,
  SELECT_CLASS,
  SortState,
  SortableTh,
  StatusPill,
  TD_CLASS,
  TH_CLASS,
  TablePager,
  ToastStack,
  useColumnVisibility,
  useToasts,
} from './catalogUi';
import { useCatalogList } from './useCatalogList';
import { DictionaryDraft, Ims015DictionaryFormModal } from './Ims015DictionaryFormModal';
import {
  ALL_DICTIONARY_ROWS,
  DICTIONARY_GROUPS,
  LookupValueRow,
  dictionaryGroupLabel,
} from './lookupValuesMock';

/**
 * SRS: `docs/srs/[IMS-015] Quản lý, khai báo dữ liệu từ điển v0.8.md`
 *
 * Màn hình quản trị của cả bảng `LOOKUP_VALUES` — khác hẳn HNX-SRS và IMS-008,
 * mỗi màn hình đó chỉ quản lý MỘT `LOV_GROUP` cố định. Ở đây "Loại" (`LOV_GROUP`)
 * là một cột trên danh sách, một tiêu chí tìm kiếm, và một trường nhập trong
 * popup — nên màn hình này đọc `ALL_DICTIONARY_ROWS`, hợp của mọi nhóm.
 *
 * IMS-013 — QUẢN LÝ DANH MỤC THÀNH VIÊN THỊ TRƯỜNG
 *
 * `docs/srs/` không có file IMS-013, và cụm "IMS-013" cũng như "Thành viên thị
 * trường" không xuất hiện lần nào trong tài liệu IMS-015. Cách hiểu khớp với
 * những gì tài liệu nói: Thành viên thị trường là MỘT NHÓM từ điển
 * (`LOV_GROUP = 'MARKET_MEMBER'`) được quản lý ngay trong màn hình này, chọn qua
 * ô lọc "Loại" — không phải một màn hình riêng. Xem `lookupValuesMock.ts`.
 *
 * GIAI ĐOẠN NÀY LÀ UI TĨNH. Dữ liệu nằm trong `useState`, chưa gọi API.
 */
const UC = findImsUseCaseByCode('uc_ims_015')!;

/**
 * Sắp xếp mặc định.
 *
 * Bảng 04/05 của IMS-015 KHÔNG nêu thứ tự mặc định (khác HNX-SRS và IMS-008, hai
 * tài liệu đó ghi rõ "sắp xếp theo Ngày cập nhật"). Dùng ngày cập nhật giảm dần
 * cho khớp với hai màn hình cùng chạy trên bảng này.
 */
const DEFAULT_SORT: SortState = { key: 'updatedDate', dir: 'desc' };

function sortValue(row: LookupValueRow, key: string): string | number {
  switch (key) {
    case 'code':
      return row.code.toLowerCase();
    case 'value':
      return row.value.toLowerCase();
    case 'lovGroup':
      return row.lovGroup.toLowerCase();
    case 'displayOrder':
      // Bản ghi chưa đặt thứ tự phải xuống cuối khi sắp tăng dần, nên coi null là
      // vô cùng lớn thay vì 0 — 0 sẽ đẩy chúng lên đầu như thể được ưu tiên nhất.
      return row.displayOrder ?? Number.MAX_SAFE_INTEGER;
    case 'description':
      return row.description.toLowerCase();
    case 'statusFlg':
      return row.statusFlg;
    default:
      // Bản ghi chưa từng sửa thì không có UPDATED_DATE; lấy ngày tạo thay thế.
      return row.updatedDate ?? row.createdDate;
  }
}

/**
 * Sáu tiêu chí tìm kiếm của Bảng 04 (mục "Mô tả tiêu chí tìm kiếm").
 *
 * Khác hẳn sáu màn hình trước: chúng có MỘT ô từ khóa quét nhiều trường, còn ở
 * đây tài liệu đặc tả sáu ô riêng biệt, kết hợp theo AND.
 */
export interface DictionaryCriteria {
  readonly code: string;
  readonly value: string;
  readonly lovGroup: string;
  readonly displayOrder: string;
  /** Bảng 04 dòng 6: "Single select" — lọc theo một bản ghi cha cụ thể. */
  readonly parentId: string;
  readonly description: string;
}

export const EMPTY_CRITERIA: DictionaryCriteria = {
  code: '',
  value: '',
  lovGroup: 'all',
  displayOrder: '',
  parentId: 'all',
  description: '',
};

/** Áp sáu tiêu chí theo AND; ô để trống thì bỏ qua tiêu chí đó. Export để kiểm thử. */
export function matchesCriteria(row: LookupValueRow, c: DictionaryCriteria): boolean {
  const like = (haystack: string, needle: string) =>
    needle.trim() === '' || haystack.toLowerCase().includes(needle.trim().toLowerCase());

  if (!like(row.code, c.code)) return false;
  if (!like(row.value, c.value)) return false;
  if (!like(row.description, c.description)) return false;
  if (c.lovGroup !== 'all' && row.lovGroup !== c.lovGroup) return false;
  if (c.parentId !== 'all' && String(row.lookupParentId ?? '') !== c.parentId) return false;

  if (c.displayOrder.trim() !== '') {
    // Thứ tự là số nên so khớp chính xác, không "chứa" — tìm 1 mà ra cả 1, 10, 21
    // thì tiêu chí này vô dụng.
    if (String(row.displayOrder ?? '') !== c.displayOrder.trim()) return false;
  }

  return true;
}

/**
 * `useCatalogList` vẫn lo lọc trạng thái, sắp xếp, phân trang và xóa mềm. Ô từ
 * khóa của hook không dùng ở màn hình này (sáu tiêu chí đã thay thế nó) nên
 * `searchFields` trả về mảng rỗng — hook tự bỏ qua khi từ khóa trống.
 */
const searchFields = () => [] as readonly string[];

/**
 * Cột bật/tắt được trên menu `Columns`.
 *
 * Thứ tự lấy đúng theo bảng "Từ điển" của file mẫu
 * `docs/quan-ly-danh-muc_2.html`: Loại đứng trước Mã, vì màn hình này quản lý
 * mọi `LOV_GROUP` nên nhóm là thứ người dùng định vị bản ghi bằng trước tiên.
 */
const COLUMNS: readonly ColumnSpec[] = [
  { key: 'stt', label: 'STT' },
  { key: 'lovGroup', label: 'Loại' },
  { key: 'code', label: 'Mã' },
  { key: 'value', label: 'Giá trị' },
  { key: 'order', label: 'Thứ tự sắp xếp' },
  { key: 'parent', label: 'Loại cha' },
  { key: 'description', label: 'Mô tả' },
  { key: 'status', label: 'Trạng thái' },
];

export const Ims015TuDienView: React.FC = () => {
  const [rows, setRows] = useState<LookupValueRow[]>(() => [...ALL_DICTIONARY_ROWS]);

  /**
   * Sáu tiêu chí có state riêng, tách khỏi `useCatalogList`, nhưng vẫn theo cùng
   * một luật: `draft` là những gì đang nhập, `applied` là điều kiện đang lọc.
   * Bảng 05 (nút Tìm kiếm) quy định danh sách chỉ lọc lại khi bấm Tìm kiếm.
   */
  const [draftCriteria, setDraftCriteria] = useState<DictionaryCriteria>(EMPTY_CRITERIA);
  const [appliedCriteria, setAppliedCriteria] = useState<DictionaryCriteria>(EMPTY_CRITERIA);

  /** Thu hẹp tập bản ghi TRƯỚC khi đưa vào hook, giống cách IMS-004 lọc tỉnh cha. */
  const scopedRows = useMemo(
    () => rows.filter((r) => matchesCriteria(r, appliedCriteria)),
    [rows, appliedCriteria],
  );

  const list = useCatalogList({
    rows: scopedRows,
    searchFields,
    sortValue,
    defaultSort: DEFAULT_SORT,
  });

  /** `null` = popup đóng; `{ row: null }` = thêm mới; `{ row }` = sửa. */
  const [formTarget, setFormTarget] = useState<{ row: LookupValueRow | null } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LookupValueRow | null>(null);

  const { toasts, pushToast } = useToasts();

  const columns = useColumnVisibility(COLUMNS);

  /** Tra nhãn bản ghi cha để hiển thị — tra trong TOÀN BỘ bảng. */
  const parentLabelOf = (parentId: number | null) => {
    if (parentId === null) return null;
    const parent = rows.find((r) => r.id === parentId);
    return parent ? `${parent.code} — ${parent.value}` : `#${parentId}`;
  };

  /**
   * Nguồn cho ô chọn cha trong popup.
   *
   * Lọc theo luật SRS cho trường tham chiếu (`DELETE_FLG = 0`, `ACTIVE_FLG = 1`)
   * và loại chính bản ghi đang sửa — một bản ghi không thể là cha của chính nó.
   */
  const parentOptions = useMemo(() => {
    const editingId = formTarget?.row?.id;
    return rows.filter((r) => r.deleteFlg === 0 && r.activeFlg === 1 && r.id !== editingId);
  }, [rows, formTarget]);

  /** Các bản ghi đang được dùng làm cha, cho ô lọc "Loại cha". */
  const parentFilterOptions = useMemo(() => {
    const usedIds = new Set(
      rows.filter((r) => r.deleteFlg === 0 && r.lookupParentId !== null).map((r) => r.lookupParentId),
    );
    return rows.filter((r) => usedIds.has(r.id));
  }, [rows]);

  /* ------------------------------------------------------------- thao tác */

  const setCriteria = <K extends keyof DictionaryCriteria>(key: K, v: DictionaryCriteria[K]) =>
    setDraftCriteria((prev) => ({ ...prev, [key]: v }));

  const applySearch = () => {
    setAppliedCriteria(draftCriteria);
    list.applySearch();
  };

  /**
   * Bỏ hết sáu tiêu chí và các điều kiện của hook.
   *
   * "Làm mới" KHÔNG có trong Bảng 05 (chỉ có Thêm, Sửa, Xóa, Tìm kiếm, Import,
   * Export) và thanh công cụ theo file mẫu cũng không có nút này, nên hàm hiện
   * không có chỗ gọi. Giữ lại: đây là chỗ duy nhất biết phải đặt lại cả sáu tiêu
   * chí lẫn điều kiện của hook cùng lúc, và một màn hình sáu ô lọc thì sớm muộn
   * cũng cần lối xóa nhanh.
   */
  const resetFilters = () => {
    setDraftCriteria(EMPTY_CRITERIA);
    setAppliedCriteria(EMPTY_CRITERIA);
    list.resetFilters();
  };

  const saveRow = (draft: DictionaryDraft) => {
    const editing = formTarget?.row ?? null;
    // Prototype chưa có backend nên mốc thời gian lấy từ đồng hồ máy; bản ghi
    // thật sẽ do CSDL đóng dấu CREATED_DATE/UPDATED_DATE.
    const now = new Date().toISOString();

    if (editing) {
      setRows((prev) =>
        prev.map((row) =>
          row.id === editing.id
            ? {
                ...row,
                ...draft,
                // §4.1 của LOOKUP_VALUES không có cột trạng thái nào; giữ
                // activeFlg khớp statusFlg ở đúng một chỗ này để không lệch nhau.
                activeFlg: draft.statusFlg,
                updatedBy: 'nqt.hnx',
                updatedDate: now,
              }
            : row,
        ),
      );
      pushToast('success', `Lưu thành công: “${draft.value}”`);
    } else {
      const nextId = rows.reduce((max, row) => Math.max(max, row.id), 0) + 1;
      setRows((prev) => [
        {
          id: nextId,
          ...draft,
          menusId: null,
          activeFlg: draft.statusFlg,
          deleteFlg: 0,
          createdBy: 'nqt.hnx',
          createdDate: now,
        },
        ...prev,
      ]);
      pushToast('success', `Lưu thành công: “${draft.value}”`);
    }

    setFormTarget(null);
  };

  /**
   * Số bản ghi đang trỏ tới `row` làm cha.
   *
   * Bảng 05 (nút Xóa): "Nếu xóa thất bại (VD: đang được sử dụng): hiển thị thông
   * báo lỗi tương ứng". Trong phạm vi dữ liệu của màn hình này, "đang được sử
   * dụng" kiểm được chính là quan hệ cha–con: xóa bản ghi cha sẽ để lại các bản
   * ghi con trỏ vào một id không còn tồn tại.
   */
  const childCountOf = (row: LookupValueRow) =>
    rows.filter((r) => r.deleteFlg === 0 && r.lookupParentId === row.id).length;

  /** Xóa mềm: chỉ bật `DELETE_FLG = 1`, không bỏ phần tử khỏi mảng. */
  const deleteRow = (row: LookupValueRow) => {
    const children = childCountOf(row);
    if (children > 0) {
      setDeleteTarget(null);
      pushToast(
        'danger',
        `Không xóa được “${row.value}”: đang được ${children} bản ghi khác dùng làm loại cha`,
      );
      return;
    }

    setRows((prev) =>
      prev.map((r) =>
        r.id === row.id
          ? {
              ...r,
              deleteFlg: 1,
              activeFlg: 0,
              statusFlg: 0,
              updatedBy: 'nqt.hnx',
              updatedDate: new Date().toISOString(),
            }
          : r,
      ),
    );
    setDeleteTarget(null);
    pushToast('danger', `Xóa thành công: “${row.value}”`);
  };

  /**
   * Bảng 05 yêu cầu "Export Excel". Repo chưa có thư viện .xlsx nào, và theo
   * CLAUDE.md việc kết xuất .xlsx đúng định dạng là phần việc của Report Engine ở
   * backend. Ở đây xuất CSV có BOM UTF-8 qua `lib/exportCsv.ts` — Excel mở trực
   * tiếp và đúng tiếng Việt.
   *
   * Xuất theo `scopedRows` (đã lọc, chưa cắt trang) chứ không phải trang hiện
   * tại: người dùng bấm Export sau khi lọc là muốn cả kết quả lọc.
   */
  const exportRows = () => {
    const visible = scopedRows.filter((r) => r.deleteFlg === 0);
    exportToCsv('tu-dien-du-lieu', [
      { header: 'Mã', value: (r: LookupValueRow) => r.code },
      { header: 'Giá trị', value: (r: LookupValueRow) => r.value },
      { header: 'Loại', value: (r: LookupValueRow) => r.lovGroup },
      { header: 'Thứ tự sắp xếp', value: (r: LookupValueRow) => r.displayOrder ?? '' },
      { header: 'Loại cha', value: (r: LookupValueRow) => parentLabelOf(r.lookupParentId) ?? '' },
      { header: 'Mô tả', value: (r: LookupValueRow) => r.description },
      {
        header: 'Trạng thái',
        value: (r: LookupValueRow) => (r.statusFlg === 1 ? 'Đang hoạt động' : 'Ngừng hoạt động'),
      },
    ], visible);
    pushToast('success', `Xuất dữ liệu thành công (${visible.length} dòng)`);
  };

  /* --------------------------------------------------------------- render */

  return (
    <>
      <CatalogPage
        catalogName={UC.menuLabel}
        heading="Từ điển dữ liệu"
        subtitle={
          <>
            Quản lý và khai báo dữ liệu từ điển cho toàn bộ hệ thống
            <span className="ml-2 rounded-sm bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-medium text-[#525252]">
              {DICTIONARY_GROUPS.length} nhóm LOV_GROUP
            </span>
          </>
        }
        actions={
          <button type="button" onClick={() => setFormTarget({ row: null })} className={BTN_PRIMARY}>
            <Plus className="h-4 w-4" />
            Thêm
          </button>
        }
      >
        {/*
          Sáu tiêu chí tìm kiếm của Bảng 04, kết hợp theo AND.
          Enter ở bất kỳ ô nào cũng chạy tìm kiếm — thanh công cụ không còn nút
          "Tìm kiếm" riêng, nên câu nhắc dưới đây là chỗ duy nhất nói ra luật này.
        */}
        <div
          onKeyDown={(e) => {
            if (e.key === 'Enter') applySearch();
          }}
          className="mb-2 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3"
        >
          <label className="flex items-center gap-2">
            <span className="w-18 shrink-0 text-[13px] text-[#525252]">Mã</span>
            <input
              type="text"
              value={draftCriteria.code}
              onChange={(e) => setCriteria('code', e.target.value)}
              placeholder="Nhập mã"
              className={INPUT_CLASS}
            />
          </label>

          <label className="flex items-center gap-2">
            <span className="w-18 shrink-0 text-[13px] text-[#525252]">Giá trị</span>
            <input
              type="text"
              value={draftCriteria.value}
              onChange={(e) => setCriteria('value', e.target.value)}
              placeholder="Nhập giá trị"
              className={INPUT_CLASS}
            />
          </label>

          <label className="flex items-center gap-2">
            <span className="w-18 shrink-0 text-[13px] text-[#525252]">Loại</span>
            <select
              value={draftCriteria.lovGroup}
              onChange={(e) => setCriteria('lovGroup', e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="all">Tất cả nhóm từ điển</option>
              {DICTIONARY_GROUPS.map((g) => (
                <option key={g.code} value={g.code}>
                  {g.label} ({g.code})
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2">
            <span className="w-18 shrink-0 text-[13px] text-[#525252]">Thứ tự sắp xếp</span>
            <input
              type="number"
              min={0}
              value={draftCriteria.displayOrder}
              onChange={(e) => setCriteria('displayOrder', e.target.value)}
              placeholder="Nhập thứ tự sắp xếp"
              className={INPUT_CLASS}
            />
          </label>

          <label className="flex items-center gap-2">
            <span className="w-18 shrink-0 text-[13px] text-[#525252]">Loại cha</span>
            <select
              value={draftCriteria.parentId}
              onChange={(e) => setCriteria('parentId', e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="all">Tất cả</option>
              {parentFilterOptions.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.code} — {p.value}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2">
            <span className="w-18 shrink-0 text-[13px] text-[#525252]">Mô tả</span>
            <input
              type="text"
              value={draftCriteria.description}
              onChange={(e) => setCriteria('description', e.target.value)}
              placeholder="Nhập mô tả"
              className={INPUT_CLASS}
            />
          </label>
        </div>

        <p className="mb-3 text-xs text-slate-500">
          Nhấn <span className="font-semibold text-[#525252]">Enter</span> ở bất kỳ ô nào để áp dụng
          các tiêu chí trên.
        </p>

        <CatalogToolbar
          status={list.draftStatus}
          onStatus={list.applyStatus}
          columns={columns}
          onExport={exportRows}
        />

        {/* Bảng danh sách — bảy cột theo Bảng 04, thêm cột Trạng thái. */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {columns.isVisible('stt') && (
                  <th scope="col" className={`${TH_CLASS} w-15 text-center`}>
                    STT
                  </th>
                )}
                {columns.isVisible('lovGroup') && (
                  <SortableTh
                    label="Loại"
                    sortKey="lovGroup"
                    sort={list.sort}
                    onSort={list.changeSort}
                  />
                )}
                {columns.isVisible('code') && (
                  <SortableTh label="Mã" sortKey="code" sort={list.sort} onSort={list.changeSort} />
                )}
                {columns.isVisible('value') && (
                  <SortableTh
                    label="Giá trị"
                    sortKey="value"
                    sort={list.sort}
                    onSort={list.changeSort}
                  />
                )}
                {columns.isVisible('order') && (
                  <SortableTh
                    label="Thứ tự sắp xếp"
                    sortKey="displayOrder"
                    sort={list.sort}
                    onSort={list.changeSort}
                  />
                )}
                {columns.isVisible('parent') && (
                  <th scope="col" className={TH_CLASS}>
                    Loại cha
                  </th>
                )}
                {columns.isVisible('description') && (
                  <SortableTh
                    label="Mô tả"
                    sortKey="description"
                    sort={list.sort}
                    onSort={list.changeSort}
                  />
                )}
                {columns.isVisible('status') && (
                  <th scope="col" className={TH_CLASS}>
                    Trạng thái
                  </th>
                )}
                <th scope="col" className={TH_CLASS}>
                  Hành động
                </th>
              </tr>
            </thead>

            <tbody>
              {list.pageRows.length === 0 ? (
                /* Bảng 05 (nút Tìm kiếm): thông báo là "Không tìm thấy dữ liệu". */
                <EmptyRow
                  colSpan={columns.visibleCount + 1}
                  title="Không tìm thấy dữ liệu"
                  hint="Thử điều chỉnh các tiêu chí tìm kiếm"
                />
              ) : (
                list.pageRows.map((row, idx) => {
                  const parentLabel = parentLabelOf(row.lookupParentId);

                  return (
                    <tr key={row.id} className="hover:bg-[#F8FAFC]">
                      {columns.isVisible('stt') && (
                        <td className={`${TD_CLASS} text-center text-slate-500`}>
                          {list.startIdx + idx + 1}
                        </td>
                      )}

                      {columns.isVisible('lovGroup') && (
                        <td className={`${TD_CLASS} whitespace-nowrap`}>
                          <div className="font-mono text-xs">{row.lovGroup}</div>
                          <div className="text-xs text-slate-500">
                            {dictionaryGroupLabel(row.lovGroup)}
                          </div>
                        </td>
                      )}

                      {columns.isVisible('code') && (
                        <td className={`${TD_CLASS} font-semibold whitespace-nowrap`}>{row.code}</td>
                      )}

                      {columns.isVisible('value') && <td className={TD_CLASS}>{row.value}</td>}

                      {columns.isVisible('order') && (
                        <td className={`${TD_CLASS} whitespace-nowrap`}>
                          {row.displayOrder ?? <span className="text-slate-400">—</span>}
                        </td>
                      )}

                      {columns.isVisible('parent') && (
                        <td className={TD_CLASS}>
                          {parentLabel ?? <span className="text-slate-400">—</span>}
                        </td>
                      )}

                      {columns.isVisible('description') && (
                        <td className={TD_CLASS}>
                          {row.description ? (
                            row.description
                          ) : (
                            <span className="text-slate-400">Chưa có mô tả</span>
                          )}
                        </td>
                      )}

                      {columns.isVisible('status') && (
                        <td className={TD_CLASS}>
                          <StatusPill active={row.statusFlg === 1} />
                        </td>
                      )}

                      <td className={`${TD_CLASS} whitespace-nowrap`}>
                        <button
                          type="button"
                          onClick={() => setFormTarget({ row })}
                          title={`Sửa ${row.value}`}
                          aria-label={`Sửa ${row.value}`}
                          className="mr-0.5 inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteTarget(row)}
                          title={`Xóa ${row.value}`}
                          aria-label={`Xóa ${row.value}`}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-[#802423]/10 hover:text-[#802423]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <TablePager
          page={list.page}
          totalPages={list.totalPages}
          total={list.total}
          pageSize={list.pageSize}
          onPage={list.setPage}
          onPageSize={list.changePageSize}
        />
      </CatalogPage>

      {formTarget && (
        <Ims015DictionaryFormModal
          editing={formTarget.row}
          groupOptions={DICTIONARY_GROUPS}
          defaultGroup={
            appliedCriteria.lovGroup === 'all' ? DICTIONARY_GROUPS[0].code : appliedCriteria.lovGroup
          }
          allRows={rows}
          parentOptions={parentOptions}
          onCancel={() => setFormTarget(null)}
          onSave={saveRow}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteDialog
          recordLabel={`${deleteTarget.code} — ${deleteTarget.value}`}
          note={
            childCountOf(deleteTarget) > 0
              ? `Bản ghi đang được ${childCountOf(deleteTarget)} bản ghi khác dùng làm loại cha — hệ thống sẽ từ chối xóa.`
              : 'SRS không cho xóa cứng: bản ghi chỉ bị vô hiệu hóa và ẩn khỏi danh sách.'
          }
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => deleteRow(deleteTarget)}
        />
      )}

      <ToastStack toasts={toasts} />
    </>
  );
};
