/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';

import { findImsUseCaseByCode } from '../../../../lib/imsRoutes';
import { exportToCsv } from '../../../../lib/exportCsv';
import { DateField } from '../CalendarDatePicker';
import {
  BULK_CHECKBOX_CLASS,
  BTN_PRIMARY,
  BulkActionBar,
  CatalogPage,
  CatalogToolbar,
  ColumnSpec,
  ConfirmDeleteDialog,
  ConfirmDeleteManyDialog,
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
  useBulkSelection,
  useColumnVisibility,
  useToasts,
} from '../catalogUi';
import { useCatalogList } from '../useCatalogList';
import { BUSINESS_TYPE_OPTIONS, INDUSTRY_OPTIONS, Values, formatDateVN, formatMoneyVN, todayISO } from './dossierFields';
import { RowIconButton } from './FieldSections';
import { IssuerDetail, IssuerDetailInitial } from './IssuerDetail';
import { IssuerCreateModal } from './IssuerModals';
import { Issuer, IssuerKind, addIssuer, nextId, str, takeIssuerOpenRequest, updateIssuer, useDossierStore } from './dossierStore';

/**
 * Tổ chức phát hành (TCPH) — nhóm "Quản lý hồ sơ", CHỈ có ở /ims.
 *
 * Dựng theo `MODULES.hosotcph` + `renderDetailView` của
 * `docs/quan-ly-danh-muc_80.html`. Chạy SONG SONG với `ListingModule` (qlny_*)
 * cũ, không dùng chung dữ liệu.
 *
 * GIAI ĐOẠN UI TĨNH: dữ liệu trong `dossierStore`, chưa gọi API.
 */
const UC = findImsUseCaseByCode('uc_hs_tcph')!;
const CURRENT_USER = 'nqt.hnx';
const DEFAULT_SORT: SortState = { key: 'createdDate', dir: 'desc' };

const COLUMNS: readonly ColumnSpec[] = [
  { key: 'stt', label: 'STT' },
  { key: 'name', label: 'Tên đầy đủ (tiếng Việt)' },
  { key: 'shortName', label: 'Tên viết tắt' },
  { key: 'tcphCode', label: 'Mã TCPH' },
  { key: 'taxCode', label: 'Mã số thuế' },
  { key: 'orgType', label: 'Loại hình' },
  { key: 'industry', label: 'Lĩnh vực / ngành nghề chính' },
  { key: 'charterCapital', label: 'Vốn điều lệ' },
  { key: 'establishedDate', label: 'Ngày thành lập' },
  { key: 'status', label: 'Trạng thái' },
];

function sortValue(row: Issuer, key: string): string | number {
  switch (key) {
    case 'name':
      return str(row.values.name).toLowerCase();
    case 'taxCode':
      return str(row.values.taxCode);
    case 'charterCapital':
      return Number(row.values.charterCapital ?? 0);
    default:
      return row.createdDate;
  }
}

/** Placeholder của file mẫu: "Tìm kiếm theo Tên, Mã số thuế...". */
const searchFields = (row: Issuer) => [str(row.values.name), str(row.values.shortName), str(row.values.taxCode), str(row.values.tcphCode)];

const orgTypeOf = (row: Issuer) => str(row.kind === 'tochuckhac' ? row.values.tcphType : row.values.businessType);

interface Criteria {
  businessType: string;
  industry: string;
  taxCode: string;
  establishedDate: string;
}
const EMPTY_CRITERIA: Criteria = { businessType: 'all', industry: 'all', taxCode: '', establishedDate: '' };

function matches(row: Issuer, c: Criteria): boolean {
  if (c.businessType !== 'all' && row.values.businessType !== c.businessType) return false;
  if (c.industry !== 'all' && row.values.industry !== c.industry) return false;
  if (c.taxCode && !str(row.values.taxCode).includes(c.taxCode.trim())) return false;
  if (c.establishedDate && row.values.establishedDate !== c.establishedDate) return false;
  return true;
}

type Screen = { kind: 'list' } | { kind: 'detail'; id: number; initial: IssuerDetailInitial };

export const HsToChucPhatHanhView: React.FC = () => {
  const { issuers, investors } = useDossierStore();

  /** Được chuyển tới từ Nhà đầu tư / Danh sách trái phiếu thì mở thẳng hồ sơ đó. */
  const [screen, setScreen] = useState<Screen>(() => {
    const req = takeIssuerOpenRequest();
    if (!req) return { kind: 'list' };
    return {
      kind: 'detail',
      id: req.issuerId,
      initial: {
        primaryTab: req.dossierKey ? 'chungkhoan' : 'tcph',
        dossierKey: req.dossierKey ?? null,
        holdersTab: req.holdersTab,
        editing: req.edit ? req.dossierKey ?? 'tcph' : null,
      },
    };
  });
  const [criteria, setCriteria] = useState<Criteria>(EMPTY_CRITERIA);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Issuer | null>(null);
  const [bulkDelete, setBulkDelete] = useState(false);

  const list = useCatalogList({ rows: issuers.filter((r) => matches(r, criteria)), searchFields, sortValue, defaultSort: DEFAULT_SORT });
  const bulk = useBulkSelection(issuers.filter((r) => r.deleteFlg === 0));
  const { toasts, pushToast } = useToasts();
  const columns = useColumnVisibility(COLUMNS);

  const setCrit = <K extends keyof Criteria>(key: K, v: Criteria[K]) => {
    setCriteria((prev) => ({ ...prev, [key]: v }));
    list.applySearch();
  };

  const softDelete = (ids: readonly number[]) => {
    const now = todayISO();
    ids.forEach((id) =>
      updateIssuer(id, (d) => {
        d.deleteFlg = 1;
        d.updatedBy = CURRENT_USER;
        d.updatedDate = now;
      }),
    );
  };

  const create = (kind: IssuerKind, values: Values) => {
    const id = nextId(issuers);
    const statusFlg = values.statusFlg === 0 ? 0 : 1;
    addIssuer({
      id,
      kind,
      values: { ...values, statusFlg },
      statusFlg,
      activeFlg: 1,
      deleteFlg: 0,
      createdBy: CURRENT_USER,
      createdDate: todayISO(),
      ownership: { parents: [], subsidiaries: [], affiliates: [] },
      changeHistory: [],
      dossiers: { cp: null, tpny: [], tprl: [] },
    });
    setCreating(false);
    setScreen({ kind: 'detail', id, initial: {} });
    pushToast('success', 'Đã thêm mới tổ chức phát hành');
  };

  const exportRows = () => {
    const rows = [...list.visibleRows];
    exportToCsv(
      'to-chuc-phat-hanh',
      [
        { header: 'Tên đầy đủ (tiếng Việt)', value: (r: Issuer) => str(r.values.name) },
        { header: 'Tên viết tắt', value: (r: Issuer) => str(r.values.shortName) },
        { header: 'Mã TCPH', value: (r: Issuer) => str(r.values.tcphCode) },
        { header: 'Mã số thuế', value: (r: Issuer) => str(r.values.taxCode) },
        { header: 'Loại hình', value: orgTypeOf },
        { header: 'Lĩnh vực / ngành nghề chính', value: (r: Issuer) => str(r.values.industry) },
        { header: 'Vốn điều lệ', value: (r: Issuer) => formatMoneyVN(r.values.charterCapital) },
        { header: 'Ngày thành lập', value: (r: Issuer) => formatDateVN(r.values.establishedDate) },
        { header: 'Trạng thái', value: (r: Issuer) => (r.statusFlg === 1 ? 'Đang hoạt động' : 'Ngừng hoạt động') },
      ],
      rows,
    );
    pushToast('success', `Xuất dữ liệu thành công (${rows.length} dòng)`);
  };

  const deleteDialog = deleteTarget && (
    <ConfirmDeleteDialog
      recordLabel={str(deleteTarget.values.name)}
      note="Hồ sơ TCPH được xóa mềm (DELETE_FLG = 1), kéo theo các hồ sơ chứng khoán của tổ chức này không còn hiển thị."
      onCancel={() => setDeleteTarget(null)}
      onConfirm={() => {
        softDelete([deleteTarget.id]);
        pushToast('danger', `Đã xóa "${str(deleteTarget.values.name)}"`);
        setDeleteTarget(null);
        setScreen({ kind: 'list' });
      }}
    />
  );

  if (screen.kind === 'detail') {
    const issuer = issuers.find((i) => i.id === screen.id && i.deleteFlg === 0);
    if (issuer) {
      return (
        <>
          <IssuerDetail
            key={issuer.id}
            issuer={issuer}
            investors={investors}
            initial={screen.initial}
            onBack={() => setScreen({ kind: 'list' })}
            onDeleteIssuer={() => setDeleteTarget(issuer)}
            toast={pushToast}
          />
          {deleteDialog}
          <ToastStack toasts={toasts} />
        </>
      );
    }
  }

  const openDetail = (row: Issuer, editing = false) =>
    setScreen({ kind: 'detail', id: row.id, initial: { editing: editing ? 'tcph' : null } });

  const pageIds = list.pageRows;

  return (
    <>
      <CatalogPage
        rootLabel="Quản lý hồ sơ"
        catalogName={UC.menuLabel}
        heading="Tổ chức phát hành"
        subtitle="Danh sách chung tất cả tổ chức phát hành (TCPH)"
        actions={
          <button type="button" onClick={() => setCreating(true)} className={BTN_PRIMARY}>
            <Plus className="h-4 w-4" />
            Thêm mới
          </button>
        }
      >
        <div className="mb-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <select value={criteria.businessType} onChange={(e) => setCrit('businessType', e.target.value)} className={SELECT_CLASS} aria-label="Loại hình doanh nghiệp">
            <option value="all">Tất cả loại hình</option>
            {BUSINESS_TYPE_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
          <select value={criteria.industry} onChange={(e) => setCrit('industry', e.target.value)} className={SELECT_CLASS} aria-label="Lĩnh vực">
            <option value="all">Tất cả lĩnh vực</option>
            {INDUSTRY_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
          <input value={criteria.taxCode} onChange={(e) => setCrit('taxCode', e.target.value)} placeholder="Mã số thuế" aria-label="Mã số thuế" className={INPUT_CLASS} />
          <DateField value={criteria.establishedDate || null} placeholder="Ngày thành lập" onChange={(v) => setCrit('establishedDate', v ?? '')} />
        </div>

        <CatalogToolbar
          keyword={list.draftKeyword}
          onKeyword={list.setDraftKeyword}
          searchPlaceholder="Tìm kiếm theo Tên, Mã số thuế..."
          onSearch={list.applySearch}
          status={list.draftStatus}
          onStatus={list.applyStatus}
          columns={columns}
          onExport={exportRows}
          showImportExcel
        />

        <BulkActionBar count={bulk.count} onClear={bulk.clear} onDelete={() => setBulkDelete(true)} />

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-max border-separate border-spacing-0">
            <thead className="bg-[#F9FAFB]">
              <tr>
                <th className={`${TH_CLASS} w-10`}>
                  <input
                    type="checkbox"
                    aria-label="Chọn tất cả trên trang"
                    className={BULK_CHECKBOX_CLASS}
                    checked={bulk.isAllSelected(pageIds)}
                    onChange={() => bulk.toggleAll(pageIds)}
                  />
                </th>
                {columns.isVisible('stt') && <th className={`${TH_CLASS} w-15 text-center`}>STT</th>}
                {columns.isVisible('name') && <SortableTh label="Tên đầy đủ (tiếng Việt)" sortKey="name" sort={list.sort} onSort={list.changeSort} />}
                {columns.isVisible('shortName') && <th className={TH_CLASS}>Tên viết tắt</th>}
                {columns.isVisible('tcphCode') && <th className={TH_CLASS}>Mã TCPH</th>}
                {columns.isVisible('taxCode') && <SortableTh label="Mã số thuế" sortKey="taxCode" sort={list.sort} onSort={list.changeSort} />}
                {columns.isVisible('orgType') && <th className={TH_CLASS}>Loại hình</th>}
                {columns.isVisible('industry') && <th className={TH_CLASS}>Lĩnh vực / ngành nghề chính</th>}
                {columns.isVisible('charterCapital') && <SortableTh label="Vốn điều lệ" sortKey="charterCapital" sort={list.sort} onSort={list.changeSort} />}
                {columns.isVisible('establishedDate') && <th className={TH_CLASS}>Ngày thành lập</th>}
                {columns.isVisible('status') && <th className={TH_CLASS}>Trạng thái</th>}
                <th className={`${TH_CLASS} text-center`}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {list.pageRows.length === 0 ? (
                <EmptyRow colSpan={columns.visibleCount + 2} title="Không tìm thấy dữ liệu" hint="Thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm" />
              ) : (
                list.pageRows.map((row, idx) => {
                  const name = str(row.values.name);
                  const dash = <span className="text-slate-300">-</span>;
                  return (
                    <tr key={row.id} className="hover:bg-[#F8FAFC]">
                      <td className={TD_CLASS}>
                        <input
                          type="checkbox"
                          aria-label={`Chọn ${name}`}
                          className={BULK_CHECKBOX_CLASS}
                          checked={bulk.isSelected(row.id)}
                          onChange={() => bulk.toggle(row.id)}
                        />
                      </td>
                      {columns.isVisible('stt') && <td className={`${TD_CLASS} text-center text-slate-500`}>{list.startIdx + idx + 1}</td>}
                      {columns.isVisible('name') && (
                        <td className={`${TD_CLASS} max-w-90 whitespace-normal`}>
                          <button type="button" onClick={() => openDetail(row)} className="text-left font-semibold text-[#00663D] hover:underline">
                            {name}
                          </button>
                        </td>
                      )}
                      {columns.isVisible('shortName') && <td className={TD_CLASS}>{str(row.values.shortName) || dash}</td>}
                      {columns.isVisible('tcphCode') && <td className={TD_CLASS}>{str(row.values.tcphCode) || dash}</td>}
                      {columns.isVisible('taxCode') && <td className={TD_CLASS}>{str(row.values.taxCode) || dash}</td>}
                      {columns.isVisible('orgType') && <td className={TD_CLASS}>{orgTypeOf(row) || dash}</td>}
                      {columns.isVisible('industry') && <td className={TD_CLASS}>{str(row.values.industry) || dash}</td>}
                      {columns.isVisible('charterCapital') && (
                        <td className={`${TD_CLASS} text-right tabular-nums`}>{formatMoneyVN(row.values.charterCapital) || dash}</td>
                      )}
                      {columns.isVisible('establishedDate') && (
                        <td className={TD_CLASS}>{formatDateVN(row.values.establishedDate) || <span className="text-slate-300">Không có</span>}</td>
                      )}
                      {columns.isVisible('status') && (
                        <td className={TD_CLASS}>
                          <StatusPill active={row.statusFlg === 1} />
                        </td>
                      )}
                      <td className={`${TD_CLASS} whitespace-nowrap text-center`}>
                        <RowIconButton label={`Sửa ${name}`} onClick={() => openDetail(row, true)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </RowIconButton>
                        <RowIconButton label={`Xóa ${name}`} danger onClick={() => setDeleteTarget(row)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </RowIconButton>
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

      {creating && <IssuerCreateModal issuers={issuers} onCancel={() => setCreating(false)} onSave={create} />}
      {deleteDialog}
      {bulkDelete && (
        <ConfirmDeleteManyDialog
          count={bulk.count}
          note="Các hồ sơ TCPH được xóa mềm (DELETE_FLG = 1) và không còn hiển thị trong danh sách."
          onCancel={() => setBulkDelete(false)}
          onConfirm={() => {
            const n = bulk.count;
            softDelete([...bulk.selectedIds]);
            bulk.clear();
            setBulkDelete(false);
            pushToast('danger', `Đã xóa ${n} bản ghi`);
          }}
        />
      )}
      <ToastStack toasts={toasts} />
    </>
  );
};
