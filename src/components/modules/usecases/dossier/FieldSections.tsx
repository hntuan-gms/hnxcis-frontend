/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

import { DateField } from '../CalendarDatePicker';
import { ERROR_RING, FormField, INPUT_CLASS, SELECT_CLASS, TEXTAREA_CLASS } from '../catalogUi';
import { FieldDef, FieldSection, Values, displayField } from './dossierFields';

/**
 * Màn xem và form nhập dựng từ `FieldSection[]` — bản dịch của
 * `renderDossierViewHtml` / `fieldHtmlWrapped` của file mẫu v80, dùng chung cho
 * TCPH, hồ sơ chứng khoán, bảng con TPRL và Nhà đầu tư.
 */

export type FieldErrors = Record<string, string | undefined>;

export function validateRequired(sections: readonly FieldSection[], values: Values): FieldErrors {
  const errors: FieldErrors = {};
  sections.forEach((s) =>
    s.fields.forEach((f) => {
      if (!f.required || f.kind === 'computed') return;
      if (f.showIf && !values[f.showIf]) return;
      const v = values[f.key];
      if (v === null || v === undefined || String(v).trim() === '') errors[f.key] = 'Trường này là bắt buộc';
    }),
  );
  return errors;
}

export function hasErrors(errors: FieldErrors): boolean {
  return Object.values(errors).some(Boolean);
}

const GROUP_TITLE = 'mb-3.5 text-[13px] font-bold uppercase tracking-[.02em] text-[#00663D]';

export const DetailRow: React.FC<{ label: string; value: string; full?: boolean }> = ({ label, value, full }) => (
  <div
    className={`flex items-baseline justify-between gap-3.5 border-b border-dashed border-slate-100 py-2 ${
      full ? 'md:col-span-2' : ''
    }`}
  >
    <div className="shrink-0 text-[12.5px] text-slate-500">{label}</div>
    <div className="text-right text-[13.5px] font-medium text-[#292929]">
      {value || <span className="text-slate-300">-</span>}
    </div>
  </div>
);

/** Khung trắng viền bo góc bao quanh các nhóm trường (`.detail-surface`). */
export const Surface: React.FC<{ children: React.ReactNode; flush?: boolean }> = ({ children, flush }) => (
  <div className={`rounded-xl border border-slate-200 bg-white ${flush ? '' : 'px-6 py-5'}`}>{children}</div>
);

const Groups: React.FC<{ sections: readonly FieldSection[]; render: (s: FieldSection) => React.ReactNode }> = ({
  sections,
  render,
}) => (
  <>
    {sections.map((s, i) => (
      <section
        key={s.title}
        className={`py-4.5 ${i > 0 ? 'border-t border-slate-100' : 'pt-0'} ${i === sections.length - 1 ? 'pb-0' : ''}`}
      >
        <h3 className={GROUP_TITLE}>{s.title}</h3>
        {render(s)}
      </section>
    ))}
  </>
);

export const SectionsView: React.FC<{ sections: readonly FieldSection[]; values: Values }> = ({ sections, values }) => (
  <Groups
    sections={sections}
    render={(s) => (
      <div className="grid grid-cols-1 gap-x-8 gap-y-0.5 md:grid-cols-2">
        {s.fields
          .filter((f) => !f.hideInView && (!f.showIf || values[f.showIf]))
          .map((f) => (
            <DetailRow key={f.key} label={f.label} value={displayField(values, f)} full={f.span2} />
          ))}
      </div>
    )}
  />
);

interface FieldInputProps {
  field: FieldDef;
  value: Values[string];
  error?: string;
  onChange: (value: Values[string]) => void;
}

export const FieldInput: React.FC<FieldInputProps> = ({ field, value, error, onChange }) => {
  const ring = error ? ERROR_RING : '';
  switch (field.kind) {
    case 'select':
      return (
        <select value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} className={`${SELECT_CLASS} ${ring}`}>
          <option value="">-- Chọn {field.label.toLowerCase()} --</option>
          {field.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    case 'status':
      return (
        <select value={String(value ?? 1)} onChange={(e) => onChange(Number(e.target.value))} className={SELECT_CLASS}>
          <option value="1">Đang hoạt động</option>
          <option value="0">Ngừng hoạt động</option>
        </select>
      );
    case 'date':
      return <DateField value={(value as string) || null} onChange={(v) => onChange(v ?? '')} hasError={!!error} />;
    case 'number':
    case 'money':
      return (
        <input
          type="number"
          step="any"
          value={value === null || value === undefined ? '' : String(value)}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          placeholder={field.placeholder ?? ''}
          className={`${INPUT_CLASS} ${ring}`}
        />
      );
    case 'textarea':
      return (
        <textarea
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder ?? ''}
          className={`${TEXTAREA_CLASS} ${ring}`}
        />
      );
    case 'toggle': {
      const on = !!value;
      return (
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={field.label}
          onClick={() => onChange(!on)}
          className={`relative h-6 w-10.5 shrink-0 rounded-full transition-colors ${on ? 'bg-[#00663D]' : 'bg-slate-200'}`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left] ${on ? 'left-5' : 'left-0.5'}`}
          />
        </button>
      );
    }
    default:
      return (
        <input
          type="text"
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder ?? 'Không bắt buộc'}
          className={`${INPUT_CLASS} ${ring}`}
        />
      );
  }
};

interface SectionsFormProps {
  sections: readonly FieldSection[];
  values: Values;
  errors: FieldErrors;
  onChange: (key: string, value: Values[string]) => void;
  /** Bỏ tiêu đề nhóm (bảng con chỉ có một nhóm trường). */
  plain?: boolean;
}

/**
 * Form hai cột. Tắt một toggle thì xóa luôn giá trị của các trường `showIf` phụ
 * thuộc nó — giống `bindCustomFieldWidgets` của file mẫu — để không lưu lại một
 * "Tỷ lệ chuyển đổi" cho trái phiếu đã bỏ đánh dấu chuyển đổi.
 */
export const SectionsForm: React.FC<SectionsFormProps> = ({ sections, values, errors, onChange, plain }) => {
  const change = (f: FieldDef, v: Values[string]) => {
    onChange(f.key, v);
    if (f.kind === 'toggle' && !v) {
      sections.forEach((s) => s.fields.forEach((dep) => dep.showIf === f.key && onChange(dep.key, dep.kind === 'number' ? null : '')));
    }
  };

  const grid = (s: FieldSection) => (
    <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
      {s.fields
        .filter((f) => f.kind !== 'computed' && (!f.showIf || values[f.showIf]))
        .map((f) => (
          <div key={f.key} className={f.span2 ? 'md:col-span-2' : ''}>
            <FormField label={f.label} required={f.required} error={errors[f.key]}>
              <FieldInput field={f} value={values[f.key]} error={errors[f.key]} onChange={(v) => change(f, v)} />
            </FormField>
          </div>
        ))}
    </div>
  );

  if (plain) return <>{sections.map((s) => <React.Fragment key={s.title}>{grid(s)}</React.Fragment>)}</>;
  return <Groups sections={sections} render={grid} />;
};

/* ---------------------------------------------------------------- modal */

interface WideModalProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  onClose: () => void;
  footer: React.ReactNode;
  children: React.ReactNode;
  /** px, theo `.modal` / `.modal-lg` / các popup rộng riêng của file mẫu. */
  width?: 480 | 540 | 560 | 820;
  bodyClassName?: string;
}

const WIDTH_CLASS: Record<NonNullable<WideModalProps['width']>, string> = {
  480: 'max-w-120',
  540: 'max-w-135',
  560: 'max-w-140',
  820: 'max-w-205',
};

export const WideModal: React.FC<WideModalProps> = ({
  title,
  subtitle,
  onClose,
  footer,
  children,
  width = 560,
  bodyClassName = 'p-5',
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`flex max-h-[calc(100vh-3rem)] w-full flex-col overflow-hidden rounded-xl bg-white shadow-2xl ${WIDTH_CLASS[width]}`}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-[#292929]">{title}</h3>
            {subtitle && <div className="mt-0.5 text-[12.5px] text-slate-500">{subtitle}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-[#292929]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className={`min-h-0 flex-1 overflow-y-auto ${bodyClassName}`}>{children}</div>
        <div className="flex shrink-0 justify-end gap-2.5 border-t border-slate-200 px-5 py-4">{footer}</div>
      </div>
    </div>
  );
};

/** Chip lọc bo tròn (`.own-chip` của file mẫu). */
export const FilterChip: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({
  active,
  onClick,
  children,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-full border px-3.25 py-1.5 text-xs ${
      active ? 'border-[#E6F4EA] bg-[#E6F4EA] font-semibold text-[#1E7A42]' : 'border-slate-200 bg-white font-medium text-[#525252]'
    }`}
  >
    {children}
  </button>
);

/** Tab dạng viên thuốc (`.dtab`). */
export const PillTab: React.FC<{ active: boolean; onClick: () => void; disabled?: boolean; children: React.ReactNode }> = ({
  active,
  onClick,
  disabled,
  children,
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`rounded-full px-4 py-2 text-[13px] disabled:cursor-not-allowed disabled:opacity-45 ${
      active ? 'bg-[#E6F4EA] font-semibold text-[#1E7A42]' : 'font-medium text-[#525252] hover:bg-slate-100'
    }`}
  >
    {children}
  </button>
);

export const RowIconButton: React.FC<{
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}> = ({ label, onClick, danger, children }) => (
  <button
    type="button"
    onClick={onClick}
    title={label}
    aria-label={label}
    className={`mr-0.5 inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 ${
      danger ? 'hover:bg-[#802423]/10 hover:text-[#802423]' : 'hover:bg-slate-100 hover:text-slate-700'
    }`}
  >
    {children}
  </button>
);
