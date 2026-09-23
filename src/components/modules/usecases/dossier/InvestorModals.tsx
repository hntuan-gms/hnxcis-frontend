/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ChevronRight, Plus, Trash2, Users } from 'lucide-react';

import { BTN_OUTLINE, BTN_PRIMARY, FormField, SELECT_CLASS } from '../catalogUi';
import {
  FAMILY_RELATION_OPTIONS,
  INVESTOR_SECTIONS,
  InvestorKind,
  Values,
  emptyValues,
  formatNumberVN,
  roleBadgeClass,
} from './dossierFields';
import { FieldErrors, PillTab, RowIconButton, SectionsForm, WideModal, hasErrors, validateRequired } from './FieldSections';
import { InvestorHolding, Investor, str } from './dossierStore';

/* ---------------------------------------------------- Thêm / sửa NĐT */

interface InvestorFormModalProps {
  editing: Investor | null;
  investors: readonly Investor[];
  onCancel: () => void;
  onSave: (kind: InvestorKind, values: Values) => void;
}

/**
 * `openInvestorFormModal` của file mẫu. Đổi tab Cá nhân / Tổ chức chỉ được lúc
 * thêm mới — sửa thì khóa, vì hai loại có bộ trường định danh khác hẳn nhau.
 *
 * Kiểm tra trùng CCCD/MST như dòng phụ đề của file mẫu hứa ("Hệ thống sẽ kiểm
 * tra trùng lặp qua CCCD / MST"): đây là định danh gốc của Single Source of
 * Truth, trùng là tạo ra hai hồ sơ cho cùng một người.
 */
export const InvestorFormModal: React.FC<InvestorFormModalProps> = ({ editing, investors, onCancel, onSave }) => {
  const [kind, setKind] = useState<InvestorKind>(editing?.kind ?? 'person');
  const [values, setValues] = useState<Values>(() =>
    editing ? { ...emptyValues(INVESTOR_SECTIONS[editing.kind]), ...editing.values } : emptyValues(INVESTOR_SECTIONS.person),
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const sections = INVESTOR_SECTIONS[kind];

  const switchKind = (next: InvestorKind) => {
    setKind(next);
    setValues(emptyValues(INVESTOR_SECTIONS[next]));
    setErrors({});
  };

  const save = () => {
    const found = validateRequired(sections, values);
    const docNo = str(values.docNo).trim();
    if (docNo && investors.some((i) => i.deleteFlg === 0 && i.id !== editing?.id && str(i.values.docNo).trim() === docNo)) {
      found.docNo = 'CCCD/MST này đã có trong Hồ sơ Nhà đầu tư';
    }
    setErrors(found);
    if (hasErrors(found)) return;
    onSave(kind, { ...values, name: str(values.name).trim(), docNo });
  };

  return (
    <WideModal
      title={editing ? 'Chỉnh sửa hồ sơ nhà đầu tư' : 'Tạo mới đối tượng trong Hồ sơ Nhà đầu tư gốc'}
      subtitle="Hệ thống sẽ kiểm tra trùng lặp qua CCCD / MST"
      onClose={onCancel}
      footer={
        <>
          <button type="button" className={BTN_OUTLINE} onClick={onCancel}>
            Hủy
          </button>
          <button type="button" className={BTN_PRIMARY} onClick={save}>
            Lưu
          </button>
        </>
      }
    >
      <div className="mb-4 flex gap-1.5">
        <PillTab active={kind === 'person'} disabled={!!editing} onClick={() => switchKind('person')}>
          Cá nhân
        </PillTab>
        <PillTab active={kind === 'org'} disabled={!!editing} onClick={() => switchKind('org')}>
          Tổ chức / Pháp nhân
        </PillTab>
      </div>
      <SectionsForm
        sections={sections}
        values={values}
        errors={errors}
        onChange={(k, v) => {
          setValues((prev) => ({ ...prev, [k]: v }));
          setErrors((prev) => ({ ...prev, [k]: undefined }));
        }}
      />
    </WideModal>
  );
};

/* ---------------------------------------------------- Quan hệ gia đình */

/**
 * Chiều ngược của quan hệ. File mẫu ghi CÙNG một nhãn cho cả hai phía (A là
 * "Bố" của B thì B cũng thành "Bố" của A) — sai nghĩa, nên ở đây ghi nhãn đảo.
 */
const INVERSE_RELATION: Record<string, string> = {
  'Vợ/chồng': 'Vợ/chồng',
  Bố: 'Con đẻ',
  Mẹ: 'Con đẻ',
  'Con đẻ': 'Bố/Mẹ',
  'Con rể': 'Bố/Mẹ vợ',
  'Con dâu': 'Bố/Mẹ chồng',
  'Người giám hộ': 'Người được giám hộ',
  Khác: 'Khác',
};

export function inverseRelation(relation: string): string {
  return INVERSE_RELATION[relation] ?? 'Khác';
}

interface FamilyModalProps {
  investor: Investor;
  investors: readonly Investor[];
  onClose: () => void;
  onAdd: (otherId: number, relation: string) => void;
  onRemove: (otherId: number) => void;
}

export const FamilyModal: React.FC<FamilyModalProps> = ({ investor, investors, onClose, onAdd, onRemove }) => {
  const linked = new Set(investor.familyRelations.map((r) => r.relatedId));
  const candidates = investors.filter((i) => i.deleteFlg === 0 && i.id !== investor.id && !linked.has(i.id));
  const [otherId, setOtherId] = useState<number | ''>(candidates[0]?.id ?? '');
  const [relation, setRelation] = useState<string>(FAMILY_RELATION_OPTIONS[0]);
  const nameOf = (id: number) => investors.find((i) => i.id === id)?.values.name ?? '—';

  const effectiveOther = candidates.some((c) => c.id === otherId) ? otherId : candidates[0]?.id ?? '';

  return (
    <WideModal
      title="Quan hệ gia đình"
      subtitle={`Nhà đầu tư: ${str(investor.values.name)}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={BTN_OUTLINE} onClick={onClose}>
            Đóng
          </button>
          <button
            type="button"
            className={BTN_PRIMARY}
            disabled={effectiveOther === ''}
            onClick={() => effectiveOther !== '' && onAdd(effectiveOther, relation)}
          >
            <Plus className="h-4 w-4" />
            Thêm quan hệ
          </button>
        </>
      }
    >
      {investor.familyRelations.length === 0 ? (
        <div className="py-8 text-center text-slate-500">
          <Users className="mx-auto mb-2 h-9 w-9 opacity-50" />
          <div className="text-sm font-medium text-[#525252]">Chưa có quan hệ gia đình nào</div>
        </div>
      ) : (
        investor.familyRelations.map((r) => (
          <div
            key={r.relatedId}
            className="mb-2 flex items-center justify-between gap-2.5 rounded-lg border border-slate-100 px-3 py-2.5 text-[13px]"
          >
            <div>
              <b>{str(nameOf(r.relatedId))}</b> — {r.relation}
            </div>
            <RowIconButton label="Xóa quan hệ" danger onClick={() => onRemove(r.relatedId)}>
              <Trash2 className="h-3.5 w-3.5" />
            </RowIconButton>
          </div>
        ))
      )}

      <div className="mt-4 border-t border-slate-200 pt-4 text-[12.5px] font-bold uppercase tracking-[.02em] text-[#00663D]">
        Thêm quan hệ mới
      </div>
      <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField label="Nhà đầu tư liên quan">
          <select
            value={effectiveOther === '' ? '' : String(effectiveOther)}
            onChange={(e) => setOtherId(Number(e.target.value))}
            className={SELECT_CLASS}
          >
            {candidates.length === 0 && <option value="">-- Không còn nhà đầu tư nào --</option>}
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {str(c.values.name)}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label={`Mối quan hệ (là ... của ${str(investor.values.name)})`}>
          <select value={relation} onChange={(e) => setRelation(e.target.value)} className={SELECT_CLASS}>
            {FAMILY_RELATION_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </FormField>
      </div>
    </WideModal>
  );
};

/* ------------------------------------------------------ MCK liên kết */

interface PortfolioModalProps {
  investor: Investor;
  holdings: readonly InvestorHolding[];
  onClose: () => void;
  onGoto: (issuerId: number) => void;
}

export const PortfolioModal: React.FC<PortfolioModalProps> = ({ investor, holdings, onClose, onGoto }) => (
  <WideModal
    title="Danh sách Mã chứng khoán liên kết"
    subtitle={`Nhà đầu tư: ${str(investor.values.name)} · ID định danh: ${str(investor.values.docNo) || 'Chưa cập nhật'}`}
    width={820}
    bodyClassName="p-0"
    onClose={onClose}
    footer={
      <button type="button" className={BTN_OUTLINE} onClick={onClose}>
        Đóng
      </button>
    }
  >
    <table className="w-full border-collapse">
      <thead className="bg-[#F9FAFB]">
        <tr className="text-left text-[13px] font-semibold text-[#292929]">
          {['Mã CK', 'TCPH', 'Vai trò', 'Chức vụ', 'SL nắm giữ', 'Tỷ lệ', 'Thao tác'].map((h, i) => (
            <th key={h} className={`border-b border-slate-200 px-3 py-2.5 ${i >= 4 && i <= 5 ? 'text-right' : ''}`}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {holdings.map((h) => (
          <tr key={h.issuerId} className="text-sm">
            <td className="border-b border-slate-100 px-3 py-3">
              <button type="button" onClick={() => onGoto(h.issuerId)} className="font-semibold text-[#00663D] hover:underline">
                {h.stockCode}
              </button>
            </td>
            <td className="border-b border-slate-100 px-3 py-3">{h.issuerShortName || h.stockCode}</td>
            <td className="border-b border-slate-100 px-3 py-3">
              <div className="flex flex-wrap gap-1">
                {h.holder.roles.map((r) => (
                  <span key={r} className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${roleBadgeClass(r)}`}>
                    {r}
                  </span>
                ))}
              </div>
            </td>
            <td className="border-b border-slate-100 px-3 py-3">{h.holder.position || <span className="text-slate-300">—</span>}</td>
            <td className="border-b border-slate-100 px-3 py-3 text-right tabular-nums">{formatNumberVN(h.holder.holdingQty) || '-'}</td>
            <td className="border-b border-slate-100 px-3 py-3 text-right font-semibold text-[#1E7A42] tabular-nums">
              {h.holder.ratio !== null ? `${h.holder.ratio}%` : '-'}
            </td>
            <td className="border-b border-slate-100 px-3 py-3 text-center">
              <RowIconButton label="Xem chi tiết" onClick={() => onGoto(h.issuerId)}>
                <ChevronRight className="h-3.5 w-3.5" />
              </RowIconButton>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </WideModal>
);
