/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';

import { findImsUseCaseByCode } from '../../../../lib/imsRoutes';
import { exportToCsv } from '../../../../lib/exportCsv';
import { AdvancedFilterButton, AdvancedFilterPanel, AdvFilterField, AdvFilterValues, useAdvancedFilter } from '../AdvancedFilterPanel';
import {
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
import { CatalogRecord } from '../catalogTypes';
import { useCatalogList } from '../useCatalogList';
import type { UseCaseViewProps } from '../index';
import {
  BUSINESS_TYPE_OPTIONS,
  Values,
  computeRemainingTerm,
  formatDateVN,
  formatNumberVN,
} from './dossierFields';
import { RowIconButton } from './FieldSections';
import { dossierSummary } from './IssuerDetail';
import { requestIssuerOpen, str, updateIssuer, useDossierStore } from './dossierStore';

/**
 * Danh sách trái phiếu — nhóm "Quản lý hồ sơ", CHỈ có ở /ims.
 *
 * Theo `MODULES.danhsachtraiphieu` + `buildBondListData` của
 * `docs/quan-ly-danh-muc_80.html`: KHÔNG có dữ liệu riêng, tổng hợp live toàn bộ
 * hồ sơ TPRL của mọi TCPH. Không có nút Thêm mới — trái phiếu luôn được tạo
 * trong hồ sơ của một TCPH. Sửa/xem dẫn sang đúng hồ sơ đó ở màn Tổ chức phát
 * hành.
 *
 * Chạy song song với `BondModule` (tttp_*) cũ, không dùng chung dữ liệu.
 */
const UC = findImsUseCaseByCode('uc_hs_dstp')!;
const DEFAULT_SORT: SortState = { key: 'issueDate', dir: 'desc' };

interface BondRow extends CatalogRecord {
  issuerId: number;
  dossierKey: string;
  issuerIdx: number;
  v: Values;
  issuerShortName: string;
  issuerName: string;
  issuerBusinessType: string;
  issuerIndustry: string;
  statusLabel: string;
}

type Col = { key: string; label: string; value: (r: BondRow) => string; num?: boolean; sortable?: boolean };

const yesNo = (b: unknown) => (b ? 'Có' : 'Không');
const bv = (k: string) => (r: BondRow) => str(r.v[k]);
const bd = (k: string) => (r: BondRow) => formatDateVN(r.v[k]);
const bn = (k: string) => (r: BondRow) => formatNumberVN(r.v[k]);

/** 48 cột, đúng thứ tự `MODULES.danhsachtraiphieu.columns` của file mẫu. */
const COLS: readonly Col[] = [
  { key: 'bondName', label: 'Tên trái phiếu', value: bv('bondName') },
  { key: 'issuerShortName', label: 'Mã doanh nghiệp', value: (r) => r.issuerShortName, sortable: true },
  { key: 'issuerName', label: 'Tên doanh nghiệp', value: (r) => r.issuerName, sortable: true },
  { key: 'issuerBusinessType', label: 'Loại hình doanh nghiệp', value: (r) => r.issuerBusinessType },
  { key: 'issuerIndustry', label: 'Loại ngành', value: (r) => r.issuerIndustry },
  { key: 'issuerIndustry2', label: 'Loại hình DN (theo ngành nghề)', value: (r) => r.issuerIndustry },
  { key: 'currency', label: 'Tiền tệ', value: bv('currency') },
  { key: 'faceValue', label: 'Mệnh giá', value: bn('faceValue'), num: true },
  { key: 'termValue', label: 'Kỳ hạn', value: bv('termValue') },
  { key: 'termUnit', label: 'Đơn vị kỳ hạn', value: bv('termUnit') },
  { key: 'remainingTerm', label: 'Kỳ hạn còn lại', value: (r) => computeRemainingTerm(r.v.maturityDate) },
  { key: 'issueValue', label: 'Giá trị phát hành', value: bn('issueValue'), num: true },
  { key: 'outstandingValue', label: 'Giá trị lưu hành', value: bn('outstandingValue'), num: true },
  { key: 'issueDate', label: 'Ngày phát hành', value: bd('issueDate'), sortable: true },
  { key: 'maturityDate', label: 'Ngày đáo hạn', value: bd('maturityDate'), sortable: true },
  { key: 'issueMethod', label: 'Phương thức phát hành', value: bv('issueMethod') },
  { key: 'bondClass', label: 'TP thường/ TP xanh', value: bv('bondClass') },
  { key: 'principalPaymentMethod', label: 'Phương thức thanh toán gốc', value: bv('principalPaymentMethod') },
  { key: 'interestPaymentMethod', label: 'Phương thức thanh toán lãi', value: bv('interestPaymentMethod') },
  { key: 'nominalInterestRate', label: 'Lãi suất danh nghĩa (%/Năm)', value: bn('nominalInterestRate'), num: true },
  { key: 'actualIssueInterestRate', label: 'Lãi suất phát hành thực tế (%/Năm)', value: bn('actualIssueInterestRate'), num: true },
  { key: 'interestPaymentType', label: 'Loại hình trả lãi', value: bv('interestPaymentType') },
  { key: 'interestRateType', label: 'Loại lãi suất', value: bv('interestRateType') },
  { key: 'interestPeriodCombined', label: 'Kỳ hạn trả lãi', value: (r) => (r.v.interestPeriod ? `${r.v.interestPeriod} ${str(r.v.interestPeriodUnit)}`.trim() : '') },
  { key: 'firstInterestPaymentDate', label: 'Ngày trả lãi đầu tiên', value: bd('firstInterestPaymentDate') },
  { key: 'isConvertible', label: 'Trái phiếu chuyển đổi', value: (r) => yesNo(r.v.isConvertible) },
  { key: 'conversionRatio', label: 'Tỷ lệ chuyển đổi', value: bn('conversionRatio'), num: true },
  { key: 'hasWarrant', label: 'Trái phiếu kèm chứng quyền', value: (r) => yesNo(r.v.hasWarrant) },
  { key: 'warrantExerciseRatio', label: 'Tỷ lệ thực hiện quyền', value: bn('warrantExerciseRatio'), num: true },
  { key: 'isSecured', label: 'Trái phiếu bảo đảm', value: (r) => yesNo(r.v.isSecured) },
  { key: 'securityForm', label: 'Hình thức bảo đảm', value: bv('securityForm') },
  { key: 'buybackSwapInfo', label: 'Mua lại/ hoán đổi', value: bv('buybackSwapInfo') },
  { key: 'bondForm', label: 'Hình thức trái phiếu', value: bv('bondForm') },
  { key: 'custodian', label: 'Tổ chức lưu ký', value: bv('custodian') },
  { key: 'statusLabel', label: 'Trạng thái lưu hành trên hệ thống', value: (r) => r.statusLabel },
  { key: 'tradingCode', label: 'Mã giao dịch', value: bv('tradingCode') },
  { key: 'isinCode', label: 'Mã ISIN', value: bv('isinCode') },
  { key: 'registrationStatus', label: 'Trạng thái ĐKGD', value: bv('registrationStatus') },
  { key: 'tprlFirstTradingDate', label: 'Ngày giao dịch đầu tiên', value: bd('tprlFirstTradingDate') },
  { key: 'tprlLastTradingDate', label: 'Ngày giao dịch cuối cùng', value: bd('tprlLastTradingDate') },
  { key: 'interestRecordCycle', label: 'Chu kỳ chốt quyền trả lãi (Ngày làm việc)', value: bn('interestRecordCycle'), num: true },
  { key: 'cancelRecordCycle', label: 'Chu kỳ chốt hủy ĐKGD (Ngày làm việc)', value: bn('cancelRecordCycle'), num: true },
  { key: 'registeredVolume', label: 'Khối lượng ĐKGD', value: bn('registeredVolume'), num: true },
  { key: 'tradingEligibility', label: 'Đối tượng giao dịch trái phiếu', value: bv('tradingEligibility') },
  { key: 'createdBy', label: 'Người tạo', value: () => 'Admin' },
  { key: 'createdDate', label: 'Ngày tạo', value: (r) => formatDateVN(r.v.createdDate || r.v.issueDate) },
];

const COLUMN_SPECS: readonly ColumnSpec[] = [
  { key: 'stt', label: 'STT' },
  { key: 'bondCode', label: 'Mã trái phiếu' },
  ...COLS.map((c) => ({ key: c.key, label: c.label })),
];

function sortValue(row: BondRow, key: string): string | number {
  switch (key) {
    case 'bondCode':
      return str(row.v.bondCode).toLowerCase();
    case 'issuerShortName':
      return row.issuerShortName.toLowerCase();
    case 'issuerName':
      return row.issuerName.toLowerCase();
    case 'maturityDate':
      return str(row.v.maturityDate);
    default:
      return str(row.v.issueDate);
  }
}

const searchFields = (r: BondRow) => [str(r.v.bondCode), str(r.v.bondName), r.issuerShortName, r.issuerName];

/** `MODULES.danhsachtraiphieu.filterFields` của file mẫu — không có trường trạng thái riêng, `statusLabel` đã là một tiêu chí lọc. */
const FILTER_FIELDS: readonly AdvFilterField[] = [
  { key: 'issuerBusinessType', label: 'Loại hình doanh nghiệp', type: 'select', options: BUSINESS_TYPE_OPTIONS.map((o) => ({ value: o, label: o })) },
  {
    key: 'bondClass',
    label: 'TP thường / TP xanh',
    type: 'select',
    options: [
      { value: 'TP thường', label: 'TP thường' },
      { value: 'TP xanh', label: 'TP xanh' },
    ],
  },
  {
    key: 'interestRateType',
    label: 'Loại lãi suất',
    type: 'select',
    options: [
      { value: 'Cố định', label: 'Cố định' },
      { value: 'Thả nổi', label: 'Thả nổi' },
      { value: 'Kết hợp', label: 'Kết hợp' },
    ],
  },
  {
    key: 'isSecured',
    label: 'Trái phiếu bảo đảm',
    type: 'select',
    options: [
      { value: 'Có', label: 'Có' },
      { value: 'Không', label: 'Không' },
    ],
  },
  {
    key: 'statusLabel',
    label: 'Trạng thái lưu hành',
    type: 'select',
    options: [
      { value: 'Đang lưu hành', label: 'Đang lưu hành' },
      { value: 'Đã đáo hạn', label: 'Đã đáo hạn' },
    ],
  },
];

function matches(r: BondRow, v: AdvFilterValues): boolean {
  if (v.issuerBusinessType !== 'all' && r.issuerBusinessType !== v.issuerBusinessType) return false;
  if (v.bondClass !== 'all' && r.v.bondClass !== v.bondClass) return false;
  if (v.interestRateType !== 'all' && r.v.interestRateType !== v.interestRateType) return false;
  if (v.isSecured !== 'all' && yesNo(r.v.isSecured) !== v.isSecured) return false;
  if (v.statusLabel !== 'all' && r.statusLabel !== v.statusLabel) return false;
  return true;
}

const STICKY_STT = 'sticky left-0 z-10 w-15 min-w-15 bg-white';
const STICKY_CODE = 'sticky left-15 z-10 min-w-40 bg-white shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]';
const STICKY_ACT = 'sticky right-0 z-10 bg-white text-center shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.08)]';

export const HsDanhSachTraiPhieuView: React.FC<UseCaseViewProps> = ({ onNavigate }) => {
  const { issuers } = useDossierStore();
  const filter = useAdvancedFilter(FILTER_FIELDS);
  const [deleteTarget, setDeleteTarget] = useState<BondRow | null>(null);

  const rows = useMemo<BondRow[]>(() => {
    const out: BondRow[] = [];
    issuers.forEach((iss) => {
      if (iss.deleteFlg === 1) return;
      iss.dossiers.tprl.forEach((d, idx) => {
        out.push({
          id: out.length + 1,
          statusFlg: 1,
          activeFlg: 1,
          deleteFlg: 0,
          createdBy: 'Admin',
          createdDate: str(d.values.issueDate),
          issuerId: iss.id,
          dossierKey: `tprl-${idx}`,
          issuerIdx: idx,
          v: d.values,
          issuerShortName: str(iss.values.shortName),
          issuerName: str(iss.values.name),
          issuerBusinessType: str(iss.values.businessType),
          issuerIndustry: str(iss.values.industry),
          statusLabel: dossierSummary('tprl', d.values).label,
        });
      });
    });
    return out;
  }, [issuers]);

  const list = useCatalogList({ rows: rows.filter((r) => matches(r, filter.applied)), searchFields, sortValue, defaultSort: DEFAULT_SORT });
  const { toasts, pushToast } = useToasts();
  const columns = useColumnVisibility(COLUMN_SPECS);
  const visibleCols = COLS.filter((c) => columns.isVisible(c.key));

  const goto = (r: BondRow, edit = false) => {
    requestIssuerOpen({ issuerId: r.issuerId, dossierKey: r.dossierKey, edit });
    onNavigate?.('uc_hs_tcph');
  };

  const confirmDelete = (r: BondRow) => {
    updateIssuer(r.issuerId, (d) => d.dossiers.tprl.splice(r.issuerIdx, 1));
    setDeleteTarget(null);
    pushToast('danger', `Đã xóa trái phiếu "${str(r.v.bondCode)}"`);
  };

  const exportRows = () => {
    const data = [...list.visibleRows];
    exportToCsv(
      'danh-sach-trai-phieu',
      [{ header: 'Mã trái phiếu', value: (r: BondRow) => str(r.v.bondCode) }, ...COLS.map((c) => ({ header: c.label, value: c.value }))],
      data,
    );
    pushToast('success', `Xuất dữ liệu thành công (${data.length} dòng)`);
  };

  return (
    <>
      <CatalogPage
        rootLabel="Quản lý hồ sơ"
        catalogName={UC.menuLabel}
        heading="Danh sách trái phiếu"
        subtitle="Tổng hợp toàn bộ trái phiếu riêng lẻ từ mọi tổ chức phát hành"
        actions={null}
      >
        <CatalogToolbar
          keyword={list.draftKeyword}
          onKeyword={list.setDraftKeyword}
          searchPlaceholder="Tìm mã trái phiếu, tên trái phiếu, mã doanh nghiệp..."
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
                {columns.isVisible('stt') && <th className={`${TH_CLASS} ${STICKY_STT} bg-[#F9FAFB] text-center`}>STT</th>}
                {columns.isVisible('bondCode') && (
                  <SortableTh label="Mã trái phiếu" sortKey="bondCode" sort={list.sort} onSort={list.changeSort} className={`${STICKY_CODE} bg-[#F9FAFB]`} />
                )}
                {visibleCols.map((c) =>
                  c.sortable ? (
                    <SortableTh key={c.key} label={c.label} sortKey={c.key} sort={list.sort} onSort={list.changeSort} />
                  ) : (
                    <th key={c.key} className={`${TH_CLASS} ${c.num ? 'text-right' : ''}`}>{c.label}</th>
                  ),
                )}
                <th className={`${TH_CLASS} ${STICKY_ACT} bg-[#F9FAFB]`}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {list.pageRows.length === 0 ? (
                <EmptyRow colSpan={columns.visibleCount + 1} title="Không tìm thấy dữ liệu" hint="Thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm" />
              ) : (
                list.pageRows.map((r, idx) => {
                  const code = str(r.v.bondCode);
                  return (
                    <tr key={`${r.issuerId}-${r.dossierKey}`} className="group hover:bg-[#F8FAFC]">
                      {columns.isVisible('stt') && (
                        <td className={`${TD_CLASS} ${STICKY_STT} text-center text-slate-500 group-hover:bg-[#F8FAFC]`}>{list.startIdx + idx + 1}</td>
                      )}
                      {columns.isVisible('bondCode') && (
                        <td className={`${TD_CLASS} ${STICKY_CODE} group-hover:bg-[#F8FAFC]`}>
                          <button type="button" onClick={() => goto(r)} className="font-semibold text-[#00663D] hover:underline">
                            {code}
                          </button>
                        </td>
                      )}
                      {visibleCols.map((c) => {
                        const val = c.value(r);
                        return (
                          <td key={c.key} className={`${TD_CLASS} whitespace-nowrap ${c.num ? 'text-right tabular-nums' : ''}`}>
                            {val || <span className="text-slate-300">-</span>}
                          </td>
                        );
                      })}
                      <td className={`${TD_CLASS} ${STICKY_ACT} whitespace-nowrap group-hover:bg-[#F8FAFC]`}>
                        <RowIconButton label={`Sửa ${code}`} onClick={() => goto(r, true)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </RowIconButton>
                        <RowIconButton label={`Xóa ${code}`} danger onClick={() => setDeleteTarget(r)}>
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

      {deleteTarget && (
        <ConfirmDeleteDialog
          recordLabel={`trái phiếu ${str(deleteTarget.v.bondCode)}`}
          note={`Hồ sơ TPRL bị xóa khỏi tổ chức phát hành ${deleteTarget.issuerShortName}. Hành động này không thể hoàn tác.`}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => confirmDelete(deleteTarget)}
        />
      )}
      <ToastStack toasts={toasts} />
    </>
  );
};
