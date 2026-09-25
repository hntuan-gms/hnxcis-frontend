/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useSyncExternalStore } from 'react';

import { CatalogRecord } from '../catalogTypes';
import { DossierType, InvestorKind, SubTableKey, Values } from './dossierFields';
import { SEED_INVESTORS, SEED_ISSUERS } from './dossierSeed';

/**
 * Kho dữ liệu dùng chung của ba màn Tổ chức phát hành / Nhà đầu tư / Danh sách
 * trái phiếu.
 *
 * Khác 8 màn danh mục (mỗi màn tự giữ `useState`): ba màn này tham chiếu chéo
 * nhau — gắn Nhà đầu tư vào mã CP của TCPH, cột "MCK liên kết" của Nhà đầu tư
 * đọc ngược từ TCPH, Danh sách trái phiếu tổng hợp hồ sơ TPRL của mọi TCPH. Để
 * riêng từng màn thì sửa ở màn này, màn kia không thấy.
 *
 * GIAI ĐOẠN UI TĨNH: dữ liệu sống trong bộ nhớ trình duyệt, tải lại trang là về
 * dữ liệu mẫu.
 */

export interface Holder {
  investorId: number;
  roles: string[];
  position: string;
  holdingQty: number | null;
  ratio: number | null;
  startDate: string;
  tradingAccounts: string[];
}

export interface Dossier {
  values: Values;
  holders: Holder[];
  subData: Partial<Record<SubTableKey, Values[]>>;
}

export interface OwnershipRelation {
  name: string;
  code: string;
  ratio: string;
}

export interface ChangeLog {
  date: string;
  user: string;
  field: string;
  change: string;
}

export type IssuerKind = 'doanhnghiep' | 'tochuckhac';

export interface Issuer extends CatalogRecord {
  kind: IssuerKind;
  /** Giá trị theo `ISSUER_SECTIONS` / `OTHER_ORG_SECTIONS`. `values.statusFlg` luôn khớp `statusFlg`. */
  values: Values;
  ownership: { parents: OwnershipRelation[]; subsidiaries: OwnershipRelation[]; affiliates: OwnershipRelation[] };
  changeHistory: ChangeLog[];
  dossiers: { cp: Dossier | null; tpny: Dossier[]; tprl: Dossier[] };
}

export interface FamilyRelation {
  relatedId: number;
  relation: string;
}

export interface Investor extends CatalogRecord {
  kind: InvestorKind;
  values: Values;
  familyRelations: FamilyRelation[];
}

/** Khóa hồ sơ trong một TCPH: `cp`, `tpny-0`, `tprl-2`... — giống file mẫu. */
export type DossierKey = string;

export function parseDossierKey(key: DossierKey): { type: DossierType; idx: number | undefined } {
  const dash = key.lastIndexOf('-');
  if (dash === -1) return { type: key as DossierType, idx: undefined };
  return { type: key.slice(0, dash) as DossierType, idx: Number(key.slice(dash + 1)) };
}

export function getDossier(issuer: Issuer, key: DossierKey): Dossier | null {
  const { type, idx } = parseDossierKey(key);
  if (type === 'cp') return issuer.dossiers.cp;
  return issuer.dossiers[type][idx ?? -1] ?? null;
}

export function str(v: unknown): string {
  return v === null || v === undefined ? '' : String(v);
}

/* --------------------------------------------------------------- store */

interface DossierState {
  readonly issuers: readonly Issuer[];
  readonly investors: readonly Investor[];
}

let state: DossierState = { issuers: SEED_ISSUERS, investors: SEED_INVESTORS };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useDossierStore(): DossierState {
  return useSyncExternalStore(subscribe, () => state);
}

/** Đọc ngoài React — kho hồ sơ đăng ký chuyên trang (IMS-018) cần khi phê duyệt. */
export function getDossierState(): DossierState {
  return state;
}

/** Cập nhật bất biến: `fn` nhận bản sao sâu của một TCPH và sửa trực tiếp trên đó. */
export function updateIssuer(id: number, fn: (draft: Issuer) => void) {
  state = {
    ...state,
    issuers: state.issuers.map((i) => {
      if (i.id !== id) return i;
      const draft = structuredClone(i);
      fn(draft);
      return draft;
    }),
  };
  emit();
}

export function addIssuer(issuer: Issuer) {
  state = { ...state, issuers: [issuer, ...state.issuers] };
  emit();
}

export function updateInvestor(id: number, fn: (draft: Investor) => void) {
  state = {
    ...state,
    investors: state.investors.map((i) => {
      if (i.id !== id) return i;
      const draft = structuredClone(i);
      fn(draft);
      return draft;
    }),
  };
  emit();
}

export function addInvestor(investor: Investor) {
  state = { ...state, investors: [investor, ...state.investors] };
  emit();
}

export function nextId(rows: readonly { id: number }[]): number {
  return rows.reduce((m, r) => Math.max(m, r.id), 0) + 1;
}

/* ----------------------------------------------------- điều hướng chéo */

/**
 * Yêu cầu mở một TCPH từ màn khác (Danh sách trái phiếu → hồ sơ TPRL, Nhà đầu tư
 * → tab Cổ đông của hồ sơ CP). Màn TCPH đọc và xóa yêu cầu này khi mount.
 */
export interface IssuerOpenRequest {
  issuerId: number;
  dossierKey?: DossierKey;
  holdersTab?: boolean;
  edit?: boolean;
}

let pendingOpen: IssuerOpenRequest | null = null;

export function requestIssuerOpen(req: IssuerOpenRequest) {
  pendingOpen = req;
}

export function takeIssuerOpenRequest(): IssuerOpenRequest | null {
  const req = pendingOpen;
  pendingOpen = null;
  return req;
}

/* ------------------------------------------------------ truy vấn chéo */

export interface InvestorHolding {
  issuerId: number;
  stockCode: string;
  issuerShortName: string;
  holder: Holder;
}

/** `findInvestorHoldings` của file mẫu — chỉ tra hồ sơ Cổ phiếu. */
export function findInvestorHoldings(issuers: readonly Issuer[], investorId: number): InvestorHolding[] {
  const out: InvestorHolding[] = [];
  issuers.forEach((iss) => {
    if (iss.deleteFlg === 1) return;
    const cp = iss.dossiers.cp;
    const h = cp?.holders.find((x) => x.investorId === investorId);
    if (cp && h) {
      out.push({ issuerId: iss.id, stockCode: str(cp.values.stockCode), issuerShortName: str(iss.values.shortName), holder: h });
    }
  });
  return out;
}

export function isMatured(values: Values): boolean {
  const m = str(values.maturityDate);
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return !!m && m < today;
}
