/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { AlertTriangle, ChevronRight, FileText } from 'lucide-react';

import { BTN_OUTLINE, BTN_PRIMARY, ModalShell, TD_CLASS, TH_CLASS } from '../catalogUi';
import { str, useDossierStore } from '../dossier/dossierStore';
import { useRelatedOrgRows } from '../relatedOrgStore';
import { requestAccountCreate, useAccountStore } from './accountStore';
import { OrgType, normalizeName } from './accountTypes';
import { useRegistrationStore } from './registrationStore';
import { AttachedFile } from './registrationTypes';

/**
 * Trang chủ /ims — hiện chỉ chứa widget "Nhắc phê duyệt hồ sơ và tạo tài khoản"
 * (IMS-018-8, SRS §2.8, Màn hình 08).
 *
 *   - Thẻ "Tổ chức chưa tạo tài khoản": hồ sơ tổ chức (TCPH, Tổ chức liên quan,
 *     Tổ chức khác) đã lưu nhưng chưa có tài khoản tổ chức nào trong LOGINS.
 *     Đối chiếu theo TÊN tổ chức — LOGINS chỉ có `ORG_NAME`, cột
 *     `ORGANIZATION_ID` trong §4.1 chưa được mô tả.
 *   - Thẻ "Hồ sơ đăng ký chuyên trang": số hồ sơ đăng ký chưa xử lý.
 *   - Khối "Nhắc lịch tạo tài khoản": từng tổ chức một dòng, nút "Tạo tài khoản"
 *     luôn có; nút "Thông tin tài khoản đã đăng ký" chỉ có khi tổ chức đi lên từ
 *     một hồ sơ đăng ký chuyên trang có đính kèm danh sách người sử dụng.
 */

interface PendingOrg {
  key: string;
  name: string;
  orgType: OrgType;
  createdDate: string;
  userListFiles: readonly AttachedFile[];
}

/** Bảng mô tả mục 8 — nội dung cố định, chỉ đổi theo Loại tổ chức của hồ sơ. */
const NOTE_BY_TYPE: Record<OrgType, string> = {
  'Tổ chức phát hành': 'Hồ sơ tổ chức phát hành đã được lưu - chưa có tài khoản tổ chức nào được tạo.',
  'Tổ chức liên quan': 'Hồ sơ tổ chức liên quan đã được lưu - chưa có tài khoản tổ chức nào được tạo.',
  'Tổ chức khác': 'Hồ sơ tổ chức khác đã được lưu - chưa có tài khoản tổ chức nào được tạo.',
};

const COLLAPSED_ROWS = 5;

interface HomeViewProps {
  onNavigate?: (moduleCode: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onNavigate }) => {
  const { accounts } = useAccountStore();
  const { issuers } = useDossierStore();
  const [relatedOrgs] = useRelatedOrgRows();
  const { registrations } = useRegistrationStore();

  const [expanded, setExpanded] = useState(false);
  const [filesOf, setFilesOf] = useState<PendingOrg | null>(null);

  const pendingOrgs = useMemo<PendingOrg[]>(() => {
    const withAccount = new Set(
      accounts.filter((a) => a.deleteFlg === 0 && a.accountType === 'EXTERNAL').map((a) => normalizeName(a.orgName)),
    );
    const approvedFiles = new Map(
      registrations.filter((r) => r.status === 'APPROVED').map((r) => [normalizeName(r.orgName), r.userListFiles]),
    );

    const orgs: PendingOrg[] = [
      ...issuers
        .filter((i) => i.deleteFlg === 0)
        .map((i) => ({
          key: `issuer-${i.id}`,
          name: str(i.values.name),
          orgType: (i.kind === 'tochuckhac' ? 'Tổ chức khác' : 'Tổ chức phát hành') as OrgType,
          createdDate: i.createdDate,
          userListFiles: [] as readonly AttachedFile[],
        })),
      ...relatedOrgs
        .filter((r) => r.deleteFlg === 0)
        .map((r) => ({
          key: `related-${r.id}`,
          name: r.name,
          orgType: 'Tổ chức liên quan' as OrgType,
          createdDate: r.createdDate,
          userListFiles: [] as readonly AttachedFile[],
        })),
    ];

    return orgs
      .filter((o) => o.name && !withAccount.has(normalizeName(o.name)))
      .map((o) => ({ ...o, userListFiles: approvedFiles.get(normalizeName(o.name)) ?? [] }))
      .sort((a, b) => b.createdDate.localeCompare(a.createdDate));
  }, [accounts, issuers, relatedOrgs, registrations]);

  const pendingRegistrations = registrations.filter((r) => r.status === 'PENDING').length;
  const visibleOrgs = expanded ? pendingOrgs : pendingOrgs.slice(0, COLLAPSED_ROWS);

  const createAccountFor = (org: PendingOrg) => {
    requestAccountCreate({ orgName: org.name, orgType: org.orgType });
    onNavigate?.('uc_ims_018');
  };

  return (
    <div className="p-6">
      <h1 className="mb-5 text-2xl font-bold text-[#292929]">Trang chủ</h1>

      <div className="mb-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="text-3xl font-bold text-[#1E7A42]">{pendingOrgs.length}</div>
          <div className="mt-1 text-[13px] text-[#525252]">Tổ chức chưa tạo tài khoản</div>
        </div>
        <button
          type="button"
          onClick={() => onNavigate?.('uc_ims_018_5')}
          className="group rounded-xl border border-slate-200 bg-white px-5 py-4 text-left shadow-sm hover:border-[#22AF73]"
        >
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold text-[#1E7A42]">{pendingRegistrations}</div>
            <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-[#008A4B]" />
          </div>
          <div className="mt-1 text-[13px] text-[#525252]">Hồ sơ đăng ký chuyên trang chưa xử lý</div>
        </button>
      </div>

      {/* Mục 5: khối nhắc lịch chỉ hiện khi có ít nhất một tổ chức cần tạo tài khoản. */}
      {pendingOrgs.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-[#F3D9B5] bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-[#F3D9B5] bg-[#FDF1E0] px-5 py-3">
            <div className="flex items-center gap-2 text-[15px] font-semibold text-[#7A4510]">
              <AlertTriangle className="h-4.5 w-4.5 text-[#B9691B]" />
              Nhắc lịch tạo tài khoản
            </div>
            <span className="rounded-full bg-[#B9691B] px-2.5 py-0.5 text-xs font-semibold text-white">
              {pendingOrgs.length} tổ chức
            </span>
          </div>

          <ul className="divide-y divide-slate-100">
            {visibleOrgs.map((org) => (
              <li key={org.key} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-[#292929]">{org.name}</div>
                  <div className="text-[12.5px] text-slate-500">{NOTE_BY_TYPE[org.orgType]}</div>
                </div>
                {org.userListFiles.length > 0 && (
                  <button type="button" className={BTN_OUTLINE} onClick={() => setFilesOf(org)}>
                    Thông tin tài khoản đã đăng ký
                  </button>
                )}
                <button type="button" className={BTN_PRIMARY} onClick={() => createAccountFor(org)}>
                  Tạo tài khoản
                </button>
              </li>
            ))}
          </ul>

          {pendingOrgs.length > COLLAPSED_ROWS && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="w-full border-t border-slate-100 px-5 py-2.5 text-[13px] font-medium text-[#008A4B] hover:bg-slate-50"
            >
              {expanded ? 'Thu gọn' : `Xem tất cả ${pendingOrgs.length} tổ chức`}
            </button>
          )}
        </div>
      )}

      {filesOf && (
        <ModalShell
          title={`Thông tin tài khoản đã đăng ký — ${filesOf.name}`}
          onClose={() => setFilesOf(null)}
          width="medium"
          footer={
            <button type="button" className={BTN_OUTLINE} onClick={() => setFilesOf(null)}>
              Đóng
            </button>
          }
        >
          <div className="px-5 py-4">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={TH_CLASS}>Tên file</th>
                  <th className={TH_CLASS}>Mô tả</th>
                  <th className={TH_CLASS}>Dung lượng</th>
                </tr>
              </thead>
              <tbody>
                {filesOf.userListFiles.map((f) => (
                  <tr key={f.name}>
                    <td className={TD_CLASS}>
                      <span className="inline-flex items-center gap-1.5">
                        <FileText className="h-4 w-4 text-slate-400" />
                        {f.name}
                      </span>
                    </td>
                    <td className={TD_CLASS}>{f.description}</td>
                    <td className={`${TD_CLASS} whitespace-nowrap`}>{f.sizeKb.toLocaleString('vi-VN')} KB</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-slate-500">
              File đính kèm lúc đăng ký chuyên trang. Prototype chưa lưu nội dung file nên chỉ hiện thông tin file.
            </p>
          </div>
        </ModalShell>
      )}
    </div>
  );
};
