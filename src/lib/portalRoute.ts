/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';

import { cnsTabFromPath } from './cnsRoutes';
import { imsModuleFromPath } from './imsRoutes';

/**
 * Định tuyến ba cổng theo đường dẫn URL.
 *
 * Ba cổng là ba địa chỉ riêng, không phải ba tab của một trang:
 *
 *   /ims      IMS  — cổng nội bộ HNX, BẮT BUỘC đăng nhập bằng tài khoản HNX
 *   /icds     ICDS — cổng doanh nghiệp, BẮT BUỘC đăng nhập bằng tài khoản ORGANIZATION
 *   /hnxcns   Corporate News — trang tin, BẮT BUỘC đăng nhập bằng tài khoản PUBLIC
 *
 * VÌ SAO TỰ VIẾT THAY VÌ DÙNG react-router
 *
 * Ứng dụng chỉ có ba đường dẫn ở cấp cao nhất; điều hướng bên trong IMS vẫn chạy
 * bằng state `activeModule` với hàng chục màn hình. Kéo react-router vào chỉ để
 * phục vụ ba đường dẫn sẽ buộc phải tái cấu trúc toàn bộ phần điều hướng module
 * đang hoạt động tốt, đổi lấy một dependency mới. Ba mươi dòng dưới đây làm đúng
 * phần cần làm: đọc path, đổi path, và nghe nút Back của trình duyệt.
 *
 * nginx đã có sẵn SPA fallback (`try_files $uri $uri/ /index.html`) nên gõ thẳng
 * /icds vào thanh địa chỉ trên production vẫn trả về ứng dụng.
 */

export type Portal = 'internal' | 'corporate' | 'public';

export const PORTAL_PATH: Record<Portal, string> = {
  internal: '/ims',
  corporate: '/icds',
  public: '/hnxcns',
};

export const PORTAL_LABEL: Record<Portal, string> = {
  internal: 'IMS · Cổng Nội bộ',
  corporate: 'ICDS · Cổng Doanh nghiệp',
  public: 'Corporate News',
};

/** Cả ba cổng đều yêu cầu đăng nhập, mỗi cổng chỉ nhận đúng nhóm tài khoản của mình. */
export const REQUIRES_AUTH: Record<Portal, boolean> = {
  internal: true,
  corporate: true,
  public: true,
};

/** Nhóm tài khoản (`ActorType`) được phép đăng nhập ở mỗi cổng. */
export const PORTAL_ACTOR_TYPE: Record<Portal, 'HNX' | 'ORGANIZATION' | 'PUBLIC'> = {
  internal: 'HNX',
  corporate: 'ORGANIZATION',
  public: 'PUBLIC',
};

/**
 * Đường dẫn lạ hoặc `/` đều rơi về trang tin công khai — đó là mặt tiền công
 * cộng của hệ thống, và là nơi an toàn nhất để đưa một khách chưa xác định vào.
 */
export function portalFromPath(pathname: string): Portal {
  const p = pathname.replace(/\/+$/, '').toLowerCase();
  if (p === '/ims' || p.startsWith('/ims/')) return 'internal';
  if (p === '/icds' || p.startsWith('/icds/')) return 'corporate';
  return 'public';
}

export function usePortalRoute(): { portal: Portal; goToPortal: (next: Portal) => void } {
  const [portal, setPortal] = useState<Portal>(() =>
    portalFromPath(typeof window === 'undefined' ? '/hnxcns' : window.location.pathname),
  );

  useEffect(() => {
    const onPop = () => setPortal(portalFromPath(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  /**
   * Chuẩn hoá `/` và các đường dẫn lạ thành đường dẫn thật, dùng replaceState để
   * không tạo thêm một mục trong lịch sử duyệt — bấm Back từ /hnxcns sẽ quay về
   * trang trước đó chứ không kẹt lại ở chính /hnxcns.
   *
   * Ngoại lệ: `/ims/<ma-uc>` là đường dẫn thật của một chức năng IMS (xem
   * `imsRoutes.ts`) và `/hnxcns/<ma-uc>` là đường dẫn thật của một mục tin (xem
   * `cnsRoutes.ts`), không phải đường dẫn lạ — giữ nguyên, nếu không mọi deep
   * link tới màn hình danh mục hay mục tin sẽ bị đẩy về đường dẫn gốc của cổng
   * ngay khi tải trang.
   */
  useEffect(() => {
    if (imsModuleFromPath(window.location.pathname)) return;
    if (cnsTabFromPath(window.location.pathname)) return;

    const expected = PORTAL_PATH[portalFromPath(window.location.pathname)];
    if (window.location.pathname !== expected) {
      window.history.replaceState({}, '', expected + window.location.search);
    }
  }, []);

  const goToPortal = useCallback((next: Portal) => {
    window.history.pushState({}, '', PORTAL_PATH[next]);
    setPortal(next);
  }, []);

  return { portal, goToPortal };
}
