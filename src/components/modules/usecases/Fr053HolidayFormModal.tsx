/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';

import { DateField, DateRangeField } from './CalendarDatePicker';
import { BTN_OUTLINE, BTN_PRIMARY, FormField, ModalShell, SELECT_CLASS } from './catalogUi';
import { Flag, STATUS_OPTIONS } from './catalogTypes';
import { HOLIDAY_CATEGORIES, HolidayRow } from './fr053HolidayMock';

/**
 * Popup "Thêm mới / Chỉnh sửa ngày nghỉ" — FR-053, theo bố cục của
 * `docs/quan-ly-danh-muc_16.html` (`ngaynghi.fields`).
 */
export interface HolidayDraft {
  category: string;
  fromDate: string;
  toDate: string;
  makeupDate: string | null;
  statusFlg: Flag;
}

interface Fr053HolidayFormModalProps {
  /** `null` là thêm mới; có giá trị là cập nhật bản ghi đó. */
  editing: HolidayRow | null;
  onCancel: () => void;
  onSave: (draft: HolidayDraft) => void;
}

function toDraft(editing: HolidayRow | null): HolidayDraft {
  if (!editing) {
    return {
      category: HOLIDAY_CATEGORIES[0],
      fromDate: '',
      toDate: '',
      makeupDate: null,
      statusFlg: 1,
    };
  }
  return {
    category: editing.category,
    fromDate: editing.fromDate,
    toDate: editing.toDate,
    makeupDate: editing.makeupDate,
    statusFlg: editing.statusFlg,
  };
}

interface FormErrors {
  dateRange?: string;
}

/** FR-053 AC-053-1: "Đến ngày < Từ ngày → chặn". */
function validate(draft: HolidayDraft): FormErrors {
  const errors: FormErrors = {};
  if (!draft.fromDate || !draft.toDate) {
    errors.dateRange = 'Từ ngày và Đến ngày là bắt buộc';
  } else if (draft.toDate < draft.fromDate) {
    errors.dateRange = 'Đến ngày phải lớn hơn hoặc bằng Từ ngày';
  }
  return errors;
}

export const Fr053HolidayFormModal: React.FC<Fr053HolidayFormModalProps> = ({
  editing,
  onCancel,
  onSave,
}) => {
  const [draft, setDraft] = useState<HolidayDraft>(() => toDraft(editing));
  const [submitted, setSubmitted] = useState(false);

  const errors = validate(draft);
  const shownErrors = submitted ? errors : {};

  const set = <K extends keyof HolidayDraft>(key: K, value: HolidayDraft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const submit = () => {
    setSubmitted(true);
    if (Object.keys(validate(draft)).length > 0) return;
    onSave(draft);
  };

  return (
    <ModalShell
      title={editing ? 'Chỉnh sửa ngày nghỉ' : 'Thêm mới ngày nghỉ'}
      onClose={onCancel}
      footer={
        <>
          <button type="button" className={BTN_OUTLINE} onClick={onCancel}>
            Hủy
          </button>
          <button type="button" className={BTN_PRIMARY} onClick={submit}>
            Lưu
          </button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex flex-col gap-4 px-5 py-5"
      >
        <FormField label="Phân loại" required>
          <select
            value={draft.category}
            onChange={(e) => set('category', e.target.value)}
            className={SELECT_CLASS}
          >
            {HOLIDAY_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Từ ngày - Đến ngày" required error={shownErrors.dateRange}>
          <DateRangeField
            startValue={draft.fromDate || null}
            endValue={draft.toDate || null}
            hasError={!!shownErrors.dateRange}
            placeholder="Chọn khoảng ngày nghỉ"
            onChange={(start, end) => {
              set('fromDate', start ?? '');
              set('toDate', end ?? '');
            }}
          />
        </FormField>

        <FormField label="Lịch làm bù" hint="Không bắt buộc — chỉ khai khi ngày nghỉ có làm bù kèm theo">
          <DateField
            value={draft.makeupDate}
            placeholder="Không bắt buộc"
            onChange={(value) => set('makeupDate', value)}
          />
        </FormField>

        <FormField label="Trạng thái" required>
          <select
            value={draft.statusFlg}
            onChange={(e) => set('statusFlg', Number(e.target.value) as Flag)}
            className={SELECT_CLASS}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FormField>

        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </ModalShell>
  );
};
