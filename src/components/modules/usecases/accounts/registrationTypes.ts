/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BUSINESS_TYPE_OPTIONS, INDUSTRY_OPTIONS } from '../dossier/dossierFields';
import { EMAIL_RE, ORG_TYPE_OPTIONS, OrgType, isValidPhone } from './accountTypes';

/**
 * Hồ sơ Đăng ký chuyên trang — IMS-018-4.1→4.4 (tổ chức tự đăng ký trên DSS) và
 * IMS-018-5 (HNX phê duyệt trên IMS). SRS Bảng 07.
 *
 * Phía IMS chỉ có màn phê duyệt: danh sách + trang chi tiết cho sửa thông tin
 * trước khi bấm Phê duyệt / Từ chối. Form đăng ký năm bước là màn của DSS, không
 * dựng ở đây — năm bước đó chỉ được dùng làm năm nhóm trường của trang chi tiết.
 */

export type RegistrationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export const REGISTRATION_STATUS_LABEL: Record<RegistrationStatus, string> = {
  PENDING: 'Chưa xử lý',
  APPROVED: 'Đã phê duyệt',
  REJECTED: 'Đã từ chối',
};

/** Một file đính kèm — cột "STT, Tên file, Mô tả, Loại file, Dung lượng" (mục 33, 34). */
export interface AttachedFile {
  readonly name: string;
  readonly description: string;
  readonly type: string;
  readonly sizeKb: number;
}

export interface RegistrationDraft {
  orgName: string;
  shortName: string;
  orgNameEn: string;
  taxCode: string;
  orgType: OrgType | '';
  enterpriseType: string;
  jscType: string;
  publicCompanyType: string;
  businessSector: string;
  enterpriseCode: string;
  depositoryCode: string;
  tradingCode: string;
  domesticForeign: 'Trong nước' | 'Nước ngoài' | '';
  securitiesBusinessLine: string;
  operationStartDate: string;
  charterCapital: number | null;
  address: string;
  email: string;
  phone: string;
  fax: string;
  legalRep: string;
  legalRepPhone: string;
  legalRepEmail: string;
  authorizedPerson: string;
  authorizedPhone: string;
  authorizedEmail: string;
  initialLicenseNo: string;
  initialLicenseDate: string;
  initialLicensePlace: string;
  initialBizRegNo: string;
  initialBizRegDate: string;
  initialBizRegPlace: string;
  registrationFiles: AttachedFile[];
  userListFiles: AttachedFile[];
  adjustedLicenseNo: string;
  adjustedLicenseDate: string;
  adjustedLicensePlace: string;
  adjustedBizRegNo: string;
  adjustedBizRegDate: string;
  adjustedBizRegPlace: string;
}

export interface Registration extends RegistrationDraft {
  readonly id: number;
  status: RegistrationStatus;
  readonly createdDate: string;
  updatedDate: string | null;
  approvedBy: string | null;
  approvedDate: string | null;
  rejectedBy: string | null;
  rejectedDate: string | null;
  rejectReason: string | null;
}

/* ---------------------------------------------------------- lựa chọn */

export const JSC_TYPE_OPTIONS = ['Chưa đại chúng', 'Đã đại chúng'] as const;

/** Mục 8 không liệt kê giá trị — dùng ba nhóm công ty đại chúng theo sàn. */
export const PUBLIC_COMPANY_TYPE_OPTIONS = [
  'Công ty niêm yết',
  'Công ty đăng ký giao dịch (UPCoM)',
  'Công ty đại chúng chưa niêm yết/ĐKGD',
] as const;

export const DOMESTIC_FOREIGN_OPTIONS = ['Trong nước', 'Nước ngoài'] as const;

/* ----------------------------------------------------- khai báo trường */

type FieldKey = keyof Omit<RegistrationDraft, 'registrationFiles' | 'userListFiles'>;

export interface RegistrationField {
  readonly key: FieldKey;
  readonly label: string;
  readonly kind?: 'text' | 'select' | 'radio' | 'date' | 'money' | 'textarea' | 'email' | 'tel';
  readonly options?: readonly string[];
  /** Bắt buộc — có thể phụ thuộc giá trị trường khác ("Bắt buộc có điều kiện"). */
  readonly required?: boolean | ((d: RegistrationDraft) => boolean);
  /** Ẩn hẳn trường khi điều kiện không thỏa ("Chỉ hiện khi ..."). */
  readonly visible?: (d: RegistrationDraft) => boolean;
  /** Hiện nhưng khóa khi điều kiện không thỏa ("Chỉ cho điền khi ..."). */
  readonly enabled?: (d: RegistrationDraft) => boolean;
  readonly hint?: string;
  readonly span2?: boolean;
}

export interface RegistrationSection {
  readonly title: string;
  readonly fields: readonly RegistrationField[];
  /** Nhóm file đính kèm thay cho trường nhập. */
  readonly files?: 'registrationFiles' | 'userListFiles';
}

const isIssuer = (d: RegistrationDraft) => d.orgType === 'Tổ chức phát hành';
const isJsc = (d: RegistrationDraft) => isIssuer(d) && d.enterpriseType === 'Công ty cổ phần';
const isPublic = (d: RegistrationDraft) => isJsc(d) && d.jscType === 'Đã đại chúng';

/**
 * Năm nhóm — đúng năm bước của màn đăng ký (Hình 4.1→4.5), theo thứ tự mục của
 * Bảng 07 "Màn chỉnh sửa chi tiết để phê duyệt/từ chối".
 */
export const REGISTRATION_SECTIONS: readonly RegistrationSection[] = [
  {
    title: 'Bước 1 · Thông tin cơ bản',
    fields: [
      { key: 'orgName', label: 'Tên tổ chức', required: true },
      { key: 'shortName', label: 'Tên viết tắt' },
      { key: 'orgNameEn', label: 'Tên tổ chức (Tiếng Anh)' },
      { key: 'taxCode', label: 'Mã số thuế', required: true, hint: '10 hoặc 13 chữ số, kiểm tra trùng khi lưu' },
      {
        key: 'orgType',
        label: 'Loại tổ chức',
        kind: 'select',
        options: ORG_TYPE_OPTIONS,
        required: true,
        hint: 'Quyết định danh mục nhận hồ sơ "Lưu tạm" sau phê duyệt',
      },
      {
        key: 'enterpriseType',
        label: 'Loại hình doanh nghiệp',
        kind: 'select',
        options: BUSINESS_TYPE_OPTIONS,
        required: isIssuer,
        enabled: isIssuer,
        hint: 'Chỉ điền khi Loại tổ chức = Tổ chức phát hành',
      },
      {
        key: 'jscType',
        label: 'Loại hình công ty cổ phần',
        kind: 'select',
        options: JSC_TYPE_OPTIONS,
        required: isJsc,
        visible: isJsc,
      },
      {
        key: 'publicCompanyType',
        label: 'Loại công ty đại chúng',
        kind: 'select',
        options: PUBLIC_COMPANY_TYPE_OPTIONS,
        required: isPublic,
        visible: isPublic,
      },
      { key: 'businessSector', label: 'Lĩnh vực hoạt động', kind: 'select', options: INDUSTRY_OPTIONS, required: true },
      { key: 'enterpriseCode', label: 'Mã doanh nghiệp', required: true, hint: 'Kiểm tra trùng khi lưu' },
      { key: 'depositoryCode', label: 'Mã TCLK' },
      { key: 'tradingCode', label: 'Mã giao dịch' },
      { key: 'domesticForeign', label: 'Trong nước / Nước ngoài', kind: 'radio', options: DOMESTIC_FOREIGN_OPTIONS, required: true },
      { key: 'operationStartDate', label: 'Ngày bắt đầu hoạt động', kind: 'date', required: true },
      {
        key: 'securitiesBusinessLine',
        label: 'Ngành nghề KD lĩnh vực chứng khoán',
        kind: 'textarea',
        required: (d) => d.businessSector === 'Chứng khoán',
        hint: 'Bắt buộc khi Lĩnh vực hoạt động là Chứng khoán',
        span2: true,
      },
      { key: 'charterCapital', label: 'Vốn điều lệ (VNĐ)', kind: 'money', required: true },
      { key: 'address', label: 'Địa chỉ trụ sở', required: true, span2: true },
      { key: 'email', label: 'Email', kind: 'email', required: true, hint: 'Nhận email kết quả phê duyệt / lý do từ chối' },
      { key: 'phone', label: 'Số điện thoại', kind: 'tel', required: true },
      { key: 'fax', label: 'Fax' },
      { key: 'legalRep', label: 'Người đại diện theo pháp luật', required: true },
      { key: 'legalRepPhone', label: 'Điện thoại (người đại diện)', kind: 'tel', required: true },
      { key: 'legalRepEmail', label: 'Email (người đại diện)', kind: 'email', required: true },
      { key: 'authorizedPerson', label: 'Người được ủy quyền CBTT' },
      { key: 'authorizedPhone', label: 'Điện thoại (ủy quyền)', kind: 'tel' },
      { key: 'authorizedEmail', label: 'Email (ủy quyền)', kind: 'email' },
    ],
  },
  {
    title: 'Bước 2 · Giấy phép cấp lần đầu',
    fields: [
      { key: 'initialLicenseNo', label: 'Số GPTL và hoạt động (lần đầu)', required: true },
      { key: 'initialLicenseDate', label: 'Ngày cấp GPTL và hoạt động (lần đầu)', kind: 'date', required: true },
      { key: 'initialLicensePlace', label: 'Nơi cấp GPTL và hoạt động (lần đầu)', required: true, span2: true },
      { key: 'initialBizRegNo', label: 'Số chứng nhận ĐKKD (lần đầu)', required: true },
      { key: 'initialBizRegDate', label: 'Ngày cấp giấy ĐKKD (lần đầu)', kind: 'date', required: true },
      { key: 'initialBizRegPlace', label: 'Nơi cấp giấy ĐKKD (lần đầu)', required: true, span2: true },
    ],
  },
  { title: 'Bước 3 · Đơn đăng ký', fields: [], files: 'registrationFiles' },
  { title: 'Bước 4 · Tài khoản sử dụng', fields: [], files: 'userListFiles' },
  {
    title: 'Bước 5 · Giấy phép điều chỉnh lần gần nhất',
    fields: [
      { key: 'adjustedLicenseNo', label: 'Số GPTL và hoạt động (điều chỉnh)', required: true },
      { key: 'adjustedLicenseDate', label: 'Ngày cấp GPTL và hoạt động (điều chỉnh)', kind: 'date', required: true },
      { key: 'adjustedLicensePlace', label: 'Nơi cấp GPTL và hoạt động (điều chỉnh)', required: true, span2: true },
      { key: 'adjustedBizRegNo', label: 'Số chứng nhận ĐKKD (điều chỉnh)', required: true },
      { key: 'adjustedBizRegDate', label: 'Ngày cấp giấy ĐKKD (điều chỉnh)', kind: 'date', required: true },
      { key: 'adjustedBizRegPlace', label: 'Nơi cấp giấy ĐKKD (điều chỉnh)', required: true, span2: true },
    ],
  },
];

export function isFieldRequired(f: RegistrationField, d: RegistrationDraft): boolean {
  return typeof f.required === 'function' ? f.required(d) : !!f.required;
}

export function isFieldVisible(f: RegistrationField, d: RegistrationDraft): boolean {
  return f.visible ? f.visible(d) : true;
}

export function isFieldEnabled(f: RegistrationField, d: RegistrationDraft): boolean {
  return f.enabled ? f.enabled(d) : true;
}

/* -------------------------------------------------------------- kiểm tra */

export type RegistrationErrors = Partial<Record<FieldKey | 'registrationFiles' | 'userListFiles', string>>;

/** Giá trị đã có ở hồ sơ khác, để kiểm tra trùng (MST, Mã DN, Email, SĐT — Bảng 07 mục 4, 10, 18, 19). */
export interface UniquePool {
  taxCodes: ReadonlySet<string>;
  enterpriseCodes: ReadonlySet<string>;
  emails: ReadonlySet<string>;
  phones: ReadonlySet<string>;
}

const digits = (s: string) => s.replace(/\D/g, '');

/**
 * Chạy khi bấm Phê duyệt — hồ sơ phải đủ và đúng mới được đưa vào danh mục. Từ
 * chối KHÔNG chạy hàm này: hồ sơ thiếu thông tin chính là lý do để từ chối.
 */
export function validateRegistration(d: RegistrationDraft, pool: UniquePool): RegistrationErrors {
  const errors: RegistrationErrors = {};

  REGISTRATION_SECTIONS.forEach((section) =>
    section.fields.forEach((f) => {
      if (!isFieldVisible(f, d) || !isFieldRequired(f, d)) return;
      const v = d[f.key];
      if (v === null || v === undefined || String(v).trim() === '') errors[f.key] = `${f.label} là bắt buộc`;
    }),
  );

  if (!errors.taxCode) {
    const tax = d.taxCode.trim();
    if (!/^(\d{10}|\d{13})$/.test(tax)) errors.taxCode = 'Mã số thuế phải gồm 10 hoặc 13 chữ số';
    else if (pool.taxCodes.has(tax)) errors.taxCode = 'Mã số thuế đã tồn tại';
  }
  if (!errors.enterpriseCode && pool.enterpriseCodes.has(d.enterpriseCode.trim().toLowerCase())) {
    errors.enterpriseCode = 'Mã doanh nghiệp đã tồn tại';
  }
  if (d.charterCapital !== null && d.charterCapital <= 0) errors.charterCapital = 'Vốn điều lệ phải là số dương';

  (['email', 'legalRepEmail', 'authorizedEmail'] as const).forEach((k) => {
    if (!errors[k] && d[k].trim() && !EMAIL_RE.test(d[k].trim())) errors[k] = 'Email không đúng định dạng';
  });
  if (!errors.email && pool.emails.has(d.email.trim().toLowerCase())) errors.email = 'Email đã được đăng ký';

  (['phone', 'legalRepPhone', 'authorizedPhone'] as const).forEach((k) => {
    if (!errors[k] && d[k].trim() && !isValidPhone(d[k])) errors[k] = 'Số điện thoại không đúng định dạng';
  });
  if (!errors.phone && pool.phones.has(digits(d.phone))) errors.phone = 'Số điện thoại đã được đăng ký';

  if (d.registrationFiles.length === 0) errors.registrationFiles = 'Đơn đăng ký là bắt buộc';
  if (d.userListFiles.length === 0) errors.userListFiles = 'Danh sách người sử dụng là bắt buộc';

  return errors;
}

export function toDraft(r: Registration): RegistrationDraft {
  const {
    id: _id,
    status: _s,
    createdDate: _c,
    updatedDate: _u,
    approvedBy: _ab,
    approvedDate: _ad,
    rejectedBy: _rb,
    rejectedDate: _rd,
    rejectReason: _rr,
    ...draft
  } = r;
  return { ...draft, registrationFiles: [...draft.registrationFiles], userListFiles: [...draft.userListFiles] };
}

export function normalizeDigits(s: string): string {
  return digits(s);
}
