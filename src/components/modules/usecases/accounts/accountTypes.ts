/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { UserAccount, UserRoleCode } from '../../../../types/hnx';
import { getRoleLabel } from '../../../../data/roleCatalog';
import { CatalogRecord, Flag } from '../catalogTypes';

/**
 * Kiểu dữ liệu và luật nghiệp vụ của [IMS-018] Quản lý tài khoản.
 *
 * SRS: `docs/srs/[IMS-018] Quản lý tài khoản.md`
 *
 * Cấu trúc bám bảng `LOGINS` (SRS §4.1). Tên trường theo §4.1 khi §4.1 và các
 * bảng mô tả màn hình (Bảng 04–06) gọi khác nhau — VD Bảng 05 gọi `BIRTH_DATE`,
 * `RESIDENT_ID`, `TEL` còn §4.1 gọi `BIRTH`, `IDENTIFICATION_NO`, `PHONE`.
 *
 * GIAI ĐOẠN UI TĨNH: chưa có IAM-SERVICE (`api/iam/accounts`), dữ liệu sống
 * trong `accountStore.ts`.
 */

/* ---------------------------------------------------------- danh mục */

/**
 * `LOGINS.TYPE` — tab "Tài khoản nội bộ" lọc `INTERNAL`, tab "Tài khoản tổ
 * chức" lọc `EXTERNAL` (Bảng 04 mục 4, 5).
 */
export type AccountType = 'INTERNAL' | 'EXTERNAL';

/**
 * `LOGINS.DEPARTMENT` — §4.1 chỉ liệt kê "Niêm yết/Trái phiếu/Thị trường".
 * Thêm CNTT vì luật cấp độ (Bảng 05 mục 5) nhắc tới "3 phòng Niêm yết, CNTT,
 * Thị trường".
 *
 * KHÔNG dùng danh mục Phòng ban IMS-006: danh mục đó có QLNY/TTTP/TTTT/CNTT/HTGD,
 * không có "Phòng Thị trường" mà SRS này dùng để lọc dữ liệu. Chờ BA chốt ánh xạ
 * giữa hai bộ mã thì mới nối được.
 */
export type DepartmentCode = 'NY' | 'TP' | 'TT' | 'CNTT';

export const DEPARTMENT_OPTIONS: ReadonlyArray<{ value: DepartmentCode; label: string }> = [
  { value: 'NY', label: 'Phòng Niêm yết' },
  { value: 'TP', label: 'Phòng Trái phiếu' },
  { value: 'TT', label: 'Phòng Thị trường' },
  { value: 'CNTT', label: 'Phòng Công nghệ thông tin' },
];

export function departmentLabel(code: DepartmentCode | null): string {
  return DEPARTMENT_OPTIONS.find((d) => d.value === code)?.label ?? '';
}

/**
 * Suy phòng ban của một persona đăng nhập khi nó chưa có bản ghi trong LOGINS.
 * `unitCode` của `INITIAL_USERS` là mã phòng theo PRD (QLNY, TTTP...).
 */
const UNIT_TO_DEPARTMENT: Record<string, DepartmentCode> = {
  QLNY: 'NY',
  TTTP: 'TP',
  CNTT: 'CNTT',
};

/** `LOGINS.LEVEL`. */
export type AccountLevel = 1 | 2 | 3;

/**
 * `LOGINS.ORG_TYPE` — dùng đúng ba giá trị "Loại tổ chức" của màn Đăng ký
 * chuyên trang (Bảng 07 mục 5), để tài khoản tạo từ widget nhắc lịch (IMS-018-8)
 * mang theo được loại tổ chức của hồ sơ gốc.
 */
export type OrgType = 'Tổ chức phát hành' | 'Tổ chức liên quan' | 'Tổ chức khác';

export const ORG_TYPE_OPTIONS: readonly OrgType[] = [
  'Tổ chức phát hành',
  'Tổ chức liên quan',
  'Tổ chức khác',
];

/** `LOGINS.GENDER` — 0: Nữ, 1: Nam (§4.1). */
export type Gender = 0 | 1;

export const GENDER_OPTIONS: ReadonlyArray<{ value: Gender; label: string }> = [
  { value: 1, label: 'Nam' },
  { value: 0, label: 'Nữ' },
];

/** Ba phương thức xác thực 2 lớp — "Chỉ được lựa chọn 1/3 phương thức" (Bảng 05 mục 25–27). */
export type TwoFactorMethod = 'GA' | 'CA' | 'SMS';

export const TWO_FACTOR_OPTIONS: ReadonlyArray<{ value: TwoFactorMethod; label: string; hint: string }> = [
  { value: 'GA', label: 'GA (Google Authenticator)', hint: 'Bật xác thực 2 lớp qua ứng dụng Authenticator' },
  { value: 'CA', label: 'CA (chữ ký số)', hint: 'Yêu cầu chữ ký số khi thao tác nghiệp vụ' },
  { value: 'SMS', label: 'Xác nhận SMS Token', hint: 'Xác nhận số điện thoại nhận OTP' },
];

/* -------------------------------------------------------------- bản ghi */

export interface AccountRow extends CatalogRecord {
  /** LOGIN_NAME VARCHAR2(50) — unique, không khoảng trắng, không sửa sau khi tạo. */
  readonly loginName: string;
  readonly accountType: AccountType;
  /** DEPARTMENT — chỉ có ở tài khoản nội bộ. */
  department: DepartmentCode | null;
  /** ORG_NAME — chỉ có ở tài khoản tổ chức. */
  orgName: string;
  /** ORG_TYPE — chỉ có ở tài khoản tổ chức. */
  orgType: OrgType | null;
  level: AccountLevel;
  role: UserRoleCode;
  /** FULLNAME — SRS Bảng 05: tối đa 100 ký tự (cột §4.1 rộng 200). */
  fullName: string;
  /** Các cột ngày lưu ISO `yyyy-mm-dd`; chuỗi rỗng = chưa nhập. */
  birthDate: string;
  gender: Gender | null;
  /** IDENTIFICATION_NO VARCHAR2(20) — chỉ số/chữ cái. */
  residentId: string;
  residentIdDate: string;
  residentIdPlace: string;
  address: string;
  phone: string;
  email: string;
  startDate: string;
  endDate: string;
  laborContract: string;
  laborContractStartDate: string;
  laborContractEndDate: string;
  approvalDocNo: string;
  approvalDocDate: string;
  caExpireDate: string;
  /**
   * GA / CA / SMS — ba cột `NUMBER(1,0)` riêng trong §4.1, nhưng SRS chỉ cho bật
   * tối đa MỘT. Lưu thành một giá trị duy nhất để luật đó không thể bị vi phạm;
   * `twoFactorFlags` đổi ngược về ba cờ khi cần xuất theo đúng cột CSDL.
   */
  twoFactor: TwoFactorMethod | null;
  description: string;
  /** LAST_PASSWORD_CHANGED_DATE — null khi chưa từng đổi mật khẩu. */
  lastPasswordChangedDate: string | null;

  /*
   * Hai trường dưới đây KHÔNG có trong LOGINS: mật khẩu do Keycloak giữ. Prototype
   * cần chúng để luồng Đặt lại mật khẩu (IMS-018-6.1) và Đổi mật khẩu lần đầu
   * (IMS-018-7) chạy được từ đầu tới cuối. Lưu văn bản thô vì đây là dữ liệu
   * giả trong bộ nhớ trình duyệt — backend thật không bao giờ trả mật khẩu về.
   */
  password: string;
  /** Tài khoản mới tạo hoặc vừa bị admin đặt lại mật khẩu — phải đổi ở lần đăng nhập tới. */
  mustChangePassword: boolean;
}

export function twoFactorFlags(row: Pick<AccountRow, 'twoFactor'>): Record<TwoFactorMethod, Flag> {
  return {
    GA: row.twoFactor === 'GA' ? 1 : 0,
    CA: row.twoFactor === 'CA' ? 1 : 0,
    SMS: row.twoFactor === 'SMS' ? 1 : 0,
  };
}

/** Các trường người dùng nhập trên popup Thêm mới/Cập nhật. */
export type AccountDraft = Omit<
  AccountRow,
  keyof CatalogRecord | 'lastPasswordChangedDate' | 'password' | 'mustChangePassword'
> & { statusFlg: Flag };

/* ---------------------------------------------------------- nhãn hiển thị */

export function levelLabel(level: AccountLevel, accountType: AccountType): string {
  if (accountType === 'EXTERNAL' && level === 3) return 'Cấp 3 — Nhà đầu tư';
  return `Cấp ${level}`;
}

export function genderLabel(gender: Gender | null): string {
  return GENDER_OPTIONS.find((g) => g.value === gender)?.label ?? '';
}

export function roleLabel(role: UserRoleCode): string {
  return getRoleLabel(role);
}

/** `yyyy-mm-dd...` → `dd/mm/yyyy` (SRS: "Định dạng DD/MM/YYYY"). */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return d && m && y ? `${d}/${m}/${y}` : '';
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return formatDate(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/* --------------------------------------------------------------- vai trò */

/** Vai trò chọn được cho tài khoản nội bộ — mọi vai trò cán bộ HNX. */
export const INTERNAL_ROLES: readonly UserRoleCode[] = [
  'ROLE_SYS_ADMIN',
  'ROLE_BIZ_ADMIN',
  'ROLE_QLNY_STAFF',
  'ROLE_QLNY_MANAGER',
  'ROLE_TTTP_STAFF',
  'ROLE_TTTP_MANAGER',
  'ROLE_TTTT_STAFF',
  'ROLE_TTTT_MANAGER',
  'ROLE_CNTT_STAFF',
  'ROLE_CNTT_MANAGER',
  'ROLE_HTGD_STAFF',
  'ROLE_HNX_EXEC',
];

/**
 * Vai trò tài khoản tổ chức theo cấp. Bảng 05: "Cấp 3: Nhà đầu tư" — nên cấp 3
 * chỉ có đúng một vai trò, còn cấp 1/2 là cán bộ của tổ chức.
 */
export function externalRolesForLevel(level: AccountLevel): readonly UserRoleCode[] {
  if (level === 3) return ['ROLE_INVESTOR'];
  return ['ROLE_ORG_MANAGER', 'ROLE_ORG_STAFF', 'ROLE_TREASURY'];
}

/* --------------------------------------------------------------- quyền */

/**
 * Người đang thao tác trên màn Quản lý tài khoản, rút gọn về đúng ba thứ luật
 * phân quyền của SRS cần: có phải Admin hệ thống không, thuộc phòng nào, cấp mấy.
 */
export interface AccountActor {
  readonly loginName: string;
  readonly displayName: string;
  /** ADMIN_HT (Bảng 01) — toàn quyền, thấy mọi tài khoản. */
  readonly isSystemAdmin: boolean;
  readonly department: DepartmentCode | null;
  readonly level: AccountLevel;
}

export function actorFor(user: UserAccount, accounts: readonly AccountRow[]): AccountActor {
  const record = accounts.find(
    (a) => a.deleteFlg === 0 && a.accountType === 'INTERNAL' && a.loginName === user.username,
  );
  return {
    loginName: user.username,
    displayName: user.fullName,
    isSystemAdmin: user.roleCode === 'ROLE_SYS_ADMIN',
    department: record?.department ?? UNIT_TO_DEPARTMENT[user.unitCode ?? ''] ?? null,
    level: record?.level ?? 1,
  };
}

/**
 * Các cấp tồn tại trong một phòng — Bảng 05 mục 5: "3 phòng Niêm yết, CNTT,
 * Thị trường chỉ hiện cấp 1. Riêng Phòng trái phiếu có 3 cấp".
 */
export function levelsOfDepartment(dept: DepartmentCode | null): readonly AccountLevel[] {
  return dept === 'TP' ? [1, 2, 3] : [1];
}

/**
 * Cấp tài khoản NỘI BỘ mà `actor` được tạo / cấp quyền trong phòng `dept`.
 *
 * Bảng 05 mục 5, riêng Phòng Trái phiếu:
 *   - Level 1 (Admin): tạo & cấp quyền tài khoản nội bộ TP L2, L3.
 *   - Level 2: chỉ tạo & cấp quyền tài khoản nội bộ TP L3.
 *   - Level 3: không tạo, không cấp quyền, không đổi trạng thái — chỉ xem.
 *
 * Ba phòng còn lại chỉ có cấp 1, và "Phòng ban nào chỉ được tạo tài khoản của
 * phòng ban đó" (mục 4). Admin hệ thống tạo được mọi cấp của mọi phòng — kể cả
 * TP L1, vì không có ai khác trong luật trên được tạo cấp đó.
 */
export function creatableInternalLevels(
  actor: AccountActor,
  dept: DepartmentCode | null,
): readonly AccountLevel[] {
  if (!dept) return [];
  if (actor.isSystemAdmin) return levelsOfDepartment(dept);
  if (actor.department !== dept) return [];
  if (dept !== 'TP') return [1];
  if (actor.level === 1) return [2, 3];
  if (actor.level === 2) return [3];
  return [];
}

/**
 * Được tạo tài khoản TỔ CHỨC không — Bảng 06 mục 5: "Các phòng CNTT, NY, TT được
 * tạo tất cả các tài khoản. Riêng phòng trái phiếu: Level 1, Level 2 tạo & cấp
 * quyền tài khoản tổ chức (cả 3 cấp); Level 3 không tạo được, chỉ xem".
 */
export function canManageExternal(actor: AccountActor): boolean {
  if (actor.isSystemAdmin) return true;
  if (!actor.department) return false;
  return !(actor.department === 'TP' && actor.level === 3);
}

/** Có được sửa / xóa / đặt lại mật khẩu cho một tài khoản cụ thể không. */
export function canManageAccount(actor: AccountActor, row: AccountRow): boolean {
  if (row.accountType === 'EXTERNAL') return canManageExternal(actor);
  return creatableInternalLevels(actor, row.department).includes(row.level);
}

/**
 * Tab nội bộ: Admin hệ thống thấy toàn bộ; chuyên viên chỉ thấy tài khoản của
 * phòng mình (Bảng 04 mục 4). Tab tổ chức: thấy toàn bộ (mục 5).
 */
export function isVisibleTo(actor: AccountActor, row: AccountRow): boolean {
  if (row.accountType === 'EXTERNAL') return true;
  if (actor.isSystemAdmin) return true;
  return actor.department !== null && row.department === actor.department;
}

/* ------------------------------------------------------------- mật khẩu */

/**
 * Sáu điều kiện mật khẩu hợp lệ — IMS-018-7 mục 5–10, theo đúng thứ tự trên màn.
 *
 * Độ dài tối thiểu lấy 8 theo bảng mô tả (mục 10: "≥ 8"); ảnh mockup Màn hình 6.2
 * và 7 ghi "6 ký tự" nhưng bảng mô tả là phần có ràng buộc, nên theo bảng.
 */
export const PASSWORD_RULES: ReadonlyArray<{
  key: string;
  label: string;
  test: (password: string, loginName: string) => boolean;
}> = [
  { key: 'lower', label: 'Mật khẩu chứa ít nhất 1 ký tự thường', test: (p) => /[a-z]/.test(p) },
  {
    key: 'notUsername',
    label: 'Mật khẩu không được giống với tên tài khoản',
    test: (p, u) => p.length > 0 && p.toLowerCase() !== u.toLowerCase(),
  },
  { key: 'digit', label: 'Mật khẩu phải chứa ít nhất 1 ký tự là số', test: (p) => /[0-9]/.test(p) },
  { key: 'upper', label: 'Mật khẩu phải chứa ít nhất 1 ký tự viết hoa', test: (p) => /[A-Z]/.test(p) },
  {
    key: 'special',
    label: 'Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt',
    test: (p) => /[^A-Za-z0-9]/.test(p),
  },
  { key: 'length', label: 'Mật khẩu phải đủ ít nhất 8 ký tự', test: (p) => p.length >= 8 },
];

export function passedPasswordRules(password: string, loginName: string): readonly string[] {
  return PASSWORD_RULES.filter((r) => r.test(password, loginName)).map((r) => r.key);
}

/**
 * Mật khẩu tạm thời do hệ thống sinh (IMS-018-6.1 phương án 2) — 12 ký tự, luôn
 * đủ sáu điều kiện ở trên để người nhận không bị chặn nếu muốn giữ luôn.
 */
export function generateTempPassword(): string {
  const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '!@#$%&*?'];
  const all = sets.join('');
  const rand = (n: number) => {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] % n;
  };
  const chars = sets.map((s) => s[rand(s.length)]);
  while (chars.length < 12) chars.push(all[rand(all.length)]);
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = rand(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

/* ------------------------------------------------------------ kiểm tra */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Số điện thoại: bỏ khoảng trắng/dấu chấm rồi còn 9–14 chữ số, cho phép `+` đầu. */
export function normalizePhone(phone: string): string {
  return phone.replace(/[\s.()-]/g, '');
}

export function isValidPhone(phone: string): boolean {
  return /^\+?\d{9,14}$/.test(normalizePhone(phone));
}

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}
