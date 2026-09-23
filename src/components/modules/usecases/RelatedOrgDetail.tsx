/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ChevronLeft, Pencil, Trash2 } from 'lucide-react';

import { DateField } from './CalendarDatePicker';
import {
  BTN_OUTLINE,
  BTN_PRIMARY,
  ERROR_RING,
  FormField,
  INPUT_CLASS,
  SELECT_CLASS,
} from './catalogUi';
import {
  EMPTY_DRAFT,
  RELATED_ORG_SECTIONS,
  RelatedOrgDraft,
  RelatedOrgField,
  RelatedOrgFieldKey,
  RelatedOrgRow,
  displayValue,
} from './relatedOrgMock';

type Errors = Partial<Record<RelatedOrgFieldKey, string>>;

const EMAIL_KEYS: readonly RelatedOrgFieldKey[] = ['email', 'legalRepEmail', 'cbttEmail'];

function toDraft(row: RelatedOrgRow): RelatedOrgDraft {
  const draft = { ...EMPTY_DRAFT };
  (Object.keys(EMPTY_DRAFT) as RelatedOrgFieldKey[]).forEach((k) => {
    (draft as Record<string, unknown>)[k] = row[k];
  });
  return draft;
}

function validate(draft: RelatedOrgDraft): Errors {
  const errors: Errors = {};
  if (!draft.name.trim()) errors.name = 'Vui lòng nhập tên tổ chức';
  if (!draft.orgType) errors.orgType = 'Vui lòng chọn loại tổ chức';
  EMAIL_KEYS.forEach((k) => {
    const v = (draft[k] as string).trim();
    if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) errors[k] = 'Email không hợp lệ';
  });
  if (draft.charterCapital !== null && draft.charterCapital < 0) {
    errors.charterCapital = 'Số vốn điều lệ không được âm';
  }
  return errors;
}

interface RelatedOrgDetailProps {
  /** `null` = đang thêm mới — mở thẳng ở chế độ sửa. */
  row: RelatedOrgRow | null;
  /** Mở trang ở chế độ sửa ngay (nút bút chì ở danh sách). */
  startEditing?: boolean;
  onBack: () => void;
  onSave: (draft: RelatedOrgDraft) => void;
  onDelete: (row: RelatedOrgRow) => void;
}

/**
 * Trang chi tiết Tổ chức liên quan — theo `renderRelatedOrgDetailView` của
 * `docs/quan-ly-danh-muc_80.html`: xem theo nhóm trường, sửa tại chỗ, thanh
 * Hủy/Lưu cố định ở đáy khi đang sửa.
 *
 * Thêm mới dùng lại đúng trang này thay vì popup: 38 trường, 6 nhóm không vừa
 * khung popup 440px của `ModalShell`.
 */
export const RelatedOrgDetail: React.FC<RelatedOrgDetailProps> = ({
  row,
  startEditing = false,
  onBack,
  onSave,
  onDelete,
}) => {
  const [editing, setEditing] = useState(row === null || startEditing);
  const [draft, setDraft] = useState<RelatedOrgDraft>(() => (row ? toDraft(row) : { ...EMPTY_DRAFT }));
  const [errors, setErrors] = useState<Errors>({});

  const title = row ? row.name : 'Thêm mới tổ chức liên quan';

  const setField = (key: RelatedOrgFieldKey, value: unknown) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const cancel = () => {
    if (!row) {
      onBack();
      return;
    }
    setDraft(toDraft(row));
    setErrors({});
    setEditing(false);
  };

  const save = () => {
    const found = validate(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    onSave({ ...draft, name: draft.name.trim() });
    if (row) setEditing(false);
  };

  const renderInput = (field: RelatedOrgField) => {
    const hasError = !!errors[field.key];
    const cls = `${field.kind === 'select' || field.kind === 'operating' ? SELECT_CLASS : INPUT_CLASS} ${
      hasError ? ERROR_RING : ''
    }`;
    const value = draft[field.key];

    switch (field.kind) {
      case 'select':
        return (
          <select value={value as string} onChange={(e) => setField(field.key, e.target.value)} className={cls}>
            <option value="">-- Chọn {field.label.toLowerCase()} --</option>
            {field.options?.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        );
      case 'operating':
        return (
          <select
            value={String(value)}
            onChange={(e) => setField(field.key, Number(e.target.value))}
            className={cls}
          >
            <option value="1">Bình thường</option>
            <option value="0">Ngừng hoạt động</option>
          </select>
        );
      case 'date':
        return (
          <DateField
            value={(value as string) || null}
            onChange={(v) => setField(field.key, v ?? '')}
            hasError={hasError}
          />
        );
      case 'money':
        return (
          <input
            type="number"
            min={0}
            value={value === null ? '' : String(value)}
            onChange={(e) => setField(field.key, e.target.value === '' ? null : Number(e.target.value))}
            placeholder="VD: 500000000000"
            className={cls}
          />
        );
      default:
        return (
          <input
            type="text"
            value={value as string}
            onChange={(e) => setField(field.key, e.target.value)}
            placeholder={field.placeholder ?? 'Không bắt buộc'}
            className={cls}
          />
        );
    }
  };

  return (
    <div className={`p-6 ${editing ? 'pb-28' : ''}`}>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <button
          type="button"
          onClick={onBack}
          className="mb-2.5 inline-flex items-center gap-1.5 text-[13px] text-[#525252] hover:text-[#00663D]"
        >
          <ChevronLeft className="h-4 w-4" />
          Quay lại danh sách
        </button>

        <nav aria-label="Đường dẫn" className="mb-4 flex flex-wrap items-center text-xs text-slate-500">
          <span>Quản lý hồ sơ</span>
          <span aria-hidden="true" className="mx-1.5">›</span>
          <span>Tổ chức liên quan</span>
          <span aria-hidden="true" className="mx-1.5">›</span>
          <span aria-current="page" className="font-medium text-slate-800">
            {title}
          </span>
        </nav>

        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[19px] font-bold text-[#292929]">{title}</h1>
              {row && (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${
                    row.recordStatus === 'Bình thường'
                      ? 'bg-[#E6F4EA] text-[#1E7A42]'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {row.recordStatus || 'Chưa xác định'}
                </span>
              )}
            </div>
            {row && (
              <div className="mt-1 text-[12.5px] text-slate-500">
                Mã lưu ký: <b className="font-semibold text-[#525252]">{row.custodyCode || '-'}</b>
                {row.shortName && (
                  <>
                    {' · '}Tên viết tắt: <b className="font-semibold text-[#525252]">{row.shortName}</b>
                  </>
                )}
              </div>
            )}
          </div>

          {row && !editing && (
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setEditing(true)} className={BTN_PRIMARY}>
                <Pencil className="h-4 w-4" />
                Chỉnh sửa
              </button>
              <button type="button" onClick={() => onDelete(row)} className={BTN_OUTLINE}>
                <Trash2 className="h-4 w-4" />
                Xóa hồ sơ
              </button>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 px-6 py-5">
          {RELATED_ORG_SECTIONS.map((section, sIdx) => (
            <section
              key={section.title}
              className={`py-4.5 ${sIdx > 0 ? 'border-t border-slate-100' : 'pt-0'} ${
                sIdx === RELATED_ORG_SECTIONS.length - 1 ? 'pb-0' : ''
              }`}
            >
              <h3 className="mb-3.5 text-[13px] font-bold uppercase tracking-[.02em] text-[#00663D]">
                {section.title}
              </h3>

              {editing ? (
                <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
                  {section.fields.map((field) => (
                    <div key={field.key} className={field.span2 ? 'md:col-span-2' : ''}>
                      <FormField label={field.label} required={field.required} error={errors[field.key]}>
                        {renderInput(field)}
                      </FormField>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-x-8 gap-y-0.5 md:grid-cols-2">
                  {section.fields.map((field) => {
                    const v = displayValue(draft, field);
                    return (
                      <div
                        key={field.key}
                        className={`flex items-baseline justify-between gap-3.5 border-b border-dashed border-slate-100 py-2 ${
                          field.span2 ? 'md:col-span-2' : ''
                        }`}
                      >
                        <div className="shrink-0 text-[12.5px] text-slate-500">{field.label}</div>
                        <div className="text-right text-[13.5px] font-medium text-[#292929]">
                          {v || <span className="text-slate-300">-</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          ))}
        </div>
      </div>

      {editing && (
        <div className="fixed right-0 bottom-0 left-0 z-40 flex items-center justify-end gap-2.5 border-t border-slate-200 bg-white px-7 py-3.5 shadow-[0_-4px_16px_rgba(16,24,32,0.08)] md:left-64">
          <span className="mr-auto text-[12.5px] text-slate-500">
            {row ? 'Đang chỉnh sửa' : 'Đang thêm mới'}
          </span>
          <button type="button" onClick={cancel} className={BTN_OUTLINE}>
            Hủy
          </button>
          <button type="button" onClick={save} className={BTN_PRIMARY}>
            Lưu thông tin
          </button>
        </div>
      )}
    </div>
  );
};
