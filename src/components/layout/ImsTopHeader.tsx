/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, KeyRound, Menu, Search } from 'lucide-react';

import { NotificationItem, UserAccount } from '../../types/hnx';
import { IMS_USE_CASES } from '../../lib/imsRoutes';

/**
 * Thanh trên của cổng nội bộ /ims — nền trắng, gọn, theo `.header` của
 * `docs/quan-ly-danh-muc_2.html`: ô tìm kiếm toàn cục bên trái, chuông thông báo
 * và avatar bên phải.
 *
 * VÌ SAO KHÔNG DÙNG `Header.tsx`
 *
 * `Header.tsx` là thanh banner chạy hết chiều ngang trang, đặt TRÊN cả sidebar,
 * và mang logo + tên cổng ("IMS — Cổng Nội bộ HNX"). Bố cục của file mẫu khác
 * hẳn: sidebar cao hết trang, logo nằm ở đầu sidebar, còn thanh trên chỉ chiếm
 * phần bên phải sidebar. Nhồi cả hai kiểu vào một component sẽ thành một mớ
 * điều kiện. `Header.tsx` giờ chỉ còn phục vụ /icds và /hnxcns.
 *
 * Danh tính người dùng nằm ở CHÂN SIDEBAR (xem `Sidebar.tsx`), nên ở đây chỉ có
 * avatar — bấm vào là hiện tên đầy đủ qua tooltip, không mở dropdown đổi persona.
 *
 * Góc phải CHỈ có chuông thông báo và avatar, đúng `.header-right` của file mẫu.
 * Không có nút chuyển ngôn ngữ — xem ghi chú tại chỗ ở phần render.
 */

interface ImsTopHeaderProps {
  currentUser: UserAccount;
  notifications: NotificationItem[];
  /** Mở drawer sidebar trên mobile. */
  onOpenMenu: () => void;
  /** Nhảy tới một chức năng từ ô tìm kiếm toàn cục. */
  onNavigate: (moduleCode: string) => void;
  /** Mở popup "Đổi mật khẩu" (IMS-018-6.2) — mục duy nhất của menu cá nhân. */
  onChangePassword?: () => void;
}

/** Hai chữ cái đầu của tên, dùng cho avatar tròn. */
function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const ImsTopHeader: React.FC<ImsTopHeaderProps> = ({
  currentUser,
  notifications,
  onOpenMenu,
  onNavigate,
  onChangePassword,
}) => {
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const unreadCount = (notifications || []).filter((n) => !n.readAt).length;

  /**
   * ⌘K / Ctrl+K đưa con trỏ vào ô tìm kiếm.
   *
   * `preventDefault` là bắt buộc: trên Chrome/Windows Ctrl+K là lệnh nhảy vào
   * thanh địa chỉ của trình duyệt, không chặn thì phím tắt in trên nút sẽ không
   * làm gì cả.
   */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
        setShowResults(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /** Bấm ra ngoài thì đóng hai dropdown của thanh này. */
  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (searchBoxRef.current && !searchBoxRef.current.contains(target)) setShowResults(false);
      if (bellRef.current && !bellRef.current.contains(target)) setShowNotifs(false);
      if (profileRef.current && !profileRef.current.contains(target)) setShowProfile(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  /**
   * Ô tìm kiếm toàn cục tra trong danh mục chức năng đã khai báo
   * (`lib/imsRoutes.ts`) — nhãn và mã UC.
   *
   * Chỉ tìm CHỨC NĂNG, không tìm dữ liệu nghiệp vụ: tìm xuyên bản ghi cần một
   * endpoint tìm kiếm ở backend, mà giai đoạn này chưa có. Để ô này chỉ trang trí
   * thì tệ hơn — người dùng gõ vào rồi không thấy gì xảy ra.
   */
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return IMS_USE_CASES;
    return IMS_USE_CASES.filter(
      (uc) => uc.label.toLowerCase().includes(q) || uc.ucCode.toLowerCase().includes(q),
    );
  }, [query]);

  const pick = (moduleCode: string) => {
    onNavigate(moduleCode);
    setQuery('');
    setShowResults(false);
    searchRef.current?.blur();
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <button
          onClick={onOpenMenu}
          aria-label="Mở menu chức năng"
          className="-ml-2 rounded-md p-2 text-[#525252] hover:bg-slate-100 hover:text-[#292929] md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Ô tìm kiếm toàn cục — `.global-search` ở file mẫu. */}
        <div ref={searchBoxRef} className="relative w-full max-w-80">
          <div className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-[#F9FAFB] pr-2 pl-3">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowResults(true);
              }}
              onFocus={() => setShowResults(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && matches.length > 0) pick(matches[0].code);
                if (e.key === 'Escape') setShowResults(false);
              }}
              placeholder="Tìm kiếm..."
              aria-label="Tìm kiếm chức năng"
              className="min-w-0 flex-1 border-none bg-transparent text-[13px] text-[#292929] outline-none placeholder:text-slate-400"
            />
            <span className="shrink-0 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-400">
              ⌘K
            </span>
          </div>

          {showResults && (
            <div className="absolute top-full left-0 z-50 mt-1.5 w-full min-w-75 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
              <div className="px-3 pt-2.5 pb-1 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                Chức năng
              </div>

              {matches.length === 0 ? (
                <div className="px-3 py-3 text-[13px] text-slate-500">
                  Không có chức năng nào khớp “{query}”
                </div>
              ) : (
                <div className="max-h-75 overflow-y-auto pb-1.5">
                  {matches.map((uc) => (
                    <button
                      key={uc.code}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pick(uc.code)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[13px] text-[#292929] hover:bg-slate-50"
                    >
                      <span className="truncate">{uc.label}</span>
                      <span className="shrink-0 font-mono text-[10px] text-slate-400">
                        {uc.ucCode}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/*
        `.header-right{display:flex; align-items:center; gap:16px}` của file mẫu —
        ĐÚNG HAI phần tử: chuông thông báo và avatar.

        Nút chuyển ngôn ngữ VI/EN đã bỏ hẳn. Nó không có trong thiết kế, và ở /ims
        nó cũng chẳng đổi được gì: không màn hình nào trong cổng nội bộ đọc `lang`
        (đã rà toàn bộ `src/components/modules/`). Chức năng dịch VI→EN thật của hệ
        thống nằm ở luồng CBTT (`onSaveTranslation` / `onPublishBilingual` trong
        `DisclosureModule`), không liên quan tới cờ này. Hai cổng /icds và /hnxcns
        VẪN dùng `lang` nên state ở `App.tsx` giữ nguyên.
      */}
      <div className="flex shrink-0 items-center gap-4">
        <div ref={bellRef} className="relative">
          <button
            onClick={() => setShowNotifs((v) => !v)}
            aria-label="Thông báo"
            title="Thông báo & Cảnh báo"
            className="relative inline-flex h-8.5 w-8.5 items-center justify-center rounded-full text-[#525252] hover:bg-slate-100"
          >
            <Bell className="h-4.5 w-4.5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 h-1.75 w-1.75 rounded-full border-[1.5px] border-white bg-[#802423]" />
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-2xl sm:w-96">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <span className="text-[13px] font-semibold text-[#292929]">
                  Thông báo &amp; Cảnh báo
                </span>
                <span className="rounded-full bg-[#E6F4EA] px-2 py-0.5 text-[10px] font-bold text-[#1E7A42]">
                  {unreadCount} mới
                </span>
              </div>

              <div className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">Không có thông báo mới</div>
                ) : (
                  notifications.map((n) => {
                    const isHighPriority =
                      n.priority === 'HIGH' ||
                      n.subject.includes('CẢNH BÁO') ||
                      n.subject.includes('HẠN NỘP') ||
                      n.subject.includes('QUÁ HẠN');

                    return (
                      <div
                        key={n.id}
                        className={`space-y-1 p-3 text-xs transition-colors ${
                          isHighPriority
                            ? 'border-l-4 border-l-[#802423] bg-[#802423]/5 hover:bg-[#802423]/10'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 font-semibold">
                          <div className="flex items-center gap-1.5">
                            {isHighPriority && (
                              <span className="shrink-0 rounded-sm bg-[#802423] px-1.5 py-0.5 text-[9px] font-extrabold text-white uppercase">
                                GẤP
                              </span>
                            )}
                            <span className={isHighPriority ? 'text-[#802423]' : 'text-[#292929]'}>
                              {n.subject}
                            </span>
                          </div>
                          <span className="shrink-0 font-mono text-[10px] text-slate-400">
                            {new Date(n.createdAt).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                        <p className="line-clamp-2 text-[11px] text-[#525252]">{n.body}</p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/*
          Avatar — `.header-avatar` ở file mẫu: viên tròn nền gradient thương hiệu.

          Bấm vào mở "profile cá nhân" thu gọn — nơi SRS [IMS-018] §2.6 đặt nút
          "Đổi mật khẩu" (Màn hình 6.2). Không có Đăng xuất ở đây: nút đó đã nằm
          ở card chân sidebar, hai chỗ cùng làm một việc chỉ thêm chỗ lệch nhau.
        */}
        <div ref={profileRef} className="relative">
          <button
            type="button"
            onClick={() => setShowProfile((v) => !v)}
            title={currentUser.fullName}
            aria-label={`Tài khoản: ${currentUser.fullName}`}
            aria-haspopup="menu"
            aria-expanded={showProfile}
            className="flex h-8.5 w-8.5 items-center justify-center rounded-full bg-[linear-gradient(90deg,#003F27_0%,#00663D_33%,#009F5F_66%,#22AF73_100%)] text-[12.5px] font-semibold text-white"
          >
            {initialsOf(currentUser.fullName)}
          </button>

          {showProfile && (
            <div role="menu" className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
              <div className="border-b border-slate-200 px-4 py-3">
                <div className="truncate text-[13px] font-semibold text-[#292929]">{currentUser.fullName}</div>
                <div className="truncate text-xs text-slate-500">{currentUser.username}</div>
              </div>
              {onChangePassword && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setShowProfile(false);
                    onChangePassword();
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px] text-[#292929] hover:bg-slate-50"
                >
                  <KeyRound className="h-4 w-4 text-slate-500" />
                  Đổi mật khẩu
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
