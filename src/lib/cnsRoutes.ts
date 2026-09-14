/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Đăng ký các mục tin của cổng Corporate News (/hnxcns).
 *
 * Sáu mục trong "Danh sách Công bố Thông tin" trước đây chỉ là state trong
 * `PublicCorporateNews.tsx`: đổi mục không đổi URL, nên không gửi link thẳng tới
 * một mục được và nút Back cũng không quay lại mục vừa xem. File này cho mỗi mục
 * một đường dẫn thật `/hnxcns/<slug>` theo đúng cách `imsRoutes.ts` làm với các
 * chức năng có SRS của /ims.
 *
 * Đây là NGUỒN SỰ THẬT DUY NHẤT cho ba thứ dễ lệch nhau nếu khai báo tách rời:
 * nhãn hiển thị trên thanh mục, đường dẫn URL, và khoá `key` mà component dùng
 * để chọn bộ lọc tin. Thêm một mục mới chỉ cần thêm một dòng ở đây rồi khai báo
 * hàm lọc tương ứng trong `PublicCorporateNews.tsx`.
 *
 * CHỈ áp dụng cho /hnxcns. Hai cổng /ims và /icds không dùng file này.
 */
export interface CnsNewsRoute {
  /** Khoá nội bộ của mục tin, dùng làm `activeTab` trong component. */
  readonly key: string;
  /** Đoạn đường dẫn sau /hnxcns — lấy từ Mã UC viết thường. */
  readonly slug: string;
  /** Mã UC trong tài liệu nghiệp vụ. */
  readonly ucCode: string;
  /** Nhãn hiển thị trên thanh mục. */
  readonly label: string;
}

/** Thứ tự ở đây cũng là thứ tự hiển thị trên thanh mục. */
export const CNS_NEWS_ROUTES: readonly CnsNewsRoute[] = [
  { key: 'today', slug: 'cns-010', ucCode: 'CNS-010', label: 'Tin trong ngày' },
  { key: 'fs', slug: 'cns-011', ucCode: 'CNS-011', label: 'Báo cáo tài chính' },
  { key: 'dividend', slug: 'cns-012', ucCode: 'CNS-012', label: 'Trả cổ tức' },
  { key: 'agm', slug: 'cns-013', ucCode: 'CNS-013', label: 'Đại hội cổ đông' },
  { key: 'bond_issue', slug: 'cns-014', ucCode: 'CNS-014', label: 'Phát hành trái phiếu' },
  { key: 'bond_payment', slug: 'cns-015', ucCode: 'CNS-015', label: 'Thanh toán trái phiếu' },
] as const;

/** Mục mặc định khi vào thẳng `/hnxcns` — mục đầu tiên của thanh mục. */
export const DEFAULT_CNS_TAB = CNS_NEWS_ROUTES[0].key;

export function findCnsRouteByKey(key: string): CnsNewsRoute | undefined {
  return CNS_NEWS_ROUTES.find((route) => route.key === key);
}

/**
 * Đọc khoá mục tin từ đường dẫn. Trả về `null` khi đường dẫn không phải một mục
 * đã khai báo — người gọi tự quyết định rơi về đâu, vì `/hnxcns` (không có slug)
 * là hợp lệ chứ không phải lỗi.
 */
export function cnsTabFromPath(pathname: string): string | null {
  const parts = pathname.replace(/\/+$/, '').toLowerCase().split('/');
  if (parts[1] !== 'hnxcns') return null;
  const slug = parts[2];
  if (!slug) return null;
  return CNS_NEWS_ROUTES.find((route) => route.slug === slug)?.key ?? null;
}

/** Đường dẫn tương ứng một mục tin; khoá lạ rơi về `/hnxcns`. */
export function cnsPathForTab(key: string): string {
  const route = findCnsRouteByKey(key);
  return route ? `/hnxcns/${route.slug}` : '/hnxcns';
}
