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
import { Ims003ProvinceFormModal, ProvinceDraft } from './Ims003ProvinceFormModal';
import { INITIAL_COUNTRIES } from './ims002CountryMock';
import { INITIAL_PROVINCES, ProvinceRow } from './ims003ProvinceMock';

/**
 * SRS: `docs/srs/[IMS-003] Quản lý danh mục Tỉnh thành.md`
 *
 * Màn hình "Danh sách Tỉnh thành" (List View) + popup "Thêm mới/Cập nhật" theo
 * SRS §2.2 và §2.4. Bố cục và các primitive lấy từ `catalogUi.tsx`, logic lọc/
 * sắp xếp/phân trang lấy từ `useCatalogList` — dùng chung với IMS-002 và IMS-004.
 *
 * GIAI ĐOẠN NÀY LÀ UI TĨNH. Dữ liệu nằm trong `useState`, chưa gọi API.
 */
const UC = findImsUseCaseByCode('uc_ims_003')!;

/** Sắp xếp mặc định: mới nhất theo CREATED_DATE (SRS Bảng 04, mục "Sắp xếp"). */
const DEFAULT_SORT: SortState = { key: 'createdDate', dir: 'desc' };

function sortValue(row: ProvinceRow, key: string): string | number {
  switch (key) {
    case 'provinceCd':
      return row.provinceCd.toLowerCase();
    case 'provinceName':
      return row.provinceNameVn.toLowerCase();
    case 'countryCd':
      return row.countryCd.toLowerCase();
    case 'region':
      return row.region.toLowerCase();
    case 'description':
      return row.description.toLowerCase();
    case 'statusFlg':
      return row.statusFlg;
    default:
      return row.createdDate;
  }
}

/** Các trường được gộp vào tìm kiếm từ khóa. */
const searchFields = (row: ProvinceRow) => [
  row.provinceCd,
  row.provinceNameVn,
  row.provinceNameEn,
  row.region,
  row.description,
];

/** Cột bật/tắt được trên menu `Columns`; nhãn theo file mẫu. */
const COLUMNS: readonly ColumnSpec[] = [
  { key: 'stt', label: 'STT' },
  { key: 'code', label: 'Mã' },
  { key: 'name', label: 'Giá trị' },
  { key: 'country', label: 'Quốc gia' },
  { key: 'region', label: 'Vùng/Miền' },
  { key: 'description', label: 'Mô tả' },
  { key: 'status', label: 'Trạng thái' },
];

export const Ims003TinhThanhView: React.FC = () => {
  const [provinces, setProvinces] = useState<ProvinceRow[]>(() => [...INITIAL_PROVINCES]);

  /**
   * Danh mục Quốc gia dùng làm nguồn cho ô chọn cha.
   *
   * Ở prototype này đọc trực tiếp mock của IMS-002 — hai danh mục nằm trong cùng
   * một hệ thống, nên nối thẳng đúng hơn là nhân đôi danh sách quốc gia. Khi có
   * API thật thì đây là chỗ gọi `GET` danh mục Quốc gia.
   *
   * Lọc theo đúng luật SRS cho trường tham chiếu: "chỉ lấy các bản ghi có
   * DELETE_FLG = 0 và ACTIVE_FLG = 1" — quốc gia đã ngừng hoạt động không được
   * xuất hiện để chọn mới, dù bản ghi cũ trỏ vào nó vẫn hiển thị bình thường.
   */
  const countryOptions = useMemo(
    () => INITIAL_COUNTRIES.filter((c) => c.deleteFlg === 0 && c.activeFlg === 1),
    [],
  );

  /** Tra tên quốc gia để hiển thị trên danh sách — tra trong TOÀN BỘ danh mục. */
  const countryNameOf = (countryCd: string) =>
    INITIAL_COUNTRIES.find((c) => c.countryCd === countryCd)?.countryNameVi ?? '';

  const list = useCatalogList({
    rows: provinces,
    searchFields,
    sortValue,
    defaultSort: DEFAULT_SORT,
  });

  /** `null` = popup đóng; `{ row: null }` = thêm mới; `{ row }` = sửa. */
  const [formTarget, setFormTarget] = useState<{ row: ProvinceRow | null } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProvinceRow | null>(null);

  const { toasts, pushToast } = useToasts();

  const columns = useColumnVisibility(COLUMNS);

  /**
   * Chọn nhiều dòng để xóa hàng loạt (theo file mẫu, không có trong SRS).
   * Xem chú thích đầy đủ ở `Ims002QuocGiaView.tsx`.
   */
  const activeProvinces = useMemo(() => provinces.filter((r) => r.deleteFlg === 0), [provinces]);
  const bulk = useBulkSelection(activeProvinces);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  /* ------------------------------------------------------------- thao tác */

  const saveProvince = (draft: ProvinceDraft) => {
    const editing = formTarget?.row ?? null;
    // Prototype chưa có backend nên mốc thời gian lấy từ đồng hồ máy; bản ghi
    // thật sẽ do CSDL đóng dấu CREATED_DATE/UPDATED_DATE.
    const now = new Date().toISOString();

    if (editing) {
      setProvinces((prev) =>
        prev.map((row) =>
          row.id === editing.id
            ? { ...row, ...draft, updatedBy: 'nqt.hnx', updatedDate: now }
            : row,
        ),
      );
      pushToast('success', `Đã cập nhật tỉnh thành “${draft.provinceNameVn}”`);
    } else {
      const nextId = provinces.reduce((max, row) => Math.max(max, row.id), 0) + 1;
      setProvinces((prev) => [
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
      pushToast('success', `Đã thêm mới tỉnh thành “${draft.provinceNameVn}”`);
    }

    setFormTarget(null);
  };

  /** Xóa mềm: chỉ bật `DELETE_FLG = 1`, không bỏ phần tử khỏi mảng. */
  const deleteProvince = (row: ProvinceRow) => {
    setProvinces((prev) =>
      prev.map((r) =>
        r.id === row.id
          ? { ...r, deleteFlg: 1, updatedBy: 'nqt.hnx', updatedDate: new Date().toISOString() }
          : r,
      ),
    );
    setDeleteTarget(null);
    pushToast('danger', `Đã xóa tỉnh thành “${row.provinceNameVn}”`);
  };

  /** Xóa mềm hàng loạt — cùng một luật với xóa từng dòng, chỉ áp cho nhiều id cùng lúc. */
  const deleteManyProvinces = () => {
    const ids = bulk.selectedIds;
    const now = new Date().toISOString();
    setProvinces((prev) =>
      prev.map((r) =>
        ids.has(r.id) ? { ...r, deleteFlg: 1, updatedBy: 'nqt.hnx', updatedDate: now } : r,
      ),
    );
    pushToast('danger', `Đã xóa ${ids.size} bản ghi`);
    bulk.clear();
    setBulkDeleteConfirm(false);
  };

  /**
   * Xuất File — CSV có BOM UTF-8, xuất toàn bộ kết quả lọc (`list.visibleRows`)
   * chứ không phải trang đang xem.
   */
  const exportRows = () => {
    exportToCsv(
      'danh-muc-tinh-thanh',
      [
        { header: 'Mã', value: (r: ProvinceRow) => r.provinceCd },
        { header: 'Tên (VN)', value: (r: ProvinceRow) => r.provinceNameVn },
        { header: 'Tên (EN)', value: (r: ProvinceRow) => r.provinceNameEn },
        { header: 'Quốc gia', value: (r: ProvinceRow) => r.countryCd },
        { header: 'Vùng/Miền', value: (r: ProvinceRow) => r.region },
        { header: 'Mô tả', value: (r: ProvinceRow) => r.description },
        {
          header: 'Trạng thái',
          value: (r: ProvinceRow) => (r.statusFlg === 1 ? 'Đang hoạt động' : 'Ngừng hoạt động'),
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
        heading="Tỉnh thành"
        subtitle="Quản lý danh sách và tạo mới tỉnh thành"
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

        {/* Bảng danh sách — các cột theo SRS Bảng 04, thêm Quốc gia và Vùng/Miền. */}
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
                    sortKey="provinceCd"
                    sort={list.sort}
                    onSort={list.changeSort}
                  />
                )}
                {columns.isVisible('name') && (
                  <SortableTh
                    label="Giá trị"
                    sortKey="provinceName"
                    sort={list.sort}
                    onSort={list.changeSort}
                  />
                )}
                {columns.isVisible('country') && (
                  <SortableTh
                    label="Quốc gia"
                    sortKey="countryCd"
                    sort={list.sort}
                    onSort={list.changeSort}
                  />
                )}
                {columns.isVisible('region') && (
                  <SortableTh
                    label="Vùng/Miền"
                    sortKey="region"
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
                        aria-label={`Chọn ${row.provinceNameVn}`}
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
                        {row.provinceCd}
                      </td>
                    )}

                    {columns.isVisible('name') && (
                      <td className={TD_CLASS}>
                        <div>{row.provinceNameVn}</div>
                        {/*
                          SRS Bảng 04 chỉ có một cột "Tên Tỉnh thành" nhưng CSDL lưu
                          cả tên VN và EN. Hiện tên EN thành dòng phụ; tên EN được
                          phép để trống nên hiện "—" khi rỗng.
                        */}
                        <div className="text-xs text-slate-500">{row.provinceNameEn || '—'}</div>
                      </td>
                    )}

                    {columns.isVisible('country') && (
                      <td className={`${TD_CLASS} whitespace-nowrap`}>
                        <div>{row.countryCd}</div>
                        <div className="text-xs text-slate-500">{countryNameOf(row.countryCd)}</div>
                      </td>
                    )}

                    {columns.isVisible('region') && (
                      <td className={`${TD_CLASS} whitespace-nowrap`}>
                        {row.region ? row.region : <span className="text-slate-400">—</span>}
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
                        title={`Sửa ${row.provinceNameVn}`}
                        aria-label={`Sửa ${row.provinceNameVn}`}
                        className="mr-0.5 inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteTarget(row)}
                        title={`Xóa ${row.provinceNameVn}`}
                        aria-label={`Xóa ${row.provinceNameVn}`}
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
        <Ims003ProvinceFormModal
          editing={formTarget.row}
          countryOptions={countryOptions}
          existingCodes={provinces
            .filter((r) => r.deleteFlg === 0 && r.id !== formTarget.row?.id)
            .map((r) => r.provinceCd)}
          onCancel={() => setFormTarget(null)}
          onSave={saveProvince}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteDialog
          recordLabel={`${deleteTarget.provinceCd} — ${deleteTarget.provinceNameVn}`}
          note="Bản ghi được xóa mềm (DELETE_FLG = 1) và không còn hiển thị trong danh sách."
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => deleteProvince(deleteTarget)}
        />
      )}

      {bulkDeleteConfirm && (
        <ConfirmDeleteManyDialog
          count={bulk.count}
          note="Các bản ghi được xóa mềm (DELETE_FLG = 1) và không còn hiển thị trong danh sách."
          onCancel={() => setBulkDeleteConfirm(false)}
          onConfirm={deleteManyProvinces}
        />
      )}

      <ToastStack toasts={toasts} />
    </>
  );
};
