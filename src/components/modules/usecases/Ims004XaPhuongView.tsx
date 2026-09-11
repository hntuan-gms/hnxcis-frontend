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
  SELECT_CLASS,
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
import { Ims004WardFormModal, WardDraft } from './Ims004WardFormModal';
import { INITIAL_PROVINCES } from './ims003ProvinceMock';
import { INITIAL_WARDS, WardRow } from './ims004WardMock';

/**
 * SRS: `docs/srs/[IMS-004] Quản lý danh mục Xã phường.md`
 *
 * Màn hình "Danh sách Phường xã" (List View) + popup "Thêm mới/Cập nhật" theo SRS
 * §2.2 và §2.4. Bố cục và các primitive lấy từ `catalogUi.tsx`, logic lọc/sắp
 * xếp/phân trang lấy từ `useCatalogList` — dùng chung với IMS-002 và IMS-003.
 *
 * GIAI ĐOẠN NÀY LÀ UI TĨNH. Dữ liệu nằm trong `useState`, chưa gọi API.
 */
const UC = findImsUseCaseByCode('uc_ims_004')!;

/** Sắp xếp mặc định: mới nhất theo CREATED_DATE (SRS Bảng 04, mục "Sắp xếp"). */
const DEFAULT_SORT: SortState = { key: 'createdDate', dir: 'desc' };

function sortValue(row: WardRow, key: string): string | number {
  switch (key) {
    case 'wardCd':
      return row.wardCd.toLowerCase();
    case 'wardName':
      return row.wardNameVn.toLowerCase();
    case 'provinceCd':
      return row.provinceCd.toLowerCase();
    case 'description':
      return row.description.toLowerCase();
    case 'statusFlg':
      return row.statusFlg;
    default:
      return row.createdDate;
  }
}

/** Các trường được gộp vào tìm kiếm từ khóa. */
const searchFields = (row: WardRow) => [
  row.wardCd,
  row.wardNameVn,
  row.wardNameEn,
  row.description,
];

/** Cột bật/tắt được trên menu `Columns`; nhãn theo file mẫu. */
const COLUMNS: readonly ColumnSpec[] = [
  { key: 'stt', label: 'STT' },
  { key: 'code', label: 'Mã' },
  { key: 'name', label: 'Giá trị' },
  { key: 'province', label: 'Tỉnh/Thành' },
  { key: 'description', label: 'Mô tả' },
  { key: 'status', label: 'Trạng thái' },
];

export const Ims004XaPhuongView: React.FC = () => {
  const [wards, setWards] = useState<WardRow[]>(() => [...INITIAL_WARDS]);

  /**
   * Danh mục Tỉnh thành làm nguồn cho khóa ngoại `PROVINCE_CD`.
   *
   * Ở prototype này đọc trực tiếp mock của IMS-003 — hai danh mục nằm trong cùng
   * một hệ thống, nên nối thẳng đúng hơn là nhân đôi danh sách tỉnh/thành. Khi có
   * API thật thì đây là chỗ gọi `GET` danh mục Tỉnh thành.
   *
   * Lọc theo đúng luật SRS cho TRƯỜNG THAM CHIẾU: "chỉ lấy các bản ghi có
   * DELETE_FLG = 0 và ACTIVE_FLG = 1" — tỉnh/thành đã ngừng hoạt động không được
   * chọn cho bản ghi mới.
   */
  const provinceOptions = useMemo(
    () => INITIAL_PROVINCES.filter((p) => p.deleteFlg === 0 && p.activeFlg === 1),
    [],
  );

  /**
   * Nguồn cho BỘ LỌC trên toolbar — khác `provinceOptions` ở chỗ vẫn giữ các
   * tỉnh/thành đã ngừng hoạt động.
   *
   * Luật "chỉ lấy ACTIVE_FLG = 1" của SRS áp cho trường tham chiếu khi NHẬP dữ
   * liệu. Bộ lọc là truy vấn: chặn lọc theo tỉnh đã ngừng hoạt động sẽ khiến các
   * phường/xã thuộc tỉnh đó không thể tra ra được nữa.
   */
  const provinceFilterOptions = useMemo(
    () => INITIAL_PROVINCES.filter((p) => p.deleteFlg === 0),
    [],
  );

  /** Tra tên tỉnh/thành để hiển thị — tra trong TOÀN BỘ danh mục. */
  const provinceNameOf = (provinceCd: string) =>
    INITIAL_PROVINCES.find((p) => p.provinceCd === provinceCd)?.provinceNameVn ?? '';

  /**
   * Bộ lọc cấp cha có state riêng, tách khỏi `useCatalogList`.
   *
   * Vẫn theo cùng một luật của SRS ("chỉ lọc khi bấm Tìm kiếm/Enter"): `draft` là
   * lựa chọn đang hiển thị trên dropdown, `applied` là điều kiện đang lọc thật.
   */
  const [draftProvince, setDraftProvince] = useState<string>('all');
  const [appliedProvince, setAppliedProvince] = useState<string>('all');

  /**
   * Thu hẹp tập bản ghi TRƯỚC khi đưa vào `useCatalogList`, để hook chỉ phải lo
   * từ khóa, trạng thái, sắp xếp và phân trang như hai màn hình còn lại.
   */
  const scopedWards = useMemo(
    () =>
      appliedProvince === 'all' ? wards : wards.filter((w) => w.provinceCd === appliedProvince),
    [wards, appliedProvince],
  );

  const list = useCatalogList({
    rows: scopedWards,
    searchFields,
    sortValue,
    defaultSort: DEFAULT_SORT,
  });

  /** `null` = popup đóng; `{ row: null }` = thêm mới; `{ row }` = sửa. */
  const [formTarget, setFormTarget] = useState<{ row: WardRow | null } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WardRow | null>(null);

  const { toasts, pushToast } = useToasts();

  const columns = useColumnVisibility(COLUMNS);

  /**
   * Chọn nhiều dòng để xóa hàng loạt (theo file mẫu, không có trong SRS).
   * Xem chú thích đầy đủ ở `Ims002QuocGiaView.tsx`.
   */
  const activeWards = useMemo(() => wards.filter((r) => r.deleteFlg === 0), [wards]);
  const bulk = useBulkSelection(activeWards);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  /* ------------------------------------------------------------- thao tác */

  /** Áp dụng cùng lúc bộ lọc cấp cha và các điều kiện do hook quản lý. */
  const applySearch = () => {
    setAppliedProvince(draftProvince);
    list.applySearch();
  };

  /**
   * Đổi Tỉnh/Thành là lọc NGAY.
   *
   * Thanh công cụ mới không còn nút "Tìm kiếm", nên một ô chọn phải tự áp dụng —
   * khác ô từ khóa, nó không có trạng thái "đang gõ dở" để phải chờ Enter. Vẫn
   * giữ cặp `draft`/`applied` để `applySearch` (Enter ở ô từ khóa) không phải
   * biết gì về bộ lọc này.
   */
  const applyProvince = (provinceCd: string) => {
    setDraftProvince(provinceCd);
    setAppliedProvince(provinceCd);
    list.setPage(1);
  };

  /**
   * Bỏ hết điều kiện lọc.
   *
   * Toolbar mới không còn nút "Làm mới" (theo file mẫu), nên hàm này hiện không
   * có chỗ gọi. Giữ lại: đây là một thao tác thật của màn hình và là chỗ duy nhất
   * biết phải đặt lại cả bộ lọc cấp cha lẫn các điều kiện của hook cùng lúc.
   */
  const resetFilters = () => {
    setDraftProvince('all');
    setAppliedProvince('all');
    list.resetFilters();
  };

  const saveWard = (draft: WardDraft) => {
    const editing = formTarget?.row ?? null;
    // Prototype chưa có backend nên mốc thời gian lấy từ đồng hồ máy; bản ghi
    // thật sẽ do CSDL đóng dấu CREATED_DATE/UPDATED_DATE.
    const now = new Date().toISOString();

    if (editing) {
      setWards((prev) =>
        prev.map((row) =>
          row.id === editing.id
            ? { ...row, ...draft, updatedBy: 'nqt.hnx', updatedDate: now }
            : row,
        ),
      );
      pushToast('success', `Đã cập nhật phường xã “${draft.wardNameVn}”`);
    } else {
      const nextId = wards.reduce((max, row) => Math.max(max, row.id), 0) + 1;
      setWards((prev) => [
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
      pushToast('success', `Đã thêm mới phường xã “${draft.wardNameVn}”`);
    }

    setFormTarget(null);
  };

  /** Xóa mềm: chỉ bật `DELETE_FLG = 1`, không bỏ phần tử khỏi mảng. */
  const deleteWard = (row: WardRow) => {
    setWards((prev) =>
      prev.map((r) =>
        r.id === row.id
          ? { ...r, deleteFlg: 1, updatedBy: 'nqt.hnx', updatedDate: new Date().toISOString() }
          : r,
      ),
    );
    setDeleteTarget(null);
    pushToast('danger', `Đã xóa phường xã “${row.wardNameVn}”`);
  };

  /** Xóa mềm hàng loạt — cùng một luật với xóa từng dòng, chỉ áp cho nhiều id cùng lúc. */
  const deleteManyWards = () => {
    const ids = bulk.selectedIds;
    const now = new Date().toISOString();
    setWards((prev) =>
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
      'danh-muc-phuong-xa',
      [
        { header: 'Mã', value: (r: WardRow) => r.wardCd },
        { header: 'Tên (VN)', value: (r: WardRow) => r.wardNameVn },
        { header: 'Tên (EN)', value: (r: WardRow) => r.wardNameEn },
        { header: 'Tỉnh/Thành', value: (r: WardRow) => r.provinceCd },
        { header: 'Mô tả', value: (r: WardRow) => r.description },
        {
          header: 'Trạng thái',
          value: (r: WardRow) => (r.statusFlg === 1 ? 'Đang hoạt động' : 'Ngừng hoạt động'),
        },
      ],
      [...list.visibleRows],
    );
    pushToast('success', `Xuất dữ liệu thành công (${list.visibleRows.length} dòng)`);
  };

  /* --------------------------------------------------------------- render */

  return (
    <>
      <CatalogPage
        catalogName={UC.menuLabel}
        heading="Phường xã"
        subtitle="Quản lý danh sách và tạo mới phường xã"
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
          onSearch={applySearch}
          searchPlaceholder="Tìm kiếm Mã, Giá trị..."
          status={list.draftStatus}
          onStatus={list.applyStatus}
          columns={columns}
          onExport={exportRows}
          showImportExcel
        >
          {/* Bộ lọc cấp cha, riêng của màn hình này — xếp cùng hàng với ô từ khóa. */}
          <select
            value={draftProvince}
            onChange={(e) => applyProvince(e.target.value)}
            aria-label="Lọc theo tỉnh thành"
            className={`${SELECT_CLASS} w-auto`}
          >
            <option value="all">Tất cả tỉnh thành</option>
            {provinceFilterOptions.map((p) => (
              <option key={p.provinceCd} value={p.provinceCd}>
                {p.provinceCd} — {p.provinceNameVn}
              </option>
            ))}
          </select>
        </CatalogToolbar>

        <BulkActionBar
          count={bulk.count}
          onClear={bulk.clear}
          onDelete={() => setBulkDeleteConfirm(true)}
        />

        {/* Bảng danh sách — các cột theo SRS Bảng 04, thêm cột Tỉnh/Thành (FK). */}
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
                    sortKey="wardCd"
                    sort={list.sort}
                    onSort={list.changeSort}
                  />
                )}
                {columns.isVisible('name') && (
                  <SortableTh
                    label="Giá trị"
                    sortKey="wardName"
                    sort={list.sort}
                    onSort={list.changeSort}
                  />
                )}
                {columns.isVisible('province') && (
                  <SortableTh
                    label="Tỉnh/Thành"
                    sortKey="provinceCd"
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
                        aria-label={`Chọn ${row.wardNameVn}`}
                        className={BULK_CHECKBOX_CLASS}
                      />
                    </td>
                    {columns.isVisible('stt') && (
                      <td className={`${TD_CLASS} text-center text-slate-500`}>
                        {list.startIdx + idx + 1}
                      </td>
                    )}

                    {columns.isVisible('code') && (
                      <td className={`${TD_CLASS} font-semibold whitespace-nowrap`}>{row.wardCd}</td>
                    )}

                    {columns.isVisible('name') && (
                      <td className={TD_CLASS}>
                        <div>{row.wardNameVn}</div>
                        {/*
                          SRS Bảng 04 chỉ có một cột "Tên Phường xã" nhưng CSDL lưu
                          cả tên VN và EN. Hiện tên EN thành dòng phụ; tên EN được
                          phép để trống nên hiện "—" khi rỗng.
                        */}
                        <div className="text-xs text-slate-500">{row.wardNameEn || '—'}</div>
                      </td>
                    )}

                    {columns.isVisible('province') && (
                      <td className={`${TD_CLASS} whitespace-nowrap`}>
                        {row.provinceCd ? (
                          <>
                            <div>{row.provinceCd}</div>
                            <div className="text-xs text-slate-500">
                              {provinceNameOf(row.provinceCd)}
                            </div>
                          </>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
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
                        title={`Sửa ${row.wardNameVn}`}
                        aria-label={`Sửa ${row.wardNameVn}`}
                        className="mr-0.5 inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteTarget(row)}
                        title={`Xóa ${row.wardNameVn}`}
                        aria-label={`Xóa ${row.wardNameVn}`}
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
        <Ims004WardFormModal
          editing={formTarget.row}
          provinceOptions={provinceOptions}
          existingCodes={wards
            .filter((r) => r.deleteFlg === 0 && r.id !== formTarget.row?.id)
            .map((r) => r.wardCd)}
          onCancel={() => setFormTarget(null)}
          onSave={saveWard}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteDialog
          recordLabel={`${deleteTarget.wardCd} — ${deleteTarget.wardNameVn}`}
          note="Bản ghi được xóa mềm (DELETE_FLG = 1) và không còn hiển thị trong danh sách."
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => deleteWard(deleteTarget)}
        />
      )}

      {bulkDeleteConfirm && (
        <ConfirmDeleteManyDialog
          count={bulk.count}
          note="Các bản ghi được xóa mềm (DELETE_FLG = 1) và không còn hiển thị trong danh sách."
          onCancel={() => setBulkDeleteConfirm(false)}
          onConfirm={deleteManyWards}
        />
      )}

      <ToastStack toasts={toasts} />
    </>
  );
};
