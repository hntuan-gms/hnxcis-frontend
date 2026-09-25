/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useSyncExternalStore } from 'react';

import { addIssuer, getDossierState, nextId as nextIssuerId, str } from '../dossier/dossierStore';
import type { Issuer } from '../dossier/dossierStore';
import { EMPTY_DRAFT as EMPTY_RELATED_ORG, RelatedOrgRow } from '../relatedOrgMock';
import { getRelatedOrgRows, setRelatedOrgRows } from '../relatedOrgStore';
import { todayISO } from './accountTypes';
import { SEED_REGISTRATIONS } from './registrationSeed';
import { Registration, RegistrationDraft, UniquePool, normalizeDigits } from './registrationTypes';

/**
 * Kho hồ sơ Đăng ký chuyên trang (IMS-018-5).
 *
 * Phê duyệt không chỉ đổi trạng thái: Bảng 07 mục 5 yêu cầu lưu hồ sơ vào danh
 * mục tổ chức ở trạng thái "Lưu tạm", danh mục nào tùy Loại tổ chức:
 *
 *   - Tổ chức phát hành → Danh mục TCPH (`dossierStore`, loại Doanh nghiệp)
 *   - Tổ chức liên quan → Danh mục Tổ chức liên quan (`relatedOrgStore`)
 *   - Tổ chức khác      → tab "Tổ chức khác" của Danh mục TCPH (`dossierStore`,
 *                         loại `tochuckhac`) — IMS chưa có danh mục "tổ chức
 *                         khác" riêng; đây là chỗ gần nhất đang có.
 *
 * Bảng 07 phần "Màn chỉnh sửa chi tiết" còn liệt kê một bộ Loại tổ chức khác
 * (Tổ chức lưu ký → Quản lý thành viên; ĐT, BL, PH; Tổ chức đại diện người sở
 * hữu) mâu thuẫn với "3 giá trị" ở phần Màn đăng ký. Theo phần Màn đăng ký vì đó
 * là nơi giá trị được nhập ra; cần BA chốt lại.
 */

/** Một dòng `USER_AUDIT_LOG` của hồ sơ đăng ký — "Xem/Sửa/Duyệt/Từ chối đều ghi log". */
export interface RegistrationLogEntry {
  readonly id: number;
  readonly registrationId: number;
  readonly at: string;
  readonly by: string;
  readonly action: 'VIEW' | 'UPDATE' | 'APPROVE' | 'REJECT';
  readonly note: string;
}

interface RegistrationState {
  readonly registrations: readonly Registration[];
  readonly logs: readonly RegistrationLogEntry[];
}

let state: RegistrationState = { registrations: SEED_REGISTRATIONS, logs: [] };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useRegistrationStore(): RegistrationState {
  return useSyncExternalStore(subscribe, () => state);
}

function withLog(entry: Omit<RegistrationLogEntry, 'id'>): readonly RegistrationLogEntry[] {
  const id = state.logs.reduce((m, l) => Math.max(m, l.id), 0) + 1;
  return [{ ...entry, id }, ...state.logs];
}

function patch(id: number, fn: (r: Registration) => Registration) {
  state = { ...state, registrations: state.registrations.map((r) => (r.id === id ? fn(r) : r)) };
}

/* ------------------------------------------------------------ thao tác */

export function logRegistrationView(id: number, by: string) {
  state = { ...state, logs: withLog({ registrationId: id, at: new Date().toISOString(), by, action: 'VIEW', note: 'Mở chi tiết hồ sơ' }) };
  emit();
}

export function saveRegistration(id: number, draft: RegistrationDraft, by: string) {
  const now = new Date().toISOString();
  patch(id, (r) => ({ ...r, ...draft, updatedDate: now }));
  state = { ...state, logs: withLog({ registrationId: id, at: now, by, action: 'UPDATE', note: 'Cập nhật thông tin hồ sơ' }) };
  emit();
}

/**
 * Phê duyệt: lưu thông tin đã chỉnh sửa, đưa hồ sơ vào danh mục ở trạng thái
 * "Lưu tạm", rồi trả về danh sách email nhận thông báo (email tổ chức + email
 * người đại diện pháp luật — Bảng 07 mục 18, 23).
 */
export function approveRegistration(id: number, draft: RegistrationDraft, by: string): { recipients: string[]; catalog: string } {
  const now = new Date().toISOString();
  patch(id, (r) => ({ ...r, ...draft, status: 'APPROVED', updatedDate: now, approvedBy: by, approvedDate: now }));
  state = { ...state, logs: withLog({ registrationId: id, at: now, by, action: 'APPROVE', note: 'Phê duyệt hồ sơ' }) };
  const catalog = pushToCatalog(draft, by);
  emit();
  return { recipients: recipientsOf(draft), catalog };
}

export function rejectRegistration(id: number, reason: string, by: string): { recipients: string[] } {
  const now = new Date().toISOString();
  const reg = state.registrations.find((r) => r.id === id);
  patch(id, (r) => ({ ...r, status: 'REJECTED', updatedDate: now, rejectedBy: by, rejectedDate: now, rejectReason: reason }));
  state = { ...state, logs: withLog({ registrationId: id, at: now, by, action: 'REJECT', note: `Từ chối: ${reason}` }) };
  emit();
  return { recipients: reg ? recipientsOf(reg) : [] };
}

function recipientsOf(d: Pick<RegistrationDraft, 'email' | 'legalRepEmail'>): string[] {
  return [...new Set([d.email.trim(), d.legalRepEmail.trim()].filter(Boolean))];
}

/* ------------------------------------------------- ghi vào danh mục */

function pushToCatalog(d: RegistrationDraft, by: string): string {
  const today = todayISO();
  const changeHistory = [{ date: today, user: by, field: 'Hồ sơ', change: 'Tạo từ đăng ký chuyên trang — Lưu tạm' }];

  if (d.orgType === 'Tổ chức liên quan') {
    const rows = getRelatedOrgRows();
    const row: RelatedOrgRow = {
      ...EMPTY_RELATED_ORG,
      id: rows.reduce((m, r) => Math.max(m, r.id), 0) + 1,
      name: d.orgName,
      orgType: 'Khác',
      shortName: d.shortName,
      custodyCode: d.depositoryCode,
      tradingCode: d.tradingCode,
      domesticForeign: d.domesticForeign,
      dossierType: 'Hồ sơ tạm thời',
      recordStatus: 'Lưu tạm',
      businessField: d.businessSector,
      startDate: d.operationStartDate,
      statusFlg: 1,
      charterCapital: d.charterCapital,
      initialLicenseNo: d.initialLicenseNo,
      initialLicenseDate: d.initialLicenseDate,
      initialLicensePlace: d.initialLicensePlace,
      initialBizRegNo: d.initialBizRegNo,
      initialBizRegDate: d.initialBizRegDate,
      initialBizRegPlace: d.initialBizRegPlace,
      latestLicenseNo: d.adjustedLicenseNo,
      latestLicenseDate: d.adjustedLicenseDate,
      latestLicensePlace: d.adjustedLicensePlace,
      latestBizRegNo: d.adjustedBizRegNo,
      latestBizRegDate: d.adjustedBizRegDate,
      latestBizRegPlace: d.adjustedBizRegPlace,
      address: d.address,
      email: d.email,
      phone: d.phone,
      fax: d.fax,
      legalRepName: d.legalRep,
      legalRepPhone: d.legalRepPhone,
      legalRepEmail: d.legalRepEmail,
      cbttName: d.authorizedPerson,
      cbttPhone: d.authorizedPhone,
      cbttEmail: d.authorizedEmail,
      activeFlg: 1,
      deleteFlg: 0,
      createdBy: by,
      createdDate: today,
      updatedBy: by,
      updatedDate: today,
    };
    setRelatedOrgRows((prev) => [row, ...prev]);
    return 'Danh mục Tổ chức liên quan';
  }

  const issuers = getDossierState().issuers;
  const base = {
    id: nextIssuerId(issuers),
    statusFlg: 1 as const,
    activeFlg: 1 as const,
    deleteFlg: 0 as const,
    createdBy: by,
    createdDate: today,
    ownership: { parents: [], subsidiaries: [], affiliates: [] },
    changeHistory,
    dossiers: { cp: null, tpny: [], tprl: [] },
  };

  if (d.orgType === 'Tổ chức khác') {
    const issuer: Issuer = {
      ...base,
      kind: 'tochuckhac',
      values: {
        name: d.orgName,
        tcphCode: d.enterpriseCode,
        shortName: d.shortName,
        tcphType: 'Khác',
        address: d.address,
        taxCode: d.taxCode,
        email: d.email,
        phone: d.phone,
        statusFlg: 1,
        recordStatus: 'Lưu tạm',
      },
    };
    addIssuer(issuer);
    return 'Danh mục TCPH — Tổ chức khác';
  }

  const issuer: Issuer = {
    ...base,
    kind: 'doanhnghiep',
    values: {
      name: d.orgName,
      englishName: d.orgNameEn,
      shortName: d.shortName,
      tradingName: d.tradingCode,
      taxCode: d.taxCode,
      businessType: d.enterpriseType,
      industry: d.businessSector,
      establishedDate: d.operationStartDate,
      statusFlg: 1,
      address: d.address,
      phone: d.phone,
      fax: d.fax,
      email: d.email,
      website: '',
      charterCapital: d.charterCapital,
      fiscalYearStart: `${today.slice(0, 4)}-01-01`,
      businessLicenseNo: d.initialBizRegNo,
      businessLicenseDate: d.initialBizRegDate,
      businessLicensePlace: d.initialBizRegPlace,
      latestLicenseNo: d.adjustedBizRegNo,
      latestLicenseDate: d.adjustedBizRegDate,
      latestLicensePlace: d.adjustedBizRegPlace,
      legalRepresentative: d.legalRep,
      disclosureContactName: d.authorizedPerson,
      disclosureContactPhone: d.authorizedPhone,
      disclosureContactEmail: d.authorizedEmail,
      recordStatus: 'Lưu tạm',
    },
  };
  addIssuer(issuer);
  return 'Danh mục TCPH';
}

/* ------------------------------------------------------- kiểm tra trùng */

/** Giá trị đã dùng ở hồ sơ khác + danh mục tổ chức — trừ chính hồ sơ `exceptId`. */
export function uniquePoolFor(exceptId: number): UniquePool {
  const issuers = getDossierState().issuers;
  const others = state.registrations.filter((r) => r.id !== exceptId && r.status !== 'REJECTED');
  const liveIssuers = issuers.filter((i) => i.deleteFlg === 0);
  const related = getRelatedOrgRows().filter((r) => r.deleteFlg === 0);

  return {
    taxCodes: new Set([...others.map((r) => r.taxCode.trim()), ...liveIssuers.map((i) => str(i.values.taxCode).trim())].filter(Boolean)),
    enterpriseCodes: new Set(
      [...others.map((r) => r.enterpriseCode), ...liveIssuers.map((i) => str(i.values.tcphCode))]
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    ),
    emails: new Set(
      [...others.map((r) => r.email), ...liveIssuers.map((i) => str(i.values.email)), ...related.map((r) => r.email)]
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    ),
    phones: new Set(
      [...others.map((r) => r.phone), ...liveIssuers.map((i) => str(i.values.phone)), ...related.map((r) => r.phone)]
        .map(normalizeDigits)
        .filter(Boolean),
    ),
  };
}
