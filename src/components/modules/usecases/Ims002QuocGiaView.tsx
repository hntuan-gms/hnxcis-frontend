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
  BULK_CHECKBOX_CLASS,
  BulkActionBar,
  CatalogPage,
  CatalogToolbar,
  ColumnSpec,
  ConfirmDeleteDialog,
  ConfirmDeleteManyDialog,
  EmptyRow,
  SortState,
  SortableTh,
  StatusPill,
  TD_CLASS,
  TH_CLASS,
  TablePager,
  ToastStack,
  useBulkSelection,
  useColumnVisibility,
  useToasts,
} from './catalogUi';
import { useCatalogList } from './useCatalogList';
import { CountryDraft, Ims002CountryFormModal } from './Ims002CountryFormModal';
import { CountryRow, INITIAL_COUNTRIES } from './ims002CountryMock';

/**
 * SRS: `docs/srs/[IMS-002] Quản lý danh mục Quốc gia.md`
 *
 * Màn hình "Danh sách Quốc gia" (List View) + popup "Thêm mới/Cập nhật" theo SRS
 * §2.2 và §2.4. Bố cục lấy từ file mẫu `docs/quan-ly-danh-muc_2.html`: breadcrumb
 * → tiêu đề + nút Thêm mới → hàng bộ lọc → bảng → chân bảng phân trang.
 *
 * GIAI ĐOẠN NÀY LÀ UI TĨNH. Toàn bộ dữ liệu nằm trong `useState`, chưa gọi API.
 * Các endpoint đã có trong SRS §5.2 (`POST /lookup-values/search`,
 * `POST /lookup-values`, `PUT /lookup-values/{id}`) sẽ thay bốn hàm xử lý bên
 * dưới mà không phải sửa phần hiển thị.
 */
const UC = findImsUseCaseByCode('uc_ims_002')!;

/**
 * Sắp xếp mặc định: mới nhất theo CREATED_DATE (SRS Bảng 04, mục "Sắp xếp").
 * Đây là thứ tự khi người dùng chưa bấm vào cột nào.
 */
const DEFAULT_SORT: SortState = { key: 'createdDate', dir: 'desc' };

/** Giá trị dùng để so sánh khi sắp xếp, theo từng cột của bảng. */
function sortValue(row: CountryRow, key: string): string | number {
  switch (key) {
    case 'countryCd':
      return row.countryCd.toLowerCase();
    case 'countryName':
      return row.countryNameVi.toLowerCase();
    case 'description':
      return row.description.toLowerCase();
    case 'statusFlg':
      return row.statusFlg;
    default:
      return row.createdDate;
  }
}

/**
 * Các trường được gộp vào tìm kiếm từ khóa.
 *
 * SRS nói tìm theo mã và tên. Gộp thêm mô tả vì đó là cột đang hiển thị và người
 * dùng sẽ tìm bằng những gì họ nhìn thấy.
 */
const searchFields = (row: CountryRow) => [
  row.countryCd,
  row.countryNameVi,
  row.countryNameEn,
  row.description,
];

/**
 * Các cột bật/tắt được trên menu `Columns`.
 *
 * Nhãn theo file mẫu `docs/quan-ly-danh-muc_2.html` (`Mã`, `Giá trị`) chứ không
 * phải "Mã Quốc gia"/"Tên Quốc gia" như bản trước: bảy màn hình danh mục dùng
 * chung một khuôn, tên danh mục đã nằm ở tiêu đề trang nên nhắc lại trên từng
 * đầu cột chỉ làm bảng chật thêm.
 *
 * "Hành động" KHÔNG có trong danh sách này — tắt nó đi thì không còn sửa/xóa
 * được bản ghi nào.
 */
const COLUMNS: readonly ColumnSpec[] = [
  { key: 'stt', label: 'STT' },
  { key: 'code', label: 'Mã' },
  { key: 'name', label: 'Giá trị' },
  { key: 'description', label: 'Mô tả' },
  { key: 'status', label: 'Trạng thái' },
];

export const Ims002QuocGiaView: React.FC = () => {
  const [countries, setCountries] = useState<CountryRow[]>(() => [...INITIAL_COUNTRIES]);

  /**
   * Lọc, sắp xếp, phân trang và luật "chỉ tìm khi bấm Tìm kiếm/Enter" nằm ở
   * `useCatalogList` — dùng chung với IMS-003 và IMS-004.
   */
  const list = useCatalogList({
    rows: countries,
    searchFields,
    sortValue,
    defaultSort: DEFAULT_SORT,
  });

  /** `null` = popup đóng; `{ row: null }` = thêm mới; `{ row }` = sửa. */
  const [formTarget, setFormTarget] = useState<{ row: CountryRow | null } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CountryRow | null>(null);

  const { toasts, pushToast } = useToasts();

  const columns = useColumnVisibility(COLUMNS);

  /**
   * Chọn nhiều dòng để xóa hàng loạt (theo file mẫu, không có trong SRS).
   *
   * `activeRows` là tập bản ghi chưa xóa mềm — hook tự rớt id khỏi lựa chọn khi
   * dòng đó bị xóa (kể cả xóa bằng nút Sửa/Xóa của từng dòng, không chỉ khi xóa
   * hàng loạt).
   */
  const activeCountries = useMemo(() => countries.filter((r) => r.deleteFlg === 0), [countries]);
  const bulk = useBulkSelection(activeCountries);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  /* ------------------------------------------------------------ thao tác */

  const saveCountry = (draft: CountryDraft) => {
    const editing = formTarget?.row ?? null;
    // Prototype chưa có backend nên mốc thời gian lấy từ đồng hồ máy; bản ghi
    // thật sẽ do CSDL đóng dấu CREATED_DATE/UPDATED_DATE.
    const now = new Date().toISOString();

    if (editing) {
      setCountries((prev) =>
        prev.map((row) =>
          row.id === editing.id
            ? { ...row, ...draft, updatedBy: 'nqt.hnx', updatedDate: now }
            : row,
        ),
      );
      pushToast('success', `Đã cập nhật quốc gia “${draft.countryNameVi}”`);
    } else {
      const nextId = countries.reduce((max, row) => Math.max(max, row.id), 0) + 1;
      setCountries((prev) => [
        {
          id: nextId,
          ...draft,
          // Bản ghi mới mặc định hoạt động và chưa bị xóa (SRS §4.1).
          activeFlg: 1,
          deleteFlg: 0,
          createdBy: 'nqt.hnx',
          createdDate: now,
        },
        ...prev,
      ]);
      pushToast('success', `Đã thêm mới quốc gia “${draft.countryNameVi}”`);
    }

    setFormTarget(null);
  };

  /** Xóa mềm: chỉ bật `DELETE_FLG = 1`, không bỏ phần tử khỏi mảng. */
  const deleteCountry = (row: CountryRow) => {
    setCountries((prev) =>
      prev.map((r) =>
        r.id === row.id
          ? { ...r, deleteFlg: 1, updatedBy: 'nqt.hnx', updatedDate: new Date().toISOString() }
          : r,
      ),
    );
    setDeleteTarget(null);
    pushToast('danger', `Đã xóa quốc gia “${row.countryNameVi}”`);
  };

  /** Xóa mềm hàng loạt — cùng một luật với xóa từng dòng, chỉ áp cho nhiều id cùng lúc. */
  const deleteManyCountries = () => {
    const ids = bulk.selectedIds;
    const now = new Date().toISOString();
    setCountries((prev) =>
      prev.map((r) =>
        ids.has(r.id) ? { ...r, deleteFlg: 1, updatedBy: 'nqt.hnx', updatedDate: now } : r,
      ),
    );
    pushToast('danger', `Đã xóa ${ids.size} bản ghi`);
    bulk.clear();
    setBulkDeleteConfirm(false);
  };

  /**
   * Xuất File — CSV có BOM UTF-8 qua `lib/exportCsv.ts`, Excel mở trực tiếp là
   * đúng tiếng Việt.
   *
   * Xuất theo `list.visibleRows`: toàn bộ kết quả lọc, KHÔNG phải mười dòng đang
   * nhìn thấy và cũng không phải các cột đang bật — người dùng lọc rồi bấm xuất
   * là muốn cả kết quả lọc, còn ẩn cột chỉ là cho dễ đọc trên màn hình.
   */
  const exportRows = () => {
    exportToCsv(
      'danh-muc-quoc-gia',
      [
        { header: 'Mã', value: (r: CountryRow) => r.countryCd },
        { header: 'Tên (VI)', value: (r: CountryRow) => r.countryNameVi },
        { header: 'Tên (EN)', value: (r: CountryRow) => r.countryNameEn },
        { header: 'Mô tả', value: (r: CountryRow) => r.description },
        {
          header: 'Trạng thái',
          value: (r: CountryRow) => (r.statusFlg === 1 ? 'Đang hoạt động' : 'Ngừng hoạt động'),
        },
      ],
      [...list.visibleRows],
    );
    pushToast('success', `Xuất dữ liệu thành công (${list.visibleRows.length} dòng)`);
  };

  /* -------------------------------------------------------------- render */

  return (
    <>
      <CatalogPage
        catalogName={UC.menuLabel}
        heading="Quốc gia"
        subtitle="Quản lý danh sách và tạo mới quốc gia"
        actions={
          <button type="button" onClick={() => setFormTarget({ row: null })} className={BTN_PRIMARY}>
            <Plus className="h-4 w-4" />
            Thêm mới
          </button>
        }
      >
        <CatalogToolbar
          keyword={list.draftKeyword}
          onKeyword={list.setDraftKeyword}
          onSearch={list.applySearch}
          searchPlaceholder="Tìm kiếm Mã, Giá trị..."
          status={list.draftStatus}
          onStatus={list.applyStatus}
          columns={columns}
          onExport={exportRows}
          showImportExcel
        />

        <BulkActionBar
          count={bulk.count}
          onClear={bulk.clear}
          onDelete={() => setBulkDeleteConfirm(true)}
        />

        {/* Bảng danh sách — các cột theo SRS Bảng 04. */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th scope="col" className={`${TH_CLASS} w-10 text-center`}>
                  <input
                    type="checkbox"
                    checked={bulk.isAllSelected(list.pageRows)}
                    onChange={() => bulk.toggleAll(list.pageRows)}
                    aria-label="Chọn tất cả dòng trên trang này"
                    className={BULK_CHECKBOX_CLASS}
                  />
                </th>
                {columns.isVisible('stt') && (
                  <th scope="col" className={`${TH_CLASS} w-15 text-center`}>
                    STT
                  </th>
                )}
                {columns.isVisible('code') && (
                  <SortableTh
                    label="Mã"
                    sortKey="countryCd"
                    sort={list.sort}
                    onSort={list.changeSort}
                  />
                )}
                {columns.isVisible('name') && (
                  <SortableTh
                    label="Giá trị"
                    sortKey="countryName"
                    sort={list.sort}
                    onSort={list.changeSort}
                  />
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
                  <SortableTh
                    label="Trạng thái"
                    sortKey="statusFlg"
                    sort={list.sort}
                    onSort={list.changeSort}
                  />
                )}
                <th scope="col" className={TH_CLASS}>
                  Hành động
                </th>
              </tr>
            </thead>

            <tbody>
              {list.pageRows.length === 0 ? (
                <EmptyRow
                  colSpan={columns.visibleCount + 2}
                  title="Không tìm thấy dữ liệu"
                  hint="Thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm"
                />
              ) : (
                list.pageRows.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-[#F8FAFC]">
                    <td className={`${TD_CLASS} text-center`}>
                      <input
                        type="checkbox"
                        checked={bulk.isSelected(row.id)}
                        onChange={() => bulk.toggle(row.id)}
                        aria-label={`Chọn ${row.countryNameVi}`}
                        className={BULK_CHECKBOX_CLASS}
                      />
                    </td>
                    {columns.isVisible('stt') && (
                      <td className={`${TD_CLASS} text-center text-slate-500`}>
                        {list.startIdx + idx + 1}
                      </td>
                    )}

                    {columns.isVisible('code') && (
                      <td className={`${TD_CLASS} font-semibold whitespace-nowrap`}>
                        {row.countryCd}
                      </td>
                    )}

                    {columns.isVisible('name') && (
                      <td className={TD_CLASS}>
                        <div>{row.countryNameVi}</div>
                        {/*
                          SRS Bảng 04 chỉ có một cột "Tên Quốc gia" nhưng CSDL lưu
                          cả tên VI và EN. Hiện tên EN thành dòng phụ để không phải
                          thêm cột ngoài đặc tả mà vẫn thấy đủ dữ liệu.
                        */}
                        <div className="text-xs text-slate-500">{row.countryNameEn}</div>
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
                        title={`Sửa ${row.countryNameVi}`}
                        aria-label={`Sửa ${row.countryNameVi}`}
                        className="mr-0.5 inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteTarget(row)}
                        title={`Xóa ${row.countryNameVi}`}
                        aria-label={`Xóa ${row.countryNameVi}`}
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
        <Ims002CountryFormModal
          editing={formTarget.row}
          existingCodes={countries
            .filter((r) => r.deleteFlg === 0 && r.id !== formTarget.row?.id)
            .map((r) => r.countryCd)}
          onCancel={() => setFormTarget(null)}
          onSave={saveCountry}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteDialog
          recordLabel={`${deleteTarget.countryCd} — ${deleteTarget.countryNameVi}`}
          note="Bản ghi được xóa mềm (DELETE_FLG = 1) và không còn hiển thị trong danh sách."
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => deleteCountry(deleteTarget)}
        />
      )}

      {bulkDeleteConfirm && (
        <ConfirmDeleteManyDialog
          count={bulk.count}
          note="Các bản ghi được xóa mềm (DELETE_FLG = 1) và không còn hiển thị trong danh sách."
          onCancel={() => setBulkDeleteConfirm(false)}
          onConfirm={deleteManyCountries}
        />
      )}

      <ToastStack toasts={toasts} />
    </>
  );
};
