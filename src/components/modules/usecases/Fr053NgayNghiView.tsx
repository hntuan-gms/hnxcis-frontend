/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';

import { findImsUseCaseByCode } from '../../../lib/imsRoutes';
import { exportToCsv } from '../../../lib/exportCsv';
import { DateField, DateRangeField } from './CalendarDatePicker';
import {
  BTN_PRIMARY,
  CatalogPage,
  CatalogToolbar,
  ColumnSpec,
  ConfirmDeleteDialog,
  EmptyRow,
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
import { Fr053HolidayFormModal, HolidayDraft } from './Fr053HolidayFormModal';
import { HOLIDAY_CATEGORIES, HolidayRow, INITIAL_HOLIDAYS } from './fr053HolidayMock';

/**
 * FR-053 · Quản lý khai báo thông tin ngày nghỉ (`docs/prd/fr/FR-053.md`).
 *
 * KHÔNG có tài liệu `docs/srs/[CODE] ...` riêng cho chức năng này, khác với sáu
 * màn hình danh mục còn lại của `usecases/`. Dựng trực tiếp từ FR-053 (mục đích,
 * tính năng, acceptance criteria) và bố cục của `docs/quan-ly-danh-muc_16.html`
 * (`MODULES.ngaynghi`) — file mẫu thứ hai được đối chiếu với bộ màn hình này,
 * sau `docs/quan-ly-danh-muc_2.html`.
 *
 * KHÔNG có ô từ khóa gộp, KHÔNG có Nhập Excel/chọn hàng loạt — giống IMS-015 chứ
 * không giống ba màn Quốc gia/Tỉnh thành/Phường xã: FR-053 mô tả tìm theo đúng
 * bốn tiêu chí có cấu trúc (từ ngày, đến ngày, năm, loại), không phải một ô quét
 * nhiều trường, và file mẫu cũng bỏ hẳn hai nút đó ở màn "Ngày nghỉ" lẫn
 * "Từ điển" — chỉ ba màn danh mục đơn giản mới có.
 *
 * GIAI ĐOẠN NÀY LÀ UI TĨNH. Dữ liệu nằm trong `useState`, chưa gọi API.
 */
const UC = findImsUseCaseByCode('uc_fr_053')!;

const DEFAULT_SORT: SortState = { key: 'createdDate', dir: 'desc' };

function sortValue(row: HolidayRow, key: string): string | number {
  switch (key) {
    case 'category':
      return row.category.toLowerCase();
    case 'fromDate':
      return row.fromDate;
    case 'toDate':
      return row.toDate;
    case 'statusFlg':
      return row.statusFlg;
    default:
      return row.createdDate;
  }
}

/** Không dùng ô từ khóa gộp — bốn tiêu chí riêng bên dưới thay thế nó. */
const searchFields = () => [] as readonly string[];

interface HolidayCriteria {
  readonly category: string;
  readonly fromDate: string;
  readonly toDate: string;
  readonly makeupDate: string;
}

const EMPTY_CRITERIA: HolidayCriteria = { category: 'all', fromDate: '', toDate: '', makeupDate: '' };

/**
 * FR-053: "Tìm kiếm/Xem danh sách (từ ngày, đến ngày, năm, loại)".
 *
 * Một bản ghi khớp khoảng ngày lọc khi khoảng của nó GIAO với khoảng lọc — cùng
 * cách đọc "từ ngày, đến ngày" của một bộ lọc khoảng thời gian thông thường,
 * không phải khớp tuyệt đối từng đầu mút.
 */
function matchesCriteria(row: HolidayRow, c: HolidayCriteria): boolean {
  if (c.category !== 'all' && row.category !== c.category) return false;
  if (c.fromDate && row.toDate < c.fromDate) return false;
  if (c.toDate && row.fromDate > c.toDate) return false;
  if (c.makeupDate && row.makeupDate !== c.makeupDate) return false;
  return true;
}

function formatVN(iso: string | null): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

const COLUMNS: readonly ColumnSpec[] = [
  { key: 'stt', label: 'STT' },
  { key: 'category', label: 'Phân loại' },
  { key: 'fromDate', label: 'Ngày bắt đầu' },
  { key: 'toDate', label: 'Ngày kết thúc' },
  { key: 'makeupDate', label: 'Lịch làm bù' },
  { key: 'status', label: 'Trạng thái' },
];

export const Fr053NgayNghiView: React.FC = () => {
  const [rows, setRows] = useState<HolidayRow[]>(() => [...INITIAL_HOLIDAYS]);

  const [draftCriteria, setDraftCriteria] = useState<HolidayCriteria>(EMPTY_CRITERIA);
  const [appliedCriteria, setAppliedCriteria] = useState<HolidayCriteria>(EMPTY_CRITERIA);

  const scopedRows = rows.filter((r) => matchesCriteria(r, appliedCriteria));

  const list = useCatalogList({
    rows: scopedRows,
    searchFields,
    sortValue,
    defaultSort: DEFAULT_SORT,
  });

  const [formTarget, setFormTarget] = useState<{ row: HolidayRow | null } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HolidayRow | null>(null);

  const { toasts, pushToast } = useToasts();
  const columns = useColumnVisibility(COLUMNS);

  const setCriteria = <K extends keyof HolidayCriteria>(key: K, v: HolidayCriteria[K]) =>
    setDraftCriteria((prev) => ({ ...prev, [key]: v }));

  const applySearch = () => {
    setAppliedCriteria(draftCriteria);
    list.applySearch();
  };

  const recordLabel = (row: HolidayRow) =>
    row.fromDate === row.toDate
      ? `${row.category} (${formatVN(row.fromDate)})`
      : `${row.category} (${formatVN(row.fromDate)} - ${formatVN(row.toDate)})`;

  const saveHoliday = (draft: HolidayDraft) => {
    const editing = formTarget?.row ?? null;
    const now = new Date().toISOString();

    if (editing) {
      setRows((prev) =>
        prev.map((row) =>
          row.id === editing.id
            ? { ...row, ...draft, updatedBy: 'nqt.hnx', updatedDate: now }
            : row,
        ),
      );
      pushToast('success', `Đã cập nhật ngày nghỉ "${draft.category}"`);
    } else {
      const nextId = rows.reduce((max, row) => Math.max(max, row.id), 0) + 1;
      setRows((prev) => [
        {
          id: nextId,
          ...draft,
          activeFlg: 1,
          deleteFlg: 0,
          createdBy: 'nqt.hnx',
          createdDate: now,
        },
        ...prev,
      ]);
      pushToast('success', `Đã thêm mới ngày nghỉ "${draft.category}"`);
    }

    setFormTarget(null);
  };

  /** Xóa mềm: chỉ bật `DELETE_FLG = 1`, không bỏ phần tử khỏi mảng. */
  const deleteHoliday = (row: HolidayRow) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === row.id
          ? { ...r, deleteFlg: 1, updatedBy: 'nqt.hnx', updatedDate: new Date().toISOString() }
          : r,
      ),
    );
    setDeleteTarget(null);
    pushToast('danger', `Đã xóa ngày nghỉ "${row.category}"`);
  };

  const exportRows = () => {
    const visible = scopedRows.filter((r) => r.deleteFlg === 0);
    exportToCsv(
      'danh-muc-ngay-nghi',
      [
        { header: 'Phân loại', value: (r: HolidayRow) => r.category },
        { header: 'Ngày bắt đầu', value: (r: HolidayRow) => formatVN(r.fromDate) },
        { header: 'Ngày kết thúc', value: (r: HolidayRow) => formatVN(r.toDate) },
        { header: 'Lịch làm bù', value: (r: HolidayRow) => formatVN(r.makeupDate) },
        {
          header: 'Trạng thái',
          value: (r: HolidayRow) => (r.statusFlg === 1 ? 'Đang hoạt động' : 'Ngừng hoạt động'),
        },
      ],
      visible,
    );
    pushToast('success', `Xuất dữ liệu thành công (${visible.length} dòng)`);
  };

  return (
    <>
      <CatalogPage
        catalogName={UC.menuLabel}
        heading="Ngày nghỉ"
        subtitle="Quản lý danh sách và tạo mới ngày nghỉ lễ, tết"
        actions={
          <button type="button" onClick={() => setFormTarget({ row: null })} className={BTN_PRIMARY}>
            <Plus className="h-4 w-4" />
            Thêm mới
          </button>
        }
      >
        {/*
          Bốn tiêu chí của FR-053 ("từ ngày, đến ngày, năm, loại"), kết hợp theo
          AND — cùng khuôn với sáu tiêu chí của IMS-015: Enter ở bất kỳ ô nào cũng
          chạy tìm kiếm, không có nút "Tìm kiếm" riêng.
        */}
        <div
          onKeyDown={(e) => {
            if (e.key === 'Enter') applySearch();
          }}
          className="mb-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3"
        >
          <label className="flex items-center gap-2">
            <span className="w-24 shrink-0 text-[13px] text-[#525252]">Phân loại</span>
            <select
              value={draftCriteria.category}
              onChange={(e) => {
                setCriteria('category', e.target.value);
                setAppliedCriteria((prev) => ({ ...prev, category: e.target.value }));
                list.applySearch();
              }}
              className={SELECT_CLASS}
            >
              <option value="all">Tất cả loại</option>
              {HOLIDAY_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2">
            <span className="w-24 shrink-0 text-[13px] text-[#525252]">Từ ngày - Đến ngày</span>
            <DateRangeField
              startValue={draftCriteria.fromDate || null}
              endValue={draftCriteria.toDate || null}
              placeholder="Chọn từ ngày - đến ngày"
              onChange={(start, end) => {
                const next = { ...draftCriteria, fromDate: start ?? '', toDate: end ?? '' };
                setDraftCriteria(next);
                setAppliedCriteria(next);
                list.applySearch();
              }}
            />
          </label>

          <label className="flex items-center gap-2">
            <span className="w-24 shrink-0 text-[13px] text-[#525252]">Lịch làm bù</span>
            <DateField
              value={draftCriteria.makeupDate || null}
              placeholder="Chọn lịch làm bù"
              onChange={(value) => {
                const next = { ...draftCriteria, makeupDate: value ?? '' };
                setDraftCriteria(next);
                setAppliedCriteria(next);
                list.applySearch();
              }}
            />
          </label>
        </div>

        <CatalogToolbar
          status={list.draftStatus}
          onStatus={list.applyStatus}
          columns={columns}
          onExport={exportRows}
        />

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {columns.isVisible('stt') && (
                  <th scope="col" className={`${TH_CLASS} w-15 text-center`}>
                    STT
                  </th>
                )}
                {columns.isVisible('category') && (
                  <SortableTh
                    label="Phân loại"
                    sortKey="category"
                    sort={list.sort}
                    onSort={list.changeSort}
                  />
                )}
                {columns.isVisible('fromDate') && (
                  <SortableTh
                    label="Ngày bắt đầu"
                    sortKey="fromDate"
                    sort={list.sort}
                    onSort={list.changeSort}
                  />
                )}
                {columns.isVisible('toDate') && (
                  <SortableTh
                    label="Ngày kết thúc"
                    sortKey="toDate"
                    sort={list.sort}
                    onSort={list.changeSort}
                  />
                )}
                {columns.isVisible('makeupDate') && (
                  <th scope="col" className={TH_CLASS}>
                    Lịch làm bù
                  </th>
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
                <EmptyRow
                  colSpan={columns.visibleCount + 1}
                  title="Không tìm thấy dữ liệu"
                  hint="Thử điều chỉnh các tiêu chí tìm kiếm"
                />
              ) : (
                list.pageRows.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-[#F8FAFC]">
                    {columns.isVisible('stt') && (
                      <td className={`${TD_CLASS} text-center text-slate-500`}>
                        {list.startIdx + idx + 1}
                      </td>
                    )}
                    {columns.isVisible('category') && (
                      <td className={`${TD_CLASS} font-medium`}>{row.category}</td>
                    )}
                    {columns.isVisible('fromDate') && (
                      <td className={TD_CLASS}>{formatVN(row.fromDate)}</td>
                    )}
                    {columns.isVisible('toDate') && <td className={TD_CLASS}>{formatVN(row.toDate)}</td>}
                    {columns.isVisible('makeupDate') && (
                      <td className={TD_CLASS}>
                        {row.makeupDate ? (
                          formatVN(row.makeupDate)
                        ) : (
                          <span className="text-slate-400">Không có</span>
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
                        title={`Sửa ${row.category}`}
                        aria-label={`Sửa ${row.category}`}
                        className="mr-0.5 inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(row)}
                        title={`Xóa ${row.category}`}
                        aria-label={`Xóa ${row.category}`}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-[#802423]/10 hover:text-[#802423]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
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
        <Fr053HolidayFormModal
          editing={formTarget.row}
          onCancel={() => setFormTarget(null)}
          onSave={saveHoliday}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteDialog
          recordLabel={recordLabel(deleteTarget)}
          note="Bản ghi được xóa mềm (DELETE_FLG = 1) và không còn hiển thị trong danh sách."
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => deleteHoliday(deleteTarget)}
        />
      )}

      <ToastStack toasts={toasts} />
    </>
  );
};
