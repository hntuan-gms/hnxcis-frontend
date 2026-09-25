/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Check, Copy, History, Info } from 'lucide-react';

import {
  BTN_OUTLINE,
  BTN_PRIMARY,
  EmptyRow,
  ERROR_RING,
  FormField,
  INPUT_CLASS,
  ModalShell,
  TD_CLASS,
  TH_CLASS,
} from '../catalogUi';
import { AccountAuditEntry, changeOwnPassword, findAccount } from './accountStore';
import { AccountRow, EMAIL_RE, formatDateTime, generateTempPassword } from './accountTypes';
import { PasswordChangeFields, PasswordInput, usePasswordChange } from './PasswordFields';

/* ------------------------------------------------------ khối định danh */

/** Ô xám "Tên tài khoản · Họ và tên" ở đầu popup đặt lại mật khẩu (Màn hình 6.1). */
const AccountIdentity: React.FC<{ account: Pick<AccountRow, 'loginName' | 'fullName'> }> = ({ account }) => (
  <div className="flex flex-wrap gap-x-10 gap-y-2 rounded-lg bg-slate-100 px-4 py-3">
    <div>
      <div className="text-xs text-slate-500">Tên tài khoản</div>
      <div className="text-sm font-semibold text-[#292929]">{account.loginName}</div>
    </div>
    <div>
      <div className="text-xs text-slate-500">Họ và tên</div>
      <div className="text-sm font-semibold text-[#292929]">{account.fullName}</div>
    </div>
  </div>
);

const ChoiceCard: React.FC<{ checked: boolean; label: string; onSelect: () => void }> = ({ checked, label, onSelect }) => (
  <label
    className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium ${
      checked ? 'border-[#22AF73] bg-[#E6F4EA] text-[#1E7A42]' : 'border-slate-200 text-[#292929] hover:bg-slate-50'
    }`}
  >
    <input type="radio" checked={checked} onChange={onSelect} className="h-4 w-4 accent-[#008A4B]" />
    {label}
  </label>
);

/* ------------------------------------------- IMS-018-6.1 đặt lại mật khẩu */

export interface ResetPasswordResult {
  password: string;
  mode: 'manual' | 'auto';
  /** `null` = không gửi email (chỉ phương án tự nhập mới được bỏ chọn). */
  emailTo: string | null;
}

interface ResetPasswordModalProps {
  account: AccountRow;
  onCancel: () => void;
  onSave: (result: ResetPasswordResult) => void;
}

/**
 * Popup "Đặt lại mật khẩu" — Màn hình 6.1, Bảng mô tả 1.1 và 1.2.
 *
 *   1. Tự nhập mật khẩu mới: nhập + xác nhận, tự chọn gửi hay không gửi email.
 *   2. (Mặc định) Hệ thống tự sinh: chỉ kiểm tra email đích — lấy mặc định từ
 *      LOGINS nhưng sửa được; email LUÔN được gửi (ô tick khóa ở trạng thái chọn),
 *      vì không gửi thì không ai biết mật khẩu vừa sinh.
 *
 * Nút Lưu chỉ bật khi phương án đang chọn đã hợp lệ. Hủy bỏ không ghi log.
 */
export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ account, onCancel, onSave }) => {
  const [mode, setMode] = useState<'manual' | 'auto'>('auto');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [email, setEmail] = useState(account.email);

  const emailOk = EMAIL_RE.test(email.trim());
  const mismatch = confirm.length > 0 && confirm !== password;
  const valid = mode === 'auto' ? emailOk : password.length > 0 && confirm === password;

  const submit = () => {
    if (!valid) return;
    if (mode === 'auto') {
      onSave({ password: generateTempPassword(), mode, emailTo: email.trim() });
    } else {
      onSave({ password, mode, emailTo: sendEmail ? account.email : null });
    }
  };

  return (
    <ModalShell
      title="Đặt lại mật khẩu"
      onClose={onCancel}
      width="medium"
      footer={
        <>
          <button type="button" className={BTN_OUTLINE} onClick={onCancel}>
            Hủy bỏ
          </button>
          <button type="button" className={BTN_PRIMARY} onClick={submit} disabled={!valid}>
            Lưu
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4 px-5 py-5">
        <AccountIdentity account={account} />

        <div>
          <div className="mb-2 text-[13px] font-medium text-[#292929]">Cách đặt mật khẩu mới</div>
          <div className="flex flex-col gap-2.5">
            <ChoiceCard checked={mode === 'manual'} label="Tự nhập mật khẩu mới" onSelect={() => setMode('manual')} />
            <ChoiceCard checked={mode === 'auto'} label="Hệ thống tự sinh mật khẩu" onSelect={() => setMode('auto')} />
          </div>
        </div>

        {mode === 'manual' ? (
          <>
            <FormField label="Mật khẩu mới" required>
              <PasswordInput value={password} onChange={setPassword} placeholder="Nhập mật khẩu mới" autoFocus />
            </FormField>
            <FormField
              label="Xác nhận mật khẩu mới"
              required
              error={mismatch ? 'Xác nhận mật khẩu không khớp với mật khẩu mới' : undefined}
            >
              <PasswordInput value={confirm} onChange={setConfirm} placeholder="Nhập lại mật khẩu mới" hasError={mismatch} />
            </FormField>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 text-sm text-[#292929]">
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                className="h-4 w-4 accent-[#008A4B]"
              />
              Gửi email thông tin đăng nhập
              <span className="ml-auto truncate text-xs text-slate-500">{account.email}</span>
            </label>
          </>
        ) : (
          <>
            <FormField
              label="Email nhận thông tin đăng nhập"
              required
              error={email.trim() && !emailOk ? 'Email không đúng định dạng' : !email.trim() ? 'Email là bắt buộc' : undefined}
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`${INPUT_CLASS} ${emailOk ? '' : ERROR_RING}`}
              />
            </FormField>
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-500">
              <input type="checkbox" checked disabled className="h-4 w-4 accent-[#008A4B]" />
              Gửi email thông tin đăng nhập
            </label>
          </>
        )}
      </div>
    </ModalShell>
  );
};

/* ------------------------------------------- kết quả cấp mật khẩu tạm */

interface PasswordIssuedDialogProps {
  title: string;
  loginName: string;
  password: string;
  emailTo: string | null;
  onClose: () => void;
}

/**
 * Báo kết quả sau khi tạo tài khoản hoặc đặt lại mật khẩu.
 *
 * Prototype chưa có dịch vụ gửi email nên mật khẩu tạm được hiện ngay tại đây —
 * không hiện thì không ai thử được luồng Đổi mật khẩu lần đầu (IMS-018-7). Hệ
 * thống thật chỉ gửi mật khẩu qua email, KHÔNG hiện trên màn hình.
 */
export const PasswordIssuedDialog: React.FC<PasswordIssuedDialogProps> = ({
  title,
  loginName,
  password,
  emailTo,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard?.writeText(password).then(() => setCopied(true));
  };

  return (
    <ModalShell
      title={title}
      onClose={onClose}
      width="form"
      footer={
        <button type="button" className={BTN_PRIMARY} onClick={onClose}>
          Đóng
        </button>
      }
    >
      <div className="flex flex-col gap-4 px-5 py-5 text-[13px] text-[#292929]">
        <p>
          {emailTo ? (
            <>
              Thông tin đăng nhập của <b>{loginName}</b> đã được gửi tới <b>{emailTo}</b>.
            </>
          ) : (
            <>
              Đã đặt mật khẩu mới cho <b>{loginName}</b> — không gửi email.
            </>
          )}{' '}
          Người dùng phải đổi mật khẩu ở lần đăng nhập tới.
        </p>

        <div>
          <div className="mb-1.5 text-xs text-slate-500">Mật khẩu tạm thời</div>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm">{password}</code>
            <button type="button" onClick={copy} className={BTN_OUTLINE} aria-label="Sao chép mật khẩu">
              {copied ? <Check className="h-4 w-4 text-[#1E7A42]" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <p className="flex gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Prototype chưa nối dịch vụ gửi email nên mật khẩu hiện tại đây để thử luồng đăng nhập lần đầu. Hệ thống thật chỉ gửi
          qua email.
        </p>
      </div>
    </ModalShell>
  );
};

/* -------------------------------------------- IMS-018-6.2 tự đổi mật khẩu */

interface ChangePasswordModalProps {
  loginName: string;
  onClose: () => void;
}

/**
 * Popup "Đổi mật khẩu" — mở từ menu cá nhân ở thanh trên (Màn hình 6.2). Người
 * dùng không có bản ghi trong LOGINS (persona công khai...) thì không đổi được:
 * không có mật khẩu nào để đối chiếu.
 */
export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ loginName, onClose }) => {
  const pw = usePasswordChange(loginName);
  const [currentError, setCurrentError] = useState<string | undefined>();
  const [done, setDone] = useState(false);
  const account = findAccount(loginName);

  const canSubmit = !!account && pw.current.length > 0 && pw.allRulesPassed && pw.confirmMatches;

  const submit = () => {
    if (!account || !canSubmit) return;
    if (pw.current !== account.password) {
      setCurrentError('Mật khẩu hiện tại không đúng');
      return;
    }
    if (pw.next === account.password) {
      setCurrentError('Mật khẩu mới phải khác mật khẩu hiện tại');
      return;
    }
    changeOwnPassword(loginName, pw.next, false);
    setDone(true);
  };

  if (done) {
    return (
      <ModalShell
        title="Đổi mật khẩu"
        onClose={onClose}
        width="confirm"
        footer={
          <button type="button" className={BTN_PRIMARY} onClick={onClose}>
            Đóng
          </button>
        }
      >
        <p className="flex items-start gap-2.5 px-5 py-5 text-[13px] text-[#292929]">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#1E7A42]" />
          Đổi mật khẩu thành công. Dùng mật khẩu mới cho lần đăng nhập tới.
        </p>
      </ModalShell>
    );
  }

  return (
    <ModalShell
      title="Đổi mật khẩu"
      onClose={onClose}
      width="medium"
      footer={
        <>
          <button type="button" className={BTN_OUTLINE} onClick={onClose}>
            Hủy bỏ
          </button>
          <button type="button" className={BTN_PRIMARY} onClick={submit} disabled={!canSubmit}>
            Đổi mật khẩu
          </button>
        </>
      }
    >
      <div className="px-5 py-5">
        <p className="mb-4 text-[13px] text-[#525252]">Tự đổi mật khẩu đăng nhập cho tài khoản của chính bạn.</p>
        {account ? (
          <PasswordChangeFields
            state={{
              ...pw,
              setCurrent: (v) => {
                pw.setCurrent(v);
                setCurrentError(undefined);
              },
            }}
            currentLabel="Mật khẩu hiện tại"
            currentPlaceholder="Nhập mật khẩu đang dùng"
            currentError={currentError}
          />
        ) : (
          <p className="text-[13px] text-[#802423]">
            Tài khoản “{loginName}” chưa có trong danh sách tài khoản (LOGINS) nên chưa đổi được mật khẩu.
          </p>
        )}
      </div>
    </ModalShell>
  );
};

/* --------------------------------------------- IMS-018-1.4 lịch sử thay đổi */

interface AccountHistoryModalProps {
  account: AccountRow;
  entries: readonly AccountAuditEntry[];
  onClose: () => void;
}

/**
 * "Lịch sử chỉnh sửa của người dùng" — Hình 1.4: Ngày cập nhật, Tài khoản thay
 * đổi, Trường dữ liệu, Giá trị cũ (gạch ngang), Giá trị mới (in đậm).
 */
export const AccountHistoryModal: React.FC<AccountHistoryModalProps> = ({ account, entries, onClose }) => (
  <ModalShell
    title={`Lịch sử chỉnh sửa của người dùng: ${account.fullName}`}
    onClose={onClose}
    width="wide"
    footer={
      <button type="button" className={BTN_OUTLINE} onClick={onClose}>
        Đóng
      </button>
    }
  >
    <div className="overflow-x-auto px-5 py-4">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={TH_CLASS}>Ngày cập nhật</th>
            <th className={TH_CLASS}>Tài khoản thay đổi</th>
            <th className={TH_CLASS}>Trường dữ liệu</th>
            <th className={TH_CLASS}>Giá trị cũ</th>
            <th className={TH_CLASS}>Giá trị mới</th>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 ? (
            <EmptyRow colSpan={5} title="Chưa có lịch sử thay đổi" hint="Mọi thao tác trên tài khoản sẽ được ghi lại tại đây" />
          ) : (
            entries.map((e) => (
              <tr key={e.id}>
                <td className={`${TD_CLASS} whitespace-nowrap`}>{formatDateTime(e.at)}</td>
                <td className={TD_CLASS}>{e.by}</td>
                <td className={TD_CLASS}>{e.field}</td>
                <td className={`${TD_CLASS} text-slate-500 line-through`}>{e.oldValue || ''}</td>
                <td className={`${TD_CLASS} font-semibold`}>{e.newValue || '—'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
        <History className="h-3.5 w-3.5" />
        Ghi nhận từ USER_AUDIT_LOG — mới nhất ở trên.
      </p>
    </div>
  </ModalShell>
);
