/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
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
  SELECT_CLASS,
  SortState,
  SortableTh,
  TD_CLASS,
  TH_CLASS,
  TablePager,
  ToastStack,
  useColumnVisibility,
  useToasts,
} from './catalogUi';
import { useCatalogList } from './useCatalogList';
import { RelatedOrgDetail } from './RelatedOrgDetail';
import {
  ALL_COLUMNS,
  DOSSIER_TYPE_OPTIONS,
  ORG_TYPE_OPTIONS,
  RECORD_STATUS_OPTIONS,
  RelatedOrgDraft,
  RelatedOrgRow,
  displayValue,
  formatDateVN,
} from './relatedOrgMock';
import { useRelatedOrgRows } from './relatedOrgStore';

/**
 * Tổ chức liên quan (TCĐT, BL, ĐLPH) — nhóm "Quản lý hồ sơ", CHỈ có ở /ims.
 *
 * KHÔNG có SRS/FR riêng. Dựng theo `MODULES.tochuclienquan` của
 * `docs/quan-ly-danh-muc_80.html`. Không trùng module React nào đang có
 * (`ListingModule`/`OwnershipModule`/`BondModule` không quản lý nhóm tổ chức
 * này), nên đây là màn hồ sơ đầu tiên được dựng.
 *
 * GIAI ĐOẠN NÀY LÀ UI TĨNH. Dữ liệu nằm trong `relatedOrgStore.ts`, chưa gọi API.
 */
const UC = findImsUseCaseByCode('uc_hs_tclq')!;

const CURRENT_USER = 'nqt.hnx';

const DEFAULT_SORT: SortState = { key: 'createdDate', dir: 'desc' };

const SORTABLE = new Set(['name', 'custodyCode']);

function sortValue(row: RelatedOrgRow, key: string): string | number {
  switch (key) {
    case 'name':
      return row.name.toLowerCase();
    case 'custodyCode':
      return row.custodyCode;
    case 'updatedDate':
      return row.updatedDate ?? '';
    default:
      return row.createdDate;
  }
}

/** Placeholder của file mẫu: "Tìm tên, tên viết tắt, mã lưu ký, mã giao dịch...". */
const searchFields = (row: RelatedOrgRow) => [row.name, row.shortName, row.custodyCode, row.tradingCode];

const AUDIT_COLUMNS: readonly ColumnSpec[] = [
  { key: 'createdBy', label: 'Người tạo' },
  { key: 'createdDate', label: 'Ngày tạo' },
  { key: 'updatedBy', label: 'Người sửa' },
  { key: 'updatedDate', label: 'Ngày sửa' },
];

const COLUMN_SPECS: readonly ColumnSpec[] = [
  { key: 'stt', label: 'STT' },
  ...ALL_COLUMNS.map((c) => ({ key: c.key, label: c.columnLabel })),
  ...AUDIT_COLUMNS,
];

interface Criteria {
  readonly orgType: string;
  readonly dossierType: string;
  readonly recordStatus: string;
}

const EMPTY_CRITERIA: Criteria = { orgType: 'all', dossierType: 'all', recordStatus: 'all' };

function matches(row: RelatedOrgRow, c: Criteria): boolean {
  if (c.orgType !== 'all' && row.orgType !== c.orgType) return false;
  if (c.dossierType !== 'all' && row.dossierType !== c.dossierType) return false;
  if (c.recordStatus !== 'all' && row.recordStatus !== c.recordStatus) return false;
  return true;
}

type Screen =
  | { kind: 'list' }
  | { kind: 'detail'; rowId: number | null; startEditing: boolean };

const STICKY_STT = 'sticky left-0 z-10 w-15 min-w-15 bg-white';
const STICKY_NAME = 'sticky left-15 z-10 min-w-65 max-w-80 bg-white shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]';

export const HsToChucLienQuanView: React.FC = () => {
  // Kho dùng chung — IMS-018 ghi hồ sơ "Lưu tạm" vào đây khi phê duyệt đăng ký chuyên trang.
  const [rows, setRows] = useRelatedOrgRows();
  const [screen, setScreen] = useState<Screen>({ kind: 'list' });
  const [criteria, setCriteria] = useState<Criteria>(EMPTY_CRITERIA);
  const [deleteTarget, setDeleteTarget] = useState<RelatedOrgRow | null>(null);

  const scopedRows = rows.filter((r) => matches(r, criteria));

  const list = useCatalogList({
    rows: scopedRows,
    searchFields,
    sortValue,
    defaultSort: DEFAULT_SORT,
  });

  const { toasts, pushToast } = useToasts();
  const columns = useColumnVisibility(COLUMN_SPECS);

  const changeCriteria = (key: keyof Criteria, value: string) => {
    setCriteria((prev) => ({ ...prev, [key]: value }));
    list.applySearch();
  };

  const saveOrg = (draft: RelatedOrgDraft) => {
    if (screen.kind !== 'detail') return;
    const now = new Date().toISOString().slice(0, 10);

    if (screen.rowId !== null) {
      const id = screen.rowId;
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...draft, updatedBy: CURRENT_USER, updatedDate: now } : r)),
      );
      pushToast('success', 'Đã lưu thay đổi');
      return;
    }

    const nextId = rows.reduce((max, r) => Math.max(max, r.id), 0) + 1;
    setRows((prev) => [
      {
        ...draft,
        id: nextId,
        activeFlg: 1,
        deleteFlg: 0,
        createdBy: CURRENT_USER,
        createdDate: now,
        updatedBy: CURRENT_USER,
        updatedDate: now,
      },
      ...prev,
    ]);
    setScreen({ kind: 'detail', rowId: nextId, startEditing: false });
    pushToast('success', `Đã thêm mới "${draft.name}"`);
  };

  /** Xóa mềm: chỉ bật `DELETE_FLG = 1`, không bỏ phần tử khỏi mảng. */
  const deleteOrg = (row: RelatedOrgRow) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === row.id ? { ...r, deleteFlg: 1, updatedBy: CURRENT_USER, updatedDate: new Date().toISOString().slice(0, 10) } : r,
      ),
    );
    setDeleteTarget(null);
    setScreen({ kind: 'list' });
    pushToast('danger', `Đã xóa "${row.name}"`);
  };

  const exportRows = () => {
    const visible = [...list.visibleRows];
    exportToCsv(
      'to-chuc-lien-quan',
      [
        ...ALL_COLUMNS.map((c) => ({ header: c.columnLabel, value: (r: RelatedOrgRow) => displayValue(r, c) })),
        { header: 'Người tạo', value: (r: RelatedOrgRow) => r.createdBy },
        { header: 'Ngày tạo', value: (r: RelatedOrgRow) => formatDateVN(r.createdDate) },
        { header: 'Người sửa', value: (r: RelatedOrgRow) => r.updatedBy ?? '' },
        { header: 'Ngày sửa', value: (r: RelatedOrgRow) => formatDateVN(r.updatedDate) },
      ],
      visible,
    );
    pushToast('success', `Xuất dữ liệu thành công (${visible.length} dòng)`);
  };

  const deleteDialog = deleteTarget && (
    <ConfirmDeleteDialog
      recordLabel={deleteTarget.name}
      note="Bản ghi được xóa mềm (DELETE_FLG = 1) và không còn hiển thị trong danh sách."
      onCancel={() => setDeleteTarget(null)}
      onConfirm={() => deleteOrg(deleteTarget)}
    />
  );

  if (screen.kind === 'detail') {
    const row = screen.rowId === null ? null : rows.find((r) => r.id === screen.rowId && r.deleteFlg === 0) ?? null;
    return (
      <>
        <RelatedOrgDetail
          key={screen.rowId ?? 'new'}
          row={row}
          startEditing={screen.startEditing}
          onBack={() => setScreen({ kind: 'list' })}
          onSave={saveOrg}
          onDelete={setDeleteTarget}
        />
        {deleteDialog}
        <ToastStack toasts={toasts} />
      </>
    );
  }

  const openDetail = (row: RelatedOrgRow, startEditing = false) =>
    setScreen({ kind: 'detail', rowId: row.id, startEditing });

  const visibleDataColumns = ALL_COLUMNS.filter((c) => columns.isVisible(c.key));
  const visibleAuditColumns = AUDIT_COLUMNS.filter((c) => columns.isVisible(c.key));

  return (
    <>
      <CatalogPage
        rootLabel="Quản lý hồ sơ"
        catalogName={UC.menuLabel}
        heading="Tổ chức liên quan"
        subtitle="Danh mục tổ chức đấu thầu, bảo lãnh, đại lý phát hành (TCĐT, BL, ĐLPH)"
        actions={
          <button
            type="button"
            onClick={() => setScreen({ kind: 'detail', rowId: null, startEditing: true })}
            className={BTN_PRIMARY}
          >
            <Plus className="h-4 w-4" />
            Thêm mới
          </button>
        }
      >
        <div className="mb-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <label className="flex items-center gap-2">
            <span className="w-24 shrink-0 text-[13px] text-[#525252]">Loại tổ chức</span>
            <select
              value={criteria.orgType}
              onChange={(e) => changeCriteria('orgType', e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="all">Tất cả</option>
              {ORG_TYPE_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span className="w-24 shrink-0 text-[13px] text-[#525252]">Loại hồ sơ</span>
            <select
              value={criteria.dossierType}
              onChange={(e) => changeCriteria('dossierType', e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="all">Tất cả</option>
              {DOSSIER_TYPE_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span className="w-24 shrink-0 text-[13px] text-[#525252]">Trạng thái hồ sơ</span>
            <select
              value={criteria.recordStatus}
              onChange={(e) => changeCriteria('recordStatus', e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="all">Tất cả</option>
              {RECORD_STATUS_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
        </div>

        <CatalogToolbar
          keyword={list.draftKeyword}
          onKeyword={list.setDraftKeyword}
          searchPlaceholder="Tìm tên, tên viết tắt, mã lưu ký, mã giao dịch..."
          onSearch={list.applySearch}
          status={list.draftStatus}
          onStatus={list.applyStatus}
          columns={columns}
          onExport={exportRows}
        />

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-max border-separate border-spacing-0">
            <thead className="bg-[#F9FAFB]">
              <tr>
                {columns.isVisible('stt') && (
                  <th scope="col" className={`${TH_CLASS} ${STICKY_STT} bg-[#F9FAFB] text-center`}>
                    STT
                  </th>
                )}
                {visibleDataColumns.map((c) =>
                  SORTABLE.has(c.key) ? (
                    <SortableTh
                      key={c.key}
                      label={c.columnLabel}
                      sortKey={c.key}
                      sort={list.sort}
                      onSort={list.changeSort}
                      className={c.key === 'name' ? `${STICKY_NAME} bg-[#F9FAFB]` : ''}
                    />
                  ) : (
                    <th key={c.key} scope="col" className={TH_CLASS}>
                      {c.columnLabel}
                    </th>
                  ),
                )}
                {visibleAuditColumns.map((c) => (
                  <th key={c.key} scope="col" className={TH_CLASS}>
                    {c.label}
                  </th>
                ))}
                <th
                  scope="col"
                  className={`${TH_CLASS} sticky right-0 z-10 bg-[#F9FAFB] text-center shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.08)]`}
                >
                  Hành động
                </th>
              </tr>
            </thead>

            <tbody>
              {list.pageRows.length === 0 ? (
                <EmptyRow
                  colSpan={columns.visibleCount + 1}
                  title="Không tìm thấy dữ liệu"
                  hint="Thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm"
                />
              ) : (
                list.pageRows.map((row, idx) => (
                  <tr key={row.id} className="group hover:bg-[#F8FAFC]">
                    {columns.isVisible('stt') && (
                      <td className={`${TD_CLASS} ${STICKY_STT} text-center text-slate-500 group-hover:bg-[#F8FAFC]`}>
                        {list.startIdx + idx + 1}
                      </td>
                    )}
                    {visibleDataColumns.map((c) => {
                      if (c.key === 'name') {
                        return (
                          <td key={c.key} className={`${TD_CLASS} ${STICKY_NAME} whitespace-normal group-hover:bg-[#F8FAFC]`}>
                            <button
                              type="button"
                              onClick={() => openDetail(row)}
                              className="text-left font-semibold text-[#00663D] hover:underline"
                            >
                              {row.name}
                            </button>
                          </td>
                        );
                      }
                      const v = displayValue(row, c);
                      return (
                        <td
                          key={c.key}
                          className={`${TD_CLASS} ${c.key === 'address' ? 'min-w-80 whitespace-normal' : 'whitespace-nowrap'} ${
                            c.kind === 'money' ? 'text-right tabular-nums' : ''
                          }`}
                        >
                          {v || <span className="text-slate-300">-</span>}
                        </td>
                      );
                    })}
                    {columns.isVisible('createdBy') && <td className={TD_CLASS}>{row.createdBy}</td>}
                    {columns.isVisible('createdDate') && (
                      <td className={`${TD_CLASS} whitespace-nowrap`}>{formatDateVN(row.createdDate)}</td>
                    )}
                    {columns.isVisible('updatedBy') && <td className={TD_CLASS}>{row.updatedBy ?? '-'}</td>}
                    {columns.isVisible('updatedDate') && (
                      <td className={`${TD_CLASS} whitespace-nowrap`}>{formatDateVN(row.updatedDate) || '-'}</td>
                    )}
                    <td
                      className={`${TD_CLASS} sticky right-0 z-10 whitespace-nowrap bg-white text-center shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.08)] group-hover:bg-[#F8FAFC]`}
                    >
                      <button
                        type="button"
                        onClick={() => openDetail(row, true)}
                        title={`Sửa ${row.name}`}
                        aria-label={`Sửa ${row.name}`}
                        className="mr-0.5 inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(row)}
                        title={`Xóa ${row.name}`}
                        aria-label={`Xóa ${row.name}`}
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

      {deleteDialog}
      <ToastStack toasts={toasts} />
    </>
  );
};
