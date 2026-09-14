/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Search,
  Building2,
  SlidersHorizontal,
  Calendar,
  Download,
  Eye,
  Award,
  ChevronDown,
  RotateCcw,
} from 'lucide-react';
import {
  Organization,
  SecurityItem,
  Submission,
} from '../../types/hnx';
import { StatusBadge } from '../common/StatusBadge';
import {
  CNS_NEWS_ROUTES,
  DEFAULT_CNS_TAB,
  cnsPathForTab,
  cnsTabFromPath,
} from '../../lib/cnsRoutes';
import { INITIAL_CATALOGS } from '../../data/mockData';
import hnxLogo from '../../assets/hnx-logo.png';

interface PublicCorporateNewsProps {
  organizations: Organization[];
  securities: SecurityItem[];
  submissions: Submission[];
  lang: 'vi' | 'en';
}

interface NewsTab {
  key: string;
  label: string;
  /** Không có trường "loại tin" nào khớp thẳng cả 6 tab tham chiếu — kết hợp
   * `newsGroupCode` sẵn có với vài từ khoá trong tiêu đề thay vì thêm field mới. */
  match: (sub: Submission) => boolean;
}

/** Bộ lọc tin của từng mục, tra theo `key` khai báo trong `cnsRoutes.ts`. Khoá
 * và nhãn nằm bên đó vì chúng còn quyết định URL `/hnxcns/<ma-uc>`; ở đây chỉ
 * còn phần thuần nghiệp vụ là điều kiện lọc. */
const TAB_MATCHERS: Record<string, (sub: Submission) => boolean> = {
  today: () => true,
  fs: (s) => s.newsGroupCode === 'PERIODIC',
  dividend: (s) => s.titleVi.toLowerCase().includes('cổ tức'),
  agm: (s) => s.titleVi.toLowerCase().includes('đại hội'),
  bond_issue: (s) => s.newsGroupCode === 'BOND' && s.titleVi.toLowerCase().includes('phát hành'),
  bond_payment: (s) => s.newsGroupCode === 'BOND' && s.titleVi.toLowerCase().includes('thanh toán'),
};

const NEWS_TABS: NewsTab[] = CNS_NEWS_ROUTES.map((route) => ({
  key: route.key,
  label: route.label,
  match: TAB_MATCHERS[route.key] ?? (() => true),
}));

/** Nhãn ngành nghề hiển thị dưới tên doanh nghiệp — đọc lại danh mục ngành đã
 * có (`INITIAL_CATALOGS`) qua `organization.industryCode`, không phải field mới. */
function industryLabel(org: Organization | undefined, lang: 'vi' | 'en'): string {
  if (!org) return '';
  const entry = INITIAL_CATALOGS.find(
    (c) => c.catalogCode === 'INDUSTRY' && c.code === org.industryCode
  );
  if (!entry) return '';
  return lang === 'en' && entry.nameEn ? entry.nameEn : entry.nameVi;
}

function formatTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(
    d.getFullYear()
  ).slice(-2)}`;
}

const TIME_RANGE_OPTIONS = [
  { value: 'ALL', label: 'Tất cả thời gian' },
  { value: 'TODAY', label: 'Hôm nay' },
  { value: '7D', label: '7 ngày qua' },
  { value: '30D', label: '30 ngày qua' },
];

/** So theo đồng hồ thực — mốc mà các service khác trong hệ thống (vd.
 * `notificationService`) cũng dùng, dù dữ liệu mẫu được soạn quanh các ngày
 * cố định trong 2026 nên bộ lọc "Hôm nay" có thể không khớp bản ghi nào. */
function isWithinTimeRange(iso: string | undefined, range: string): boolean {
  if (range === 'ALL' || !iso) return true;
  const published = new Date(iso);
  const now = new Date();
  if (range === 'TODAY') return published.toDateString() === now.toDateString();
  const days = range === '7D' ? 7 : 30;
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days);
  return published >= cutoff && published <= now;
}

interface FilterSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

/** Ba bộ lọc trong panel "Lọc nâng cao" dùng chung một khối nhãn + dropdown bo
 * tròn nền trắng — tách riêng để không lặp lại cùng một khối JSX ba lần.
 *
 * Dùng menu tự dựng thay vì `<select>` gốc: hộp tuỳ chọn của `<select>` do
 * trình duyệt vẽ ở lớp riêng, CSS của trang không chỉnh được kích thước/bo
 * góc/đệm của nó — mà khối "Thị trường" cần đúng các trị số đó (rộng 361.5px,
 * cao 122px, bo góc 10px...). */
const FilterSelect: React.FC<FilterSelectProps> = ({ label, value, onChange, options }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const selectedLabel = options.find((opt) => opt.value === value)?.label ?? '';

  return (
    <div className="flex flex-col gap-1.5" ref={rootRef}>
      <label className="text-xs font-semibold text-emerald-100/90">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-white/60"
        >
          <span className="truncate">{selectedLabel}</span>
          <ChevronDown
            className={`h-4 w-4 text-slate-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>

        {open && (
          <div
            className="absolute z-50 top-full left-0 mt-1.5 w-full min-w-[206px] rounded-[10px] border border-slate-200 bg-white py-1.5 opacity-100 shadow-xl"
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm ${
                  opt.value === value
                    ? 'bg-hnx-50 text-hnx-800 font-semibold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const PublicCorporateNews: React.FC<PublicCorporateNewsProps> = ({
  organizations,
  securities,
  submissions,
  lang,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<string>('ALL');
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('ALL');
  /**
   * Mục tin đang mở đọc từ URL chứ không chỉ từ state: mỗi mục có đường dẫn
   * riêng `/hnxcns/<ma-uc>` (xem `cnsRoutes.ts`) nên gõ thẳng hay gửi link tới
   * một mục đều vào đúng mục đó. Vào `/hnxcns` trống thì rơi về mục đầu tiên.
   */
  const [activeTab, setActiveTab] = useState<string>(() =>
    (typeof window === 'undefined' ? null : cnsTabFromPath(window.location.pathname)) ??
    DEFAULT_CNS_TAB
  );
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);

  /** Nút Back/Forward của trình duyệt phải kéo mục tin đi theo. */
  useEffect(() => {
    const onPop = () => setActiveTab(cnsTabFromPath(window.location.pathname) ?? DEFAULT_CNS_TAB);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  /**
   * Bấm một mục đổi cả nội dung lẫn đường dẫn. Dùng pushState để nút Back quay
   * lại đúng mục vừa xem thay vì rời hẳn trang tin.
   */
  const changeTab = (key: string) => {
    setActiveTab(key);
    const nextPath = cnsPathForTab(key);
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath + window.location.search);
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedBoard('ALL');
    setSelectedGroup('ALL');
    setSelectedTimeRange('ALL');
  };

  // Chỉ hiện tin đã công bố công khai (FR-066 / §8.3): PUBLISHED + isPublic + chưa bị ẩn.
  const publicSubmissions = (submissions || []).filter(
    (s) => s.status === 'PUBLISHED' && s.isPublic && !s.hiddenAt
  );

  const activeTabDef = NEWS_TABS.find((t) => t.key === activeTab) ?? NEWS_TABS[0];

  const filteredSubmissions = publicSubmissions
    .filter(activeTabDef.match)
    .filter((sub) => {
      const org = organizations.find((o) => o.id === sub.organizationId);
      const sec = securities.find((s) => s.id === sub.securityId);

      if (selectedBoard !== 'ALL' && sec && sec.board !== selectedBoard) return false;
      if (selectedGroup !== 'ALL' && sub.newsGroupCode !== selectedGroup) return false;
      if (!isWithinTimeRange(sub.publishedAt, selectedTimeRange)) return false;

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchTitle = sub.titleVi.toLowerCase().includes(term);
        const matchOrg =
          org && (org.nameVi.toLowerCase().includes(term) || org.shortName.toLowerCase().includes(term));
        const matchSymbol = sec && sec.symbol.toLowerCase().includes(term);
        return matchTitle || matchOrg || matchSymbol;
      }

      return true;
    })
    .sort((a, b) => new Date(b.publishedAt ?? 0).getTime() - new Date(a.publishedAt ?? 0).getTime());

  return (
    <div className="bg-slate-50 min-h-screen text-slate-900 flex flex-col">
      {/* Hero + thanh tìm kiếm */}
      <div className="bg-hnx-search-hub text-white py-6 sm:py-8 px-4 sm:px-6 lg:px-8 border-b border-emerald-900 shadow-md">
        <div className="max-w-7xl mx-auto space-y-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-xs">
              {lang === 'vi' ? 'Tra cứu Công bố Thông tin' : 'Corporate Disclosure Lookup'}
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-2xl font-medium">
              {lang === 'vi'
                ? 'Tìm kiếm theo mã chứng khoán, tên doanh nghiệp, hoặc nội dung công bố · HNX · UPCoM · Bond Market'
                : 'Search by symbol, company name, or disclosure content · HNX · UPCoM · Bond Market'}
            </p>
          </div>

          <div className="w-full space-y-2">
            <div className="flex items-stretch bg-white text-slate-900 rounded-[12px] shadow-lg overflow-hidden h-[50px] opacity-100">
              <div className="hidden sm:flex items-center gap-1.5 px-4 border-r border-slate-200 text-slate-500 text-xs font-semibold shrink-0">
                <Building2 className="h-3.5 w-3.5" />
                <span>Mã CK / Công ty</span>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={
                  lang === 'vi'
                    ? 'Nhập mã CK (vd: ACB, FPT) hoặc tên công ty...'
                    : 'Enter symbol (e.g. ACB, FPT) or company name...'
                }
                className="flex-1 min-w-0 px-3 h-full text-sm font-medium focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className={`flex items-center gap-1.5 px-4 border-l border-slate-200 text-xs font-semibold shrink-0 ${
                  showAdvanced ? 'bg-hnx-50 text-hnx-800' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Lọc nâng cao</span>
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 px-5 bg-[#12573A] hover:brightness-110 text-white text-xs font-bold border-[3px] border-white rounded-[12px] shrink-0"
              >
                <Search className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Tìm kiếm</span>
              </button>
            </div>

            {showAdvanced && (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end bg-[#0B4A28] border border-[#6FAE55]/30 rounded-2xl p-4 shadow-lg">
                <FilterSelect
                  label="Thị trường"
                  value={selectedBoard}
                  onChange={setSelectedBoard}
                  options={[
                    { value: 'ALL', label: 'Tất cả' },
                    { value: 'HNX', label: 'HNX' },
                    { value: 'HOSE', label: 'HOSE' },
                    { value: 'UPCOM', label: 'UPCoM' },
                    { value: 'PRIVATE_BOND', label: 'Trái phiếu riêng lẻ' },
                  ]}
                />

                <FilterSelect
                  label="Loại tin"
                  value={selectedGroup}
                  onChange={setSelectedGroup}
                  options={[
                    { value: 'ALL', label: 'Tất cả' },
                    { value: 'PERIODIC', label: 'Báo cáo Định kỳ (BCTC)' },
                    { value: 'EXTRAORDINARY', label: 'Tin Bất thường (24h/48h)' },
                    { value: 'BOND', label: 'Tin Trái phiếu' },
                    { value: 'TRADING', label: 'Tin Giao dịch NNB/CĐL' },
                    { value: 'OFFERING', label: 'Tin Chào bán / Phát hành' },
                    { value: 'ON_DEMAND', label: 'Tin theo yêu cầu' },
                    { value: 'HNX_NEWS', label: 'Tin từ Sở HNX' },
                  ]}
                />

                <FilterSelect
                  label="Khoảng thời gian"
                  value={selectedTimeRange}
                  onChange={setSelectedTimeRange}
                  options={TIME_RANGE_OPTIONS}
                />

                <button
                  type="button"
                  onClick={resetFilters}
                  className="flex items-center justify-center gap-2 h-[42px] rounded-lg bg-[#7A1F2B] hover:bg-[#8f2432] text-white text-sm font-bold"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Xóa bộ lọc</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Nội dung chính */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {selectedOrg ? (
          /* Hồ sơ doanh nghiệp + tin công bố của riêng doanh nghiệp đó */
          <div className="space-y-6">
            <button
              onClick={() => setSelectedOrg(null)}
              className="text-xs font-semibold text-hnx-700 hover:text-hnx-900 flex items-center space-x-1"
            >
              <span>← Quay lại Danh sách Công bố Thông tin</span>
            </button>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 bg-hnx-50 text-hnx-800 font-extrabold text-sm rounded-lg border border-hnx-200">
                      {selectedOrg.shortName}
                    </span>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                      {lang === 'vi' ? selectedOrg.nameVi : selectedOrg.nameEn || selectedOrg.nameVi}
                    </h2>
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>Mã số thuế: <strong>{selectedOrg.taxCode}</strong></span>
                    <span className="hidden sm:inline">•</span>
                    <span>Ngành: <strong>{industryLabel(selectedOrg, lang)}</strong></span>
                    <span className="hidden sm:inline">•</span>
                    <span>Đại diện CBTT: <strong>{selectedOrg.disclosureRepName}</strong></span>
                  </div>
                </div>

                <StatusBadge status="NORMAL" type="security" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                  <div className="text-slate-500">Vốn điều lệ</div>
                  <div className="font-bold text-slate-900 text-sm">
                    {selectedOrg.charterCapital.toLocaleString('vi-VN')} VND
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                  <div className="text-slate-500">Địa chỉ Trụ sở</div>
                  <div className="font-medium text-slate-800 truncate">{selectedOrg.address}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                  <div className="text-slate-500">Website & Email</div>
                  <div className="font-medium text-hnx-700 truncate">{selectedOrg.website}</div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-slate-900">
                Tin Công bố Thông tin Công khai ({selectedOrg.shortName})
              </h3>

              <div className="divide-y divide-slate-100">
                {publicSubmissions
                  .filter((s) => s.organizationId === selectedOrg.id)
                  .map((sub) => (
                    <div key={sub.id} className="py-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="px-2 py-0.5 bg-hnx-50 text-hnx-800 text-[10px] font-bold rounded-md mr-2">
                            {sub.newsGroupCode || 'DINH_KY'}
                          </span>
                          <span className="text-xs text-slate-400">
                            {sub.publishedAt ? new Date(sub.publishedAt).toLocaleDateString('vi-VN') : ''}
                          </span>
                          <h4 className="text-sm font-semibold text-slate-900 mt-1">
                            {lang === 'vi' ? sub.titleVi : sub.titleEn || sub.titleVi}
                          </h4>
                        </div>

                        <button
                          onClick={() => alert(`Tải xuống file BCTC/Thông báo công khai: ${sub.submissionNo}.pdf`)}
                          className="inline-flex items-center space-x-1 text-xs font-semibold text-hnx-700 bg-hnx-50 hover:bg-hnx-100 px-3 py-1.5 rounded-lg border border-hnx-200"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Tải PDF</span>
                        </button>
                      </div>

                      {(sub.payload || sub.contentEn) && (
                        <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                          {lang === 'en' && sub.contentEn
                            ? sub.contentEn
                            : sub.payload?.summary_note || JSON.stringify(sub.payload)}
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ) : (
          /* Danh sách Công bố Thông tin */
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-5 pt-5">
              <h2 className="text-base font-bold text-slate-900">Danh sách Công bố Thông tin</h2>
            </div>

            <div className="flex items-center gap-2 px-5 pt-4 overflow-x-auto">
              {NEWS_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => changeTab(tab.key)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors ${
                    activeTab === tab.key
                      ? 'bg-[#12573A] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="mt-4 border-t border-slate-100" />

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3 text-left font-bold">Thời gian</th>
                    <th className="px-3 py-3 text-left font-bold">Mã CK</th>
                    <th className="px-3 py-3 text-left font-bold">Tên rút gọn</th>
                    <th className="px-3 py-3 text-left font-bold">Tiêu đề / Nội dung</th>
                    <th className="px-5 py-3 text-right font-bold">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-sm text-slate-500">
                        Không tìm thấy tin công bố nào phù hợp với bộ lọc hiện tại.
                      </td>
                    </tr>
                  ) : (
                    filteredSubmissions.map((sub) => {
                      const org = organizations.find((o) => o.id === sub.organizationId);
                      const sec = securities.find((s) => s.id === sub.securityId);
                      const isHot = sub.newsGroupCode === 'EXTRAORDINARY';

                      return (
                        <tr key={sub.id} className="hover:bg-slate-50/70 align-top">
                          <td className="px-5 py-3 whitespace-nowrap">
                            <div className="font-semibold text-slate-800 text-xs">{formatTime(sub.publishedAt)}</div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Calendar className="h-3 w-3" />
                              {formatDate(sub.publishedAt)}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            {sec && (
                              <span className="inline-block px-2 py-1 border border-slate-300 rounded-md text-xs font-bold text-slate-700">
                                {sec.symbol}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3 min-w-[140px]">
                            <div className="text-xs font-bold text-slate-900">{org?.shortName}</div>
                            <div className="text-[11px] text-slate-400">{industryLabel(org, lang)}</div>
                          </td>
                          <td className="px-3 py-3 min-w-[260px]">
                            <button
                              onClick={() => org && setSelectedOrg(org)}
                              className="text-left text-xs font-semibold text-slate-800 hover:text-hnx-700"
                            >
                              {lang === 'vi' ? sub.titleVi : sub.titleEn || sub.titleVi}
                            </button>
                            {isHot && (
                              <span className="ml-2 align-middle px-1.5 py-0.5 bg-red-600 text-white text-[9px] font-extrabold uppercase rounded-sm">
                                Hot
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => org && setSelectedOrg(org)}
                                title="Xem chi tiết doanh nghiệp"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-hnx-700 hover:bg-hnx-50 border border-slate-200"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() =>
                                  alert(`Tải file văn bản công bố chính thức: ${sub.submissionNo}.pdf`)
                                }
                                title="Tải PDF"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-hnx-700 hover:bg-hnx-50 border border-slate-200"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-3 text-xs text-slate-500 border-t border-slate-100">
              Tìm thấy <strong>{filteredSubmissions.length}</strong> tin công bố công khai
            </div>
          </div>
        )}
      </div>

      {/* Chân trang */}
      <footer className="bg-hnx-footer text-emerald-100 mt-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
          <div className="space-y-2">
            <img src={hnxLogo} alt="Hanoi Stock Exchange" className="h-7 w-auto" />
            <p className="text-xs text-emerald-200/80 flex items-center gap-1.5">
              <Award className="h-3.5 w-3.5" />
              Corporate Disclosure Portal v2.0 · Powered by VNX Exchange Group
            </p>
            <p className="text-xs text-emerald-200/60">
              2 Phan Chu Trinh, Hoàn Kiếm, Hà Nội · Tel: (024) 3941 8398 · info@hnx.vn
            </p>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-emerald-200/80 shrink-0">
            <span className="cursor-default hover:text-white">Điều khoản sử dụng</span>
            <span className="cursor-default hover:text-white">Chính sách bảo mật</span>
            <span className="cursor-default hover:text-white">Liên hệ hỗ trợ</span>
            <span className="cursor-default hover:text-white">API Documentation</span>
          </div>
        </div>
        <div className="border-t border-emerald-900/60 py-3 text-center text-[11px] text-emerald-300/60">
          © 2026 Hanoi Stock Exchange (HNX) · VNX Group. All rights reserved.
        </div>
      </footer>
    </div>
  );
};
