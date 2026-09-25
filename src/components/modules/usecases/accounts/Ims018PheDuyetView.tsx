/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, FileText, Info, XCircle } from 'lucide-react';

import type { UserAccount } from '../../../../types/hnx';
import { findImsUseCaseByCode } from '../../../../lib/imsRoutes';
import {
  BTN_DANGER,
  BTN_OUTLINE,
  BTN_PRIMARY,
  CatalogPage,
  EmptyRow,
  ERROR_RING,
  FormField,
  INPUT_CLASS,
  ModalShell,
  SELECT_CLASS,
  TD_CLASS,
  TEXTAREA_CLASS,
  TH_CLASS,
  TablePager,
  ToastStack,
  useToasts,
} from '../catalogUi';
import { DateField } from '../CalendarDatePicker';
import { BUSINESS_TYPE_OPTIONS, INDUSTRY_OPTIONS } from '../dossier/dossierFields';
import { useAccountStore } from './accountStore';
import { ORG_TYPE_OPTIONS, actorFor, canManageExternal, formatDate, formatDateTime } from './accountTypes';
import {
  approveRegistration,
  logRegistrationView,
  rejectRegistration,
  saveRegistration,
  uniquePoolFor,
  useRegistrationStore,
} from './registrationStore';
import {
  AttachedFile,
  DOMESTIC_FOREIGN_OPTIONS,
  REGISTRATION_SECTIONS,
  REGISTRATION_STATUS_LABEL,
  Registration,
  RegistrationDraft,
  RegistrationErrors,
  RegistrationField,
  RegistrationStatus,
  isFieldEnabled,
  isFieldRequired,
  isFieldVisible,
  toDraft,
  validateRegistration,
} from './registrationTypes';

/**
 * SRS: `docs/srs/[IMS-018] Quản lý tài khoản.md` — IMS-018-5 "Phê duyệt chuyên
 * trang IMS" (Hình 5, Bảng 07 phần "Danh sách phê duyệt" và "Màn chỉnh sửa chi
 * tiết để phê duyệt/từ chối").
 *
 * Luồng theo Bảng 07 mục 16: bấm Phê duyệt / Từ chối ở danh sách KHÔNG xử lý
 * ngay mà mở trang chi tiết để người duyệt sửa thông tin trước, rồi mới bấm Phê
 * duyệt / Từ chối ở đó. Từ chối bắt buộc có lý do; cả hai đều gửi email tới email
 * tổ chức và email người đại diện pháp luật.
 *
 * GIAI ĐOẠN UI TĨNH: email chỉ được mô phỏng bằng thông báo trên màn hình.
 */
const UC = findImsUseCaseByCode('uc_ims_018_5')!;
const PAGE_SIZES_DEFAULT = 10;

/* ---------------------------------------------------------- badge */

const STATUS_CLASS: Record<RegistrationStatus, string> = {
  PENDING: 'bg-[#FDF1E0] text-[#B9691B]',
  APPROVED: 'bg-[#E6F4EA] text-[#1E7A42]',
  REJECTED: 'bg-[#802423]/10 text-[#802423]',
};

const RegistrationStatusPill: React.FC<{ status: RegistrationStatus }> = ({ status }) => (
  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${STATUS_CLASS[status]}`}>
    <span className="h-1.5 w-1.5 rounded-full bg-current" />
    {REGISTRATION_STATUS_LABEL[status]}
  </span>
);

const dash = (v: string | null | undefined) => (v ? v : <span className="text-slate-400">—</span>);

/* ---------------------------------------------------------- bộ lọc */

interface Criteria {
  name: string;
  orgType: string;
  enterpriseType: string;
  businessSector: string;
  domesticForeign: string;
  status: string;
}

const EMPTY_CRITERIA: Criteria = { name: '', orgType: '', enterpriseType: '', businessSector: '', domesticForeign: '', status: '' };

function matches(r: Registration, c: Criteria): boolean {
  const q = c.name.trim().toLowerCase();
  if (q && !r.orgName.toLowerCase().includes(q) && !r.shortName.toLowerCase().includes(q)) return false;
  if (c.orgType && r.orgType !== c.orgType) return false;
  if (c.enterpriseType && r.enterpriseType !== c.enterpriseType) return false;
  if (c.businessSector && r.businessSector !== c.businessSector) return false;
  if (c.domesticForeign && r.domesticForeign !== c.domesticForeign) return false;
  if (c.status && r.status !== c.status) return false;
  return true;
}

const FilterSelect: React.FC<{
  label: string;
  value: string;
  options: readonly string[];
  labels?: Record<string, string>;
  onChange: (v: string) => void;
}> = ({ label, value, options, labels, onChange }) => (
  <div>
    <label className="mb-1.5 block text-[13px] text-[#292929]">{label}</label>
    <select value={value} onChange={(e) => onChange(e.target.value)} className={SELECT_CLASS}>
      <option value="">— Tất cả —</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {labels?.[o] ?? o}
        </option>
      ))}
    </select>
  </div>
);

/* ------------------------------------------------------------- list */

interface ListProps {
  registrations: readonly Registration[];
  canDecide: boolean;
  onOpen: (id: number) => void;
}

const RegistrationList: React.FC<ListProps> = ({ registrations, canDecide, onOpen }) => {
  const [draft, setDraft] = useState<Criteria>(EMPTY_CRITERIA);
  const [applied, setApplied] = useState<Criteria>(EMPTY_CRITERIA);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES_DEFAULT);

  // Mới nhất lên đầu — cùng quy ước sắp xếp mặc định của các danh sách IMS.
  const rows = useMemo(
    () =>
      registrations
        .filter((r) => matches(r, applied))
        .sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()),
    [registrations, applied],
  );
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);

  const set = (key: keyof Criteria, v: string) => setDraft((prev) => ({ ...prev, [key]: v }));
  const search = () => {
    setApplied(draft);
    setPage(1);
  };
  const reset = () => {
    setDraft(EMPTY_CRITERIA);
    setApplied(EMPTY_CRITERIA);
    setPage(1);
  };

  return (
    <>
      <div
        className="mb-5 grid gap-x-8 gap-y-4 border-b border-slate-200 pb-5 md:grid-cols-2"
        onKeyDown={(e) => {
          if (e.key === 'Enter') search();
        }}
      >
        <div>
          <label className="mb-1.5 block text-[13px] text-[#292929]">Tên / tên viết tắt</label>
          <input value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="Nhập tên hoặc tên viết tắt tổ chức" className={INPUT_CLASS} />
        </div>
        <FilterSelect label="Loại tổ chức" value={draft.orgType} options={ORG_TYPE_OPTIONS} onChange={(v) => set('orgType', v)} />
        <FilterSelect label="Loại hình doanh nghiệp" value={draft.enterpriseType} options={BUSINESS_TYPE_OPTIONS} onChange={(v) => set('enterpriseType', v)} />
        <FilterSelect label="Lĩnh vực hoạt động" value={draft.businessSector} options={INDUSTRY_OPTIONS} onChange={(v) => set('businessSector', v)} />
        <FilterSelect label="Trong nước / Nước ngoài" value={draft.domesticForeign} options={DOMESTIC_FOREIGN_OPTIONS} onChange={(v) => set('domesticForeign', v)} />
        <FilterSelect
          label="Trạng thái"
          value={draft.status}
          options={['PENDING', 'APPROVED', 'REJECTED']}
          labels={REGISTRATION_STATUS_LABEL}
          onChange={(v) => set('status', v)}
        />
        <div className="flex justify-end gap-2.5 md:col-span-2">
          <button type="button" className={BTN_OUTLINE} onClick={reset}>
            Đặt lại
          </button>
          <button type="button" className={BTN_PRIMARY} onClick={search}>
            Tìm kiếm
          </button>
        </div>
      </div>

      <div className="mb-3 text-[13px] text-[#525252]">
        Tìm thấy <b className="text-[#292929]">{rows.length}</b> hồ sơ
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {[
                'STT',
                'Tên tổ chức',
                'Tên viết tắt',
                'Mã số thuế',
                'Trong nước / Nước ngoài',
                'Trạng thái',
                'Loại tổ chức',
                'Ngày bắt đầu hoạt động',
                'Ngày tạo',
                'Ngày sửa',
                'Người duyệt',
                'Ngày duyệt',
                'Người từ chối',
                'Ngày từ chối',
                'Lý do từ chối',
                'Thao tác',
              ].map((h) => (
                <th key={h} className={TH_CLASS}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <EmptyRow colSpan={16} title="Không tìm thấy hồ sơ" hint="Thử điều chỉnh điều kiện tìm kiếm" />
            ) : (
              pageRows.map((r, i) => (
                <tr key={r.id} className="hover:bg-[#F8FAFC]">
                  <td className={`${TD_CLASS} text-center text-slate-500`}>{start + i + 1}</td>
                  <td className={`${TD_CLASS} min-w-60`}>
                    <button type="button" onClick={() => onOpen(r.id)} className="text-left font-semibold text-[#008A4B] hover:underline">
                      {r.orgName}
                    </button>
                  </td>
                  <td className={TD_CLASS}>{dash(r.shortName)}</td>
                  <td className={`${TD_CLASS} font-mono text-[13px]`}>{r.taxCode}</td>
                  <td className={`${TD_CLASS} whitespace-nowrap`}>{dash(r.domesticForeign)}</td>
                  <td className={TD_CLASS}>
                    <RegistrationStatusPill status={r.status} />
                  </td>
                  <td className={`${TD_CLASS} whitespace-nowrap`}>{dash(r.orgType)}</td>
                  <td className={`${TD_CLASS} whitespace-nowrap`}>{dash(formatDate(r.operationStartDate))}</td>
                  <td className={`${TD_CLASS} whitespace-nowrap`}>{formatDateTime(r.createdDate)}</td>
                  <td className={`${TD_CLASS} whitespace-nowrap`}>{r.updatedDate ? formatDateTime(r.updatedDate) : dash('')}</td>
                  <td className={TD_CLASS}>{dash(r.approvedBy)}</td>
                  <td className={`${TD_CLASS} whitespace-nowrap`}>{r.approvedDate ? formatDateTime(r.approvedDate) : dash('')}</td>
                  <td className={TD_CLASS}>{dash(r.rejectedBy)}</td>
                  <td className={`${TD_CLASS} whitespace-nowrap`}>{r.rejectedDate ? formatDateTime(r.rejectedDate) : dash('')}</td>
                  <td className={`${TD_CLASS} min-w-50`}>{dash(r.rejectReason)}</td>
                  <td className={`${TD_CLASS} whitespace-nowrap`}>
                    {r.status === 'PENDING' && canDecide ? (
                      <div className="flex gap-2">
                        <button type="button" onClick={() => onOpen(r.id)} className={BTN_PRIMARY}>
                          Phê duyệt
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpen(r.id)}
                          className={`${BTN_OUTLINE} border-[#802423]/40 text-[#802423] hover:bg-[#802423]/5`}
                        >
                          Từ chối
                        </button>
                      </div>
                    ) : (
                      <span className="text-[13px] text-slate-500">{r.status === 'PENDING' ? 'Chờ xử lý' : 'Đã xử lý'}</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <TablePager
        page={safePage}
        totalPages={totalPages}
        total={rows.length}
        pageSize={pageSize}
        onPage={setPage}
        onPageSize={(n) => {
          setPageSize(n);
          setPage(1);
        }}
      />
    </>
  );
};

/* ----------------------------------------------------------- chi tiết */

const FileTable: React.FC<{ files: readonly AttachedFile[]; error?: string; onView: (f: AttachedFile) => void }> = ({
  files,
  error,
  onView,
}) => (
  <div className="sm:col-span-2">
    <div className={`overflow-x-auto rounded-lg border ${error ? 'border-[#802423]' : 'border-slate-200'}`}>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {['STT', 'Tên file', 'Mô tả', 'Loại file', 'Dung lượng', ''].map((h) => (
              <th key={h} className={TH_CLASS}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {files.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-3 py-4 text-center text-[13px] text-slate-500">
                Tổ chức chưa đính kèm file
              </td>
            </tr>
          ) : (
            files.map((f, i) => (
              <tr key={`${f.name}-${i}`}>
                <td className={`${TD_CLASS} text-center text-slate-500`}>{i + 1}</td>
                <td className={TD_CLASS}>
                  <span className="inline-flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-slate-400" />
                    {f.name}
                  </span>
                </td>
                <td className={TD_CLASS}>{f.description}</td>
                <td className={TD_CLASS}>{f.type}</td>
                <td className={`${TD_CLASS} whitespace-nowrap`}>{f.sizeKb.toLocaleString('vi-VN')} KB</td>
                <td className={TD_CLASS}>
                  <button type="button" onClick={() => onView(f)} className="text-[13px] font-medium text-[#008A4B] hover:underline">
                    Xem
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
    {error && <p className="mt-1 text-xs text-[#802423]">{error}</p>}
  </div>
);

const FieldInput: React.FC<{
  field: RegistrationField;
  draft: RegistrationDraft;
  error?: string;
  disabled: boolean;
  onChange: (key: RegistrationField['key'], value: string | number | null) => void;
}> = ({ field, draft, error, disabled, onChange }) => {
  const value = draft[field.key];
  const off = disabled || !isFieldEnabled(field, draft);
  const cls = `${INPUT_CLASS} ${error ? ERROR_RING : ''} disabled:bg-slate-100 disabled:text-slate-500`;

  switch (field.kind) {
    case 'select':
      return (
        <select value={String(value ?? '')} disabled={off} onChange={(e) => onChange(field.key, e.target.value)} className={`${SELECT_CLASS} ${error ? ERROR_RING : ''} disabled:bg-slate-100 disabled:text-slate-500`}>
          <option value="">-- Chọn --</option>
          {field.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    case 'radio':
      return (
        <div className="flex h-9 items-center gap-6">
          {field.options?.map((o) => (
            <label key={o} className="flex items-center gap-2 text-[13px] text-[#292929]">
              <input type="radio" disabled={off} checked={value === o} onChange={() => onChange(field.key, o)} className="h-4 w-4 accent-[#008A4B]" />
              {o}
            </label>
          ))}
        </div>
      );
    case 'date':
      return off ? (
        <input value={formatDate(String(value ?? ''))} disabled className={cls} />
      ) : (
        <DateField value={(value as string) || null} onChange={(v) => onChange(field.key, v ?? '')} hasError={!!error} />
      );
    case 'money':
      return (
        <input
          inputMode="numeric"
          disabled={off}
          // Bảng 07 mục 16: "định dạng số có phân tách hàng nghìn".
          value={value === null || value === '' ? '' : Number(value).toLocaleString('vi-VN')}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '');
            onChange(field.key, digits ? Number(digits) : null);
          }}
          className={cls}
        />
      );
    case 'textarea':
      return (
        <textarea
          value={String(value ?? '')}
          disabled={off}
          onChange={(e) => onChange(field.key, e.target.value)}
          className={`${TEXTAREA_CLASS} ${error ? ERROR_RING : ''} disabled:bg-slate-100 disabled:text-slate-500`}
        />
      );
    default:
      return (
        <input
          type={field.kind === 'email' ? 'email' : field.kind === 'tel' ? 'tel' : 'text'}
          value={String(value ?? '')}
          disabled={off}
          onChange={(e) => onChange(field.key, e.target.value)}
          className={cls}
        />
      );
  }
};

interface DetailProps {
  registration: Registration;
  canDecide: boolean;
  by: string;
  onBack: () => void;
  onDone: (message: string) => void;
  pushToast: (kind: 'success' | 'danger', message: string) => void;
}

const RegistrationDetail: React.FC<DetailProps> = ({ registration, canDecide, by, onBack, onDone, pushToast }) => {
  const initial = useMemo(() => toDraft(registration), [registration]);
  const [draft, setDraft] = useState<RegistrationDraft>(initial);
  const [showErrors, setShowErrors] = useState(false);
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonTouched, setReasonTouched] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const editable = canDecide && registration.status === 'PENDING';
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const errors: RegistrationErrors = validateRegistration(draft, uniquePoolFor(registration.id));
  const shown: RegistrationErrors = showErrors ? errors : {};
  const errorCount = Object.keys(errors).length;

  const change = (key: RegistrationField['key'], value: string | number | null) =>
    setDraft((prev) => {
      const next = { ...prev, [key]: value } as RegistrationDraft;
      // Trường phụ thuộc bị ẩn/khóa thì xóa giá trị, để hồ sơ không mang theo dữ
      // liệu của một nhánh lựa chọn đã bỏ.
      if (next.orgType !== 'Tổ chức phát hành') next.enterpriseType = '';
      if (next.enterpriseType !== 'Công ty cổ phần') next.jscType = '';
      if (next.jscType !== 'Đã đại chúng') next.publicCompanyType = '';
      return next;
    });

  const viewFile = (f: AttachedFile) =>
    pushToast('success', `Prototype chưa lưu nội dung file — “${f.name}” (${f.sizeKb.toLocaleString('vi-VN')} KB)`);

  const back = () => (editable && dirty ? setConfirmLeave(true) : onBack());

  const save = () => {
    saveRegistration(registration.id, draft, by);
    pushToast('success', 'Đã lưu thay đổi hồ sơ');
  };

  const tryApprove = () => {
    setShowErrors(true);
    if (errorCount > 0) {
      pushToast('danger', `Hồ sơ còn ${errorCount} trường chưa hợp lệ — chưa phê duyệt được`);
      return;
    }
    setConfirmApprove(true);
  };

  const approve = () => {
    const { recipients, catalog } = approveRegistration(registration.id, draft, by);
    onDone(`Đã phê duyệt “${draft.orgName}” — lưu vào ${catalog} (Lưu tạm). Email đã gửi tới ${recipients.join(', ')}`);
  };

  const reject = () => {
    setReasonTouched(true);
    if (!reason.trim()) return;
    if (dirty) saveRegistration(registration.id, draft, by);
    const { recipients } = rejectRegistration(registration.id, reason.trim(), by);
    onDone(`Đã từ chối “${draft.orgName}”. Lý do đã gửi tới ${recipients.join(', ')}`);
  };

  return (
    <>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <button type="button" onClick={back} className="mb-2 inline-flex items-center gap-1.5 text-[13px] text-[#525252] hover:text-[#008A4B]">
            <ArrowLeft className="h-4 w-4" />
            Danh sách đăng ký
          </button>
          <h2 className="text-xl font-bold text-[#292929]">{registration.orgName}</h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-2.5 text-[13px] text-[#525252]">
            <RegistrationStatusPill status={registration.status} />
            <span>Gửi lúc {formatDateTime(registration.createdDate)}</span>
          </div>
        </div>
      </div>

      {registration.status === 'APPROVED' && (
        <p className="mb-4 flex items-start gap-2 rounded-lg bg-[#E6F4EA] px-3.5 py-2.5 text-[13px] text-[#1E7A42]">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          Đã phê duyệt bởi <b>{registration.approvedBy}</b> lúc {formatDateTime(registration.approvedDate ?? '')}. Hồ sơ đã lưu vào danh mục
          tổ chức ở trạng thái “Lưu tạm”.
        </p>
      )}
      {registration.status === 'REJECTED' && (
        <p className="mb-4 flex items-start gap-2 rounded-lg bg-[#802423]/5 px-3.5 py-2.5 text-[13px] text-[#802423]">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Đã từ chối bởi <b>{registration.rejectedBy}</b> lúc {formatDateTime(registration.rejectedDate ?? '')}. Lý do:{' '}
            {registration.rejectReason}
          </span>
        </p>
      )}
      {registration.status === 'PENDING' && !canDecide && (
        <p className="mb-4 flex items-center gap-2 text-[13px] text-[#525252]">
          <Info className="h-4 w-4" />
          Tài khoản đang đăng nhập chỉ được xem, không phê duyệt / từ chối được.
        </p>
      )}
      {showErrors && errorCount > 0 && (
        <p className="mb-4 rounded-lg border border-[#802423]/30 bg-[#802423]/5 px-3.5 py-2.5 text-[13px] text-[#802423]">
          Còn {errorCount} trường chưa hợp lệ — kiểm tra các ô viền đỏ bên dưới. Hồ sơ thiếu thông tin có thể Từ chối kèm lý do.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {REGISTRATION_SECTIONS.map((section) => (
          <section key={section.title} className="rounded-xl border border-slate-200">
            <h3 className="border-b border-slate-200 px-5 py-3 text-sm font-semibold text-[#292929]">{section.title}</h3>
            <div className="grid gap-x-5 gap-y-4 px-5 py-4 sm:grid-cols-2">
              {section.files && (
                <FileTable
                  files={draft[section.files]}
                  error={shown[section.files]}
                  onView={viewFile}
                />
              )}
              {section.fields
                .filter((f) => isFieldVisible(f, draft))
                .map((f) => (
                  <div key={f.key} className={f.span2 ? 'sm:col-span-2' : undefined}>
                    <FormField label={f.label} required={isFieldRequired(f, draft)} error={shown[f.key]} hint={editable ? f.hint : undefined}>
                      <FieldInput field={f} draft={draft} error={shown[f.key]} disabled={!editable} onChange={change} />
                    </FormField>
                  </div>
                ))}
            </div>
          </section>
        ))}
      </div>

      <div className="sticky bottom-0 -mx-6 mt-5 -mb-6 flex flex-wrap justify-end gap-2.5 rounded-b-xl border-t border-slate-200 bg-white px-6 py-4">
        <button type="button" className={BTN_OUTLINE} onClick={back}>
          Quay lại
        </button>
        {editable && (
          <>
            <button type="button" className={BTN_OUTLINE} onClick={save} disabled={!dirty}>
              Lưu thay đổi
            </button>
            <button type="button" className={BTN_DANGER} onClick={() => setRejecting(true)}>
              Từ chối
            </button>
            <button type="button" className={BTN_PRIMARY} onClick={tryApprove}>
              Phê duyệt
            </button>
          </>
        )}
      </div>

      {confirmApprove && (
        <ModalShell
          title="Phê duyệt hồ sơ"
          onClose={() => setConfirmApprove(false)}
          width="confirm"
          footer={
            <>
              <button type="button" className={BTN_OUTLINE} onClick={() => setConfirmApprove(false)}>
                Hủy
              </button>
              <button type="button" className={BTN_PRIMARY} onClick={approve}>
                Phê duyệt
              </button>
            </>
          }
        >
          <div className="px-5 py-5 text-[13px] text-[#292929]">
            <p>
              Phê duyệt đăng ký chuyên trang của <b>{draft.orgName}</b>?
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[#525252]">
              <li>Hồ sơ được lưu vào danh mục {draft.orgType === 'Tổ chức liên quan' ? 'Tổ chức liên quan' : 'TCPH'} ở trạng thái “Lưu tạm”.</li>
              <li>Email phê duyệt gửi tới {[draft.email, draft.legalRepEmail].filter(Boolean).join(' và ')}, kèm thông báo “thông tin tài khoản sẽ được gửi sau”.</li>
            </ul>
          </div>
        </ModalShell>
      )}

      {rejecting && (
        <ModalShell
          title="Từ chối hồ sơ"
          onClose={() => setRejecting(false)}
          width="medium"
          footer={
            <>
              <button type="button" className={BTN_OUTLINE} onClick={() => setRejecting(false)}>
                Hủy
              </button>
              <button type="button" className={BTN_DANGER} onClick={reject}>
                Từ chối
              </button>
            </>
          }
        >
          <div className="flex flex-col gap-3 px-5 py-5">
            <FormField
              label="Lý do từ chối"
              required
              error={reasonTouched && !reason.trim() ? 'Lý do từ chối là bắt buộc' : undefined}
              hint={`Gửi tới ${[draft.email, draft.legalRepEmail].filter(Boolean).join(', ')} kèm đường dẫn đăng ký lại`}
            >
              <textarea
                autoFocus
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="VD: Đơn đăng ký chưa có chữ ký, đóng dấu của người đại diện theo pháp luật"
                className={`${TEXTAREA_CLASS} ${reasonTouched && !reason.trim() ? ERROR_RING : ''}`}
              />
            </FormField>
          </div>
        </ModalShell>
      )}

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
              <button type="button" className={BTN_DANGER} onClick={onBack}>
                Thoát
              </button>
            </>
          }
        >
          <p className="px-5 py-5 text-[13px] text-[#292929]">Các thay đổi trên hồ sơ chưa được lưu sẽ bị mất.</p>
        </ModalShell>
      )}
    </>
  );
};

/* ------------------------------------------------------------ màn hình */

interface Ims018PheDuyetViewProps {
  currentUser?: UserAccount;
}

export const Ims018PheDuyetView: React.FC<Ims018PheDuyetViewProps> = ({ currentUser }) => {
  const { registrations } = useRegistrationStore();
  const { accounts } = useAccountStore();
  const [openId, setOpenId] = useState<number | null>(null);
  const { toasts, pushToast } = useToasts();

  const actor = currentUser ? actorFor(currentUser, accounts) : null;
  const by = currentUser?.username ?? 'unknown';
  // Phê duyệt tạo hồ sơ tổ chức và dẫn tới cấp tài khoản tổ chức — dùng cùng
  // luật "được quản lý tài khoản tổ chức" (TP cấp 3 chỉ xem).
  const canDecide = actor ? canManageExternal(actor) : false;

  const opened = registrations.find((r) => r.id === openId) ?? null;

  useEffect(() => {
    if (openId !== null) logRegistrationView(openId, by);
  }, [openId, by]);

  return (
    <>
      <CatalogPage
        catalogName={UC.menuLabel}
        rootLabel="Quản lý tài khoản"
        heading={opened ? 'Chi tiết hồ sơ đăng ký chuyên trang' : 'Danh sách đăng ký tài khoản chuyên trang'}
        subtitle={
          opened
            ? 'Kiểm tra, chỉnh sửa thông tin rồi phê duyệt hoặc từ chối hồ sơ'
            : 'Hồ sơ tổ chức tự đăng ký qua cổng DSS — phê duyệt để đưa vào danh mục tổ chức ở trạng thái “Lưu tạm”'
        }
        actions={null}
      >
        {opened ? (
          <RegistrationDetail
            key={opened.id}
            registration={opened}
            canDecide={canDecide}
            by={by}
            onBack={() => setOpenId(null)}
            onDone={(msg) => {
              setOpenId(null);
              pushToast('success', msg);
            }}
            pushToast={pushToast}
          />
        ) : (
          <RegistrationList registrations={registrations} canDecide={canDecide} onOpen={setOpenId} />
        )}
      </CatalogPage>
      <ToastStack toasts={toasts} />
    </>
  );
};
