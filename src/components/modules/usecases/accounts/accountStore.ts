/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useSyncExternalStore } from 'react';

import type { UserAccount } from '../../../../types/hnx';
import { SEED_ACCOUNTS, SEED_AUDIT } from './accountSeed';
import {
  AccountDraft,
  AccountRow,
  OrgType,
  TWO_FACTOR_OPTIONS,
  departmentLabel,
  formatDate,
  generateTempPassword,
  genderLabel,
  levelLabel,
  roleLabel,
  todayISO,
} from './accountTypes';

/**
 * Kho dữ liệu dùng chung của [IMS-018] — bảng `LOGINS` + `USER_AUDIT_LOG`.
 *
 * Khác các màn danh mục (mỗi màn tự giữ `useState`), tài khoản được đọc từ bốn
 * chỗ: màn Quản lý tài khoản, màn đăng nhập (khóa tài khoản / đổi mật khẩu lần
 * đầu phải có hiệu lực thật), popup Đổi mật khẩu ở thanh trên, và widget nhắc tạo
 * tài khoản ở Trang chủ. Cùng cách làm với `dossier/dossierStore.ts`.
 *
 * GIAI ĐOẠN UI TĨNH: tải lại trang là về dữ liệu mẫu.
 */

/** Một dòng `USER_AUDIT_LOG` — đủ cho popup Lịch sử chỉnh sửa (IMS-018-1.4). */
export interface AccountAuditEntry {
  readonly id: number;
  readonly accountId: number;
  readonly at: string;
  /** Tài khoản thực hiện thay đổi. */
  readonly by: string;
  readonly action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESET_PASSWORD' | 'CHANGE_PASSWORD';
  readonly field: string;
  readonly oldValue: string;
  readonly newValue: string;
}

interface AccountState {
  readonly accounts: readonly AccountRow[];
  readonly audit: readonly AccountAuditEntry[];
}

let state: AccountState = { accounts: SEED_ACCOUNTS, audit: SEED_AUDIT };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAccountStore(): AccountState {
  return useSyncExternalStore(subscribe, () => state);
}

export function getAccountState(): AccountState {
  return state;
}

function nextId(rows: readonly { id: number }[]): number {
  return rows.reduce((m, r) => Math.max(m, r.id), 0) + 1;
}

function log(entries: Omit<AccountAuditEntry, 'id'>[]): AccountAuditEntry[] {
  let id = nextId(state.audit);
  return entries.map((e) => ({ ...e, id: id++ }));
}

/* ------------------------------------------------------- diff để ghi log */

/**
 * Nhãn + cách hiển thị giá trị của từng trường khi ghi `USER_AUDIT_LOG`. Popup
 * lịch sử hiện đúng chuỗi đã ghi ở đây, nên nhãn phải là nhãn trên form chứ không
 * phải tên cột CSDL.
 */
const TRACKED_FIELDS: ReadonlyArray<{
  key: keyof AccountDraft;
  label: string;
  show: (d: AccountDraft) => string;
}> = [
  { key: 'department', label: 'Phòng ban', show: (d) => departmentLabel(d.department) },
  { key: 'orgName', label: 'Tên tổ chức', show: (d) => d.orgName },
  { key: 'orgType', label: 'Loại tổ chức', show: (d) => d.orgType ?? '' },
  { key: 'level', label: 'Cấp độ', show: (d) => levelLabel(d.level, d.accountType) },
  { key: 'role', label: 'Vai trò', show: (d) => roleLabel(d.role) },
  { key: 'statusFlg', label: 'Trạng thái', show: (d) => (d.statusFlg === 1 ? 'Đang hoạt động' : 'Ngừng hoạt động') },
  { key: 'fullName', label: 'Họ và tên', show: (d) => d.fullName },
  { key: 'birthDate', label: 'Ngày sinh', show: (d) => formatDate(d.birthDate) },
  { key: 'gender', label: 'Giới tính', show: (d) => genderLabel(d.gender) },
  { key: 'residentId', label: 'Mã định danh', show: (d) => d.residentId },
  { key: 'residentIdDate', label: 'Ngày cấp', show: (d) => formatDate(d.residentIdDate) },
  { key: 'residentIdPlace', label: 'Nơi cấp', show: (d) => d.residentIdPlace },
  { key: 'address', label: 'Địa chỉ', show: (d) => d.address },
  { key: 'phone', label: 'Số điện thoại', show: (d) => d.phone },
  { key: 'email', label: 'Email', show: (d) => d.email },
  { key: 'startDate', label: 'Ngày bắt đầu', show: (d) => formatDate(d.startDate) },
  { key: 'endDate', label: 'Ngày kết thúc', show: (d) => formatDate(d.endDate) },
  { key: 'laborContract', label: 'Hợp đồng lao động', show: (d) => d.laborContract },
  { key: 'laborContractStartDate', label: 'Ngày hiệu lực HĐLĐ', show: (d) => formatDate(d.laborContractStartDate) },
  { key: 'laborContractEndDate', label: 'Ngày hết hạn HĐLĐ', show: (d) => formatDate(d.laborContractEndDate) },
  { key: 'approvalDocNo', label: 'Số CV cấp TK', show: (d) => d.approvalDocNo },
  { key: 'approvalDocDate', label: 'Ngày CV cấp TK', show: (d) => formatDate(d.approvalDocDate) },
  { key: 'caExpireDate', label: 'Ngày hết hạn CA', show: (d) => formatDate(d.caExpireDate) },
  {
    key: 'twoFactor',
    label: 'Xác thực 2 lớp',
    show: (d) => TWO_FACTOR_OPTIONS.find((o) => o.value === d.twoFactor)?.label ?? 'Không sử dụng',
  },
  { key: 'description', label: 'Mô tả', show: (d) => d.description },
];

function draftOf(row: AccountRow): AccountDraft {
  const {
    id: _id,
    activeFlg: _a,
    deleteFlg: _d,
    createdBy: _cb,
    createdDate: _cd,
    updatedBy: _ub,
    updatedDate: _ud,
    lastPasswordChangedDate: _l,
    password: _p,
    mustChangePassword: _m,
    ...draft
  } = row;
  return draft;
}

/* ------------------------------------------------------------ thao tác */

/**
 * Thêm mới tài khoản. Hệ thống tự sinh mật khẩu tạm và bắt đổi ở lần đăng nhập
 * đầu (Sơ đồ 06) — trả mật khẩu đó về để màn gọi hiện ra, vì prototype chưa có
 * dịch vụ gửi email thật.
 */
export function createAccount(draft: AccountDraft, by: string): { account: AccountRow; tempPassword: string } {
  const now = new Date().toISOString();
  const tempPassword = generateTempPassword();
  const account: AccountRow = {
    ...draft,
    id: nextId(state.accounts),
    activeFlg: draft.statusFlg,
    deleteFlg: 0,
    createdBy: by,
    createdDate: now,
    lastPasswordChangedDate: null,
    password: tempPassword,
    mustChangePassword: true,
  };
  state = {
    accounts: [account, ...state.accounts],
    audit: [
      ...log([
        { accountId: account.id, at: now, by, action: 'CREATE', field: 'Tài khoản', oldValue: '', newValue: 'Tạo mới tài khoản' },
      ]),
      ...state.audit,
    ],
  };
  emit();
  return { account, tempPassword };
}

/** Cập nhật — ghi một dòng log cho MỖI trường thay đổi (Hình 1.4). */
export function updateAccount(id: number, draft: AccountDraft, by: string) {
  const before = state.accounts.find((a) => a.id === id);
  if (!before) return;

  const now = new Date().toISOString();
  const old = draftOf(before);
  const changes = TRACKED_FIELDS.filter((f) => old[f.key] !== draft[f.key]).map((f) => ({
    accountId: id,
    at: now,
    by,
    action: 'UPDATE' as const,
    field: f.label,
    oldValue: f.show(old),
    newValue: f.show(draft),
  }));
  if (changes.length === 0) return;

  state = {
    accounts: state.accounts.map((a) =>
      a.id === id
        ? {
            ...a,
            ...draft,
            // Tên tài khoản và loại tài khoản không đổi được sau khi tạo (Bảng 05 mục 2, 3).
            loginName: a.loginName,
            accountType: a.accountType,
            activeFlg: draft.statusFlg,
            updatedBy: by,
            updatedDate: now,
          }
        : a,
    ),
    audit: [...log(changes), ...state.audit],
  };
  emit();
}

/** Xóa mềm: `DELETE_FLG = 1` (§3.1 "Delete (soft)"). */
export function deleteAccount(id: number, by: string) {
  const now = new Date().toISOString();
  state = {
    accounts: state.accounts.map((a) => (a.id === id ? { ...a, deleteFlg: 1, updatedBy: by, updatedDate: now } : a)),
    audit: [
      ...log([{ accountId: id, at: now, by, action: 'DELETE', field: 'Tài khoản', oldValue: '', newValue: 'Xóa tài khoản' }]),
      ...state.audit,
    ],
  };
  emit();
}

/**
 * Đặt lại mật khẩu cho người khác (IMS-018-6.1): mật khẩu cũ mất hiệu lực ngay,
 * mật khẩu mới dùng được ngay nhưng là mật khẩu TẠM — người nhận phải đổi ở lần
 * đăng nhập tới (Sơ đồ 05 → 06).
 */
export function resetPassword(id: number, newPassword: string, by: string, mode: 'manual' | 'auto', emailTo: string | null) {
  const now = new Date().toISOString();
  state = {
    accounts: state.accounts.map((a) =>
      a.id === id ? { ...a, password: newPassword, mustChangePassword: true, updatedBy: by, updatedDate: now } : a,
    ),
    audit: [
      ...log([
        {
          accountId: id,
          at: now,
          by,
          action: 'RESET_PASSWORD',
          field: 'Mật khẩu',
          oldValue: '',
          newValue:
            (mode === 'auto' ? 'Đặt lại — hệ thống tự sinh' : 'Đặt lại — quản trị tự nhập') +
            (emailTo ? `, gửi tới ${emailTo}` : ', không gửi email'),
        },
      ]),
      ...state.audit,
    ],
  };
  emit();
}

/** Người dùng tự đổi mật khẩu (IMS-018-6.2) hoặc đổi lần đầu (IMS-018-7). */
export function changeOwnPassword(loginName: string, newPassword: string, firstLogin: boolean) {
  const account = findAccount(loginName);
  if (!account) return;
  const now = new Date().toISOString();
  state = {
    accounts: state.accounts.map((a) =>
      a.id === account.id
        ? {
            ...a,
            password: newPassword,
            mustChangePassword: false,
            lastPasswordChangedDate: todayISO(),
            updatedBy: loginName,
            updatedDate: now,
          }
        : a,
    ),
    audit: [
      ...log([
        {
          accountId: account.id,
          at: now,
          by: loginName,
          action: 'CHANGE_PASSWORD',
          field: 'Mật khẩu',
          oldValue: '',
          newValue: firstLogin ? 'Đổi mật khẩu lần đầu' : 'Người dùng tự đổi mật khẩu',
        },
      ]),
      ...state.audit,
    ],
  };
  emit();
}

/** Tài khoản còn hiệu lực (chưa xóa mềm) theo tên đăng nhập. */
export function findAccount(loginName: string): AccountRow | undefined {
  return state.accounts.find((a) => a.deleteFlg === 0 && a.loginName === loginName);
}

/* ------------------------------------------------------- nối màn đăng nhập */

/**
 * Danh sách tài khoản màn đăng nhập nhận vào.
 *
 * Persona của `INITIAL_USERS` giữ nguyên hồ sơ (vai trò, đơn vị...) nhưng lấy
 * TRẠNG THÁI từ LOGINS: khóa ở màn Quản lý tài khoản là chặn đăng nhập thật, xóa
 * là biến mất khỏi danh sách. Tài khoản tạo mới ở IMS-018 chưa có persona thì
 * được dựng thành `UserAccount` để đăng nhập được ngay.
 */
export function toLoginUsers(personas: readonly UserAccount[], accounts: readonly AccountRow[]): UserAccount[] {
  const byLogin = new Map(accounts.map((a) => [a.loginName, a]));

  const fromPersonas = personas.flatMap((p) => {
    const acc = byLogin.get(p.username);
    if (!acc) return [p];
    if (acc.deleteFlg === 1) return [];
    return [{ ...p, status: acc.statusFlg === 1 ? ('ACTIVE' as const) : ('DISABLED' as const) }];
  });

  const personaNames = new Set(personas.map((p) => p.username));
  const fromAccounts: UserAccount[] = accounts
    .filter((a) => a.deleteFlg === 0 && !personaNames.has(a.loginName))
    .map((a) => ({
      id: 100000 + a.id,
      createdAt: a.createdDate,
      createdBy: 1,
      versionNo: 1,
      isCurrent: true,
      username: a.loginName,
      email: a.email,
      fullName: a.fullName,
      phone: a.phone,
      actorType: a.accountType === 'INTERNAL' ? 'HNX' : 'ORGANIZATION',
      unitCode: a.department ?? undefined,
      status: a.statusFlg === 1 ? 'ACTIVE' : 'DISABLED',
      roleCode: a.role,
    }));

  return [...fromPersonas, ...fromAccounts];
}

/* ----------------------------------------------------- điều hướng chéo */

/**
 * Nút "Tạo tài khoản" của widget Trang chủ (IMS-018-8) mở màn Quản lý tài khoản
 * với popup tài khoản tổ chức điền sẵn tên + loại tổ chức. Màn đích đọc và xóa
 * yêu cầu này khi mount — cùng cách `requestIssuerOpen` của hồ sơ TCPH.
 */
export interface AccountCreateRequest {
  orgName: string;
  orgType: OrgType;
}

let pendingCreate: AccountCreateRequest | null = null;

export function requestAccountCreate(req: AccountCreateRequest) {
  pendingCreate = req;
}

export function takeAccountCreateRequest(): AccountCreateRequest | null {
  const req = pendingCreate;
  pendingCreate = null;
  return req;
}
