/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useSyncExternalStore } from 'react';

import { INITIAL_RELATED_ORGS, RelatedOrgRow } from './relatedOrgMock';

/**
 * Danh sách Tổ chức liên quan dùng chung giữa các màn.
 *
 * Trước đây `HsToChucLienQuanView` tự giữ `useState`. Tách ra vì [IMS-018] cần
 * đọc và ghi cùng dữ liệu này: phê duyệt đăng ký chuyên trang có Loại tổ chức =
 * "Tổ chức liên quan" phải lưu hồ sơ vào đây ở trạng thái "Lưu tạm" (Bảng 07
 * mục 5), và widget Trang chủ phải đếm được tổ chức nào chưa có tài khoản.
 *
 * Giữ nguyên chữ ký `[rows, setRows]` của `useState` để màn cũ đổi đúng một dòng.
 */

let rows: RelatedOrgRow[] = [...INITIAL_RELATED_ORGS];
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setRelatedOrgRows(update: (prev: RelatedOrgRow[]) => RelatedOrgRow[]) {
  rows = update(rows);
  listeners.forEach((l) => l());
}

export function getRelatedOrgRows(): readonly RelatedOrgRow[] {
  return rows;
}

export function useRelatedOrgRows(): [RelatedOrgRow[], typeof setRelatedOrgRows] {
  return [useSyncExternalStore(subscribe, () => rows), setRelatedOrgRows];
}
