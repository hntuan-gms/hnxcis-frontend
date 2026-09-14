/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Đăng ký các chức năng có SRS của cổng IMS.
 *
 * Đây là NGUỒN SỰ THẬT DUY NHẤT cho ba thứ vốn rất dễ lệch nhau nếu khai báo
 * tách rời: nhãn hiển thị trên sidebar, đường dẫn URL (`/ims/<slug>`), và mã
 * module mà `App.tsx` dùng để chọn màn hình. Thêm một chức năng mới chỉ cần
 * thêm một dòng ở đây rồi khai báo view tương ứng trong
 * `src/components/modules/usecases/index.tsx`.
 *
 * Mã module giữ tiền tố `uc_` — `App.tsx` định tuyến theo tiền tố này, đúng quy
 * ước sẵn có của các khối `qlny_`, `tttp_`, `meta_`...
 *
 * CHỈ áp dụng cho /ims. Hai cổng /icds và /hnxcns không dùng file này.
 */
export interface ImsUseCaseRoute {
  /** Mã module nội bộ, tiền tố `uc_`. */
  readonly code: string;
  /** Đoạn đường dẫn sau /ims — lấy từ Mã UC viết thường. */
  readonly slug: string;
  /** Mã UC trong tài liệu SRS. */
  readonly ucCode: string;
  /**
   * Tên UC đầy đủ theo tài liệu SRS.
   *
   * Dùng cho tooltip và cho ô tìm kiếm toàn cục — gõ "quản lý danh mục" vẫn ra
   * đúng chức năng. KHÔNG dùng làm nhãn menu: xem `menuLabel`.
   */
  readonly label: string;
  /**
   * Nhãn hiển thị trên menu sidebar — tên danh mục, ngắn.
   *
   * Tách khỏi `label` vì hai chỗ cần hai độ dài khác nhau: menu chỉ rộng 256px và
   * đã nằm dưới nhóm "Quản lý Danh mục", nên bảy dòng cùng mở đầu bằng "Quản lý
   * danh mục ..." chỉ làm người đọc phải quét tới cuối dòng mới phân biệt được.
   * Lấy đúng `navLabel` của file mẫu `docs/quan-ly-danh-muc_2.html`.
   */
  readonly menuLabel: string;
}

export const IMS_USE_CASES: readonly ImsUseCaseRoute[] = [
  {
    code: 'uc_ims_002',
    slug: 'ims-002',
    ucCode: 'IMS-002',
    label: 'Quản lý danh mục Quốc gia',
    menuLabel: 'Quốc gia',
  },
  {
    code: 'uc_ims_003',
    slug: 'ims-003',
    ucCode: 'IMS-003',
    label: 'Quản lý danh mục Tỉnh thành',
    menuLabel: 'Tỉnh thành',
  },
  {
    code: 'uc_ims_004',
    slug: 'ims-004',
    ucCode: 'IMS-004',
    label: 'Quản lý danh mục Xã phường',
    menuLabel: 'Phường / Xã',
  },
  {
    code: 'uc_ims_006',
    slug: 'ims-006',
    ucCode: 'IMS-006',
    label: 'Quản lý danh mục Phòng ban',
    menuLabel: 'Phòng ban',
  },
  {
    code: 'uc_hnx_srs',
    slug: 'hnx-srs',
    ucCode: 'HNX-SRS',
    label: 'Quản lý Chức vụ',
    menuLabel: 'Chức vụ',
  },
  {
    code: 'uc_ims_008',
    slug: 'ims-008',
    ucCode: 'IMS-008',
    label: 'Quản lý danh mục Loại hình doanh nghiệp',
    menuLabel: 'Loại hình doanh nghiệp',
  },
  {
    code: 'uc_ims_015',
    slug: 'ims-015',
    ucCode: 'IMS-015',
    label: 'Quản lý, khai báo dữ liệu từ điển',
    menuLabel: 'Từ điển',
  },
  /**
   * KHÔNG có tài liệu `docs/srs/[CODE] ...` cho chức năng này — `ucCode` trỏ tới
   * `docs/prd/fr/FR-053.md` thay vì thư mục `docs/srs/` như sáu mục còn lại. Xem
   * đầu file `Fr053NgayNghiView.tsx` để rõ vì sao vẫn đăng ký ở đây được.
   */
  {
    code: 'uc_fr_053',
    slug: 'fr-053',
    ucCode: 'FR-053',
    label: 'Quản lý khai báo thông tin ngày nghỉ',
    menuLabel: 'Ngày nghỉ',
  },
] as const;

/** Màn hình mặc định khi vào thẳng `/ims` — mục đầu tiên của menu. */
export const DEFAULT_IMS_MODULE = IMS_USE_CASES[0].code;

/** Mọi mã module thuộc khối chức năng có SRS đều mang tiền tố này. */
export const IMS_USE_CASE_PREFIX = 'uc_';

export function isImsUseCaseModule(moduleCode: string): boolean {
  return moduleCode.startsWith(IMS_USE_CASE_PREFIX);
}

export function findImsUseCaseByCode(moduleCode: string): ImsUseCaseRoute | undefined {
  return IMS_USE_CASES.find((uc) => uc.code === moduleCode);
}

/**
 * Đọc mã module từ đường dẫn. Trả về `null` khi đường dẫn không phải một chức
 * năng đã khai báo — người gọi tự quyết định rơi về đâu, vì `/ims` (không có
 * slug) là hợp lệ chứ không phải lỗi.
 */
export function imsModuleFromPath(pathname: string): string | null {
  const parts = pathname.replace(/\/+$/, '').toLowerCase().split('/');
  if (parts[1] !== 'ims') return null;
  const slug = parts[2];
  if (!slug) return null;
  return IMS_USE_CASES.find((uc) => uc.slug === slug)?.code ?? null;
}

/**
 * Đường dẫn tương ứng một mã module. Module không thuộc khối SRS (dashboard,
 * qlny_*, meta_*...) không có URL riêng nên rơi về `/ims` — điều hướng trong
 * các khối đó vẫn chạy bằng state như trước.
 */
export function imsPathForModule(moduleCode: string): string {
  const uc = findImsUseCaseByCode(moduleCode);
  return uc ? `/ims/${uc.slug}` : '/ims';
}
