/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useRef, useState } from 'react';
import { ChevronDown, Plus, Search, Users } from 'lucide-react';

import { DateField } from '../CalendarDatePicker';
import { BTN_OUTLINE, BTN_PRIMARY, ERROR_RING, FormField, INPUT_CLASS, useCloseOnOutsideOrEscape } from '../catalogUi';
import {
  DOSSIER_TYPES,
  DossierType,
  ISSUER_SECTIONS,
  OTHER_ORG_SECTIONS,
  SHAREHOLDER_ROLES,
  SubTableKey,
  TPRL_SUBTABLES,
  Values,
  emptyValues,
} from './dossierFields';
import { FieldErrors, PillTab, SectionsForm, WideModal, hasErrors, validateRequired } from './FieldSections';
import { FamilyRelation, Holder, Investor, IssuerKind, Issuer, str } from './dossierStore';

function useFormState(initial: Values) {
  const [values, setValues] = useState<Values>(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const onChange = (k: string, v: Values[string]) => {
    setValues((prev) => ({ ...prev, [k]: v }));
    setErrors((prev) => ({ ...prev, [k]: undefined }));
  };
  return { values, setValues, errors, setErrors, onChange };
}

const SaveCancel: React.FC<{ onCancel: () => void; onSave: () => void; saveLabel?: string }> = ({
  onCancel,
  onSave,
  saveLabel = 'Lưu',
}) => (
  <>
    <button type="button" className={BTN_OUTLINE} onClick={onCancel}>
      Hủy
    </button>
    <button type="button" className={BTN_PRIMARY} onClick={onSave}>
      {saveLabel}
    </button>
  </>
);

/* ---------------------------------------------------- Thêm mới TCPH */

export function issuerSectionsFor(kind: IssuerKind) {
  return kind === 'tochuckhac' ? OTHER_ORG_SECTIONS : ISSUER_SECTIONS;
}

interface IssuerCreateModalProps {
  issuers: readonly Issuer[];
  onCancel: () => void;
  onSave: (kind: IssuerKind, values: Values) => void;
}

/** `openIssuerFormModal` (thêm mới). Sửa TCPH làm tại chỗ ở trang chi tiết. */
export const IssuerCreateModal: React.FC<IssuerCreateModalProps> = ({ issuers, onCancel, onSave }) => {
  const [kind, setKind] = useState<IssuerKind>('doanhnghiep');
  const form = useFormState(emptyValues(ISSUER_SECTIONS));
  const sections = issuerSectionsFor(kind);

  const switchKind = (next: IssuerKind) => {
    setKind(next);
    form.setValues(emptyValues(issuerSectionsFor(next)));
    form.setErrors({});
  };

  const save = () => {
    const found = validateRequired(sections, form.values);
    const taxCode = str(form.values.taxCode).trim();
    if (kind === 'doanhnghiep' && taxCode && issuers.some((i) => i.deleteFlg === 0 && str(i.values.taxCode) === taxCode)) {
      found.taxCode = 'Mã số thuế này đã có hồ sơ TCPH';
    }
    form.setErrors(found);
    if (hasErrors(found)) return;
    onSave(kind, { ...form.values, name: str(form.values.name).trim() });
  };

  return (
    <WideModal title="Thêm mới" onClose={onCancel} footer={<SaveCancel onCancel={onCancel} onSave={save} />}>
      <div className="mb-4 flex gap-1.5">
        <PillTab active={kind === 'doanhnghiep'} onClick={() => switchKind('doanhnghiep')}>
          Tổ chức phát hành
        </PillTab>
        <PillTab active={kind === 'tochuckhac'} onClick={() => switchKind('tochuckhac')}>
          Tổ chức khác
        </PillTab>
      </div>
      <SectionsForm sections={sections} values={form.values} errors={form.errors} onChange={form.onChange} />
    </WideModal>
  );
};

/* ------------------------------------------- Chọn loại hồ sơ chứng khoán */

interface DossierPickerModalProps {
  issuer: Issuer;
  onClose: () => void;
  onCreate: (type: DossierType) => void;
  onGotoCp: () => void;
}

export const DossierPickerModal: React.FC<DossierPickerModalProps> = ({ issuer, onClose, onCreate, onGotoCp }) => (
  <WideModal
    title="Tạo hồ sơ chứng khoán mới"
    width={480}
    bodyClassName="p-2.5"
    onClose={onClose}
    footer={
      <button type="button" className={BTN_OUTLINE} onClick={onClose}>
        Đóng
      </button>
    }
  >
    {(Object.keys(DOSSIER_TYPES) as DossierType[]).map((type) => {
      const cfg = DOSSIER_TYPES[type];
      const count = type === 'cp' ? (issuer.dossiers.cp ? 1 : 0) : issuer.dossiers[type].length;
      return (
        <div key={type} className="flex items-center gap-3 rounded-lg p-3 hover:bg-[#F9FAFB]">
          <div className="flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-lg bg-[#E6F4EA] text-xs font-bold text-[#1E7A42]">
            {cfg.shortTag}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-semibold text-[#292929]">{cfg.label}</div>
            <div className="text-[11.8px] text-slate-500">{cfg.description}</div>
          </div>
          {count > 0 && (
            <span className="rounded-full bg-[#E6F4EA] px-2.5 py-0.75 text-[11px] whitespace-nowrap text-[#1E7A42]">
              {cfg.multiple ? `${count} hồ sơ` : 'Đã có hồ sơ'}
            </span>
          )}
          {!cfg.multiple && count > 0 ? (
            <button type="button" className={`${BTN_OUTLINE} h-7.5 px-3 text-[12.5px]`} onClick={onGotoCp}>
              Xem hồ sơ
            </button>
          ) : (
            <button
              type="button"
              className={`${count > 0 ? BTN_OUTLINE : BTN_PRIMARY} h-7.5 px-3 text-[12.5px]`}
              onClick={() => onCreate(type)}
            >
              {count > 0 ? '+ Thêm mới' : 'Tạo hồ sơ'}
            </button>
          )}
        </div>
      );
    })}
  </WideModal>
);

/* ----------------------------------------------- Tạo hồ sơ chứng khoán */

interface DossierCreateModalProps {
  type: DossierType;
  onCancel: () => void;
  onSave: (values: Values) => void;
}

export const DossierCreateModal: React.FC<DossierCreateModalProps> = ({ type, onCancel, onSave }) => {
  const cfg = DOSSIER_TYPES[type];
  const form = useFormState(emptyValues(cfg.sections));
  const save = () => {
    const found = validateRequired(cfg.sections, form.values);
    form.setErrors(found);
    if (!hasErrors(found)) onSave(form.values);
  };
  return (
    <WideModal title={`Tạo mới ${cfg.label}`} onClose={onCancel} footer={<SaveCancel onCancel={onCancel} onSave={save} />}>
      <SectionsForm sections={cfg.sections} values={form.values} errors={form.errors} onChange={form.onChange} />
    </WideModal>
  );
};

/* ---------------------------------------------------- Dòng bảng con TPRL */

interface SubRowModalProps {
  subKey: SubTableKey;
  editing: Values | null;
  onCancel: () => void;
  onSave: (values: Values) => void;
}

export const SubRowModal: React.FC<SubRowModalProps> = ({ subKey, editing, onCancel, onSave }) => {
  const cfg = TPRL_SUBTABLES[subKey];
  const sections = [{ title: cfg.label, fields: cfg.fields }];
  const form = useFormState(editing ? { ...editing } : emptyValues(sections));
  return (
    <WideModal
      title={`${editing ? 'Chỉnh sửa dòng' : 'Thêm dòng'} — ${cfg.label}`}
      onClose={onCancel}
      footer={<SaveCancel onCancel={onCancel} onSave={() => onSave(form.values)} />}
    >
      <SectionsForm plain sections={sections} values={form.values} errors={form.errors} onChange={form.onChange} />
    </WideModal>
  );
};

/* ------------------------------------------------ Gắn cổ đông / NNB / NLQ */

function investorLabel(inv: Investor | undefined): string {
  if (!inv) return '';
  const name = str(inv.values.name);
  const doc = str(inv.values.docNo);
  return doc ? `${name} (${doc})` : name;
}

/** Ô chọn nhà đầu tư có tìm kiếm (`openInvestorPickerMenu`). */
const InvestorPicker: React.FC<{
  investors: readonly Investor[];
  value: number | null;
  disabled?: boolean;
  hasError?: boolean;
  onChange: (id: number) => void;
}> = ({ investors, value, disabled, hasError, onChange }) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const boxRef = useRef<HTMLDivElement>(null);
  useCloseOnOutsideOrEscape(open, () => setOpen(false), boxRef);

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    return investors.filter(
      (i) => !k || str(i.values.name).toLowerCase().includes(k) || str(i.values.docNo).toLowerCase().includes(k),
    );
  }, [investors, q]);

  const current = investors.find((i) => i.id === value);

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`${INPUT_CLASS} flex items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60 ${
          hasError ? ERROR_RING : ''
        }`}
      >
        <span className={`truncate ${current ? '' : 'text-slate-400'}`}>
          {current ? investorLabel(current) : '-- Chọn nhà đầu tư từ Hồ sơ Nhà đầu tư --'}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      </button>
      {open && (
        <div className="absolute right-0 left-0 z-30 mt-1.5 flex max-h-75 flex-col rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
          <div className="mb-1.5 flex h-8.5 shrink-0 items-center gap-2 rounded-lg border border-slate-200 px-2.5">
            <Search className="h-3.5 w-3.5 text-slate-400" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm theo tên hoặc CCCD/MST..."
              className="w-full border-none bg-transparent text-[13px] outline-none"
            />
          </div>
          <div className="overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-2.5 py-3.5 text-center text-[12.5px] text-slate-500">Không tìm thấy nhà đầu tư</div>
            ) : (
              filtered.map((i) => (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => {
                    onChange(i.id);
                    setOpen(false);
                  }}
                  className={`block w-full rounded-md px-2.5 py-2.25 text-left text-[13px] ${
                    i.id === value ? 'bg-[#E6F4EA] font-medium text-[#1E7A42]' : 'hover:bg-[#F9FAFB]'
                  }`}
                >
                  {str(i.values.name)}
                  {str(i.values.docNo) && <span className="ml-1 text-[11.5px] text-slate-400">({str(i.values.docNo)})</span>}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface HolderModalProps {
  investors: readonly Investor[];
  existing: readonly Holder[];
  editing: Holder | null;
  onCancel: () => void;
  onSave: (holder: Holder) => void;
}

/** `openHolderFormModal` — vai trò gắn theo mã CK, không lưu ở hồ sơ NĐT. */
export const HolderModal: React.FC<HolderModalProps> = ({ investors, existing, editing, onCancel, onSave }) => {
  const [investorId, setInvestorId] = useState<number | null>(editing?.investorId ?? null);
  const [roles, setRoles] = useState<string[]>(editing?.roles ?? []);
  const [position, setPosition] = useState(editing?.position ?? '');
  const [qty, setQty] = useState(editing?.holdingQty ?? null);
  const [ratio, setRatio] = useState(editing?.ratio ?? null);
  const [startDate, setStartDate] = useState(editing?.startDate ?? '');
  const [accounts, setAccounts] = useState((editing?.tradingAccounts ?? []).join(', '));
  const [errors, setErrors] = useState<{ investor?: string; roles?: string; ratio?: string }>({});

  const active = investors.filter((i) => i.deleteFlg === 0);

  const save = () => {
    const found: typeof errors = {};
    if (investorId === null) found.investor = 'Vui lòng chọn nhà đầu tư';
    else if (!editing && existing.some((h) => h.investorId === investorId)) {
      found.investor = 'Nhà đầu tư này đã có trong danh sách của mã chứng khoán này';
    }
    if (roles.length === 0) found.roles = 'Vui lòng chọn ít nhất một Vai trò / Loại cổ đông';
    if (ratio !== null && (ratio < 0 || ratio > 100)) found.ratio = 'Tỷ lệ sở hữu phải trong khoảng 0–100%';
    setErrors(found);
    if (Object.keys(found).length > 0 || investorId === null) return;
    onSave({
      investorId,
      roles,
      position: position.trim(),
      holdingQty: qty,
      ratio,
      startDate,
      tradingAccounts: accounts.split(',').map((s) => s.trim()).filter(Boolean),
    });
  };

  const numInput = (value: number | null, set: (v: number | null) => void, placeholder: string, hasError?: boolean) => (
    <input
      type="number"
      step="any"
      value={value === null ? '' : String(value)}
      onChange={(e) => set(e.target.value === '' ? null : Number(e.target.value))}
      placeholder={placeholder}
      className={`${INPUT_CLASS} ${hasError ? ERROR_RING : ''}`}
    />
  );

  return (
    <WideModal
      title={`${editing ? 'Chỉnh sửa' : 'Gắn'} Cổ đông / NNB / NLQ`}
      onClose={onCancel}
      footer={<SaveCancel onCancel={onCancel} onSave={save} />}
    >
      <div className="space-y-4">
        <FormField
          label="Nhà đầu tư"
          required
          error={errors.investor}
          hint={editing ? undefined : 'Không tìm thấy nhà đầu tư? Hãy tạo mới trong màn "Nhà đầu tư" trước.'}
        >
          <InvestorPicker
            investors={active}
            value={investorId}
            disabled={!!editing}
            hasError={!!errors.investor}
            onChange={(id) => {
              setInvestorId(id);
              setErrors((p) => ({ ...p, investor: undefined }));
            }}
          />
        </FormField>

        <FormField label="Vai trò / Loại cổ đông" required error={errors.roles}>
          <div className="flex flex-wrap gap-2">
            {SHAREHOLDER_ROLES.map((r) => {
              const on = roles.includes(r.value);
              return (
                <button
                  key={r.value}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    setRoles((prev) => (on ? prev.filter((x) => x !== r.value) : [...prev, r.value]));
                    setErrors((p) => ({ ...p, roles: undefined }));
                  }}
                  className={`rounded-full border px-3 py-1.75 text-[12.5px] ${
                    on ? 'border-[#E6F4EA] bg-[#E6F4EA] font-semibold text-[#1E7A42]' : 'border-slate-200 bg-white text-[#525252]'
                  }`}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        </FormField>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Chức vụ tại công ty">
            <input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="VD: Chủ tịch HĐQT, Tổng Giám đốc" className={INPUT_CLASS} />
          </FormField>
          <FormField label="Số lượng nắm giữ">{numInput(qty, setQty, 'VD: 5000000')}</FormField>
          <FormField label="Tỷ lệ sở hữu (%)" error={errors.ratio}>
            {numInput(ratio, setRatio, 'VD: 5.25', !!errors.ratio)}
          </FormField>
          <FormField label="Ngày bắt đầu nắm giữ">
            <DateField value={startDate || null} onChange={(v) => setStartDate(v ?? '')} />
          </FormField>
          <FormField label="Tài khoản GD">
            <input value={accounts} onChange={(e) => setAccounts(e.target.value)} placeholder="Nhập số TK, cách nhau bởi dấu phẩy" className={INPUT_CLASS} />
          </FormField>
        </div>
      </div>
    </WideModal>
  );
};

/* ------------------------------------------------ Gợi ý NLQ từ gia đình */

interface FamilySuggestModalProps {
  base: Investor;
  candidates: readonly FamilyRelation[];
  nameOf: (id: number) => string;
  onClose: () => void;
  onAdd: (investorIds: number[]) => void;
}

/** `openFamilySuggestModal` — hiện ngay sau khi gắn một NĐT có quan hệ gia đình. */
export const FamilySuggestModal: React.FC<FamilySuggestModalProps> = ({ base, candidates, nameOf, onClose, onAdd }) => {
  const [checked, setChecked] = useState<ReadonlySet<number>>(new Set(candidates.map((c) => c.relatedId)));
  const baseName = str(base.values.name);
  return (
    <WideModal
      title="Gợi ý gắn Người liên quan (NLQ)"
      subtitle={`${baseName} có quan hệ gia đình với những người dưới đây`}
      width={540}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={BTN_OUTLINE} onClick={onClose}>
            Bỏ qua
          </button>
          <button type="button" className={BTN_PRIMARY} disabled={checked.size === 0} onClick={() => onAdd([...checked])}>
            <Plus className="h-4 w-4" />
            Gắn người liên quan đã chọn
          </button>
        </>
      }
    >
      <div className="mb-3.5 flex items-start gap-2 rounded-lg border border-[#22AF73] bg-[#E6F4EA] px-3 py-2.5 text-[12.5px] text-[#1E7A42]">
        <Users className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Những người này có quan hệ gia đình với “{baseName}” nhưng chưa được gắn vào mã chứng khoán này. Chọn người muốn
          gắn thêm làm <b>Người liên quan (NLQ)</b>.
        </span>
      </div>
      {candidates.map((c) => (
        <label
          key={c.relatedId}
          className="mb-2 flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-100 px-3 py-2.5 hover:bg-[#F9FAFB]"
        >
          <input
            type="checkbox"
            className="mt-0.75 h-4 w-4 accent-[#008A4B]"
            checked={checked.has(c.relatedId)}
            onChange={() =>
              setChecked((prev) => {
                const next = new Set(prev);
                if (next.has(c.relatedId)) next.delete(c.relatedId);
                else next.add(c.relatedId);
                return next;
              })
            }
          />
          <div>
            <div className="font-semibold text-[#292929]">{nameOf(c.relatedId)}</div>
            <div className="text-xs text-slate-500">
              {c.relation} của {baseName}
            </div>
          </div>
        </label>
      ))}
    </WideModal>
  );
};
