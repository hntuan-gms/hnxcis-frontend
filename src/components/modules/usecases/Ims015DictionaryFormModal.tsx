/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

import {
  BTN_DANGER,
  BTN_OUTLINE,
  BTN_PRIMARY,
  ERROR_RING,
  FormField,
  INPUT_CLASS,
  ModalShell,
  SELECT_CLASS,
  TEXTAREA_CLASS,
} from './catalogUi';
import { Flag, MAX_LEN, STATUS_OPTIONS } from './catalogTypes';
import { LookupValueRow } from './lookupValuesMock';

/**
 * Popup "Thêm / Sửa từ điển" — SRS [IMS-015] §2.3 (Bảng 06 và Bảng 07).
 *
 * KHÁC popup của HNX-SRS / IMS-008 (`LookupValueFormModal`) ở ba chỗ, nên tách
 * riêng thay vì nhồi thêm cờ cấu hình vào popup kia:
 *
 *   1. "Loại" (`LOV_GROUP`) là trường NHẬP ĐƯỢC. Hai UC kia ghim cứng một nhóm.
 *   2. Bảng 06 đặc tả `CODE` chi tiết nhất trong cả bảy SRS: bắt buộc, tối đa 255
 *      ký tự, chỉ chữ - số - dấu gạch dưới, tự viết hoa khi lưu, và trùng mã chỉ
 *      tính TRONG CÙNG MỘT LOẠI.
 *   3. Bảng 07 yêu cầu bấm Hủy khi đã nhập dở phải hỏi lại trước khi đóng.
 */

export interface DictionaryDraft {
  code: string;
  value: string;
  lovGroup: string;
  displayOrder: number | null;
  lookupParentId: number | null;
  description: string;
  statusFlg: Flag;
}

/**
 * Định dạng mã theo Bảng 06: "Không có chứa ký tự đặc biệt, chỉ chứa chữ cái,
 * chữ số, dấu _".
 */
const CODE_PATTERN = /^[A-Za-z0-9_]+$/;

interface Ims015DictionaryFormModalProps {
  /** `null` là thêm mới; có giá trị là cập nhật bản ghi đó. */
  editing: LookupValueRow | null;
  /** Danh sách nhóm từ điển cho ô "Loại". */
  groupOptions: ReadonlyArray<{ code: string; label: string }>;
  /** Nhóm đang được lọc trên danh sách, dùng làm giá trị mặc định khi thêm mới. */
  defaultGroup: string;
  /**
   * TOÀN BỘ bản ghi chưa xóa, để kiểm tra trùng mã.
   *
   * Truyền cả bảng chứ không truyền sẵn danh sách mã: Bảng 06 quy định trùng mã
   * chỉ tính trong cùng một Loại, mà Loại lại đổi được ngay trong form này — nên
   * phép kiểm tra phải chạy lại theo Loại người dùng vừa chọn.
   */
  allRows: readonly LookupValueRow[];
  /**
   * Các bản ghi có thể làm cha.
   *
   * Màn hình gọi đã lọc theo luật trường tham chiếu (`DELETE_FLG = 0`,
   * `ACTIVE_FLG = 1`) và đã loại bản ghi đang sửa.
   */
  parentOptions: readonly LookupValueRow[];
  onCancel: () => void;
  onSave: (draft: DictionaryDraft) => void;
}

function toDraft(editing: LookupValueRow | null, defaultGroup: string): DictionaryDraft {
  if (!editing) {
    return {
      code: '',
      value: '',
      // Đang lọc theo một nhóm thì thêm mới vào đúng nhóm đó — người dùng vào từ
      // danh sách đã lọc thì gần như chắc chắn muốn thêm vào nhóm đang xem.
      lovGroup: defaultGroup,
      displayOrder: null,
      lookupParentId: null,
      description: '',
      statusFlg: 1,
    };
  }

  return {
    code: editing.code,
    value: editing.value,
    lovGroup: editing.lovGroup,
    displayOrder: editing.displayOrder,
    lookupParentId: editing.lookupParentId,
    description: editing.description,
    statusFlg: editing.statusFlg,
  };
}

type FieldKey = 'code' | 'value' | 'lovGroup' | 'displayOrder';

/**
 * Export để kiểm thử được: đây là phần đặc tả chi tiết nhất trong cả bảy SRS
 * (Bảng 06, dòng "Mã"), và luật "trùng mã chỉ tính trong cùng một Loại" mà sai
 * thì hệ thống lặng lẽ cho phép hai bản ghi cùng mã trong một nhóm.
 */
export function validateDictionaryDraft(
  draft: DictionaryDraft,
  editing: LookupValueRow | null,
  allRows: readonly LookupValueRow[],
): Partial<Record<FieldKey, string>> {
  const errors: Partial<Record<FieldKey, string>> = {};

  const code = draft.code.trim();
  if (!code) {
    errors.code = 'Mã là bắt buộc';
  } else if (code.length > MAX_LEN.lookupCode) {
    errors.code = `Mã tối đa ${MAX_LEN.lookupCode} ký tự`;
  } else if (!CODE_PATTERN.test(code)) {
    // Nguyên văn thông báo ở Bảng 06.
    errors.code = 'Mã chỉ chứa chữ cái và số';
  } else if (
    /*
     * Bảng 06: "Nếu mã mới trùng với mã đã tồn tại TRONG CÙNG LOẠI". Trùng mã
     * giữa hai nhóm khác nhau là hợp lệ — VD mã 'HCM' vừa có thể là một tỉnh
     * thành vừa là một thành viên thị trường.
     */
    allRows.some(
      (r) =>
        r.id !== editing?.id &&
        r.deleteFlg === 0 &&
        r.lovGroup === draft.lovGroup &&
        r.code.toUpperCase() === code.toUpperCase(),
    )
  ) {
    errors.code = `Mã đã tồn tại trong loại ${draft.lovGroup}`;
  }

  const value = draft.value.trim();
  if (!value) {
    errors.value = 'Giá trị là bắt buộc';
  } else if (value.length > MAX_LEN.lookupValue) {
    errors.value = `Giá trị tối đa ${MAX_LEN.lookupValue} ký tự`;
  }

  if (!draft.lovGroup) {
    errors.lovGroup = 'Loại là bắt buộc';
  }

  if (draft.displayOrder !== null && draft.displayOrder < 0) {
    errors.displayOrder = 'Thứ tự không được là số âm';
  }

  return errors;
}

export const Ims015DictionaryFormModal: React.FC<Ims015DictionaryFormModalProps> = ({
  editing,
  groupOptions,
  defaultGroup,
  allRows,
  parentOptions,
  onCancel,
  onSave,
}) => {
  const initial = toDraft(editing, defaultGroup);
  const [draft, setDraft] = useState<DictionaryDraft>(initial);

  /**
   * Chỉ hiện lỗi sau lần bấm Lưu đầu tiên. Bật lỗi ngay khi vừa mở form sẽ tô đỏ
   * mọi trường bắt buộc trước khi người dùng kịp gõ chữ nào.
   */
  const [submitted, setSubmitted] = useState(false);

  /** Bảng 07: bấm Hủy khi đã nhập dở thì phải hỏi lại trước khi đóng. */
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const errors = validateDictionaryDraft(draft, editing, allRows);
  const shownErrors = submitted ? errors : {};

  const set = <K extends keyof DictionaryDraft>(key: K, value: DictionaryDraft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  /** So với giá trị lúc mở form, người dùng đã sửa gì chưa. */
  const isDirty = (Object.keys(initial) as Array<keyof DictionaryDraft>).some(
    (k) => draft[k] !== initial[k],
  );

  /**
   * Bảng 07: "Nếu chưa nhập gì: đóng popup ngay. Nếu đã nhập dữ liệu: hiển thị
   * popup xác nhận trước khi đóng."
   */
  const requestCancel = () => {
    if (isDirty) {
      setConfirmingCancel(true);
    } else {
      onCancel();
    }
  };

  const submit = () => {
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;

    onSave({
      ...draft,
      // Bảng 06: "Hệ thống tự động viết hoa giá trị sau khi lưu".
      code: draft.code.trim().toUpperCase(),
      value: draft.value.trim(),
      description: draft.description.trim(),
    });
  };

  const inputClass = (key: FieldKey) => `${INPUT_CLASS} ${shownErrors[key] ? ERROR_RING : ''}`;

  /**
   * Bản ghi đang sửa có thể trỏ tới một bản ghi cha đã ngừng hoạt động — cha đó
   * không nằm trong `parentOptions`. Không bù thêm một option cho nó thì ô chọn
   * sẽ nhảy về rỗng và lặng lẽ xóa quan hệ cha-con khi người dùng bấm Lưu.
   */
  const missingParent =
    draft.lookupParentId !== null && !parentOptions.some((p) => p.id === draft.lookupParentId);

  /**
   * Popup xác nhận hủy hiển thị THAY CHO form, không lồng lên trên.
   *
   * Lồng hai `ModalShell` sẽ làm phím Esc đóng cả hai cùng lúc — mất luôn dữ liệu
   * đang nhập, đúng cái mà bước xác nhận này sinh ra để tránh. Đổi phần hiển thị
   * thì `draft` vẫn nằm nguyên trong state của component nên không mất gì.
   */
  if (confirmingCancel) {
    return (
      <ModalShell
        title="Xác nhận hủy"
        width="confirm"
        onClose={() => setConfirmingCancel(false)}
        footer={
          <>
            <button
              type="button"
              className={BTN_OUTLINE}
              onClick={() => setConfirmingCancel(false)}
            >
              Tiếp tục nhập
            </button>
            <button type="button" className={BTN_DANGER} onClick={onCancel}>
              Hủy bỏ thay đổi
            </button>
          </>
        }
      >
        <div className="flex gap-3.5 px-5 pt-5 pb-1.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FDF1E0] text-[#B9691B]">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <div className="mb-1 text-sm font-semibold text-[#292929]">
              Bạn có chắc muốn hủy?
            </div>
            <div className="text-[13px] text-[#525252]">Dữ liệu chưa lưu sẽ mất.</div>
          </div>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell
      title={editing ? 'Sửa từ điển' : 'Thêm mới từ điển'}
      onClose={requestCancel}
      footer={
        <>
          <button type="button" className={BTN_OUTLINE} onClick={requestCancel}>
            Hủy bỏ
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
        <FormField
          label="Mã"
          required
          error={shownErrors.code}
          hint="Chỉ chữ cái, chữ số và dấu _ — hệ thống tự viết hoa khi lưu"
        >
          <input
            type="text"
            autoFocus
            value={draft.code}
            maxLength={MAX_LEN.lookupCode}
            onChange={(e) => set('code', e.target.value)}
            placeholder="VD: SSI"
            className={inputClass('code')}
          />
        </FormField>

        <FormField label="Giá trị" required error={shownErrors.value}>
          <input
            type="text"
            value={draft.value}
            maxLength={MAX_LEN.lookupValue}
            onChange={(e) => set('value', e.target.value)}
            placeholder="Giá trị hiển thị trên các dropdown của hệ thống"
            className={inputClass('value')}
          />
        </FormField>

        <FormField
          label="Loại"
          required
          error={shownErrors.lovGroup}
          hint="Nhóm từ điển (LOV_GROUP) mà bản ghi này thuộc về"
        >
          <select
            value={draft.lovGroup}
            onChange={(e) => set('lovGroup', e.target.value)}
            className={`${SELECT_CLASS} ${shownErrors.lovGroup ? ERROR_RING : ''}`}
          >
            <option value="">— Chọn loại —</option>
            {groupOptions.map((g) => (
              <option key={g.code} value={g.code}>
                {g.label} ({g.code})
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          label="Thứ tự sắp xếp"
          error={shownErrors.displayOrder}
          hint="Không bắt buộc — để trống nếu chưa cần sắp thứ tự"
        >
          <input
            type="number"
            min={0}
            value={draft.displayOrder ?? ''}
            onChange={(e) =>
              // Ô số để trống phải thành null (chưa đặt thứ tự), không phải 0 —
              // 0 là một thứ tự hợp lệ và sẽ đẩy bản ghi lên đầu danh sách.
              set('displayOrder', e.target.value === '' ? null : Number(e.target.value))
            }
            placeholder="VD: 1"
            className={inputClass('displayOrder')}
          />
        </FormField>

        <FormField label="Loại cha" hint="Không bắt buộc — LOOKUP_PARENT_ID cho phép để trống">
          <select
            value={draft.lookupParentId === null ? '' : String(draft.lookupParentId)}
            onChange={(e) =>
              set('lookupParentId', e.target.value === '' ? null : Number(e.target.value))
            }
            className={SELECT_CLASS}
          >
            <option value="">— Không có cha —</option>
            {parentOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} — {p.value}
              </option>
            ))}
            {missingParent && (
              <option value={String(draft.lookupParentId)}>
                #{draft.lookupParentId} — (đã ngừng hoạt động)
              </option>
            )}
          </select>
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

        <FormField
          label="Mô tả"
          hint={`${draft.description.length}/${MAX_LEN.lookupDescription} ký tự`}
        >
          <textarea
            value={draft.description}
            maxLength={MAX_LEN.lookupDescription}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Nhập mô tả"
            className={TEXTAREA_CLASS}
          />
        </FormField>

        {/* Nút submit ẩn: cho phép Enter lưu form mà không nhân đôi nút Lưu. */}
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </ModalShell>
  );
};
