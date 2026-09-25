/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CheckCircle2, Circle, Eye, EyeOff } from 'lucide-react';

import { ERROR_RING, FormField, INPUT_CLASS } from '../catalogUi';
import { PASSWORD_RULES, passedPasswordRules } from './accountTypes';

/**
 * Ô mật khẩu + thanh độ mạnh + danh sách sáu điều kiện — dùng chung cho
 * IMS-018-6.2 (tự đổi mật khẩu) và IMS-018-7 (đổi mật khẩu lần đầu). Hai màn chỉ
 * khác nhau ở nhãn ô đầu ("Mật khẩu hiện tại" / "Mật khẩu tạm thời") và chỗ đặt
 * nút, nên state nằm trong một hook, còn nút do màn gọi tự vẽ.
 */

/* --------------------------------------------------------------- ô nhập */

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hasError?: boolean;
  autoFocus?: boolean;
  autoComplete?: string;
}

/** Ô mật khẩu có nút hiện/ẩn — gõ mật khẩu mới dài 8+ ký tự mà không nhìn được thì dễ gõ sai. */
export const PasswordInput: React.FC<PasswordInputProps> = ({
  value,
  onChange,
  placeholder,
  hasError,
  autoFocus,
  autoComplete = 'new-password',
}) => {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <input
        type={shown ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        className={`${INPUT_CLASS} pr-9 ${hasError ? ERROR_RING : ''}`}
      />
      <button
        type="button"
        onClick={() => setShown((v) => !v)}
        aria-label={shown ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        tabIndex={-1}
        className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
      >
        {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
};

/* ------------------------------------------------------- độ mạnh + luật */

/**
 * Thanh "Mức độ đáp ứng điều kiện mật khẩu" (IMS-018-7 mục 4) — mỗi đoạn là một
 * điều kiện đã đạt, đổi màu theo số điều kiện đạt: đỏ → vàng → xanh.
 */
export const PasswordStrengthBar: React.FC<{ passed: number }> = ({ passed }) => {
  const total = PASSWORD_RULES.length;
  const color = passed === total ? 'bg-[#1E7A42]' : passed >= 4 ? 'bg-[#B9691B]' : 'bg-[#802423]';
  return (
    <div className="mt-2 flex gap-1" aria-label={`Đạt ${passed}/${total} điều kiện mật khẩu`}>
      {PASSWORD_RULES.map((r, i) => (
        <span key={r.key} className={`h-1 flex-1 rounded-full ${i < passed ? color : 'bg-slate-200'}`} />
      ))}
    </div>
  );
};

export const PasswordRuleList: React.FC<{ passedKeys: readonly string[] }> = ({ passedKeys }) => (
  <div>
    <div className="mb-2 text-[13px] font-medium text-[#292929]">Điều kiện mật khẩu hợp lệ</div>
    <ul className="space-y-1.5">
      {PASSWORD_RULES.map((r) => {
        const ok = passedKeys.includes(r.key);
        return (
          <li key={r.key} className={`flex items-center gap-2 text-[13px] ${ok ? 'text-[#1E7A42]' : 'text-slate-500'}`}>
            {ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <Circle className="h-4 w-4 shrink-0 text-slate-300" />}
            {r.label}
          </li>
        );
      })}
    </ul>
  </div>
);

/* ------------------------------------------------------------ hook + form */

export interface PasswordChangeState {
  current: string;
  setCurrent: (v: string) => void;
  next: string;
  setNext: (v: string) => void;
  confirm: string;
  setConfirm: (v: string) => void;
  passedKeys: readonly string[];
  allRulesPassed: boolean;
  confirmMatches: boolean;
  /** Đã gõ gì chưa — để quyết định có hỏi lại trước khi thoát không. */
  dirty: boolean;
}

export function usePasswordChange(loginName: string): PasswordChangeState {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const passedKeys = passedPasswordRules(next, loginName);
  return {
    current,
    setCurrent,
    next,
    setNext,
    confirm,
    setConfirm,
    passedKeys,
    allRulesPassed: passedKeys.length === PASSWORD_RULES.length,
    confirmMatches: confirm.length > 0 && confirm === next,
    dirty: current !== '' || next !== '' || confirm !== '',
  };
}

interface PasswordChangeFieldsProps {
  state: PasswordChangeState;
  currentLabel: string;
  currentPlaceholder: string;
  /** Lỗi của ô đầu — do màn gọi kiểm tra với mật khẩu đang lưu khi bấm nút. */
  currentError?: string;
}

/**
 * Bố cục của Màn hình 6.2 / 7: ô mật khẩu hiện tại (hoặc tạm thời) một hàng
 * riêng, hàng dưới là Mật khẩu mới + Xác nhận, rồi thanh độ mạnh và danh sách
 * điều kiện đánh giá theo từng ký tự gõ (real-time, mục 2).
 */
export const PasswordChangeFields: React.FC<PasswordChangeFieldsProps> = ({
  state,
  currentLabel,
  currentPlaceholder,
  currentError,
}) => {
  const mismatch = state.confirm.length > 0 && !state.confirmMatches;
  return (
    <div className="flex flex-col gap-4">
      <FormField label={currentLabel} required error={currentError}>
        <PasswordInput
          value={state.current}
          onChange={state.setCurrent}
          placeholder={currentPlaceholder}
          hasError={!!currentError}
          autoFocus
          autoComplete="current-password"
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FormField label="Mật khẩu mới" required>
            <PasswordInput value={state.next} onChange={state.setNext} placeholder="Nhập mật khẩu mới" />
          </FormField>
          <PasswordStrengthBar passed={state.passedKeys.length} />
        </div>
        <FormField
          label="Xác nhận mật khẩu mới"
          required
          error={mismatch ? 'Xác nhận mật khẩu không khớp với mật khẩu mới' : undefined}
        >
          <PasswordInput
            value={state.confirm}
            onChange={state.setConfirm}
            placeholder="Nhập lại mật khẩu mới"
            hasError={mismatch}
          />
        </FormField>
      </div>

      <PasswordRuleList passedKeys={state.passedKeys} />
    </div>
  );
};
