/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CatalogRecord, Flag } from './catalogTypes';

/**
 * Tổ chức liên quan (TCĐT, BL, ĐLPH) — nhóm "Quản lý hồ sơ" của /ims.
 *
 * KHÔNG có SRS/FR riêng: dựng theo `MODULES.tochuclienquan` +
 * `RELATED_ORG_FIELDS` của `docs/quan-ly-danh-muc_80.html`.
 *
 * `statusFlg` gánh "Tình trạng hoạt động" (1 = Bình thường, 0 = Ngừng hoạt
 * động) để bộ lọc trạng thái dùng chung của `CatalogToolbar` lọc đúng nghĩa.
 * "Trạng thái" hồ sơ (Lưu tạm / Bình thường) là khái niệm khác nên giữ ở
 * `recordStatus`.
 */
export interface RelatedOrgRow extends CatalogRecord {
  name: string;
  orgType: string;
  shortName: string;
  custodyCode: string;
  tradingCode: string;
  domesticForeign: string;
  dossierType: string;
  recordStatus: string;
  relatedOrgType: string;
  businessField: string;
  startDate: string;
  charterCapital: number | null;
  initialLicenseNo: string;
  initialLicenseDate: string;
  initialLicensePlace: string;
  initialBizRegNo: string;
  initialBizRegDate: string;
  initialBizRegPlace: string;
  latestLicenseNo: string;
  latestLicenseDate: string;
  latestLicensePlace: string;
  latestBizRegNo: string;
  latestBizRegDate: string;
  latestBizRegPlace: string;
  address: string;
  email: string;
  phone: string;
  fax: string;
  legalRepName: string;
  legalRepPhone: string;
  legalRepEmail: string;
  cbttName: string;
  cbttPhone: string;
  cbttEmail: string;
}

/** Các trường người dùng nhập — mọi thứ trừ khung `CatalogRecord`. */
export type RelatedOrgDraft = Omit<RelatedOrgRow, keyof CatalogRecord> & { statusFlg: Flag };

export type RelatedOrgFieldKey = keyof RelatedOrgDraft;

export const ORG_TYPE_OPTIONS: readonly string[] = [
  'Tổ chức đấu thầu',
  'Tổ chức bảo lãnh phát hành',
  'Đại lý phát hành',
  'Công ty chứng khoán',
  'Ngân hàng lưu ký',
  'Tổ chức kiểm toán',
  'Khác',
];
export const DOMESTIC_OPTIONS: readonly string[] = ['Trong nước', 'Nước ngoài'];
export const DOSSIER_TYPE_OPTIONS: readonly string[] = ['Hồ sơ đầy đủ', 'Hồ sơ tạm thời', 'Khác'];
export const RECORD_STATUS_OPTIONS: readonly string[] = ['Lưu tạm', 'Bình thường'];

export interface RelatedOrgField {
  readonly key: RelatedOrgFieldKey;
  readonly label: string;
  readonly kind?: 'text' | 'select' | 'date' | 'money' | 'operating';
  readonly options?: readonly string[];
  readonly required?: boolean;
  readonly placeholder?: string;
  readonly span2?: boolean;
}

export interface RelatedOrgSection {
  readonly title: string;
  readonly fields: readonly RelatedOrgField[];
}

/** Thứ tự và nhóm trường lấy nguyên `RELATED_ORG_FIELDS` của file mẫu. */
export const RELATED_ORG_SECTIONS: readonly RelatedOrgSection[] = [
  {
    title: 'Định danh tổ chức',
    fields: [
      { key: 'name', label: 'Tên TCĐT, BL, ĐLPH', required: true, span2: true, placeholder: 'VD: Công ty Cổ phần Chứng khoán AIS' },
      { key: 'orgType', label: 'Loại tổ chức', kind: 'select', options: ORG_TYPE_OPTIONS, required: true },
      { key: 'shortName', label: 'Tên viết tắt', placeholder: 'VD: AIS' },
      { key: 'custodyCode', label: 'Mã lưu ký', placeholder: 'VD: 118' },
      { key: 'tradingCode', label: 'Mã giao dịch', placeholder: 'VD: 118' },
      { key: 'domesticForeign', label: 'Trong nước/ Nước ngoài', kind: 'select', options: DOMESTIC_OPTIONS },
      { key: 'dossierType', label: 'Loại hồ sơ', kind: 'select', options: DOSSIER_TYPE_OPTIONS },
      { key: 'recordStatus', label: 'Trạng thái', kind: 'select', options: RECORD_STATUS_OPTIONS },
    ],
  },
  {
    title: 'Thông tin hoạt động',
    fields: [
      { key: 'relatedOrgType', label: 'Loại TCLK', placeholder: 'VD: Công ty chứng khoán trong nước' },
      { key: 'businessField', label: 'Lĩnh vực hoạt động' },
      { key: 'startDate', label: 'Ngày bắt đầu hoạt động', kind: 'date' },
      { key: 'statusFlg', label: 'Tình trạng hoạt động', kind: 'operating' },
      { key: 'charterCapital', label: 'Số vốn điều lệ', kind: 'money' },
    ],
  },
  {
    title: 'Giấy phép cấp lần đầu',
    fields: [
      { key: 'initialLicenseNo', label: 'GPTL và hoạt động - Số' },
      { key: 'initialLicenseDate', label: 'GPTL và hoạt động - Ngày cấp', kind: 'date' },
      { key: 'initialLicensePlace', label: 'GPTL và hoạt động - Nơi cấp' },
      { key: 'initialBizRegNo', label: 'Chứng nhận ĐKKD - Số' },
      { key: 'initialBizRegDate', label: 'Chứng nhận ĐKKD - Ngày cấp', kind: 'date' },
      { key: 'initialBizRegPlace', label: 'Chứng nhận ĐKKD - Nơi cấp' },
    ],
  },
  {
    title: 'Giấy phép điều chỉnh lần gần nhất',
    fields: [
      { key: 'latestLicenseNo', label: 'GPTL và hoạt động - Số' },
      { key: 'latestLicenseDate', label: 'GPTL và hoạt động - Ngày cấp', kind: 'date' },
      { key: 'latestLicensePlace', label: 'GPTL và hoạt động - Nơi cấp' },
      { key: 'latestBizRegNo', label: 'Chứng nhận ĐKKD - Số' },
      { key: 'latestBizRegDate', label: 'Chứng nhận ĐKKD - Ngày cấp', kind: 'date' },
      { key: 'latestBizRegPlace', label: 'Chứng nhận ĐKKD - Nơi cấp' },
    ],
  },
  {
    title: 'Thông tin liên hệ',
    fields: [
      { key: 'address', label: 'Địa chỉ trụ sở', span2: true, placeholder: 'Địa chỉ trụ sở chính' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Số điện thoại' },
      { key: 'fax', label: 'Fax' },
    ],
  },
  {
    title: 'Người đại diện & Công bố thông tin',
    fields: [
      { key: 'legalRepName', label: 'Người đại diện theo pháp luật - Tên' },
      { key: 'legalRepPhone', label: 'Người đại diện theo pháp luật - Điện thoại' },
      { key: 'legalRepEmail', label: 'Người đại diện theo pháp luật - Email' },
      { key: 'cbttName', label: 'Người được ủy quyền CBTT - Tên' },
      { key: 'cbttPhone', label: 'Người được ủy quyền CBTT - Điện thoại' },
      { key: 'cbttEmail', label: 'Người được ủy quyền CBTT - Email' },
    ],
  },
];

export const EMPTY_DRAFT: RelatedOrgDraft = {
  name: '', orgType: '', shortName: '', custodyCode: '', tradingCode: '',
  domesticForeign: '', dossierType: '', recordStatus: 'Lưu tạm',
  relatedOrgType: '', businessField: '', startDate: '', statusFlg: 1, charterCapital: null,
  initialLicenseNo: '', initialLicenseDate: '', initialLicensePlace: '',
  initialBizRegNo: '', initialBizRegDate: '', initialBizRegPlace: '',
  latestLicenseNo: '', latestLicenseDate: '', latestLicensePlace: '',
  latestBizRegNo: '', latestBizRegDate: '', latestBizRegPlace: '',
  address: '', email: '', phone: '', fax: '',
  legalRepName: '', legalRepPhone: '', legalRepEmail: '',
  cbttName: '', cbttPhone: '', cbttEmail: '',
};

let seedId = 0;
function seed(
  partial: Partial<RelatedOrgDraft> & Pick<RelatedOrgDraft, 'name' | 'orgType'>,
  audit: { createdDate: string; updatedDate: string },
): RelatedOrgRow {
  seedId += 1;
  return {
    ...EMPTY_DRAFT,
    recordStatus: 'Bình thường',
    dossierType: 'Hồ sơ đầy đủ',
    ...partial,
    id: seedId,
    activeFlg: 1,
    deleteFlg: 0,
    createdBy: 'Admin',
    createdDate: audit.createdDate,
    updatedBy: 'Admin',
    updatedDate: audit.updatedDate,
  };
}

/** 11 dòng mẫu của `relatedOrgs` trong file mẫu v80. */
export const INITIAL_RELATED_ORGS: readonly RelatedOrgRow[] = [
  seed(
    {
      name: 'Công ty Cổ phần Chứng khoán AIS', orgType: 'Tổ chức đấu thầu', shortName: 'AIS',
      custodyCode: '118', tradingCode: '118', domesticForeign: 'Trong nước',
      relatedOrgType: 'Công ty chứng khoán trong nước', businessField: 'Đấu thầu, môi giới trái phiếu Chính phủ',
      startDate: '2025-01-01', charterCapital: 500000000000,
      initialLicenseNo: '34324', initialLicenseDate: '2021-08-31', initialLicensePlace: 'Ủy ban Chứng khoán Nhà nước',
      initialBizRegNo: '0106324234', initialBizRegDate: '2021-08-31', initialBizRegPlace: 'Sở Kế hoạch và Đầu tư TP. Hà Nội',
      latestLicenseNo: '12/GPĐC-UBCK', latestLicenseDate: '2024-03-10', latestLicensePlace: 'Ủy ban Chứng khoán Nhà nước',
      latestBizRegNo: '0106324234', latestBizRegDate: '2024-03-10', latestBizRegPlace: 'Sở Kế hoạch và Đầu tư TP. Hà Nội',
      address: 'Tầng 10, tòa nhà Horison Tower, số 40 Cát Linh, phường Cát Linh, quận Đống Đa, thành phố Hà Nội',
      email: 'info@ais.com.vn', phone: '024 3823 5566', fax: '024 3823 5567',
      legalRepName: 'Nguyễn Văn An', legalRepPhone: '0903 123 456', legalRepEmail: 'an.nv@ais.com.vn',
      cbttName: 'Trần Thị Bích', cbttPhone: '0903 654 321', cbttEmail: 'cbtt@ais.com.vn',
    },
    { createdDate: '2021-09-01', updatedDate: '2023-04-15' },
  ),
  seed(
    {
      name: 'Công ty Cổ phần Chứng khoán VNDIRECT', orgType: 'Công ty chứng khoán', shortName: 'VNDIRECT',
      custodyCode: '001', tradingCode: '001', domesticForeign: 'Trong nước',
      relatedOrgType: 'Công ty chứng khoán trong nước', businessField: 'Môi giới, tự doanh chứng khoán',
      startDate: '2006-11-07', charterCapital: 15220000000000,
      initialLicenseNo: '01/GPHĐKD', initialLicenseDate: '2006-11-07', initialLicensePlace: 'UBCKNN',
      address: 'Tầng 1,3,4, Toà nhà Times Tower, 35 Lê Văn Lương, Thanh Xuân, Hà Nội', phone: '024 7300 8888',
    },
    { createdDate: '2021-09-01', updatedDate: '2024-02-10' },
  ),
  seed(
    {
      name: 'Công ty Cổ phần Chứng khoán VPS', orgType: 'Công ty chứng khoán', shortName: 'VPS',
      custodyCode: '077', tradingCode: '077', domesticForeign: 'Trong nước',
      relatedOrgType: 'Công ty chứng khoán trong nước', businessField: 'Môi giới, tự doanh chứng khoán',
      startDate: '2006-12-08', charterCapital: 8911000000000,
      initialLicenseNo: '69/UBCK-GP', initialLicenseDate: '2006-12-08', initialLicensePlace: 'Ủy ban Chứng khoán Nhà nước',
      initialBizRegNo: '0101438371', initialBizRegDate: '2006-12-08', initialBizRegPlace: 'Sở Kế hoạch và Đầu tư TP. Hà Nội',
      latestLicenseNo: '45/GPĐC-UBCK', latestLicenseDate: '2023-06-15', latestLicensePlace: 'Ủy ban Chứng khoán Nhà nước',
      latestBizRegNo: '0101438371', latestBizRegDate: '2023-06-15', latestBizRegPlace: 'Sở Kế hoạch và Đầu tư TP. Hà Nội',
      address: 'Tầng 6, Tòa nhà Ngọc Khánh Plaza, 1 Phạm Huy Thông, Ba Đình, Hà Nội',
      email: 'contact@vps.com.vn', phone: '024 3934 3888', fax: '024 3934 3889',
      legalRepName: 'Nguyễn Lâm Dũng', legalRepPhone: '0904 111 222', legalRepEmail: 'dung.nl@vps.com.vn',
      cbttName: 'Phạm Thu Hà', cbttPhone: '0904 222 333', cbttEmail: 'cbtt@vps.com.vn',
    },
    { createdDate: '2021-09-01', updatedDate: '2023-11-20' },
  ),
  seed(
    {
      name: 'Công ty Cổ phần Chứng khoán Kỹ Thương (TCBS)', orgType: 'Công ty chứng khoán', shortName: 'TCBS',
      custodyCode: '073', tradingCode: '073', domesticForeign: 'Trong nước',
      relatedOrgType: 'Công ty chứng khoán trong nước', businessField: 'Bảo lãnh phát hành, môi giới trái phiếu',
      startDate: '2008-04-02', charterCapital: 1123000000000,
      initialLicenseNo: '19/UBCK-GP', initialLicenseDate: '2008-04-02', initialLicensePlace: 'Ủy ban Chứng khoán Nhà nước',
      initialBizRegNo: '0301537687', initialBizRegDate: '2008-04-02', initialBizRegPlace: 'Sở Kế hoạch và Đầu tư TP.HCM',
      latestLicenseNo: '28/GPĐC-UBCK', latestLicenseDate: '2024-01-20', latestLicensePlace: 'Ủy ban Chứng khoán Nhà nước',
      latestBizRegNo: '0301537687', latestBizRegDate: '2024-01-20', latestBizRegPlace: 'Sở Kế hoạch và Đầu tư TP.HCM',
      address: 'Tầng 14, Tòa nhà Vincom Center, 72 Lê Thánh Tôn, Quận 1, TP.HCM',
      email: 'info@tcbs.com.vn', phone: '028 3823 4159', fax: '028 3823 4160',
      legalRepName: 'Nguyễn Xuân Minh', legalRepPhone: '0905 333 444', legalRepEmail: 'minh.nx@tcbs.com.vn',
      cbttName: 'Lê Ngọc Anh', cbttPhone: '0905 444 555', cbttEmail: 'cbtt@tcbs.com.vn',
    },
    { createdDate: '2021-09-01', updatedDate: '2024-06-05' },
  ),
  seed(
    {
      name: 'Công ty Cổ phần Chứng khoán MB (MBS)', orgType: 'Tổ chức bảo lãnh phát hành', shortName: 'MBS',
      custodyCode: '094', tradingCode: '094', domesticForeign: 'Trong nước',
      relatedOrgType: 'Công ty chứng khoán trong nước', businessField: 'Bảo lãnh phát hành trái phiếu',
      startDate: '2000-05-11', charterCapital: 5261000000000,
      initialLicenseNo: '07/UBCK-GP', initialLicenseDate: '2000-05-11', initialLicensePlace: 'Ủy ban Chứng khoán Nhà nước',
      initialBizRegNo: '0100112193', initialBizRegDate: '2000-05-11', initialBizRegPlace: 'Sở Kế hoạch và Đầu tư TP. Hà Nội',
      latestLicenseNo: '33/GPĐC-UBCK', latestLicenseDate: '2023-09-01', latestLicensePlace: 'Ủy ban Chứng khoán Nhà nước',
      latestBizRegNo: '0100112193', latestBizRegDate: '2023-09-01', latestBizRegPlace: 'Sở Kế hoạch và Đầu tư TP. Hà Nội',
      address: 'Tòa nhà MB, số 3 Liễu Giai, Ba Đình, Hà Nội',
      email: 'info@mbs.com.vn', phone: '024 7304 5688', fax: '024 7304 5689',
      legalRepName: 'Trần Hải Hà', legalRepPhone: '0906 555 666', legalRepEmail: 'ha.th@mbs.com.vn',
      cbttName: 'Đỗ Minh Trang', cbttPhone: '0906 666 777', cbttEmail: 'cbtt@mbs.com.vn',
    },
    { createdDate: '2021-09-01', updatedDate: '2023-08-14' },
  ),
  seed(
    {
      name: 'Công ty Cổ phần Chứng khoán Ngân hàng Đầu tư và Phát triển Việt Nam (BSC)',
      orgType: 'Tổ chức bảo lãnh phát hành', shortName: 'BSC',
      custodyCode: '022', tradingCode: '022', domesticForeign: 'Trong nước',
      relatedOrgType: 'Công ty chứng khoán trong nước', businessField: 'Bảo lãnh phát hành trái phiếu',
      startDate: '1999-11-26', charterCapital: 1478000000000,
      address: 'Tầng 10, Tháp BIDV, 35 Hàng Vôi, Hoàn Kiếm, Hà Nội', phone: '024 3934 3305',
    },
    { createdDate: '2021-09-01', updatedDate: '2022-12-01' },
  ),
  seed(
    {
      name: 'Công ty TNHH Chứng khoán Mirae Asset (Việt Nam)', orgType: 'Công ty chứng khoán', shortName: 'Mirae Asset',
      custodyCode: '066', tradingCode: '066', domesticForeign: 'Nước ngoài',
      relatedOrgType: 'Công ty chứng khoán vốn nước ngoài', businessField: 'Môi giới, tự doanh chứng khoán',
      startDate: '2007-08-01', charterCapital: 6987000000000,
      address: 'Tầng 8, Tòa nhà Saigon Trade Center, 37 Tôn Đức Thắng, Quận 1, TP.HCM', phone: '028 3911 7488',
    },
    { createdDate: '2021-09-01', updatedDate: '2023-05-19' },
  ),
  seed(
    {
      name: 'Ngân hàng TNHH MTV Standard Chartered (Việt Nam)', orgType: 'Ngân hàng lưu ký',
      shortName: 'Standard Chartered VN', custodyCode: '050', domesticForeign: 'Nước ngoài',
      relatedOrgType: 'Ngân hàng lưu ký nước ngoài', businessField: 'Lưu ký, thanh toán chứng khoán',
      startDate: '2009-08-01', charterCapital: 4215000000000,
      initialLicenseNo: '236/GP-NHNN', initialLicenseDate: '2009-08-01', initialLicensePlace: 'Ngân hàng Nhà nước Việt Nam',
      initialBizRegNo: '0304758228', initialBizRegDate: '2009-08-01', initialBizRegPlace: 'Sở Kế hoạch và Đầu tư TP.HCM',
      latestLicenseNo: '58/GPĐC-NHNN', latestLicenseDate: '2022-11-05', latestLicensePlace: 'Ngân hàng Nhà nước Việt Nam',
      latestBizRegNo: '0304758228', latestBizRegDate: '2022-11-05', latestBizRegPlace: 'Sở Kế hoạch và Đầu tư TP.HCM',
      address: 'Tầng 1-3, Sài Gòn Centre, 65 Lê Lợi, Quận 1, TP.HCM',
      email: 'contact.vn@sc.com', phone: '028 3911 6888', fax: '028 3911 6889',
      legalRepName: 'Michael Kim', legalRepPhone: '0908 777 888', legalRepEmail: 'michael.kim@sc.com',
      cbttName: 'Nguyễn Thanh Tâm', cbttPhone: '0908 888 999', cbttEmail: 'cbtt.vn@sc.com',
    },
    { createdDate: '2021-09-01', updatedDate: '2022-07-08' },
  ),
  seed(
    {
      name: 'Ngân hàng TNHH MTV HSBC (Việt Nam)', orgType: 'Ngân hàng lưu ký', shortName: 'HSBC Việt Nam',
      custodyCode: '051', domesticForeign: 'Nước ngoài',
      relatedOrgType: 'Ngân hàng lưu ký nước ngoài', businessField: 'Lưu ký, thanh toán chứng khoán',
      startDate: '2009-01-01', charterCapital: 0,
      address: 'Tầng 1, Metropolitan Tower, 235 Đồng Khởi, Quận 1, TP.HCM', phone: '028 3829 2288',
    },
    { createdDate: '2021-09-01', updatedDate: '2022-03-30' },
  ),
  seed(
    {
      name: 'Công ty TNHH Deloitte Việt Nam', orgType: 'Tổ chức kiểm toán', shortName: 'Deloitte VN',
      domesticForeign: 'Nước ngoài',
      relatedOrgType: 'Tổ chức kiểm toán độc lập', businessField: 'Kiểm toán báo cáo tài chính',
      startDate: '1994-04-01', charterCapital: 0,
      address: 'Tầng 15, Tòa nhà Vinaconex, 34 Láng Hạ, Đống Đa, Hà Nội', phone: '024 6288 3568',
    },
    { createdDate: '2021-09-01', updatedDate: '2021-09-01' },
  ),
  seed(
    {
      name: 'Công ty TNHH KPMG Việt Nam', orgType: 'Tổ chức kiểm toán', shortName: 'KPMG VN',
      domesticForeign: 'Nước ngoài', dossierType: 'Hồ sơ tạm thời', recordStatus: 'Lưu tạm',
      relatedOrgType: 'Tổ chức kiểm toán độc lập', businessField: 'Kiểm toán báo cáo tài chính',
      startDate: '1994-05-01', charterCapital: 0,
      address: 'Tầng 46, Keangnam Landmark 72, Phạm Hùng, Nam Từ Liêm, Hà Nội', phone: '024 3946 1600',
    },
    { createdDate: '2021-09-01', updatedDate: '2021-09-01' },
  ),
];

export function formatDateVN(iso: string | null | undefined): string {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

export function formatMoneyVN(n: number | null): string {
  if (n === null) return '';
  return `${n.toLocaleString('vi-VN')} đ`;
}

export function operatingLabel(flag: Flag): string {
  return flag === 1 ? 'Bình thường' : 'Ngừng hoạt động';
}

/** Chuỗi hiển thị của một trường — dùng chung cho bảng, trang chi tiết và file xuất. */
export function displayValue(row: RelatedOrgDraft, field: RelatedOrgField): string {
  const raw = row[field.key];
  switch (field.kind) {
    case 'date':
      return formatDateVN(raw as string);
    case 'money':
      return formatMoneyVN(raw as number | null);
    case 'operating':
      return operatingLabel(raw as Flag);
    default:
      return (raw as string) ?? '';
  }
}

/**
 * Nhãn cột trên bảng danh sách. Hai nhóm giấy phép có cùng bộ nhãn trường
 * ("GPTL và hoạt động - Số"...), trong form thì tiêu đề nhóm phân biệt được,
 * còn trên một hàng tiêu đề bảng phẳng thì không — nên gắn thêm tiền tố.
 */
const LICENSE_PREFIX: Record<string, string> = {
  'Giấy phép cấp lần đầu': 'Lần đầu',
  'Giấy phép điều chỉnh lần gần nhất': 'Điều chỉnh',
};

export interface RelatedOrgColumn extends RelatedOrgField {
  readonly columnLabel: string;
}

export const ALL_COLUMNS: readonly RelatedOrgColumn[] = RELATED_ORG_SECTIONS.flatMap((s) =>
  s.fields.map((f) => ({
    ...f,
    columnLabel: LICENSE_PREFIX[s.title] ? `${LICENSE_PREFIX[s.title]} · ${f.label}` : f.label,
  })),
);
