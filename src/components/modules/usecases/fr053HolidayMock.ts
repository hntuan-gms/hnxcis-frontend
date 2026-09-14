/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CatalogRecord } from './catalogTypes';

/**
 * Dữ liệu mẫu cho FR-053 · Quản lý khai báo thông tin ngày nghỉ
 * (`docs/prd/fr/FR-053.md`).
 *
 * KHÔNG có tài liệu `docs/srs/[CODE] ...` riêng cho chức năng này — khác với sáu
 * màn hình danh mục còn lại. Cơ sở là FR-053 (mục đích, tính năng, acceptance
 * criteria) cộng với `docs/quan-ly-danh-muc_16.html` (bố cục, các trường nhập).
 * FR-053 nói rõ đây là dữ liệu nguồn của `BusinessCalendarService`
 * (`src/services/businessCalendar.ts`, mục 6.2.5 của PRD) — bảy dòng mẫu dưới
 * đây lấy đúng bộ ngày nghỉ 2026 đã seed sẵn ở đó (`HOLIDAYS_2026`), viết lại
 * dưới dạng bản ghi có thể Thêm/Sửa/Xóa thay vì hằng số tĩnh.
 */
export interface HolidayRow extends CatalogRecord {
  /** Phân loại ngày nghỉ — một trong `HOLIDAY_CATEGORIES`. */
  category: string;
  /** Từ ngày (YYYY-MM-DD). FR-053 AC-053-1: phải ≤ `toDate`. */
  fromDate: string;
  /** Đến ngày (YYYY-MM-DD). */
  toDate: string;
  /**
   * Lịch làm bù (YYYY-MM-DD), không bắt buộc — FR-053 AC-053-2: khai ngày làm bù
   * thứ 7 thì `BusinessCalendarService.isWorkingDay()` phải trả `true` cho ngày đó.
   */
  makeupDate: string | null;
}

/** Bảy phân loại của file mẫu — dùng cho cả ô lọc và popup Thêm/Sửa. */
export const HOLIDAY_CATEGORIES: readonly string[] = [
  'Tết dương lịch',
  'Tết nguyên đán',
  'Giỗ tổ Hùng Vương',
  'Ngày Giải phóng miền Nam',
  'Ngày Quốc tế lao động',
  'Quốc khánh',
  'Nghỉ cuối tuần',
];

export const INITIAL_HOLIDAYS: readonly HolidayRow[] = [
  {
    id: 1,
    category: 'Tết dương lịch',
    fromDate: '2026-01-01',
    toDate: '2026-01-01',
    makeupDate: null,
    statusFlg: 1,
    activeFlg: 1,
    deleteFlg: 0,
    createdBy: 'admin',
    createdDate: '2025-11-03T09:00:00+07:00',
  },
  {
    id: 2,
    category: 'Tết nguyên đán',
    fromDate: '2026-02-14',
    toDate: '2026-02-20',
    makeupDate: '2026-02-07',
    statusFlg: 1,
    activeFlg: 1,
    deleteFlg: 0,
    createdBy: 'admin',
    createdDate: '2025-11-03T09:02:00+07:00',
  },
  {
    id: 3,
    category: 'Giỗ tổ Hùng Vương',
    fromDate: '2026-04-25',
    toDate: '2026-04-25',
    makeupDate: null,
    statusFlg: 1,
    activeFlg: 1,
    deleteFlg: 0,
    createdBy: 'admin',
    createdDate: '2025-11-03T09:03:00+07:00',
  },
  {
    id: 4,
    category: 'Ngày Giải phóng miền Nam',
    fromDate: '2026-04-30',
    toDate: '2026-04-30',
    makeupDate: null,
    statusFlg: 1,
    activeFlg: 1,
    deleteFlg: 0,
    createdBy: 'admin',
    createdDate: '2025-11-03T09:04:00+07:00',
  },
  {
    id: 5,
    category: 'Ngày Quốc tế lao động',
    fromDate: '2026-05-01',
    toDate: '2026-05-01',
    makeupDate: null,
    statusFlg: 1,
    activeFlg: 1,
    deleteFlg: 0,
    createdBy: 'admin',
    createdDate: '2025-11-03T09:05:00+07:00',
  },
  {
    id: 6,
    category: 'Quốc khánh',
    fromDate: '2026-09-02',
    toDate: '2026-09-03',
    makeupDate: '2026-08-29',
    statusFlg: 1,
    activeFlg: 1,
    deleteFlg: 0,
    createdBy: 'admin',
    createdDate: '2025-11-03T09:06:00+07:00',
  },
  {
    id: 7,
    category: 'Nghỉ cuối tuần',
    fromDate: '2025-12-27',
    toDate: '2025-12-28',
    makeupDate: null,
    statusFlg: 0,
    activeFlg: 0,
    deleteFlg: 0,
    createdBy: 'admin',
    createdDate: '2025-10-20T08:30:00+07:00',
    updatedBy: 'nqt.hnx',
    updatedDate: '2025-11-10T15:12:00+07:00',
  },
];
