/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Link2, Pencil, Plus, Trash2, Users } from 'lucide-react';

import { findImsUseCaseByCode } from '../../../../lib/imsRoutes';
import { exportToCsv } from '../../../../lib/exportCsv';
import { AdvancedFilterButton, AdvancedFilterPanel, AdvFilterField, AdvFilterValues, useAdvancedFilter } from '../AdvancedFilterPanel';
import {
  BTN_PRIMARY,
  CatalogPage,
  CatalogToolbar,
  ColumnSpec,
  ConfirmDeleteDialog,
  EmptyRow,
  SortState,
  SortableTh,
  TD_CLASS,
  TH_CLASS,
  TablePager,
  ToastStack,
  useColumnVisibility,
  useToasts,
} from '../catalogUi';
import { useCatalogList } from '../useCatalogList';
import type { UseCaseViewProps } from '../index';
import { INVESTOR_DOC_TYPE_OPTIONS, INVESTOR_ORG_TYPE_OPTIONS, InvestorKind, Values } from './dossierFields';
import { RowIconButton } from './FieldSections';
import { FamilyModal, InvestorFormModal, PortfolioModal, inverseRelation } from './InvestorModals';
import {
  Investor,
  addInvestor,
  findInvestorHoldings,
  nextId,
  requestIssuerOpen,
  str,
  updateInvestor,
  useDossierStore,
} from './dossierStore';

/**
 * Hồ sơ Nhà đầu tư — nhóm "Quản lý hồ sơ", CHỈ có ở /ims.
 *
 * Dựng theo `MODULES.nhadautu` của `docs/quan-ly-danh-muc_80.html`: dữ liệu định
 * danh tập trung, KHÔNG lưu vai trò CĐL/NNB/NLQ ở đây — vai trò gắn theo từng mã
 * CP, ở tab "Cổ đông, NNB & NLQ" của Tổ chức phát hành.
 *
 * Chạy song song với `OwnershipModule` (FR-026) cũ, không dùng chung dữ liệu.
 */
const UC = findImsUseCaseByCode('uc_hs_ndt')!;
const CURRENT_USER = 'nqt.hnx';
const DEFAULT_SORT: SortState = { key: 'createdDate', dir: 'desc' };

const COLUMNS: readonly ColumnSpec[] = [
  { key: 'stt', label: 'STT' },
  { key: 'name', label: 'Tên Nhà đầu tư' },
  { key: 'kind', label: 'Loại' },
  { key: 'docNo', label: 'CCCD / MST' },
  { key: 'nationality', label: 'Quốc tịch' },
  { key: 'contact', label: 'Liên hệ' },
  { key: 'mck', label: 'MCK Liên kết' },
  { key: 'family', label: 'Quan hệ gia đình' },
];

function sortValue(row: Investor, key: string): string | number {
  if (key === 'name') return str(row.values.name).toLowerCase();
  if (key === 'docNo') return str(row.values.docNo);
  return row.createdDate;
}

const searchFields = (row: Investor) => [
  str(row.values.name),
  str(row.values.docNo),
  str(row.values.phone),
  str(row.values.email),
  str(row.values.shortName),
];

/** `MODULES.nhadautu.filterFields` của file mẫu — không có trường trạng thái vì Nhà đầu tư không có cờ hoạt động. */
const FILTER_FIELDS: readonly AdvFilterField[] = [
  {
    key: 'kind',
    label: 'Loại nhà đầu tư',
    type: 'select',
    options: [
      { value: 'person', label: 'Cá nhân' },
      { value: 'org', label: 'Tổ chức' },
    ],
  },
  { key: 'nationality', label: 'Quốc tịch', type: 'text' },
  {
    key: 'docType',
    label: 'Loại giấy tờ định danh (Cá nhân)',
    type: 'select',
    options: INVESTOR_DOC_TYPE_OPTIONS.map((o) => ({ value: o, label: o })),
  },
  {
    key: 'orgType',
    label: 'Loại hình doanh nghiệp (Tổ chức)',
    type: 'select',
    options: INVESTOR_ORG_TYPE_OPTIONS.map((o) => ({ value: o, label: o })),
  },
  {
    key: 'hasFamily',
    label: 'Có quan hệ gia đình',
    type: 'select',
    options: [
      { value: 'yes', label: 'Có' },
      { value: 'no', label: 'Không' },
    ],
  },
];

function matches(row: Investor, v: AdvFilterValues): boolean {
  if (v.kind !== 'all' && row.kind !== v.kind) return false;
  if (v.nationality && !str(row.values.nationality).toLowerCase().includes(v.nationality.toLowerCase())) return false;
  if (v.docType !== 'all' && row.values.docType !== v.docType) return false;
  if (v.orgType !== 'all' && row.values.orgType !== v.orgType) return false;
  if (v.hasFamily !== 'all' && (row.familyRelations.length > 0 ? 'yes' : 'no') !== v.hasFamily) return false;
  return true;
}

function initials(name: string): string {
  return name.trim().split(/\s+/).filter(Boolean).slice(-2).map((w) => w[0]).join('').toUpperCase();
}

export const HsNhaDauTuView: React.FC<UseCaseViewProps> = ({ onNavigate }) => {
  const { issuers, investors } = useDossierStore();
  const filter = useAdvancedFilter(FILTER_FIELDS);
  const [formTarget, setFormTarget] = useState<{ row: Investor | null } | null>(null);
  const [familyId, setFamilyId] = useState<number | null>(null);
  const [portfolioId, setPortfolioId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Investor | null>(null);

  const list = useCatalogList({
    rows: investors.filter((r) => matches(r, filter.applied)),
    searchFields,
    sortValue,
    defaultSort: DEFAULT_SORT,
  });
  const { toasts, pushToast } = useToasts();
  const columns = useColumnVisibility(COLUMNS);

  const nameOf = (id: number) => str(investors.find((i) => i.id === id)?.values.name);

  const save = (kind: InvestorKind, values: Values) => {
    const editing = formTarget?.row;
    const now = new Date().toISOString().slice(0, 10);
    if (editing) {
      updateInvestor(editing.id, (d) => {
        d.values = values;
        d.updatedBy = CURRENT_USER;
        d.updatedDate = now;
      });
      pushToast('success', 'Đã lưu thay đổi hồ sơ nhà đầu tư');
    } else {
      addInvestor({
        id: nextId(investors),
        kind,
        values,
        familyRelations: [],
        statusFlg: 1,
        activeFlg: 1,
        deleteFlg: 0,
        createdBy: CURRENT_USER,
        createdDate: now,
      });
      pushToast('success', 'Đã thêm mới nhà đầu tư');
    }
    setFormTarget(null);
  };

  const addRelation = (baseId: number, otherId: number, relation: string) => {
    updateInvestor(baseId, (d) => d.familyRelations.push({ relatedId: otherId, relation }));
    updateInvestor(otherId, (d) => {
      if (!d.familyRelations.some((r) => r.relatedId === baseId)) {
        d.familyRelations.push({ relatedId: baseId, relation: inverseRelation(relation) });
      }
    });
    pushToast('success', 'Đã thêm quan hệ gia đình');
  };

  const removeRelation = (baseId: number, otherId: number) => {
    updateInvestor(baseId, (d) => (d.familyRelations = d.familyRelations.filter((r) => r.relatedId !== otherId)));
    updateInvestor(otherId, (d) => (d.familyRelations = d.familyRelations.filter((r) => r.relatedId !== baseId)));
  };

  /**
   * Xóa mềm. Chặn khi NĐT còn được gắn vào hồ sơ CP nào đó — xóa đi thì dòng cổ
   * đông ở TCPH trỏ vào một hồ sơ không còn tồn tại.
   */
  const requestDelete = (row: Investor) => {
    const n = findInvestorHoldings(issuers, row.id).length;
    if (n > 0) {
      pushToast('danger', `Không thể xóa: nhà đầu tư đang được gắn vào ${n} mã chứng khoán. Bỏ gắn ở Tổ chức phát hành trước.`);
      return;
    }
    setDeleteTarget(row);
  };

  const confirmDelete = (row: Investor) => {
    row.familyRelations.forEach((r) => removeRelation(row.id, r.relatedId));
    updateInvestor(row.id, (d) => {
      d.deleteFlg = 1;
      d.familyRelations = [];
      d.updatedBy = CURRENT_USER;
      d.updatedDate = new Date().toISOString().slice(0, 10);
    });
    setDeleteTarget(null);
    pushToast('danger', `Đã xóa "${str(row.values.name)}"`);
  };

  const gotoIssuer = (issuerId: number) => {
    requestIssuerOpen({ issuerId, dossierKey: 'cp', holdersTab: true });
    onNavigate?.('uc_hs_tcph');
  };

  const exportRows = () => {
    const rows = [...list.visibleRows];
    exportToCsv(
      'ho-so-nha-dau-tu',
      [
        { header: 'Tên Nhà đầu tư', value: (r: Investor) => str(r.values.name) },
        { header: 'Loại', value: (r: Investor) => (r.kind === 'person' ? 'Cá nhân' : 'Tổ chức') },
        { header: 'CCCD / MST', value: (r: Investor) => str(r.values.docNo) },
        { header: 'Quốc tịch', value: (r: Investor) => str(r.values.nationality) },
        { header: 'Liên hệ', value: (r: Investor) => str(r.values.phone) || str(r.values.email) },
        { header: 'MCK Liên kết', value: (r: Investor) => findInvestorHoldings(issuers, r.id).map((h) => h.stockCode).join('; ') },
        { header: 'Quan hệ gia đình', value: (r: Investor) => r.familyRelations.map((f) => `${nameOf(f.relatedId)} (${f.relation})`).join('; ') },
      ],
      rows,
    );
    pushToast('success', `Xuất dữ liệu thành công (${rows.length} dòng)`);
  };

  const familyInvestor = familyId !== null ? investors.find((i) => i.id === familyId) : undefined;
  const portfolioInvestor = portfolioId !== null ? investors.find((i) => i.id === portfolioId) : undefined;

  return (
    <>
      <CatalogPage
        rootLabel="Quản lý hồ sơ"
        catalogName={UC.menuLabel}
        heading="Hồ sơ Nhà đầu tư"
        subtitle="Dữ liệu định danh tập trung (Single Source of Truth) áp dụng toàn hệ thống · Không lưu vai trò CĐL/NNB/NLQ tại đây"
        actions={
          <button type="button" onClick={() => setFormTarget({ row: null })} className={BTN_PRIMARY}>
            <Plus className="h-4 w-4" />
            Thêm mới Nhà đầu tư
          </button>
        }
      >
        <CatalogToolbar
          keyword={list.draftKeyword}
          onKeyword={list.setDraftKeyword}
          searchPlaceholder="Tìm tên, CCCD/MST, số điện thoại..."
          onSearch={list.applySearch}
          columns={columns}
          onExport={exportRows}
          advancedFilterButton={<AdvancedFilterButton active={filter.open} count={filter.count} onClick={filter.toggle} />}
        />

        {filter.open && (
          <AdvancedFilterPanel fields={FILTER_FIELDS} draft={filter.draft} onChange={filter.setField} onApply={filter.apply} onReset={filter.reset} />
        )}

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-max border-separate border-spacing-0">
            <thead className="bg-[#F9FAFB]">
              <tr>
                {columns.isVisible('stt') && <th className={`${TH_CLASS} w-15 text-center`}>STT</th>}
                {columns.isVisible('name') && <SortableTh label="Tên Nhà đầu tư" sortKey="name" sort={list.sort} onSort={list.changeSort} />}
                {columns.isVisible('kind') && <th className={TH_CLASS}>Loại</th>}
                {columns.isVisible('docNo') && <SortableTh label="CCCD / MST" sortKey="docNo" sort={list.sort} onSort={list.changeSort} />}
                {columns.isVisible('nationality') && <th className={TH_CLASS}>Quốc tịch</th>}
                {columns.isVisible('contact') && <th className={TH_CLASS}>Liên hệ</th>}
                {columns.isVisible('mck') && <th className={TH_CLASS}>MCK Liên kết</th>}
                {columns.isVisible('family') && <th className={TH_CLASS}>Quan hệ gia đình</th>}
                <th className={`${TH_CLASS} text-center`}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {list.pageRows.length === 0 ? (
                <EmptyRow colSpan={columns.visibleCount + 1} title="Không tìm thấy dữ liệu" hint="Thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm" />
              ) : (
                list.pageRows.map((row, idx) => {
                  const name = str(row.values.name);
                  const holdings = findInvestorHoldings(issuers, row.id);
                  const contact = str(row.values.phone) || str(row.values.email);
                  return (
                    <tr key={row.id} className="hover:bg-[#F8FAFC]">
                      {columns.isVisible('stt') && <td className={`${TD_CLASS} text-center text-slate-500`}>{list.startIdx + idx + 1}</td>}
                      {columns.isVisible('name') && (
                        <td className={TD_CLASS}>
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                                row.kind === 'org' ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-[#EDE9FE] text-[#5B21B6]'
                              }`}
                            >
                              {initials(name)}
                            </span>
                            <button type="button" onClick={() => setFormTarget({ row })} className="text-left font-semibold text-[#00663D] hover:underline">
                              {name}
                            </button>
                          </div>
                        </td>
                      )}
                      {columns.isVisible('kind') && (
                        <td className={TD_CLASS}>
                          <span
                            className={`rounded-full px-2.25 py-0.75 text-[11px] font-bold ${
                              row.kind === 'person' ? 'bg-[#F3F4F6] text-[#4B5563]' : 'bg-[#EFF6FF] text-[#1D4ED8]'
                            }`}
                          >
                            {row.kind === 'person' ? 'Cá nhân' : 'Tổ chức'}
                          </span>
                        </td>
                      )}
                      {columns.isVisible('docNo') && <td className={TD_CLASS}>{str(row.values.docNo) || <span className="text-slate-300">-</span>}</td>}
                      {columns.isVisible('nationality') && <td className={TD_CLASS}>{str(row.values.nationality) || <span className="text-slate-300">-</span>}</td>}
                      {columns.isVisible('contact') && <td className={TD_CLASS}>{contact || <span className="text-slate-300">-</span>}</td>}
                      {columns.isVisible('mck') && (
                        <td className={TD_CLASS}>
                          {holdings.length === 0 ? (
                            <span className="text-slate-300">-</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setPortfolioId(row.id)}
                              className="inline-flex items-center gap-1.25 rounded-full border border-[#A7F3D0] bg-[#ECFDF5] px-2.5 py-1 text-xs font-medium text-[#047857] hover:border-[#059669] hover:bg-[#059669] hover:text-white"
                            >
                              <Link2 className="h-3 w-3" />
                              {holdings.length} MCK
                            </button>
                          )}
                        </td>
                      )}
                      {columns.isVisible('family') && (
                        <td className={TD_CLASS}>
                          <button
                            type="button"
                            onClick={() => setFamilyId(row.id)}
                            className="inline-flex items-center gap-1.25 rounded-full border border-[#FBCFE8] bg-[#FDF2F8] px-2.5 py-1 text-[11px] font-semibold text-[#9D174D] hover:bg-[#FCE7F3]"
                          >
                            <Users className="h-3 w-3" />
                            {row.familyRelations.length > 0 ? `${row.familyRelations.length} quan hệ` : 'Gắn quan hệ'}
                          </button>
                        </td>
                      )}
                      <td className={`${TD_CLASS} whitespace-nowrap text-center`}>
                        <RowIconButton label={`Sửa ${name}`} onClick={() => setFormTarget({ row })}>
                          <Pencil className="h-3.5 w-3.5" />
                        </RowIconButton>
                        <RowIconButton label={`Xóa ${name}`} danger onClick={() => requestDelete(row)}>
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

      {formTarget && (
        <InvestorFormModal editing={formTarget.row} investors={investors} onCancel={() => setFormTarget(null)} onSave={save} />
      )}
      {familyInvestor && (
        <FamilyModal
          investor={familyInvestor}
          investors={investors}
          onClose={() => setFamilyId(null)}
          onAdd={(otherId, relation) => addRelation(familyInvestor.id, otherId, relation)}
          onRemove={(otherId) => removeRelation(familyInvestor.id, otherId)}
        />
      )}
      {portfolioInvestor && (
        <PortfolioModal
          investor={portfolioInvestor}
          holdings={findInvestorHoldings(issuers, portfolioInvestor.id)}
          onClose={() => setPortfolioId(null)}
          onGoto={gotoIssuer}
        />
      )}
      {deleteTarget && (
        <ConfirmDeleteDialog
          recordLabel={str(deleteTarget.values.name)}
          note="Hồ sơ được xóa mềm (DELETE_FLG = 1). Các quan hệ gia đình của nhà đầu tư này cũng được gỡ ở cả hai phía."
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => confirmDelete(deleteTarget)}
        />
      )}
      <ToastStack toasts={toasts} />
    </>
  );
};
