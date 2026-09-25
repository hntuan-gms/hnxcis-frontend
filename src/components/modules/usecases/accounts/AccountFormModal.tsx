/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { Info } from 'lucide-react';

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
} from '../catalogUi';
import { DateField } from '../CalendarDatePicker';
import { Flag, STATUS_OPTIONS } from '../catalogTypes';
import {
  AccountActor,
  AccountDraft,
  AccountLevel,
  AccountRow,
  AccountType,
  DEPARTMENT_OPTIONS,
  DepartmentCode,
  EMAIL_RE,
  GENDER_OPTIONS,
  Gender,
  INTERNAL_ROLES,
  ORG_TYPE_OPTIONS,
  OrgType,
  TWO_FACTOR_OPTIONS,
  creatableInternalLevels,
  externalRolesForLevel,
  formatDate,
  isValidPhone,
  levelLabel,
  normalizePhone,
  roleLabel,
  todayISO,
} from './accountTypes';

/**
 * Popup "Thêm mới / Cập nhật tài khoản" — IMS-018-2.1 (nội bộ) và IMS-018-2.2
 * (tổ chức), SRS Bảng 05.
 *
 * Một component cho cả hai loại: Bảng 05 mô tả hai màn giống nhau từ mục 8 trở
 * đi, chỉ khác khối "Thông tin tài khoản" (nội bộ có Phòng ban; tổ chức có Tên +
 * Loại tổ chức) và danh sách cấp độ / vai trò chọn được.
 *
 * Bố cục nhóm trường lấy theo Hình 2.1 / 2.2: Thông tin tài khoản → Thông tin cá
 * nhân → Thông tin liên hệ → Thời hạn công tác → Hợp đồng & văn bản → Bảo mật.
 */

const LOGIN_NAME_MAX = 50;
const FULL_NAME_MAX = 100;
const RESIDENT_ID_MAX = 20;
const DESCRIPTION_MAX = 500;

/** Vai trò gợi ý sẵn khi chọn phòng ban — người tạo vẫn đổi được. */
const DEPARTMENT_DEFAULT_ROLE: Record<DepartmentCode, AccountDraft['role']> = {
  NY: 'ROLE_QLNY_STAFF',
  TP: 'ROLE_TTTP_STAFF',
  TT: 'ROLE_TTTT_STAFF',
  CNTT: 'ROLE_CNTT_STAFF',
};

export interface AccountFormPrefill {
  orgName?: string;
  orgType?: OrgType;
}

interface AccountFormModalProps {
  accountType: AccountType;
  /** `null` = thêm mới. */
  editing: AccountRow | null;
  actor: AccountActor;
  /** Toàn bộ tài khoản (kể cả đã xóa mềm) — để kiểm tra trùng. */
  accounts: readonly AccountRow[];
  /** Gợi ý cho ô Tên tổ chức — tên các hồ sơ TCPH / Tổ chức liên quan đang có. */
  orgSuggestions: readonly string[];
  prefill?: AccountFormPrefill | null;
  /** Xem không sửa — tài khoản ngoài quyền của người đang thao tác. */
  readOnly?: boolean;
  onCancel: () => void;
  onSave: (draft: AccountDraft) => void;
}

function emptyDraft(
  accountType: AccountType,
  actor: AccountActor,
  prefill: AccountFormPrefill | null | undefined,
): AccountDraft {
  // Bảng 05 mục 4: phòng ban tự lấy theo người tạo. Admin hệ thống không thuộc
  // phòng nghiệp vụ nào nên phải tự chọn.
  const department: DepartmentCode | null =
    accountType === 'INTERNAL' && !actor.isSystemAdmin ? actor.department : null;
  const level: AccountLevel =
    accountType === 'INTERNAL' ? (creatableInternalLevels(actor, department)[0] ?? 1) : 1;

  return {
    loginName: '',
    accountType,
    department,
    orgName: prefill?.orgName ?? '',
    orgType: prefill?.orgType ?? null,
    level,
    role:
      accountType === 'INTERNAL'
        ? department
          ? DEPARTMENT_DEFAULT_ROLE[department]
          : 'ROLE_QLNY_STAFF'
        : externalRolesForLevel(1)[0],
    statusFlg: 1,
    fullName: '',
    birthDate: '',
    gender: null,
    residentId: '',
    residentIdDate: '',
    residentIdPlace: '',
    address: '',
    phone: '',
    email: '',
    startDate: todayISO(),
    endDate: '',
    laborContract: '',
    laborContractStartDate: '',
    laborContractEndDate: '',
    approvalDocNo: '',
    approvalDocDate: '',
    caExpireDate: '',
    twoFactor: null,
    description: '',
  };
}

function draftFrom(row: AccountRow): AccountDraft {
  return {
    loginName: row.loginName,
    accountType: row.accountType,
    department: row.department,
    orgName: row.orgName,
    orgType: row.orgType,
    level: row.level,
    role: row.role,
    statusFlg: row.statusFlg,
    fullName: row.fullName,
    birthDate: row.birthDate,
    gender: row.gender,
    residentId: row.residentId,
    residentIdDate: row.residentIdDate,
    residentIdPlace: row.residentIdPlace,
    address: row.address,
    phone: row.phone,
    email: row.email,
    startDate: row.startDate,
    endDate: row.endDate,
    laborContract: row.laborContract,
    laborContractStartDate: row.laborContractStartDate,
    laborContractEndDate: row.laborContractEndDate,
    approvalDocNo: row.approvalDocNo,
    approvalDocDate: row.approvalDocDate,
    caExpireDate: row.caExpireDate,
    twoFactor: row.twoFactor,
    description: row.description,
  };
}

type Errors = Partial<Record<keyof AccountDraft, string>>;

function validate(d: AccountDraft, editing: AccountRow | null, accounts: readonly AccountRow[]): Errors {
  const e: Errors = {};
  const today = todayISO();
  const others = accounts.filter((a) => a.id !== editing?.id);
  const live = others.filter((a) => a.deleteFlg === 0);
  const req = (key: keyof AccountDraft, label: string) => {
    const v = d[key];
    if (v === null || v === undefined || String(v).trim() === '') e[key] = `${label} là bắt buộc`;
  };

  // Mục 2 — chỉ kiểm tra khi thêm mới: tên tài khoản không đổi được sau khi tạo.
  if (!editing) {
    const name = d.loginName.trim();
    if (!name) e.loginName = 'Tên tài khoản là bắt buộc';
    else if (/\s/.test(d.loginName)) e.loginName = 'Tên tài khoản không được chứa khoảng trắng';
    else if (name.length > LOGIN_NAME_MAX) e.loginName = `Tên tài khoản tối đa ${LOGIN_NAME_MAX} ký tự`;
    // LOGIN_NAME là khóa đối chiếu với CBIS (§4.1) — trùng cả với tài khoản đã
    // xóa mềm cũng không được, vì bản ghi đó vẫn nằm trong CSDL.
    else if (others.some((a) => a.loginName.toLowerCase() === name.toLowerCase())) e.loginName = 'Tên tài khoản đã tồn tại';
  }

  if (d.accountType === 'INTERNAL') {
    if (!d.department) e.department = 'Phòng ban là bắt buộc';
  } else {
    req('orgName', 'Tên tổ chức');
    if (!d.orgType) e.orgType = 'Loại tổ chức là bắt buộc';
  }

  if (!d.fullName.trim()) e.fullName = 'Họ và tên là bắt buộc';
  else if (d.fullName.trim().length > FULL_NAME_MAX) e.fullName = `Họ và tên tối đa ${FULL_NAME_MAX} ký tự`;

  if (!d.birthDate) e.birthDate = 'Ngày sinh là bắt buộc';
  else if (d.birthDate >= today) e.birthDate = 'Ngày sinh phải trước ngày hiện tại';

  if (d.gender === null) e.gender = 'Giới tính là bắt buộc';

  if (!d.residentId.trim()) e.residentId = 'Mã định danh là bắt buộc';
  else if (!/^[A-Za-z0-9]+$/.test(d.residentId.trim())) e.residentId = 'Mã định danh chỉ chứa số/chữ cái';
  else if (d.residentId.trim().length > RESIDENT_ID_MAX) e.residentId = `Mã định danh tối đa ${RESIDENT_ID_MAX} ký tự`;

  if (!d.residentIdDate) e.residentIdDate = 'Ngày cấp là bắt buộc';
  else if (d.residentIdDate > today) e.residentIdDate = 'Ngày cấp không được sau ngày hiện tại';
  else if (d.birthDate && d.residentIdDate < d.birthDate) e.residentIdDate = 'Ngày cấp phải từ ngày sinh trở đi';

  req('residentIdPlace', 'Nơi cấp');
  req('address', 'Địa chỉ');

  if (!d.phone.trim()) e.phone = 'Số điện thoại là bắt buộc';
  else if (!isValidPhone(d.phone)) e.phone = 'Số điện thoại không đúng định dạng';
  else if (live.some((a) => normalizePhone(a.phone) === normalizePhone(d.phone))) e.phone = 'Số điện thoại đã được dùng cho tài khoản khác';

  if (!d.email.trim()) e.email = 'Email là bắt buộc';
  else if (!EMAIL_RE.test(d.email.trim())) e.email = 'Email không đúng định dạng';
  else if (live.some((a) => a.email.toLowerCase() === d.email.trim().toLowerCase())) e.email = 'Email đã được dùng cho tài khoản khác';

  if (!d.startDate) e.startDate = 'Ngày bắt đầu là bắt buộc';
  if (d.startDate && d.endDate && d.endDate < d.startDate) e.endDate = 'Ngày kết thúc phải từ ngày bắt đầu trở đi';

  if (d.laborContractStartDate && d.laborContractEndDate && d.laborContractEndDate < d.laborContractStartDate) {
    e.laborContractEndDate = 'Ngày hết hạn phải từ ngày hiệu lực trở đi';
  }

  return e;
}

/* ------------------------------------------------------------ bố cục */

const Section: React.FC<{ title: string; children: React.ReactNode; hint?: string }> = ({ title, children, hint }) => (
  <section className="border-b border-slate-200 px-5 py-4 last:border-b-0">
    <h4 className="mb-3 text-xs font-bold tracking-wider text-[#1E7A42] uppercase">{title}</h4>
    {hint && <p className="-mt-1.5 mb-3 text-xs text-slate-500">{hint}</p>}
    <div className="grid gap-x-4 gap-y-3.5 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
  </section>
);

const Span: React.FC<{ cols?: 2 | 3; children: React.ReactNode }> = ({ cols = 2, children }) => (
  <div className={cols === 3 ? 'sm:col-span-2 lg:col-span-3' : 'sm:col-span-2'}>{children}</div>
);

/* ---------------------------------------------------------- component */

export const AccountFormModal: React.FC<AccountFormModalProps> = ({
  accountType,
  editing,
  actor,
  accounts,
  orgSuggestions,
  prefill,
  readOnly = false,
  onCancel,
  onSave,
}) => {
  const initial = useMemo(
    () => (editing ? draftFrom(editing) : emptyDraft(accountType, actor, prefill)),
    // Chỉ tính một lần khi mở popup — draft sau đó do người dùng sửa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [draft, setDraft] = useState<AccountDraft>(initial);
  const [submitted, setSubmitted] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const errors = validate(draft, editing, accounts);
  const shown: Errors = submitted ? errors : {};
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const isInternal = accountType === 'INTERNAL';

  const set = <K extends keyof AccountDraft>(key: K, value: AccountDraft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  /* --- cấp độ + vai trò phụ thuộc phòng ban / cấp --- */

  const levelOptions: readonly AccountLevel[] = isInternal
    ? (() => {
        const creatable = creatableInternalLevels(actor, draft.department);
        // Đang xem một tài khoản ngoài quyền: vẫn phải hiện được cấp hiện tại.
        return creatable.includes(draft.level) || !editing ? creatable : [draft.level, ...creatable];
      })()
    : [1, 2, 3];

  const roleOptions = isInternal ? INTERNAL_ROLES : externalRolesForLevel(draft.level);

  const changeDepartment = (dept: DepartmentCode | null) => {
    const levels = creatableInternalLevels(actor, dept);
    setDraft((prev) => ({
      ...prev,
      department: dept,
      level: levels.includes(prev.level) ? prev.level : (levels[0] ?? 1),
      role: dept ? DEPARTMENT_DEFAULT_ROLE[dept] : prev.role,
    }));
  };

  const changeLevel = (level: AccountLevel) => {
    setDraft((prev) => {
      if (isInternal) return { ...prev, level };
      const roles = externalRolesForLevel(level);
      return { ...prev, level, role: roles.includes(prev.role) ? prev.role : roles[0] };
    });
  };

  /* --- lưu / thoát --- */

  const requestClose = () => {
    if (!readOnly && dirty) setConfirmLeave(true);
    else onCancel();
  };

  const submit = () => {
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;
    onSave({
      ...draft,
      loginName: draft.loginName.trim(),
      fullName: draft.fullName.trim(),
      orgName: draft.orgName.trim(),
      residentId: draft.residentId.trim(),
      residentIdPlace: draft.residentIdPlace.trim(),
      address: draft.address.trim(),
      phone: draft.phone.trim(),
      email: draft.email.trim(),
      description: draft.description.trim(),
    });
  };

  const cls = (key: keyof AccountDraft, base = INPUT_CLASS) => `${base} ${shown[key] ? ERROR_RING : ''}`;
  const dateProps = (key: keyof AccountDraft) => ({
    value: (draft[key] as string) || null,
    onChange: (v: string | null) => set(key, (v ?? '') as never),
    hasError: !!shown[key],
  });

  const title = readOnly
    ? isInternal
      ? 'Chi tiết tài khoản nội bộ'
      : 'Chi tiết tài khoản tổ chức'
    : `${editing ? 'Cập nhật' : 'Thêm mới'} tài khoản ${isInternal ? 'nội bộ' : 'tổ chức'}`;

  const levelHint = isInternal
    ? draft.department === 'TP'
      ? 'Phòng Trái phiếu: cấp 1 tạo được cấp 2, 3; cấp 2 tạo được cấp 3; cấp 3 chỉ được xem'
      : 'Phòng Niêm yết, Thị trường, CNTT chỉ có cấp 1'
    : draft.level === 1
      ? 'Cấp 1 tạo được tài khoản cấp 2 và tài khoản Nhà đầu tư'
      : draft.level === 2
        ? 'Cấp 2 cấp được tài khoản cho Nhà đầu tư'
        : 'Cấp 3 là tài khoản Nhà đầu tư';

  return (
    <>
      <ModalShell
        title={title}
        // Popup xác nhận đang mở thì Esc chỉ đóng popup đó — không để hai popup
        // cùng nhận phím và mở lại lẫn nhau.
        onClose={confirmLeave ? () => undefined : requestClose}
        width="wide"
        footer={
          readOnly ? (
            <button type="button" className={BTN_OUTLINE} onClick={onCancel}>
              Đóng
            </button>
          ) : (
            <>
              <button type="button" className={BTN_OUTLINE} onClick={requestClose}>
                Hủy bỏ
              </button>
              <button type="button" className={BTN_PRIMARY} onClick={submit}>
                Lưu
              </button>
            </>
          )
        }
      >
        {submitted && Object.keys(errors).length > 0 && (
          <div className="mx-5 mt-4 rounded-lg border border-[#802423]/30 bg-[#802423]/5 px-3.5 py-2.5 text-[13px] text-[#802423]">
            Còn {Object.keys(errors).length} trường chưa hợp lệ — kiểm tra các ô viền đỏ bên dưới.
          </div>
        )}

        <fieldset disabled={readOnly} className="min-w-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <Section title="Thông tin tài khoản">
              <FormField
                label="Tên tài khoản"
                required
                error={shown.loginName}
                hint={editing ? 'Không thay đổi được sau khi tạo' : undefined}
              >
                <input
                  type="text"
                  autoFocus={!editing}
                  value={draft.loginName}
                  maxLength={LOGIN_NAME_MAX}
                  disabled={!!editing}
                  onChange={(e) => set('loginName', e.target.value.replace(/\s/g, ''))}
                  placeholder="Username — không dấu cách"
                  className={`${cls('loginName')} disabled:bg-slate-100 disabled:text-slate-500`}
                />
              </FormField>

              <FormField label="Loại tài khoản">
                <input
                  type="text"
                  value={isInternal ? 'Nội bộ' : 'Tổ chức'}
                  disabled
                  className={`${INPUT_CLASS} bg-slate-100 text-slate-500`}
                />
              </FormField>

              <FormField label="Trạng thái">
                <select
                  value={draft.statusFlg}
                  onChange={(e) => set('statusFlg', Number(e.target.value) as Flag)}
                  className={SELECT_CLASS}
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </FormField>

              {isInternal ? (
                <FormField
                  label="Phòng ban"
                  required
                  error={shown.department}
                  hint={!actor.isSystemAdmin ? 'Tự lấy theo phòng ban của người tạo' : undefined}
                >
                  <select
                    value={draft.department ?? ''}
                    disabled={!actor.isSystemAdmin}
                    onChange={(e) => changeDepartment((e.target.value || null) as DepartmentCode | null)}
                    className={`${cls('department', SELECT_CLASS)} disabled:bg-slate-100 disabled:text-slate-500`}
                  >
                    <option value="">-- Chọn phòng ban --</option>
                    {DEPARTMENT_OPTIONS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </FormField>
              ) : (
                <>
                  <FormField label="Tên tổ chức" required error={shown.orgName}>
                    <input
                      type="text"
                      list="account-org-suggestions"
                      value={draft.orgName}
                      onChange={(e) => set('orgName', e.target.value)}
                      placeholder="Nhập để tìm tên tổ chức"
                      className={cls('orgName')}
                    />
                    <datalist id="account-org-suggestions">
                      {orgSuggestions.map((n) => (
                        <option key={n} value={n} />
                      ))}
                    </datalist>
                  </FormField>
                  <FormField label="Loại tổ chức" required error={shown.orgType}>
                    <select
                      value={draft.orgType ?? ''}
                      onChange={(e) => set('orgType', (e.target.value || null) as OrgType | null)}
                      className={cls('orgType', SELECT_CLASS)}
                    >
                      <option value="">-- Chọn loại tổ chức --</option>
                      {ORG_TYPE_OPTIONS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </>
              )}

              <FormField label="Cấp độ tài khoản" required hint={levelHint}>
                <select
                  value={draft.level}
                  disabled={levelOptions.length <= 1}
                  onChange={(e) => changeLevel(Number(e.target.value) as AccountLevel)}
                  className={`${SELECT_CLASS} disabled:bg-slate-100 disabled:text-slate-500`}
                >
                  {levelOptions.length === 0 && <option value={draft.level}>{levelLabel(draft.level, accountType)}</option>}
                  {levelOptions.map((l) => (
                    <option key={l} value={l}>
                      {levelLabel(l, accountType)}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Vai trò" required>
                <select
                  value={draft.role}
                  onChange={(e) => set('role', e.target.value as AccountDraft['role'])}
                  className={SELECT_CLASS}
                >
                  {roleOptions.map((r) => (
                    <option key={r} value={r}>
                      {roleLabel(r)}
                    </option>
                  ))}
                </select>
              </FormField>
            </Section>

            <Section title="Thông tin cá nhân">
              <Span>
                <FormField label="Họ và tên" required error={shown.fullName}>
                  <input
                    type="text"
                    value={draft.fullName}
                    maxLength={FULL_NAME_MAX}
                    onChange={(e) => set('fullName', e.target.value)}
                    placeholder="Tối đa 100 ký tự"
                    className={cls('fullName')}
                  />
                </FormField>
              </Span>
              <FormField label="Giới tính" required error={shown.gender}>
                <select
                  value={draft.gender ?? ''}
                  onChange={(e) => set('gender', e.target.value === '' ? null : (Number(e.target.value) as Gender))}
                  className={cls('gender', SELECT_CLASS)}
                >
                  <option value="">-- Chọn giới tính --</option>
                  {GENDER_OPTIONS.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Ngày sinh" required error={shown.birthDate}>
                <DateField {...dateProps('birthDate')} />
              </FormField>
              <FormField label="Mã định danh (CCCD/CMND)" required error={shown.residentId}>
                <input
                  type="text"
                  value={draft.residentId}
                  maxLength={RESIDENT_ID_MAX}
                  onChange={(e) => set('residentId', e.target.value)}
                  placeholder="Chỉ số/chữ cái, tối đa 20 ký tự"
                  className={cls('residentId')}
                />
              </FormField>
              <FormField label="Ngày cấp" required error={shown.residentIdDate}>
                <DateField {...dateProps('residentIdDate')} />
              </FormField>
              <Span cols={3}>
                <FormField label="Nơi cấp" required error={shown.residentIdPlace}>
                  <input
                    type="text"
                    value={draft.residentIdPlace}
                    onChange={(e) => set('residentIdPlace', e.target.value)}
                    className={cls('residentIdPlace')}
                  />
                </FormField>
              </Span>
              <Span cols={3}>
                <FormField label="Địa chỉ" required error={shown.address}>
                  <input
                    type="text"
                    value={draft.address}
                    onChange={(e) => set('address', e.target.value)}
                    className={cls('address')}
                  />
                </FormField>
              </Span>
            </Section>

            <Section title="Thông tin liên hệ">
              <FormField label="Số điện thoại" required error={shown.phone}>
                <input
                  type="tel"
                  value={draft.phone}
                  maxLength={15}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="VD: 0912345678"
                  className={cls('phone')}
                />
              </FormField>
              <Span>
                <FormField label="Email" required error={shown.email}>
                  <input
                    type="email"
                    value={draft.email}
                    maxLength={100}
                    onChange={(e) => set('email', e.target.value)}
                    placeholder={isInternal ? 'VD: nva@hnx.vn' : 'VD: cbtt@congty.com.vn'}
                    className={cls('email')}
                  />
                </FormField>
              </Span>
            </Section>

            <Section title="Thời hạn công tác">
              <FormField label="Ngày bắt đầu" required error={shown.startDate}>
                <DateField {...dateProps('startDate')} />
              </FormField>
              <FormField label="Ngày kết thúc" error={shown.endDate} hint="Bỏ trống nếu không thời hạn">
                <DateField {...dateProps('endDate')} placeholder="Không thời hạn" />
              </FormField>
            </Section>

            <Section title="Hợp đồng & văn bản">
              <FormField label="Hợp đồng lao động">
                <input
                  type="text"
                  value={draft.laborContract}
                  maxLength={30}
                  onChange={(e) => set('laborContract', e.target.value)}
                  placeholder="Số HĐLĐ (nếu có)"
                  className={INPUT_CLASS}
                />
              </FormField>
              <FormField label="Ngày hiệu lực HĐLĐ">
                <DateField {...dateProps('laborContractStartDate')} />
              </FormField>
              <FormField label="Ngày hết hạn HĐLĐ" error={shown.laborContractEndDate}>
                <DateField {...dateProps('laborContractEndDate')} />
              </FormField>
              <FormField label="Số CV cấp TK">
                <input
                  type="text"
                  value={draft.approvalDocNo}
                  maxLength={30}
                  onChange={(e) => set('approvalDocNo', e.target.value)}
                  placeholder="Số công văn"
                  className={INPUT_CLASS}
                />
              </FormField>
              <FormField label="Ngày CV cấp TK">
                <DateField {...dateProps('approvalDocDate')} />
              </FormField>
              <FormField label="Ngày hết hạn CA">
                <DateField {...dateProps('caExpireDate')} />
              </FormField>
            </Section>

            <Section title="Bảo mật" hint="Chọn 1 trong 3 phương thức xác thực 2 lớp bên dưới — bấm lại để bỏ chọn.">
              {TWO_FACTOR_OPTIONS.map((o) => {
                const on = draft.twoFactor === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => set('twoFactor', on ? null : o.value)}
                    className={`flex items-start gap-3 rounded-lg border px-3.5 py-3 text-left disabled:cursor-default ${
                      on ? 'border-[#22AF73] bg-[#E6F4EA]' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                        on ? 'border-[#008A4B]' : 'border-slate-300'
                      }`}
                    >
                      {on && <span className="h-2 w-2 rounded-full bg-[#008A4B]" />}
                    </span>
                    <span>
                      <span className="block text-[13px] font-medium text-[#292929]">{o.label}</span>
                      <span className="block text-xs text-slate-500">{o.hint}</span>
                    </span>
                  </button>
                );
              })}
              <Span cols={3}>
                <FormField label="Mô tả" hint={`${draft.description.length}/${DESCRIPTION_MAX} ký tự — ghi chú thêm về việc cấp tài khoản`}>
                  <textarea
                    value={draft.description}
                    maxLength={DESCRIPTION_MAX}
                    onChange={(e) => set('description', e.target.value)}
                    className={TEXTAREA_CLASS}
                  />
                </FormField>
              </Span>
              {/* Mục 30 — chỉ ở màn Cập nhật, và chỉ khi tài khoản từng đổi mật khẩu. */}
              {editing?.lastPasswordChangedDate && (
                <Span cols={3}>
                  <p className="flex items-center gap-1.5 text-[13px] text-[#525252]">
                    <Info className="h-3.5 w-3.5" />
                    Ngày đổi mật khẩu gần nhất: <b>{formatDate(editing.lastPasswordChangedDate)}</b>
                  </p>
                </Span>
              )}
            </Section>

            <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
          </form>
        </fieldset>
      </ModalShell>

      {/* Bảng 05 mục 32: "Có popup cảnh báo mất dữ liệu nếu đã nhập form". */}
      {confirmLeave && (
        <ModalShell
          title="Thoát khi chưa lưu?"
          onClose={() => setConfirmLeave(false)}
          width="confirm"
          footer={
            <>
              <button type="button" className={BTN_OUTLINE} onClick={() => setConfirmLeave(false)}>
                Ở lại
              </button>
              <button type="button" className={BTN_DANGER} onClick={onCancel}>
                Thoát
              </button>
            </>
          }
        >
          <p className="px-5 py-5 text-[13px] text-[#292929]">Dữ liệu vừa nhập sẽ bị mất. Bạn có chắc chắn muốn thoát?</p>
        </ModalShell>
      )}
    </>
  );
};
