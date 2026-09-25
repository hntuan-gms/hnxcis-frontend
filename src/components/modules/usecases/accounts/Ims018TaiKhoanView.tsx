/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Eye, Filter, History, Info, KeyRound, Pencil, Plus, Trash2 } from 'lucide-react';

import type { UserAccount, UserRoleCode } from '../../../../types/hnx';
import { findImsUseCaseByCode } from '../../../../lib/imsRoutes';
import { exportToCsv } from '../../../../lib/exportCsv';
import {
  BTN_OUTLINE,
  BTN_PRIMARY,
  CatalogPage,
  CatalogToolbar,
  ColumnSpec,
  ConfirmDeleteDialog,
  EmptyRow,
  SELECT_CLASS,
  INPUT_CLASS,
  SortState,
  SortableTh,
  StatusPill,
  TD_CLASS,
  TH_CLASS,
  TablePager,
  ToastStack,
  useColumnVisibility,
  useToasts,
} from '../catalogUi';
import { Flag, STATUS_OPTIONS } from '../catalogTypes';
import { useCatalogList } from '../useCatalogList';
import { useDossierStore } from '../dossier/dossierStore';
import { useRelatedOrgRows } from '../relatedOrgStore';
import {
  createAccount,
  deleteAccount,
  resetPassword,
  takeAccountCreateRequest,
  updateAccount,
  useAccountStore,
} from './accountStore';
import {
  AccountDraft,
  AccountRow,
  AccountType,
  DEPARTMENT_OPTIONS,
  DepartmentCode,
  INTERNAL_ROLES,
  ORG_TYPE_OPTIONS,
  OrgType,
  TwoFactorMethod,
  actorFor,
  canManageAccount,
  canManageExternal,
  creatableInternalLevels,
  departmentLabel,
  externalRolesForLevel,
  formatDate,
  isVisibleTo,
  levelLabel,
  roleLabel,
} from './accountTypes';
import { AccountFormModal, AccountFormPrefill } from './AccountFormModal';
import {
  AccountHistoryModal,
  PasswordIssuedDialog,
  ResetPasswordModal,
  ResetPasswordResult,
} from './AccountDialogs';

/**
 * SRS: `docs/srs/[IMS-018] Quản lý tài khoản.md`
 *
 * Màn "Quản lý tài khoản" của IMS — IMS-018-1.1 (tab Tài khoản nội bộ) và
 * IMS-018-1.2 (tab Tài khoản tổ chức), cùng các popup mở từ đây: Thêm mới/Cập
 * nhật (2.1, 2.2), Xem lịch sử (1.4), Đặt lại mật khẩu (6.1).
 *
 * Phạm vi dữ liệu (Bảng 04 mục 4, 5): Admin hệ thống thấy toàn bộ; chuyên viên
 * chỉ thấy tài khoản nội bộ của phòng mình; tab tổ chức ai cũng thấy đủ. Quyền
 * tạo/sửa theo luật cấp độ ở `accountTypes.ts`.
 *
 * GIAI ĐOẠN UI TĨNH: dữ liệu ở `accountStore.ts`, chưa gọi `api/iam/accounts`.
 */
const UC = findImsUseCaseByCode('uc_ims_018')!;

const DEFAULT_SORT: SortState = { key: 'createdDate', dir: 'desc' };

function sortValue(row: AccountRow, key: string): string | number {
  switch (key) {
    case 'loginName':
      return row.loginName.toLowerCase();
    case 'fullName':
      return row.fullName.toLowerCase();
    default:
      return row.createdDate;
  }
}

/** Bảng 04 mục 2: "Tìm kiếm tương đối theo tên đăng nhập, email và các giá trị khác trong bảng". */
const searchFields = (row: AccountRow) => [
  row.loginName,
  row.fullName,
  row.email,
  row.phone,
  row.orgName,
  departmentLabel(row.department),
  roleLabel(row.role),
];

const COMMON_HEAD: readonly ColumnSpec[] = [
  { key: 'stt', label: 'STT' },
  { key: 'loginName', label: 'Tên tài khoản' },
  { key: 'fullName', label: 'Họ và tên' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Số điện thoại' },
];

const COMMON_TAIL: readonly ColumnSpec[] = [
  { key: 'role', label: 'Vai trò' },
  { key: 'level', label: 'Cấp độ' },
  { key: 'ga', label: 'GA' },
  { key: 'ca', label: 'CA' },
  { key: 'sms', label: 'SMS' },
  { key: 'status', label: 'Trạng thái' },
  { key: 'createdDate', label: 'Ngày tạo' },
];

const INTERNAL_COLUMNS: readonly ColumnSpec[] = [...COMMON_HEAD, { key: 'department', label: 'Phòng ban' }, ...COMMON_TAIL];

const EXTERNAL_COLUMNS: readonly ColumnSpec[] = [
  ...COMMON_HEAD,
  { key: 'orgName', label: 'Tên tổ chức' },
  { key: 'orgType', label: 'Loại tổ chức' },
  ...COMMON_TAIL,
];

/* ------------------------------------------------------- lọc nâng cao */

interface AdvancedFilter {
  loginName: string;
  fullName: string;
  department: DepartmentCode | '';
  orgType: OrgType | '';
  role: UserRoleCode | '';
  level: '' | '1' | '2' | '3';
  status: 'all' | Flag;
}

const EMPTY_FILTER: AdvancedFilter = {
  loginName: '',
  fullName: '',
  department: '',
  orgType: '',
  role: '',
  level: '',
  status: 'all',
};

function matchesFilter(row: AccountRow, f: AdvancedFilter): boolean {
  const has = (value: string, q: string) => value.toLowerCase().includes(q.trim().toLowerCase());
  if (f.loginName.trim() && !has(row.loginName, f.loginName)) return false;
  if (f.fullName.trim() && !has(row.fullName, f.fullName)) return false;
  if (row.accountType === 'INTERNAL' && f.department && row.department !== f.department) return false;
  if (row.accountType === 'EXTERNAL' && f.orgType && row.orgType !== f.orgType) return false;
  if (f.role && row.role !== f.role) return false;
  if (f.level && row.level !== Number(f.level)) return false;
  return true;
}

function activeFilterCount(f: AdvancedFilter, tab: AccountType): number {
  return [
    f.loginName.trim(),
    f.fullName.trim(),
    tab === 'INTERNAL' ? f.department : f.orgType,
    f.role,
    f.level,
    f.status === 'all' ? '' : 'x',
  ].filter(Boolean).length;
}

const FILTER_LABEL = 'mb-1.5 block text-[12.5px] font-medium text-[#525252]';

/** `.adv-filter-panel` của `docs/quan-ly-danh-muc_80.html` — lưới 4 cột, nền xám nhạt. */
const AdvancedFilterPanel: React.FC<{
  tab: AccountType;
  value: AdvancedFilter;
  onChange: (value: AdvancedFilter) => void;
  onApply: () => void;
  onReset: () => void;
}> = ({ tab, value, onChange, onApply, onReset }) => {
  const set = <K extends keyof AdvancedFilter>(key: K, v: AdvancedFilter[K]) => onChange({ ...value, [key]: v });
  const roles = tab === 'INTERNAL' ? INTERNAL_ROLES : [...externalRolesForLevel(1), ...externalRolesForLevel(3)];

  return (
    <div
      className="mb-4 grid gap-x-5 gap-y-4 rounded-[10px] border border-slate-200 bg-[#F5F6F7] px-5 pt-4.5 pb-5 sm:grid-cols-2 lg:grid-cols-4"
      onKeyDown={(e) => {
        if (e.key === 'Enter') onApply();
      }}
    >
      <div>
        <label className={FILTER_LABEL}>Tên tài khoản</label>
        <input value={value.loginName} onChange={(e) => set('loginName', e.target.value)} placeholder="Nhập tên tài khoản" className={INPUT_CLASS} />
      </div>
      <div>
        <label className={FILTER_LABEL}>Họ và tên</label>
        <input value={value.fullName} onChange={(e) => set('fullName', e.target.value)} placeholder="Nhập họ và tên" className={INPUT_CLASS} />
      </div>
      {tab === 'INTERNAL' ? (
        <div>
          <label className={FILTER_LABEL}>Phòng ban</label>
          <select value={value.department} onChange={(e) => set('department', e.target.value as DepartmentCode | '')} className={SELECT_CLASS}>
            <option value="">Tất cả</option>
            {DEPARTMENT_OPTIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div>
          <label className={FILTER_LABEL}>Loại tổ chức</label>
          <select value={value.orgType} onChange={(e) => set('orgType', e.target.value as OrgType | '')} className={SELECT_CLASS}>
            <option value="">Tất cả</option>
            {ORG_TYPE_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className={FILTER_LABEL}>Vai trò</label>
        <select value={value.role} onChange={(e) => set('role', e.target.value as UserRoleCode | '')} className={SELECT_CLASS}>
          <option value="">Tất cả</option>
          {roles.map((r) => (
            <option key={r} value={r}>
              {roleLabel(r)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={FILTER_LABEL}>Cấp độ</label>
        <select value={value.level} onChange={(e) => set('level', e.target.value as AdvancedFilter['level'])} className={SELECT_CLASS}>
          <option value="">Tất cả</option>
          {([1, 2, 3] as const).map((l) => (
            <option key={l} value={String(l)}>
              {levelLabel(l, tab)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={FILTER_LABEL}>Trạng thái</label>
        <select
          value={String(value.status)}
          onChange={(e) => set('status', e.target.value === 'all' ? 'all' : (Number(e.target.value) as Flag))}
          className={SELECT_CLASS}
        >
          <option value="all">Tất cả</option>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-end gap-2 lg:col-span-2">
        <button type="button" className={BTN_OUTLINE} onClick={onReset}>
          Làm mới
        </button>
        <button type="button" className={BTN_PRIMARY} onClick={onApply}>
          Tìm kiếm
        </button>
      </div>
    </div>
  );
};

/* ---------------------------------------------------------- ô GA/CA/SMS */

/** Bảng 04 mục 19–20: "đăng ký" / "không đăng ký" — hiện dấu tích như Hình 1.1. */
const TwoFactorCell: React.FC<{ row: AccountRow; method: TwoFactorMethod }> = ({ row, method }) =>
  row.twoFactor === method ? (
    <span title="Đăng ký" className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#E6F4EA] text-[#1E7A42]">
      <CheckCircle2 className="h-4 w-4" />
      <span className="sr-only">Đăng ký</span>
    </span>
  ) : (
    <span title="Không đăng ký" className="text-slate-300">
      <span className="sr-only">Không đăng ký</span>
    </span>
  );

/* ------------------------------------------------------------- màn hình */

type FormTarget = { accountType: AccountType; row: AccountRow | null; prefill?: AccountFormPrefill | null; readOnly: boolean };

type Issued = { title: string; loginName: string; password: string; emailTo: string | null };

interface Ims018TaiKhoanViewProps {
  currentUser?: UserAccount;
}

export const Ims018TaiKhoanView: React.FC<Ims018TaiKhoanViewProps> = ({ currentUser }) => {
  const { accounts, audit } = useAccountStore();
  const { issuers } = useDossierStore();
  const [relatedOrgs] = useRelatedOrgRows();

  const actor = useMemo(
    () =>
      currentUser
        ? actorFor(currentUser, accounts)
        : { loginName: 'unknown', displayName: '', isSystemAdmin: false, department: null, level: 1 as const },
    [currentUser, accounts],
  );
  const by = actor.loginName;

  const [tab, setTab] = useState<AccountType>('INTERNAL');
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftFilter, setDraftFilter] = useState<AdvancedFilter>(EMPTY_FILTER);
  const [appliedFilter, setAppliedFilter] = useState<AdvancedFilter>(EMPTY_FILTER);

  const scoped = useMemo(() => accounts.filter((a) => a.deleteFlg === 0 && isVisibleTo(actor, a)), [accounts, actor]);
  const counts = {
    INTERNAL: scoped.filter((a) => a.accountType === 'INTERNAL').length,
    EXTERNAL: scoped.filter((a) => a.accountType === 'EXTERNAL').length,
  };
  const tabRows = useMemo(
    () => scoped.filter((a) => a.accountType === tab && matchesFilter(a, appliedFilter)),
    [scoped, tab, appliedFilter],
  );

  const list = useCatalogList({ rows: tabRows, searchFields, sortValue, defaultSort: DEFAULT_SORT });

  const internalColumns = useColumnVisibility(INTERNAL_COLUMNS);
  const externalColumns = useColumnVisibility(EXTERNAL_COLUMNS);
  const columns = tab === 'INTERNAL' ? internalColumns : externalColumns;

  const [formTarget, setFormTarget] = useState<FormTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AccountRow | null>(null);
  const [resetTarget, setResetTarget] = useState<AccountRow | null>(null);
  const [historyTarget, setHistoryTarget] = useState<AccountRow | null>(null);
  const [issued, setIssued] = useState<Issued | null>(null);

  const { toasts, pushToast } = useToasts();

  const orgSuggestions = useMemo(
    () =>
      [...new Set([...issuers.filter((i) => i.deleteFlg === 0).map((i) => String(i.values.name ?? '')), ...relatedOrgs.filter((r) => r.deleteFlg === 0).map((r) => r.name)])]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, 'vi')),
    [issuers, relatedOrgs],
  );

  /** "Tạo tài khoản" từ widget Trang chủ (IMS-018-8) — mở sẵn popup tài khoản tổ chức. */
  useEffect(() => {
    const req = takeAccountCreateRequest();
    if (!req) return;
    setTab('EXTERNAL');
    setFormTarget({ accountType: 'EXTERNAL', row: null, prefill: req, readOnly: false });
  }, []);

  /* --- quyền ở cấp màn hình --- */

  const internalCreateBlocked = actor.isSystemAdmin
    ? null
    : !actor.department
      ? 'Tài khoản đang đăng nhập chưa gắn phòng ban nên không tạo được tài khoản nội bộ'
      : creatableInternalLevels(actor, actor.department).length === 0
        ? 'Tài khoản cấp 3 Phòng Trái phiếu chỉ được xem, không tạo được tài khoản'
        : null;
  const externalCreateBlocked = canManageExternal(actor)
    ? null
    : actor.department === 'TP'
      ? 'Tài khoản cấp 3 Phòng Trái phiếu chỉ được xem, không tạo được tài khoản'
      : 'Tài khoản đang đăng nhập không có quyền tạo tài khoản tổ chức';
  const createBlocked = tab === 'INTERNAL' ? internalCreateBlocked : externalCreateBlocked;

  /* --- thao tác --- */

  const switchTab = (next: AccountType) => {
    setTab(next);
    list.setPage(1);
  };

  const applyFilter = () => {
    setAppliedFilter(draftFilter);
    list.applyStatus(draftFilter.status);
  };

  const resetFilter = () => {
    setDraftFilter(EMPTY_FILTER);
    setAppliedFilter(EMPTY_FILTER);
    list.resetFilters();
  };

  const openRow = (row: AccountRow) =>
    setFormTarget({ accountType: row.accountType, row, readOnly: !canManageAccount(actor, row) });

  const saveAccount = (draft: AccountDraft) => {
    const editing = formTarget?.row ?? null;
    if (editing) {
      updateAccount(editing.id, draft, by);
      pushToast('success', `Đã cập nhật tài khoản “${editing.loginName}”`);
    } else {
      const { account, tempPassword } = createAccount(draft, by);
      pushToast('success', `Đã tạo tài khoản “${account.loginName}”`);
      setIssued({ title: 'Tạo tài khoản thành công', loginName: account.loginName, password: tempPassword, emailTo: account.email });
    }
    setFormTarget(null);
  };

  const confirmReset = (row: AccountRow, result: ResetPasswordResult) => {
    resetPassword(row.id, result.password, by, result.mode, result.emailTo);
    setResetTarget(null);
    setIssued({ title: 'Đã đặt lại mật khẩu', loginName: row.loginName, password: result.password, emailTo: result.emailTo });
  };

  const confirmDelete = (row: AccountRow) => {
    deleteAccount(row.id, by);
    setDeleteTarget(null);
    pushToast('danger', `Đã xóa tài khoản “${row.loginName}”`);
  };

  const exportRows = () => {
    const yesNo = (m: TwoFactorMethod) => (r: AccountRow) => (r.twoFactor === m ? 'Đăng ký' : 'Không đăng ký');
    exportToCsv(
      tab === 'INTERNAL' ? 'tai-khoan-noi-bo' : 'tai-khoan-to-chuc',
      [
        { header: 'Tên tài khoản', value: (r: AccountRow) => r.loginName },
        { header: 'Họ và tên', value: (r: AccountRow) => r.fullName },
        { header: 'Email', value: (r: AccountRow) => r.email },
        { header: 'Số điện thoại', value: (r: AccountRow) => r.phone },
        ...(tab === 'INTERNAL'
          ? [{ header: 'Phòng ban', value: (r: AccountRow) => departmentLabel(r.department) }]
          : [
              { header: 'Tên tổ chức', value: (r: AccountRow) => r.orgName },
              { header: 'Loại tổ chức', value: (r: AccountRow) => r.orgType ?? '' },
            ]),
        { header: 'Vai trò', value: (r: AccountRow) => roleLabel(r.role) },
        { header: 'Cấp độ', value: (r: AccountRow) => levelLabel(r.level, r.accountType) },
        { header: 'GA', value: yesNo('GA') },
        { header: 'CA', value: yesNo('CA') },
        { header: 'SMS', value: yesNo('SMS') },
        { header: 'Trạng thái', value: (r: AccountRow) => (r.statusFlg === 1 ? 'Đang hoạt động' : 'Ngừng hoạt động') },
        { header: 'Ngày tạo', value: (r: AccountRow) => formatDate(r.createdDate) },
      ],
      [...list.visibleRows],
    );
    pushToast('success', `Xuất dữ liệu thành công (${list.visibleRows.length} dòng)`);
  };

  /* --- render --- */

  const filterCount = activeFilterCount({ ...appliedFilter, status: list.draftStatus }, tab);
  const iconBtn = 'inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400';
  const show = columns.isVisible;

  return (
    <>
      <CatalogPage
        catalogName={UC.menuLabel}
        rootLabel="Quản lý tài khoản"
        heading="Quản lý tài khoản"
        subtitle="Quản lý tài khoản đăng nhập hệ thống — nội bộ và tổ chức thành viên"
        actions={
          <button
            type="button"
            onClick={() => setFormTarget({ accountType: tab, row: null, readOnly: false })}
            disabled={!!createBlocked}
            title={createBlocked ?? undefined}
            className={BTN_PRIMARY}
          >
            <Plus className="h-4 w-4" />
            Thêm mới
          </button>
        }
      >
        {/* Hai tab — Bảng 04 mục 4, 5. Tab nội bộ mặc định chọn khi vào màn hình. */}
        <div role="tablist" className="mb-4 flex gap-6 border-b border-slate-200">
          {(['INTERNAL', 'EXTERNAL'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => switchTab(t)}
              className={`-mb-px flex items-center gap-2 border-b-2 px-1 pb-2.5 text-sm font-medium ${
                tab === t ? 'border-[#008A4B] text-[#1E7A42]' : 'border-transparent text-[#525252] hover:text-[#292929]'
              }`}
            >
              {t === 'INTERNAL' ? 'Tài khoản nội bộ' : 'Tài khoản tổ chức'}
              <span className="rounded-full bg-[#E6F4EA] px-2 py-0.5 text-[11px] font-semibold text-[#1E7A42]">{counts[t]}</span>
            </button>
          ))}
        </div>

        {tab === 'INTERNAL' && !actor.isSystemAdmin && (
          <p className="mb-3 flex items-center gap-1.5 text-[12.5px] text-[#525252]">
            <Info className="h-3.5 w-3.5 shrink-0" />
            {actor.department
              ? `Đang hiển thị tài khoản nội bộ của ${departmentLabel(actor.department)} — Admin hệ thống xem được toàn bộ.`
              : 'Tài khoản đang đăng nhập chưa gắn phòng ban nên không xem được tài khoản nội bộ nào.'}
          </p>
        )}

        <CatalogToolbar
          keyword={list.draftKeyword}
          onKeyword={list.setDraftKeyword}
          onSearch={list.applySearch}
          searchPlaceholder="Tìm tên tài khoản, họ tên, email..."
          columns={columns}
          onExport={exportRows}
          extraActions={
            <button
              type="button"
              onClick={() => {
                if (!filterOpen) setDraftFilter({ ...appliedFilter, status: list.draftStatus });
                setFilterOpen((v) => !v);
              }}
              aria-expanded={filterOpen}
              className={`${BTN_OUTLINE} ${filterOpen ? 'border-[#22AF73] text-[#1E7A42]' : ''}`}
            >
              <Filter className="h-4 w-4" />
              Lọc nâng cao
              {filterCount > 0 && (
                <span className="rounded-full bg-[#008A4B] px-1.5 text-[11px] font-semibold text-white">{filterCount}</span>
              )}
            </button>
          }
        />

        {filterOpen && (
          <AdvancedFilterPanel tab={tab} value={draftFilter} onChange={setDraftFilter} onApply={applyFilter} onReset={resetFilter} />
        )}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {show('stt') && <th className={`${TH_CLASS} w-15 text-center`}>STT</th>}
                {show('loginName') && <SortableTh label="Tên tài khoản" sortKey="loginName" sort={list.sort} onSort={list.changeSort} />}
                {show('fullName') && <SortableTh label="Họ và tên" sortKey="fullName" sort={list.sort} onSort={list.changeSort} />}
                {show('email') && <th className={TH_CLASS}>Email</th>}
                {show('phone') && <th className={TH_CLASS}>Số điện thoại</th>}
                {tab === 'INTERNAL' && show('department') && <th className={TH_CLASS}>Phòng ban</th>}
                {tab === 'EXTERNAL' && show('orgName') && <th className={TH_CLASS}>Tên tổ chức</th>}
                {tab === 'EXTERNAL' && show('orgType') && <th className={TH_CLASS}>Loại tổ chức</th>}
                {show('role') && <th className={TH_CLASS}>Vai trò</th>}
                {show('level') && <th className={TH_CLASS}>Cấp độ</th>}
                {show('ga') && <th className={`${TH_CLASS} text-center`}>GA</th>}
                {show('ca') && <th className={`${TH_CLASS} text-center`}>CA</th>}
                {show('sms') && <th className={`${TH_CLASS} text-center`}>SMS</th>}
                {show('status') && <th className={TH_CLASS}>Trạng thái</th>}
                {show('createdDate') && <SortableTh label="Ngày tạo" sortKey="createdDate" sort={list.sort} onSort={list.changeSort} />}
                <th className={TH_CLASS}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {list.pageRows.length === 0 ? (
                <EmptyRow colSpan={columns.visibleCount + 1} title="Không tìm thấy tài khoản" hint="Thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm" />
              ) : (
                list.pageRows.map((row, idx) => {
                  const manageable = canManageAccount(actor, row);
                  const isSelf = row.loginName === actor.loginName;
                  return (
                    <tr key={row.id} className="hover:bg-[#F8FAFC]">
                      {show('stt') && <td className={`${TD_CLASS} text-center text-slate-500`}>{list.startIdx + idx + 1}</td>}
                      {show('loginName') && (
                        <td className={`${TD_CLASS} whitespace-nowrap`}>
                          {/* Bảng 04 mục 13: tên tài khoản là hyperlink tới chi tiết (có thể chỉnh sửa). */}
                          <button type="button" onClick={() => openRow(row)} className="font-semibold text-[#008A4B] hover:underline">
                            {row.loginName}
                          </button>
                          {row.mustChangePassword && (
                            <div className="text-[11px] text-[#B9691B]" title="Người dùng chưa đổi mật khẩu tạm thời">
                              Chờ đổi mật khẩu
                            </div>
                          )}
                        </td>
                      )}
                      {show('fullName') && <td className={`${TD_CLASS} whitespace-nowrap`}>{row.fullName}</td>}
                      {show('email') && <td className={TD_CLASS}>{row.email}</td>}
                      {show('phone') && <td className={`${TD_CLASS} whitespace-nowrap`}>{row.phone}</td>}
                      {tab === 'INTERNAL' && show('department') && <td className={`${TD_CLASS} whitespace-nowrap`}>{departmentLabel(row.department)}</td>}
                      {tab === 'EXTERNAL' && show('orgName') && <td className={`${TD_CLASS} min-w-60`}>{row.orgName}</td>}
                      {tab === 'EXTERNAL' && show('orgType') && <td className={`${TD_CLASS} whitespace-nowrap`}>{row.orgType}</td>}
                      {show('role') && <td className={`${TD_CLASS} whitespace-nowrap`}>{roleLabel(row.role)}</td>}
                      {show('level') && <td className={`${TD_CLASS} whitespace-nowrap`}>{levelLabel(row.level, row.accountType)}</td>}
                      {show('ga') && (
                        <td className={`${TD_CLASS} text-center`}>
                          <TwoFactorCell row={row} method="GA" />
                        </td>
                      )}
                      {show('ca') && (
                        <td className={`${TD_CLASS} text-center`}>
                          <TwoFactorCell row={row} method="CA" />
                        </td>
                      )}
                      {show('sms') && (
                        <td className={`${TD_CLASS} text-center`}>
                          <TwoFactorCell row={row} method="SMS" />
                        </td>
                      )}
                      {show('status') && (
                        <td className={`${TD_CLASS} whitespace-nowrap`}>
                          <StatusPill active={row.statusFlg === 1} />
                        </td>
                      )}
                      {show('createdDate') && <td className={`${TD_CLASS} whitespace-nowrap`}>{formatDate(row.createdDate)}</td>}
                      <td className={`${TD_CLASS} whitespace-nowrap`}>
                        <button
                          type="button"
                          onClick={() => openRow(row)}
                          title={manageable ? 'Sửa' : 'Xem chi tiết'}
                          aria-label={`${manageable ? 'Sửa' : 'Xem'} ${row.loginName}`}
                          className={`${iconBtn} hover:bg-slate-100 hover:text-slate-700`}
                        >
                          {manageable ? <Pencil className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                        {manageable && (
                          <button
                            type="button"
                            onClick={() => setResetTarget(row)}
                            title="Đặt lại mật khẩu"
                            aria-label={`Đặt lại mật khẩu ${row.loginName}`}
                            className={`${iconBtn} hover:bg-slate-100 hover:text-slate-700`}
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setHistoryTarget(row)}
                          title="Xem lịch sử"
                          aria-label={`Xem lịch sử ${row.loginName}`}
                          className={`${iconBtn} hover:bg-slate-100 hover:text-slate-700`}
                        >
                          <History className="h-3.5 w-3.5" />
                        </button>
                        {manageable && !isSelf && (
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(row)}
                            title="Xóa"
                            aria-label={`Xóa ${row.loginName}`}
                            className={`${iconBtn} hover:bg-[#802423]/10 hover:text-[#802423]`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
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
        <AccountFormModal
          accountType={formTarget.accountType}
          editing={formTarget.row}
          actor={actor}
          accounts={accounts}
          orgSuggestions={orgSuggestions}
          prefill={formTarget.prefill}
          readOnly={formTarget.readOnly}
          onCancel={() => setFormTarget(null)}
          onSave={saveAccount}
        />
      )}

      {resetTarget && (
        <ResetPasswordModal account={resetTarget} onCancel={() => setResetTarget(null)} onSave={(r) => confirmReset(resetTarget, r)} />
      )}

      {historyTarget && (
        <AccountHistoryModal
          account={historyTarget}
          entries={audit
            .filter((e) => e.accountId === historyTarget.id)
            .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())}
          onClose={() => setHistoryTarget(null)}
        />
      )}

      {issued && <PasswordIssuedDialog {...issued} onClose={() => setIssued(null)} />}

      {deleteTarget && (
        <ConfirmDeleteDialog
          recordLabel={`${deleteTarget.loginName} — ${deleteTarget.fullName}`}
          note="Tài khoản được xóa mềm (DELETE_FLG = 1): không còn đăng nhập được và không hiển thị trong danh sách."
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => confirmDelete(deleteTarget)}
        />
      )}

      <ToastStack toasts={toasts} />
    </>
  );
};
