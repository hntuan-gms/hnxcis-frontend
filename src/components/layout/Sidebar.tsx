/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  LayoutDashboard,
  FileSpreadsheet,
  FileCheck,
  ShieldAlert,
  Sliders,
  Sparkles,
  Users,
  Settings,
  Layers,
  Award,
  AlertTriangle,
  Building,
  CreditCard,
  CalendarDays,
  FileText,
  X,
  Library,
  BookMarked,
  ListChecks,
  Table2,
  Calculator,
  Boxes,
  GitBranch,
  UserPlus,
  ShieldCheck,
  Filter,
  Lock,
  LogOut,
  Building2,
  Scale,
  Gavel,
  ShieldOff,
  Users2,
  PieChart,
  Landmark,
  Scissors,
  SlidersHorizontal,
  Newspaper,
  FileCheck2,
  EyeOff,
  BarChart3,
  ClipboardList,
  ChevronDown,
  ChevronRight,
  Folder,
  Home,
  UserCog,
} from 'lucide-react';

/** Hai chữ cái đầu của tên, cho avatar tròn ở chân sidebar. */
function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Nhóm menu khai báo bằng dữ liệu; `Icon` là component nên viết hoa đầu. */
interface NavItem {
  readonly code: string;
  readonly label: string;
  readonly Icon: React.ComponentType<{ className?: string }>;
}
import { UserAccount, UserRoleCode } from '../../types/hnx';
import { IMS_USE_CASES } from '../../lib/imsRoutes';

const CATALOG_USE_CASES = IMS_USE_CASES.filter((uc) => uc.group === 'catalog');
const DOSSIER_USE_CASES = IMS_USE_CASES.filter((uc) => uc.group === 'dossier');
const HOME_USE_CASE = IMS_USE_CASES.find((uc) => uc.group === 'home');
const ACCOUNT_USE_CASES = IMS_USE_CASES.filter((uc) => uc.group === 'account');
import { getRoleLabel } from '../../data/roleCatalog';
import hnxLogo from '../../assets/hnx-logo.png';

/**
 * Menu cũ của cổng IMS — tạm ẩn, không xoá.
 *
 * Giai đoạn này sidebar /ims chỉ hiển thị các chức năng đã có SRS trong
 * `docs/srs/`. Toàn bộ khối menu dựng theo PRD trước đây (Dashboard, P.QLNY,
 * P.TTTP, P.TTTT, Metadata, Access...) cùng các màn hình phía sau vẫn còn nguyên
 * trong repo; bật lại cờ này là menu cũ hiện lại đầy đủ. Xoá hẳn sẽ làm mất
 * đường vào hàng chục màn hình đã dựng xong mà chưa có gì thay thế.
 *
 * KHÔNG ảnh hưởng /icds và /hnxcns: hai cổng đó có nhánh render riêng phía trên.
 */
const SHOW_LEGACY_IMS_NAV = false;

/**
 * Menu khối quản trị metadata. Khai báo dạng dữ liệu thay vì tám khối JSX lặp
 * nhau: tám mục này chỉ khác nhau ở mã, nhãn và icon, nên viết tay tám lần chỉ
 * tạo thêm tám chỗ để lệch class khi sửa giao diện.
 *
 * Mã phải giữ tiền tố `meta_` — App.tsx định tuyến theo tiền tố này.
 */
const METADATA_NAV = [
  { code: 'meta_catalogs', label: 'Danh mục dùng chung (FR-045)', Icon: Library },
  { code: 'meta_dictionary', label: 'Từ điển dữ liệu (FR-052)', Icon: BookMarked },
  { code: 'meta_holidays', label: 'Ngày nghỉ & làm bù (FR-053)', Icon: CalendarDays },
  { code: 'meta_fields', label: 'Khai báo trường CBTT (FR-046)', Icon: ListChecks },
  { code: 'meta_template_fields', label: 'Trường trong mẫu (FR-048)', Icon: Table2 },
  { code: 'meta_fs_templates', label: 'Mẫu báo cáo tài chính (FR-049)', Icon: Calculator },
  { code: 'meta_datastruct', label: 'Cấu trúc dữ liệu (FR-050,051)', Icon: Boxes },
  { code: 'meta_workflows', label: 'Khai báo Workflow (FR-054)', Icon: GitBranch },
] as const;

/** Giám sát & xử lý trạng thái niêm yết — P.QLNY. */
const SURVEILLANCE_NAV = [
  { code: 'surv_status_cases', label: 'Thẩm định & Xử lý trạng thái (FR-004,005,009,012,013)', Icon: Scale },
  { code: 'surv_violations', label: 'Vi phạm giao dịch (FR-007)', Icon: Gavel },
  { code: 'surv_margin', label: 'Danh sách KKQ (FR-014,015)', Icon: ShieldOff },
] as const;

/** Nhà đầu tư & sở hữu chứng khoán — dùng chung Niêm yết và Trái phiếu. */
const OWNERSHIP_NAV = [
  { code: 'own_investors', label: 'Nhà đầu tư & NCLQ (FR-026)', Icon: Users2 },
  { code: 'own_holdings', label: 'Sở hữu chứng khoán (FR-003)', Icon: PieChart },
] as const;

/** Trái phiếu — phần bổ sung ngoài FR-020/021 đã có ở BondModule. */
const BOND_EXTRA_NAV = [
  { code: 'bond_listed', label: 'Trái phiếu niêm yết (FR-002)', Icon: Landmark },
  { code: 'bond_cancel', label: 'Hủy ĐKGD trái phiếu (FR-022)', Icon: Scissors },
  { code: 'bond_adjust', label: 'Điều chỉnh số lượng ĐKGD (FR-024)', Icon: SlidersHorizontal },
] as const;

/** Công bố thông tin — phần bổ sung ngoài FR-039/041/042 đã có ở DisclosureModule. */
const CBTT_NAV = [
  { code: 'cbtt_types', label: 'Các loại CBTT (FR-033→038)', Icon: Newspaper },
  { code: 'cbtt_report_approval', label: 'Phê duyệt báo cáo (FR-040)', Icon: FileCheck2 },
  { code: 'cbtt_control', label: 'Kiểm soát Corp News (FR-016)', Icon: EyeOff },
] as const;

/** Báo cáo khai thác và khảo sát. */
const REPORT_NAV = [
  { code: 'report_qlny', label: 'Báo cáo P.Niêm yết (FR-019)', Icon: BarChart3 },
  { code: 'report_tttp', label: 'Báo cáo P.Trái phiếu (FR-025)', Icon: BarChart3 },
  { code: 'survey_defs', label: 'Khai báo khảo sát (FR-028)', Icon: ClipboardList },
  { code: 'survey_results', label: 'Kết quả khảo sát (FR-029)', Icon: PieChart },
] as const;

/** Khối tài khoản – phân quyền – bảo mật. Tiền tố `access_` do App.tsx định tuyến. */
const ACCESS_NAV = [
  { code: 'access_requests', label: 'Đăng ký tài khoản (FR-055)', Icon: UserPlus },
  { code: 'access_permissions', label: 'Phân quyền chức năng (FR-057)', Icon: ShieldCheck },
  { code: 'access_datascope', label: 'Phân quyền dữ liệu (FR-058,044)', Icon: Filter },
  { code: 'access_security', label: 'Bảo mật & Đăng nhập (FR-059,060)', Icon: Lock },
  { code: 'access_orgs', label: 'Hồ sơ tổ chức (FR-061)', Icon: Building2 },
] as const;

interface SidebarProps {
  activeModule: string;
  setActiveModule: (module: string) => void;
  userRole: UserRoleCode;
  activePortal: 'internal' | 'corporate' | 'public';
  /** Drawer trên mobile: dưới md sidebar không nằm trong luồng trang. */
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  /**
   * Người đang đăng nhập — chỉ dùng cho card ở chân sidebar /ims. Không truyền ở
   * /icds: cổng đó vào tự do, không có phiên đăng nhập nào để hiển thị.
   */
  currentUser?: UserAccount;
  /** Đăng xuất khỏi /ims; nút chỉ hiện khi có hàm này. */
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeModule,
  setActiveModule,
  userRole,
  activePortal,
  mobileOpen = false,
  onCloseMobile,
  currentUser,
  onLogout,
}) => {
  /**
   * Nhóm "Quản lý Danh mục" mở sẵn — đó là toàn bộ nội dung menu /ims hiện tại,
   * mở sẵn để người dùng không phải bấm thêm một lần mới thấy chức năng nào.
   *
   * Hook phải đứng trước nhánh `return null` bên dưới: sidebar bị bỏ render ở
   * cổng public, nếu khai báo state sau đó thì số hook sẽ lệch khi đổi cổng.
   */
  const [catalogOpen, setCatalogOpen] = useState(true);
  const [dossierOpen, setDossierOpen] = useState(true);

  if (activePortal === 'public') {
    return null;
  }

  /**
   * Chọn menu xong thì đóng drawer, nếu không người dùng mobile phải tự đóng mới
   * thấy được nội dung vừa chọn.
   */
  const pickModule = (moduleCode: string) => {
    setActiveModule(moduleCode);
    onCloseMobile?.();
  };

  /**
   * Dưới md: drawer trượt từ trái, có lớp phủ. Từ md trở lên: cột tĩnh như cũ.
   * Trước đây sidebar để `hidden md:block` nên trên điện thoại không có menu
   * module nào — lãnh đạo P.TTTT không thể vào hàng đợi duyệt tin bằng điện thoại.
   */
  /**
   * Nen sidebar tach theo cong.
   *
   * /ims lay NGUYEN VEN `.sidebar` cua `docs/quan-ly-danh-muc_2.html`:
   *
   *     background: linear-gradient(90deg,#003F27 0%,#00663D 30%,#009F5F 60%,#22AF73 100%);
   *     background-size: 220% 100%;
   *
   * HAI DONG PHAI DI CUNG NHAU. Gradient la 90deg — chay NGANG tu trai sang
   * phai, khong phai doc tu tren xuong. Va `background-size:220%` keo dai mau
   * rong 2,2 lan be ngang sidebar, nen tren 260px chi hien ra 1/2,2 = 45,45%
   * dau cua ramp: tu #003F27, qua #00663D (o ~66% be ngang cot menu), dung lai
   * quanh #00834E o canh phai. Diem #009F5F va #22AF73 KHONG BAO GIO duoc ve.
   *
   * Do la ly do dai mau trong file mau vua co do sau vua khong bi choi. Bo
   * `background-size` di la lo ca #22AF73 ra — sidebar sang bang mau nut Primary
   * va chu trang bat dau troi. Doi sang mot mau phang thi mat han do sau.
   *
   * KHONG co vien phai: file mau de dai mau tu ket thuc. Canh phai ~#00834E ap
   * vao nen noi dung #EBEBEB da du tach bach.
   *
   * ICDS PHAI giu nguyen `bg-hnx-sidebar` + `text-emerald-100`: `asideSkin` la
   * chuoi dung chung cho ca hai nhanh render, doi thang o day la doi luon mau
   * sidebar cua /icds.
   */
  const asideSkin =
    activePortal === 'internal'
      ? 'bg-[linear-gradient(90deg,#003F27_0%,#00663D_30%,#009F5F_60%,#22AF73_100%)] bg-[length:220%_100%] text-white'
      : 'bg-hnx-sidebar text-emerald-100 border-r border-emerald-900/60';

  const asideClass = [
    `w-64 ${asideSkin} shrink-0`,
    'fixed inset-y-0 left-0 z-50 overflow-y-auto transition-transform duration-200',
    mobileOpen ? 'translate-x-0' : '-translate-x-full',
    'md:static md:translate-x-0 md:z-auto md:overflow-visible',
  ].join(' ');

  /**
   * Sidebar /ims cao hết trang và chia ba tầng: logo (cố định), menu (cuộn), card
   * người dùng (cố định) — đúng `.sidebar` của `docs/quan-ly-danh-muc_2.html`.
   * Vì vậy nó là `flex flex-col` và KHÔNG tự cuộn ở cấp ngoài; phần cuộn nằm ở
   * `<nav>` bên trong, nếu không card ở chân sẽ trôi lên khi menu dài.
   *
   * `asideClass` bên trên giữ nguyên cho /icds — cổng đó vẫn là một cột cuộn
   * thẳng như trước.
   */
  const asideClassInternal = [
    `w-64 ${asideSkin} shrink-0 flex flex-col`,
    'fixed inset-y-0 left-0 z-50 transition-transform duration-200',
    mobileOpen ? 'translate-x-0' : '-translate-x-full',
    'md:sticky md:top-0 md:h-screen md:translate-x-0 md:z-auto',
  ].join(' ');

  const backdrop = mobileOpen ? (
    <div
      onClick={onCloseMobile}
      className="fixed inset-0 bg-slate-900/60 z-40 md:hidden"
      aria-hidden="true"
    />
  ) : null;

  if (activePortal === 'corporate') {
    return (
      <>
      {backdrop}
      <aside className={asideClass}>
        <div className="p-4 border-b border-slate-800 flex items-start justify-between gap-2">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              ICDS — Tiếp nhận Tin Công bố
            </div>
            <div className="text-sm font-bold text-white mt-1">Vinamilk (VNM)</div>
          </div>
          <button
            onClick={onCloseMobile}
            aria-label="Đóng menu"
            className="md:hidden p-1 text-slate-400 hover:text-white shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="p-3 space-y-1.5 text-xs">
          <button
            onClick={() => pickModule('corp_dashboard')}
            className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-sm font-bold tracking-wider text-[11px] uppercase transition-all ${
              activeModule === 'corp_dashboard'
                ? 'bg-indigo-600 text-white font-bold border-l-4 border-white shadow-xs'
                : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Dashboard Nghĩa vụ & Cảnh báo</span>
          </button>

          <button
            onClick={() => pickModule('corp_filing')}
            className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-sm font-bold tracking-wider text-[11px] uppercase transition-all ${
              activeModule === 'corp_filing'
                ? 'bg-indigo-600 text-white font-bold border-l-4 border-white shadow-xs'
                : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Nộp Báo cáo & Hồ sơ (E-Form)</span>
          </button>

          <button
            onClick={() => pickModule('corp_history')}
            className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-sm font-bold tracking-wider text-[11px] uppercase transition-all ${
              activeModule === 'corp_history'
                ? 'bg-indigo-600 text-white font-bold border-l-4 border-white shadow-xs'
                : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <FileCheck className="h-4 w-4" />
            <span>Lịch sử CBTT (Chỉ xem)</span>
          </button>
        </nav>
      </aside>
      </>
    );
  }

  /**
   * Nhóm menu khai báo bằng dữ liệu. Mười ba mục mới đều chỉ khác nhau ở mã,
   * nhãn và icon — dựng bằng JSX lặp tay sẽ tạo mười ba chỗ để lệch class khi
   * sửa giao diện, và đã có sẵn một lần lệch như vậy trong file này trước đây.
   */
  const NavGroup: React.FC<{ title: string; items: readonly NavItem[] }> = ({ title, items }) => (
    <div className="space-y-1">
      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2">{title}</div>
      {items.map(({ code, label, Icon }) => (
        <button
          key={code}
          onClick={() => pickModule(code)}
          className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-sm font-semibold transition-all ${
            activeModule === code
              ? 'bg-indigo-600 text-white font-bold border-l-4 border-white shadow-xs'
              : 'hover:bg-slate-800 text-slate-300'
          }`}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="text-left leading-tight">{label}</span>
        </button>
      ))}
    </div>
  );

  // Internal HNX Portal
  const isSysAdmin = userRole === 'ROLE_SYS_ADMIN' || userRole === 'ROLE_BIZ_ADMIN';
  const isQLNY = userRole.includes('QLNY') || isSysAdmin || userRole === 'ROLE_HNX_EXEC';
  const isTTTP = userRole.includes('TTTP') || isSysAdmin || userRole === 'ROLE_HNX_EXEC';
  const isTTTT = userRole.includes('TTTT') || isSysAdmin || userRole === 'ROLE_HNX_EXEC';

  // P.CNTT vận hành hệ thống, không xử lý nghiệp vụ niêm yết / CBTT. Lãnh đạo
  // P.CNTT xem được màn hình quản trị nhưng ở chế độ chỉ đọc (xem AdminModule).
  const isCNTTManager = userRole === 'ROLE_CNTT_MANAGER';
  const canSeeAdmin = isSysAdmin || isCNTTManager;

  return (
    <>
    {backdrop}
    <aside className={asideClassInternal}>
      {/*
        Logo HNX ở ĐẦU SIDEBAR (nền xanh) thay cho khối chữ "IMS — Cổng Nội bộ
        HNX" trước đây, theo `.sidebar-logo` của file mẫu.

        Dùng `hnx-logo.png` — bản chữ TRẮNG trên nền trong suốt. Trên nền
        gradient xanh của sidebar nó đọc rõ; bản `hnx-logo-dark.png` thì không.
        Ảnh đã mang tên hệ thống song ngữ nên không cần thêm dòng chữ nào.

        CHIỀU CAO KHỐI: `h-16` = 64px, đúng `.sidebar-logo{height:64px}` của file
        mẫu — và PHẢI giữ nguyên con số này. `ImsTopHeader` cũng cao `h-16`, nên
        đường kẻ dưới của khối logo và đường kẻ dưới của thanh trên nằm trên cùng
        một hàng, cắt ngang cả trang thành một nét liền. Đổi thành `py-4` không
        kèm chiều cao cố định là 36 + 32 = 68px, lệch 4px và nét kẻ đó gãy ra.
        Vì vậy logo căn giữa bằng `items-center` chứ không bằng padding dọc.

        CHIỀU CAO LOGO: `h-9` = 36px. Ảnh là 1056×209 (tỉ lệ 5,05:1) nên chiều
        cao quyết định chiều rộng: h-9 → 182px. Sidebar `w-64` trừ `px-5` còn
        216px; dưới md còn thêm nút X (24px) và `gap-2` (8px) cùng hàng, tổng
        182 + 8 + 24 = 214px — vừa đủ. `h-10` (40px → 202px) thì tổng thành 234px,
        TRÀN 18px trên điện thoại và đẩy nút Đóng menu ra ngoài; desktop mới đủ
        chỗ. Nên lấy h-9, mức lớn nhất còn an toàn ở cả hai khổ màn hình.

        Không có `max-h-*` nào trên ảnh này để phải bỏ.
      */}
      <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-white/14 px-5">
        <img
          src={hnxLogo}
          alt="Sở Giao dịch Chứng khoán Hà Nội — Hanoi Stock Exchange"
          className="h-9 w-auto shrink-0"
        />
        <button
          onClick={onCloseMobile}
          aria-label="Đóng menu"
          className="shrink-0 p-1 text-white/70 hover:text-white md:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="min-h-0 flex-1 space-y-6 overflow-y-auto p-3 text-xs">
        {/*
          Trang chủ — đứng riêng ở đầu menu, cùng kiểu chữ với nhãn nhóm nhưng
          bấm được. Là màn mặc định của /ims (widget nhắc tạo tài khoản IMS-018-8).
        */}
        {HOME_USE_CASE && (
          <button
            type="button"
            onClick={() => pickModule(HOME_USE_CASE.code)}
            title={`${HOME_USE_CASE.ucCode} — ${HOME_USE_CASE.label}`}
            className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2.25 text-left text-[13px] font-medium transition-colors duration-[120ms] ease-[ease] ${
              activeModule === HOME_USE_CASE.code
                ? 'bg-white/16 text-white'
                : 'text-white/92 hover:bg-white/8 hover:text-white'
            }`}
          >
            <Home className="h-4 w-4 shrink-0 opacity-90" />
            <span>{HOME_USE_CASE.menuLabel}</span>
          </button>
        )}

        {/*
          Khối chức năng đã có SRS (docs/srs/) — cấu trúc menu lấy theo file mẫu
          docs/quan-ly-danh-muc_2.html: một nhãn nhóm không bấm được ("Quản lý hệ
          thống"), một nhóm con gập/mở ("Quản lý Danh mục"), rồi các mục con thụt
          vào có dấu tròn dẫn.

          Mỗi mục là một URL thật (`/ims/<ma-uc>`); App.tsx đẩy đường dẫn khi
          `activeModule` đổi, nên bấm menu là địa chỉ trên thanh URL đổi theo và
          copy link gửi cho người khác vẫn mở đúng màn hình.
        */}
        <div className="space-y-0.5">
          {/*
            `.nav-group-label` của file mẫu: padding 9px 10px, font-weight 500,
            màu rgba(255,255,255,.92), icon opacity .9, bo góc 8px.
          */}
          <div className="flex select-none items-center gap-2 rounded-lg px-2.5 py-2.25 text-[13px] font-medium text-white/92">
            <Settings className="h-4 w-4 shrink-0 opacity-90" />
            <span>Quản lý hệ thống</span>
            <ChevronDown className="ml-auto h-4 w-4 shrink-0 opacity-90" />
          </div>

          <button
            type="button"
            onClick={() => setCatalogOpen((open) => !open)}
            aria-expanded={catalogOpen}
            /*
              `.nav-group-sub` của file mẫu: chữ rgba(255,255,255,.95), hover là
              lớp phủ trắng 6% — nhạt hơn hover của mục con (8%) một bậc, để nhóm
              cha không nổi hơn thứ mà nó chứa. Dấu tròn và chevron opacity .85.
            */
            className="flex w-full items-center gap-2 rounded-lg py-2 pr-2.5 pl-5 text-[13px] font-medium text-white/95 hover:bg-white/6"
          >
            <span className="h-[5px] w-[5px] shrink-0 rounded-full bg-current opacity-85" />
            <span>Quản lý Danh mục</span>
            {catalogOpen ? (
              <ChevronDown className="ml-auto h-3.5 w-3.5 shrink-0 opacity-85" />
            ) : (
              <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 opacity-85" />
            )}
          </button>

          {catalogOpen && (
            <div className="mt-0.5 mb-2 pl-3.5">
              {CATALOG_USE_CASES.map((uc) => (
                <button
                  key={uc.code}
                  onClick={() => pickModule(uc.code)}
                  /*
                    Nhãn menu là tên danh mục ngắn (`menuLabel`); tên UC đầy đủ và
                    mã UC chuyển hết vào tooltip — vẫn tra được mà không chiếm dòng.
                  */
                  title={`${uc.ucCode} — ${uc.label}`}
                  /*
                    Ba trạng thái lấy nguyên `.nav-item` của file mẫu — KHÔNG
                    thêm gì:

                      .nav-item          color: rgba(255,255,255,.8)
                                         background: transparent
                                         border-radius: 8px
                                         margin: 1px 0
                                         padding: 8px 10px 8px 20px
                                         transition: background .12s ease,
                                                     color .12s ease
                      .nav-item:hover    background: rgba(255,255,255,0.08)
                                         color: #fff
                      .nav-item.active   background: rgba(255,255,255,0.16)
                                         color: #fff
                                         font-weight: 500

                    Nền của cả ba trạng thái là LỚP PHỦ TRẮNG trong suốt, không
                    phải một mã hex riêng: nhờ vậy dải gradient vẫn hiện xuyên
                    qua thẻ, mục đang chọn ở đầu cột và ở cuối cột đều ăn theo
                    đúng đoạn màu dưới nó. Một hex đặc như `#006B38` trước đây
                    thì đè phẳng lên gradient và tự phá mất độ sâu.

                    File mẫu KHÔNG cho `.nav-item` border hay box-shadow nào —
                    ở cả ba trạng thái — nên ở đây cũng không có.
                  */
                  className={`my-px flex w-full items-center gap-2.5 rounded-lg py-2 pr-2.5 pl-5 text-left text-[13px] transition-colors duration-[120ms] ease-[ease] ${
                    activeModule === uc.code
                      ? 'bg-white/16 font-medium text-white'
                      : 'text-white/80 hover:bg-white/8 hover:text-white'
                  }`}
                >
                  {/*
                    Bảy mục này KHÔNG có icon — theo `.nav-item` của file mẫu
                    `docs/quan-ly-danh-muc_2.html`: chỉ dấu tròn dẫn rồi tới chữ.
                    Bảy icon trước đây (địa cầu, bản đồ, ghim...) không nói thêm
                    được gì mà "Quốc gia", "Tỉnh thành" chưa nói, nên chỉ làm cột
                    menu rối thêm.
                  */}
                  <span className="h-[5px] w-[5px] shrink-0 rounded-full bg-current opacity-70" />
                  <span className="leading-tight">{uc.menuLabel}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/*
          Nhóm "Quản lý hồ sơ" — theo `NAV_GROUPS[1]` của
          `docs/quan-ly-danh-muc_80.html`. Chỉ render ở nhánh /ims này; nhánh
          /icds phía trên không có, đúng yêu cầu BA "hồ sơ chỉ ở cổng nội bộ".
          Class của nhãn nhóm, nhóm con và mục con giữ y hệt nhóm Danh mục.
        */}
        {DOSSIER_USE_CASES.length > 0 && (
          <div className="space-y-0.5">
            <div className="flex select-none items-center gap-2 rounded-lg px-2.5 py-2.25 text-[13px] font-medium text-white/92">
              <Folder className="h-4 w-4 shrink-0 opacity-90" />
              <span>Quản lý hồ sơ</span>
              <ChevronDown className="ml-auto h-4 w-4 shrink-0 opacity-90" />
            </div>

            <button
              type="button"
              onClick={() => setDossierOpen((open) => !open)}
              aria-expanded={dossierOpen}
              className="flex w-full items-center gap-2 rounded-lg py-2 pr-2.5 pl-5 text-[13px] font-medium text-white/95 hover:bg-white/6"
            >
              <span className="h-[5px] w-[5px] shrink-0 rounded-full bg-current opacity-85" />
              <span>Hồ sơ</span>
              {dossierOpen ? (
                <ChevronDown className="ml-auto h-3.5 w-3.5 shrink-0 opacity-85" />
              ) : (
                <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 opacity-85" />
              )}
            </button>

            {dossierOpen && (
              <div className="mt-0.5 mb-2 pl-3.5">
                {DOSSIER_USE_CASES.map((uc) => (
                  <button
                    key={uc.code}
                    onClick={() => pickModule(uc.code)}
                    title={`${uc.ucCode} — ${uc.label}`}
                    className={`my-px flex w-full items-center gap-2.5 rounded-lg py-2 pr-2.5 pl-5 text-left text-[13px] transition-colors duration-[120ms] ease-[ease] ${
                      activeModule === uc.code
                        ? 'bg-white/16 font-medium text-white'
                        : 'text-white/80 hover:bg-white/8 hover:text-white'
                    }`}
                  >
                    <span className="h-[5px] w-[5px] shrink-0 rounded-full bg-current opacity-70" />
                    <span className="leading-tight">{uc.menuLabel}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/*
          Nhóm "Quản lý Tài khoản" — Hình 1.1 của `[IMS-018]`: nhãn nhóm có icon
          người dùng, các mục nằm ngay dưới nhãn ở tầng "nhóm con" (dấu tròn,
          thụt `pl-5`), không có tầng gập/mở thứ hai như Danh mục / Hồ sơ.
        */}
        {ACCOUNT_USE_CASES.length > 0 && (
          <div className="space-y-0.5">
            <div className="flex select-none items-center gap-2 rounded-lg px-2.5 py-2.25 text-[13px] font-medium text-white/92">
              <UserCog className="h-4 w-4 shrink-0 opacity-90" />
              <span>Quản lý Tài khoản</span>
              <ChevronDown className="ml-auto h-4 w-4 shrink-0 opacity-90" />
            </div>

            {ACCOUNT_USE_CASES.map((uc) => (
              <button
                key={uc.code}
                onClick={() => pickModule(uc.code)}
                title={`${uc.ucCode} — ${uc.label}`}
                className={`my-px flex w-full items-center gap-2 rounded-lg py-2 pr-2.5 pl-5 text-left text-[13px] transition-colors duration-[120ms] ease-[ease] ${
                  activeModule === uc.code
                    ? 'bg-white/16 font-medium text-white'
                    : 'text-white/80 hover:bg-white/8 hover:text-white'
                }`}
              >
                <span className="h-[5px] w-[5px] shrink-0 rounded-full bg-current opacity-85" />
                <span className="leading-tight">{uc.menuLabel}</span>
              </button>
            ))}
          </div>
        )}

        {SHOW_LEGACY_IMS_NAV && (
          <>
        {/* General Overview */}
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2">
            Tổng quan & Khai thác
          </div>

          <button
            onClick={() => pickModule('dashboard')}
            className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-sm font-semibold tracking-wide transition-all ${
              activeModule === 'dashboard'
                ? 'bg-indigo-600 text-white font-bold border-l-4 border-white shadow-xs'
                : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Dashboard Tuân thủ & SLA</span>
          </button>

          <button
            onClick={() => pickModule('ai_center')}
            className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-sm font-semibold tracking-wide transition-all ${
              activeModule === 'ai_center'
                ? 'bg-purple-600 text-white font-bold border-l-4 border-white shadow-xs'
                : 'hover:bg-slate-800 text-purple-300'
            }`}
          >
            <Sparkles className="h-4 w-4 text-purple-400" />
            <span>Trung tâm AI (4 Tính năng)</span>
          </button>
        </div>

        {/* P.QLNY */}
        {isQLNY && (
          <div className="space-y-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2">
              Quản lý Niêm yết (P.QLNY)
            </div>

            <button
              onClick={() => pickModule('qlny_equities')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-sm font-semibold transition-all ${
                activeModule === 'qlny_equities'
                  ? 'bg-indigo-600 text-white font-bold border-l-4 border-white shadow-xs'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <Building className="h-4 w-4" />
              <span>Hồ sơ Cổ phiếu (FR-001)</span>
            </button>

            <button
              onClick={() => pickModule('qlny_dossiers')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-sm font-semibold transition-all ${
                activeModule === 'qlny_dossiers'
                  ? 'bg-indigo-600 text-white font-bold border-l-4 border-white shadow-xs'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>Hồ sơ ĐKGD &amp; Mẫu 01–06 (FR-006)</span>
            </button>

            <button
              onClick={() => pickModule('qlny_status_control')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-sm font-semibold transition-all ${
                activeModule === 'qlny_status_control'
                  ? 'bg-indigo-600 text-white font-bold border-l-4 border-white shadow-xs'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span>Kiểm soát Trạng thái (Đ40-44)</span>
            </button>

            <button
              onClick={() => pickModule('qlny_delisting')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-sm font-semibold transition-all ${
                activeModule === 'qlny_delisting'
                  ? 'bg-indigo-600 text-white font-bold border-l-4 border-white shadow-xs'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <ShieldAlert className="h-4 w-4 text-rose-400" />
              <span>Hủy Niêm yết (FR-010,011)</span>
            </button>

            <button
              onClick={() => pickModule('qlny_fees')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-sm font-semibold transition-all ${
                activeModule === 'qlny_fees'
                  ? 'bg-indigo-600 text-white font-bold border-l-4 border-white shadow-xs'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <CreditCard className="h-4 w-4" />
              <span>Quản lý Phí (FR-017)</span>
            </button>

            <button
              onClick={() => pickModule('qlny_corp_actions')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-sm font-semibold transition-all ${
                activeModule === 'qlny_corp_actions'
                  ? 'bg-indigo-600 text-white font-bold border-l-4 border-white shadow-xs'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <CalendarDays className="h-4 w-4" />
              <span>Sự kiện DN & Sổ T+2 (FR-018)</span>
            </button>
          </div>
        )}

        {/* P.TTTP */}
        {isTTTP && (
          <div className="space-y-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2">
              Thị trường Trái phiếu (P.TTTP)
            </div>

            <button
              onClick={() => pickModule('tttp_bonds')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-sm font-semibold transition-all ${
                activeModule === 'tttp_bonds'
                  ? 'bg-indigo-600 text-white font-bold border-l-4 border-white shadow-xs'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <Layers className="h-4 w-4" />
              <span>Trái phiếu Riêng lẻ (FR-020)</span>
            </button>

            <button
              onClick={() => pickModule('tttp_green_bonds')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-sm font-semibold transition-all ${
                activeModule === 'tttp_green_bonds'
                  ? 'bg-emerald-600 text-white font-bold border-l-4 border-white shadow-xs'
                  : 'hover:bg-slate-800 text-emerald-300'
              }`}
            >
              <Award className="h-4 w-4 text-emerald-400" />
              <span>Trái phiếu Xanh (FR-021)</span>
            </button>
          </div>
        )}

        {/* P.TTTT */}
        {isTTTT && (
          <div className="space-y-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2">
              Công bố Thông tin (P.TTTT)
            </div>

            <button
              onClick={() => pickModule('tttt_inbox')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-sm font-semibold transition-all ${
                activeModule === 'tttt_inbox'
                  ? 'bg-indigo-600 text-white font-bold border-l-4 border-white shadow-xs'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>Hàng đợi Phê duyệt (FR-039)</span>
            </button>

            <button
              onClick={() => pickModule('tttt_violations')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-sm font-semibold transition-all ${
                activeModule === 'tttt_violations'
                  ? 'bg-indigo-600 text-white font-bold border-l-4 border-white shadow-xs'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <AlertTriangle className="h-4 w-4 text-rose-400" />
              <span>Vi phạm CBTT (FR-041)</span>
            </button>

            <button
              onClick={() => pickModule('tttt_display_config')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-sm font-semibold transition-all ${
                activeModule === 'tttt_display_config'
                  ? 'bg-indigo-600 text-white font-bold border-l-4 border-white shadow-xs'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <Sliders className="h-4 w-4" />
              <span>Cấu hình Hiển thị (FR-042)</span>
            </button>
          </div>
        )}

        {isQLNY && <NavGroup title="Giám sát & Xử lý trạng thái" items={SURVEILLANCE_NAV} />}

        {(isQLNY || isTTTP) && <NavGroup title="Nhà đầu tư & Sở hữu" items={OWNERSHIP_NAV} />}

        {isTTTP && <NavGroup title="Trái phiếu (bổ sung)" items={BOND_EXTRA_NAV} />}

        {isTTTT && <NavGroup title="Công bố thông tin (bổ sung)" items={CBTT_NAV} />}

        {(isQLNY || isTTTP || isTTTT) && <NavGroup title="Báo cáo & Khảo sát" items={REPORT_NAV} />}

        {/* Admin */}
        {canSeeAdmin && (
          <div className="space-y-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2">
              {isCNTTManager ? 'Quản trị Hệ thống (Chỉ đọc)' : 'Quản trị Hệ thống (Admin)'}
            </div>

            <button
              onClick={() => pickModule('admin_system')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-sm font-semibold transition-all ${
                activeModule === 'admin_system'
                  ? 'bg-indigo-600 text-white font-bold border-l-4 border-white shadow-xs'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>Form / Rule Builder</span>
            </button>

            <button
              onClick={() => pickModule('admin_templates')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-sm font-semibold transition-all ${
                activeModule === 'admin_templates'
                  ? 'bg-indigo-600 text-white font-bold border-l-4 border-white shadow-xs'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Cấu hình Mẫu báo cáo (FR-047)</span>
            </button>

            <button
              onClick={() => pickModule('admin_users')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-sm font-semibold transition-all ${
                activeModule === 'admin_users'
                  ? 'bg-indigo-600 text-white font-bold border-l-4 border-white shadow-xs'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Tài khoản & Phân quyền ABAC</span>
            </button>
          </div>
        )}

        {/*
          Quản trị Metadata — tầng 0-1 của bản đồ phụ thuộc PRD §3.4.
          Tách khỏi nhóm "Quản trị Hệ thống" ở trên vì đây là cấu hình nghiệp vụ
          (danh mục, trường, mẫu, quy trình), không phải vận hành hệ thống. Toàn bộ
          nghiệp vụ phía sau chỉ chạy đúng khi khối này được khai báo trước.
        */}
        {canSeeAdmin && (
          <div className="space-y-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2">
              Quản trị Metadata
            </div>

            {METADATA_NAV.map(({ code, label, Icon }) => (
              <button
                key={code}
                onClick={() => pickModule(code)}
                className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-sm font-semibold transition-all ${
                  activeModule === code
                    ? 'bg-indigo-600 text-white font-bold border-l-4 border-white shadow-xs'
                    : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="text-left leading-tight">{label}</span>
              </button>
            ))}
          </div>
        )}

        {canSeeAdmin && (
          <div className="space-y-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2">
              Tài khoản &amp; Bảo mật
            </div>

            {ACCESS_NAV.map(({ code, label, Icon }) => (
              <button
                key={code}
                onClick={() => pickModule(code)}
                className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-sm font-semibold transition-all ${
                  activeModule === code
                    ? 'bg-indigo-600 text-white font-bold border-l-4 border-white shadow-xs'
                    : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="text-left leading-tight">{label}</span>
              </button>
            ))}
          </div>
        )}
          </>
        )}
      </nav>

      {/*
        Card người dùng ở chân sidebar — `.sidebar-footer` của file mẫu.

        Đây cũng là chỗ duy nhất còn nút Đăng xuất: thanh trên đã bỏ khối danh
        tính, và để hai chỗ cùng làm một việc thì chỉ tạo thêm chỗ để lệch nhau.
      */}
      {currentUser && (
        <div className="flex shrink-0 items-center gap-2.5 border-t border-white/14 px-4 py-3.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-semibold text-white">
            {initialsOf(currentUser.fullName)}
          </div>

          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-[12.5px] font-medium text-white">
              {currentUser.fullName}
            </div>
            {/*
              Dòng phụ là EMAIL, không phải tên vai trò: card này để người dùng
              nhận ra mình đang đăng nhập bằng tài khoản nào — vai trò đã lộ ra qua
              chính các mục menu đang thấy. Tài khoản mock có thể chưa có email nên
              rơi về nhãn vai trò.
            */}
            <div className="truncate text-[11px] text-white/70">
              {currentUser.email || getRoleLabel(currentUser.roleCode)}
            </div>
          </div>

          {onLogout && (
            <button
              onClick={onLogout}
              aria-label="Đăng xuất"
              title="Đăng xuất khỏi cổng nội bộ"
              className="shrink-0 rounded-md p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </aside>
    </>
  );
};

