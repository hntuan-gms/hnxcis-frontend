/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

import { DEFAULT_IMS_MODULE } from '../../../lib/imsRoutes';
import { HnxSrsChucVuView } from './HnxSrsChucVuView';
import { Ims002QuocGiaView } from './Ims002QuocGiaView';
import { Ims003TinhThanhView } from './Ims003TinhThanhView';
import { Ims004XaPhuongView } from './Ims004XaPhuongView';
import { Ims006PhongBanView } from './Ims006PhongBanView';
import { Ims008LoaiHinhDnView } from './Ims008LoaiHinhDnView';
import { Ims015TuDienView } from './Ims015TuDienView';
import { Fr053NgayNghiView } from './Fr053NgayNghiView';

/**
 * Bảng tra mã module → view, cho khối chức năng `uc_*` của cổng IMS.
 *
 * Tách khỏi `App.tsx` để thêm một chức năng mới chỉ phải sửa hai file cạnh nhau
 * (`imsRoutes.ts` khai báo route, file này khai báo view) thay vì chèn thêm một
 * nhánh `activeModule === ...` vào giữa hàng trăm dòng của App.tsx.
 */
const VIEWS: Record<string, React.ComponentType> = {
  uc_ims_002: Ims002QuocGiaView,
  uc_ims_003: Ims003TinhThanhView,
  uc_ims_004: Ims004XaPhuongView,
  uc_ims_006: Ims006PhongBanView,
  uc_hnx_srs: HnxSrsChucVuView,
  uc_ims_008: Ims008LoaiHinhDnView,
  uc_ims_015: Ims015TuDienView,
  uc_fr_053: Fr053NgayNghiView,
};

interface UseCaseRouterProps {
  activeModule: string;
}

/**
 * Mã lạ rơi về màn hình mặc định thay vì render trắng — người dùng gõ sai URL
 * vẫn thấy một trang dùng được.
 */
export const UseCaseRouter: React.FC<UseCaseRouterProps> = ({ activeModule }) => {
  const View = VIEWS[activeModule] ?? VIEWS[DEFAULT_IMS_MODULE];
  return <View />;
};
