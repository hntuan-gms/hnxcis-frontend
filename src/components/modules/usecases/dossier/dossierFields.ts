/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Cấu hình trường của nhóm "Quản lý hồ sơ" (/ims) — Tổ chức phát hành, hồ sơ
 * chứng khoán (CP / TP niêm yết / TP riêng lẻ), bảng con TPRL và Nhà đầu tư.
 *
 * KHÔNG có SRS/FR riêng. Nhãn, thứ tự, nhóm trường và danh sách lựa chọn lấy
 * nguyên từ `docs/quan-ly-danh-muc_80.html` (`MODULES.hosotcph.fields`,
 * `OTHER_ORG_FIELDS`, `DOSSIER_TYPES`, `TPRL_SUBTABLES`, `INVESTOR_TYPES`).
 *
 * Chạy SONG SONG với `ListingModule`/`OwnershipModule`/`BondModule` cũ — không
 * dùng chung kiểu hay dữ liệu với các module đó để gỡ bên nào cũng không vỡ bên
 * còn lại.
 */

export type FieldValue = string | number | boolean | null;
export type Values = Record<string, FieldValue>;

export type FieldKind =
  | 'text'
  | 'textarea'
  | 'select'
  | 'date'
  | 'number'
  | 'money'
  | 'toggle'
  | 'status'
  | 'computed';

export interface FieldDef {
  readonly key: string;
  readonly label: string;
  readonly kind?: FieldKind;
  readonly options?: readonly string[];
  readonly required?: boolean;
  readonly placeholder?: string;
  readonly span2?: boolean;
  /** Chỉ hiện khi trường toggle này đang bật (VD: Tỷ lệ chuyển đổi ← TP chuyển đổi). */
  readonly showIf?: string;
  /** Chỉ dùng trong form — màn xem hiện trường `computed` gộp thay cho nó. */
  readonly hideInView?: boolean;
  readonly compute?: (v: Values) => string;
}

export interface FieldSection {
  readonly title: string;
  readonly fields: readonly FieldDef[];
}

/* -------------------------------------------------------------- tiện ích */

export function formatDateVN(iso: FieldValue | undefined): string {
  if (!iso || typeof iso !== 'string') return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return d ? `${d}/${m}/${y}` : iso;
}

export function formatNumberVN(n: FieldValue | undefined): string {
  if (n === null || n === undefined || n === '') return '';
  return Number(n).toLocaleString('vi-VN');
}

export function formatMoneyVN(n: FieldValue | undefined): string {
  const s = formatNumberVN(n);
  return s ? `${s} đ` : '';
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** `computeRemainingTerm` của file mẫu. */
export function computeRemainingTerm(maturityISO: FieldValue | undefined): string {
  if (!maturityISO || typeof maturityISO !== 'string') return '';
  const [y, m, d] = maturityISO.split('-').map(Number);
  const maturity = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (maturity < today) return 'Đã đáo hạn';
  let months = (maturity.getFullYear() - today.getFullYear()) * 12 + (maturity.getMonth() - today.getMonth());
  if (maturity.getDate() < today.getDate()) months -= 1;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} năm`);
  if (rem > 0) parts.push(`${rem} tháng`);
  return parts.length ? `${parts.join(' ')} còn lại` : 'Dưới 1 tháng';
}

/** Chuỗi hiển thị của một trường, dùng chung cho màn xem, bảng và file xuất. */
export function displayField(values: Values, f: FieldDef): string {
  const v = values[f.key];
  switch (f.kind) {
    case 'computed':
      return f.compute ? f.compute(values) : '';
    case 'date':
      return formatDateVN(v);
    case 'number':
      return formatNumberVN(v);
    case 'money':
      return formatMoneyVN(v);
    case 'toggle':
      return v ? 'Có' : 'Không';
    case 'status':
      return v === 1 ? 'Đang hoạt động' : 'Ngừng hoạt động';
    default:
      return v === null || v === undefined ? '' : String(v);
  }
}

/** Giá trị trống ban đầu cho một bộ trường (form thêm mới). */
export function emptyValues(sections: readonly FieldSection[]): Values {
  const out: Values = {};
  sections.forEach((s) =>
    s.fields.forEach((f) => {
      if (f.kind === 'computed') return;
      out[f.key] = f.kind === 'toggle' ? false : f.kind === 'status' ? 1 : f.kind === 'number' || f.kind === 'money' ? null : '';
    }),
  );
  return out;
}

export function allFields(sections: readonly FieldSection[]): FieldDef[] {
  return sections.flatMap((s) => s.fields);
}

/* ------------------------------------------------------ Tổ chức phát hành */

export const BUSINESS_TYPE_OPTIONS = [
  'Công ty cổ phần',
  'Công ty TNHH',
  'Doanh nghiệp nhà nước',
  'Ngân hàng thương mại cổ phần',
  'Tổ chức tín dụng khác',
  'Doanh nghiệp có vốn đầu tư nước ngoài',
] as const;

export const INDUSTRY_OPTIONS = [
  'Ngân hàng',
  'Bất động sản',
  'Xây dựng',
  'Sản xuất - Công nghiệp',
  'Năng lượng',
  'Chứng khoán',
  'Bảo hiểm',
  'Thương mại - Dịch vụ',
  'Nông nghiệp - Thủy sản',
  'Khác',
] as const;

export const OTHER_ORG_TYPE_OPTIONS = [
  'Chính phủ',
  'Chính quyền địa phương',
  'Tổ chức trung gian tài chính',
  'Quỹ hỗ trợ phát triển',
  'Khác',
] as const;

export const ISSUER_SECTIONS: readonly FieldSection[] = [
  {
    title: 'Định danh doanh nghiệp',
    fields: [
      { key: 'name', label: 'Tên đầy đủ (tiếng Việt)', required: true, span2: true, placeholder: 'Tên đầy đủ doanh nghiệp' },
      { key: 'englishName', label: 'Tên tiếng Anh', placeholder: 'Tên giao dịch quốc tế (nếu có)' },
      { key: 'shortName', label: 'Tên viết tắt', placeholder: 'VD: HPG' },
      { key: 'tradingName', label: 'Tên giao dịch', placeholder: 'Tên thường gọi/giao dịch' },
      { key: 'taxCode', label: 'Mã số thuế', required: true, placeholder: 'Nhập mã số thuế' },
      { key: 'businessType', label: 'Loại hình doanh nghiệp', kind: 'select', required: true, options: BUSINESS_TYPE_OPTIONS },
      { key: 'industry', label: 'Lĩnh vực / ngành nghề hoạt động chính', kind: 'select', required: true, options: INDUSTRY_OPTIONS },
      { key: 'establishedDate', label: 'Ngày hoạt động đầu tiên (thành lập)', kind: 'date' },
      { key: 'statusFlg', label: 'Tình trạng hoạt động', kind: 'status' },
    ],
  },
  {
    title: 'Thông tin liên hệ',
    fields: [
      { key: 'address', label: 'Địa chỉ trụ sở chính', required: true, span2: true, placeholder: 'Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành' },
      { key: 'phone', label: 'Điện thoại', placeholder: 'Số điện thoại liên hệ' },
      { key: 'fax', label: 'Fax', placeholder: 'Số fax (nếu có)' },
      { key: 'email', label: 'Email', placeholder: 'Email liên hệ' },
      { key: 'website', label: 'Website', placeholder: 'VD: congty.com.vn' },
    ],
  },
  {
    title: 'Vốn & tài chính doanh nghiệp',
    fields: [
      { key: 'charterCapital', label: 'Vốn điều lệ (VNĐ)', kind: 'money', required: true, placeholder: 'VD: 10000000000' },
      { key: 'fiscalYearStart', label: 'Năm tài chính (ngày bắt đầu)', kind: 'date' },
    ],
  },
  {
    title: 'Giấy phép / ĐKKD',
    fields: [
      { key: 'businessLicenseNo', label: 'Số GCN ĐKKD / GPKD lần đầu', required: true, placeholder: 'Nhập số giấy chứng nhận' },
      { key: 'businessLicenseDate', label: 'Ngày cấp GPKD lần đầu', kind: 'date', required: true },
      { key: 'businessLicensePlace', label: 'Nơi cấp GPKD lần đầu', required: true, span2: true, placeholder: 'VD: Sở Kế hoạch và Đầu tư TP. Hà Nội' },
      { key: 'latestLicenseNo', label: 'Số GPKD (lần thay đổi gần nhất)' },
      { key: 'latestLicenseDate', label: 'Ngày thay đổi GPKD gần nhất', kind: 'date' },
      { key: 'latestLicensePlace', label: 'Nơi cấp GPKD (lần thay đổi gần nhất)', span2: true },
    ],
  },
  {
    title: 'Người đại diện & Công bố thông tin',
    fields: [
      { key: 'legalRepresentative', label: 'Họ tên người đại diện theo pháp luật', required: true, span2: true, placeholder: 'Họ tên người đại diện' },
      { key: 'disclosureContactName', label: 'Họ tên người công bố thông tin / ủy quyền CBTT', span2: true, placeholder: 'Họ tên người CBTT' },
      { key: 'disclosureContactPhone', label: 'Điện thoại người công bố thông tin' },
      { key: 'disclosureContactEmail', label: 'Email người công bố thông tin' },
    ],
  },
];

/** Tab "Tổ chức khác" của popup Thêm mới TCPH (`OTHER_ORG_FIELDS`). */
export const OTHER_ORG_SECTIONS: readonly FieldSection[] = [
  {
    title: 'Định danh tổ chức phát hành',
    fields: [
      { key: 'name', label: 'Tên TCPH', required: true, span2: true, placeholder: 'VD: Kho Bạc Nhà nước' },
      { key: 'tcphCode', label: 'Mã TCPH', required: true, placeholder: 'VD: KBNN' },
      { key: 'shortName', label: 'Tên viết tắt', placeholder: 'VD: KBNN' },
      { key: 'tcphType', label: 'Loại TCPH', kind: 'select', required: true, options: OTHER_ORG_TYPE_OPTIONS },
      { key: 'address', label: 'Địa chỉ', span2: true, placeholder: 'Địa chỉ trụ sở' },
    ],
  },
];

/* --------------------------------------------------- Hồ sơ chứng khoán */

export type DossierType = 'cp' | 'tpny' | 'tprl';

const RATE_TYPE = ['Cố định', 'Thả nổi', 'Kết hợp'] as const;

export interface DossierTypeConfig {
  readonly label: string;
  readonly shortTag: string;
  /** CP chỉ có 1 hồ sơ / TCPH; TP có nhiều. */
  readonly multiple: boolean;
  readonly description: string;
  readonly titleKey: string;
  readonly sections: readonly FieldSection[];
}

export const DOSSIER_TYPES: Record<DossierType, DossierTypeConfig> = {
  cp: {
    label: 'Hồ sơ Cổ phiếu',
    shortTag: 'CP',
    multiple: false,
    description: 'Thông tin niêm yết, cơ cấu vốn cổ phần',
    titleKey: 'stockCode',
    sections: [
      {
        title: 'Định danh chứng khoán',
        fields: [
          { key: 'stockCode', label: 'Mã chứng khoán trong nước', required: true, placeholder: 'VD: FPT' },
          { key: 'intlCode', label: 'Mã chứng khoán quốc tế' },
        ],
      },
      {
        title: 'Thông tin niêm yết ban đầu',
        fields: [
          { key: 'submissionDate', label: 'Ngày nộp hồ sơ', kind: 'date' },
          { key: 'approvalInPrincipleDate', label: 'Ngày chấp thuận nguyên tắc', kind: 'date' },
          { key: 'officialApprovalDate', label: 'Ngày chấp thuận chính thức', kind: 'date' },
          { key: 'offeringRegistrationDate', label: 'Ngày chứng nhận đăng ký chào bán', kind: 'date' },
          { key: 'firstTradingDate', label: 'Ngày giao dịch đầu tiên', kind: 'date' },
          { key: 'initialListedVolume', label: 'Số lượng cổ phiếu niêm yết (ban đầu)', kind: 'number', placeholder: 'VD: 60810000' },
          { key: 'initialListedVolume2', label: 'KLNY ngày đầu tiên (khối lượng niêm yết)', kind: 'number', placeholder: 'Có thể trùng với số liệu ở trên' },
          { key: 'shareholderCountAtListing', label: 'Số lượng cổ đông (tại thời điểm niêm yết)', kind: 'number' },
          { key: 'stateOwnedSharesAtListing', label: 'Số lượng CP nhà nước nắm giữ (tại thời điểm niêm yết)', kind: 'number' },
          { key: 'referencePrice', label: 'Giá tham chiếu phiên đầu tiên (đ)', kind: 'money', placeholder: 'VD: 50000' },
        ],
      },
      {
        title: 'Thông tin niêm yết hiện tại',
        fields: [{ key: 'currentListedVolume', label: 'Số lượng cổ phiếu đang niêm yết', kind: 'number' }],
      },
      {
        title: 'Cơ cấu vốn cổ phần hiện tại',
        fields: [
          { key: 'issuedShares', label: 'Số lượng CP phát hành', kind: 'number' },
          { key: 'outstandingShares', label: 'Số lượng CP lưu hành', kind: 'number' },
          { key: 'treasuryShares', label: 'Số lượng CP quỹ', kind: 'number' },
        ],
      },
      {
        title: 'Giới hạn sở hữu nước ngoài',
        fields: [{ key: 'foreignOwnershipLimit', label: 'Tỷ lệ sở hữu tối đa NĐT nước ngoài (%)', kind: 'number', placeholder: 'VD: 49' }],
      },
      {
        title: 'Cơ cấu sở hữu nhóm công ty (liên quan CP)',
        fields: [
          { key: 'parentOwnedShares', label: 'Số lượng CP công ty mẹ sở hữu', kind: 'number' },
          { key: 'parentOwnedRatio', label: 'Tỷ lệ CP công ty mẹ sở hữu (%)', kind: 'number' },
        ],
      },
    ],
  },
  tpny: {
    label: 'Hồ sơ Trái phiếu niêm yết',
    shortTag: 'TP',
    multiple: true,
    description: 'Trái phiếu phát hành ra công chúng, niêm yết giao dịch',
    titleKey: 'bondCode',
    sections: [
      {
        title: 'Định danh trái phiếu niêm yết',
        fields: [
          { key: 'bondCode', label: 'Mã trái phiếu (MTP)', required: true, placeholder: 'VD: FPT12025' },
          { key: 'bondName', label: 'Tên trái phiếu', span2: true, placeholder: 'Tên đầy đủ trái phiếu' },
        ],
      },
      {
        title: 'Thông tin phát hành & niêm yết',
        fields: [
          { key: 'issueDate', label: 'Ngày phát hành', kind: 'date' },
          { key: 'firstTradingDate', label: 'Ngày giao dịch đầu tiên', kind: 'date' },
          { key: 'maturityDate', label: 'Ngày đáo hạn', kind: 'date' },
          { key: 'remainingTerm', label: 'Thời gian còn lại', kind: 'computed', compute: (v) => computeRemainingTerm(v.maturityDate) },
          { key: 'faceValue', label: 'Mệnh giá (đ)', kind: 'money', placeholder: 'VD: 100000' },
          { key: 'listedVolume', label: 'Số lượng trái phiếu niêm yết', kind: 'number' },
          { key: 'totalFaceValue', label: 'Tổng giá trị theo mệnh giá (đ)', kind: 'money' },
        ],
      },
      {
        title: 'Lãi suất & phân loại',
        fields: [
          { key: 'interestRateType', label: 'Loại lãi suất', kind: 'select', options: RATE_TYPE },
          { key: 'interestRate', label: 'Mức lãi suất (%/năm)', kind: 'number', placeholder: 'VD: 8.5' },
          {
            key: 'bondType',
            label: 'Loại trái phiếu',
            kind: 'select',
            options: ['Trái phiếu thường', 'Trái phiếu chuyển đổi', 'Trái phiếu có bảo đảm', 'Trái phiếu xanh'],
          },
        ],
      },
    ],
  },
  tprl: {
    label: 'Hồ sơ Trái phiếu riêng lẻ',
    shortTag: 'TP',
    multiple: true,
    description: 'Trái phiếu phát hành riêng lẻ, không chào bán rộng rãi',
    titleKey: 'bondCode',
    sections: [
      {
        title: 'Định danh trái phiếu riêng lẻ',
        fields: [
          { key: 'bondCode', label: 'Mã trái phiếu', required: true, placeholder: 'VD: FPT12025' },
          { key: 'bondName', label: 'Tên trái phiếu', placeholder: 'Tên đầy đủ trái phiếu' },
          { key: 'currency', label: 'Tiền tệ', kind: 'select', options: ['VND', 'USD', 'EUR', 'Khác'] },
          { key: 'otherCurrency', label: 'Tiền tệ khác', placeholder: 'Chỉ nhập nếu chọn "Khác" ở trên' },
        ],
      },
      {
        title: 'Thông tin phát hành',
        fields: [
          { key: 'faceValue', label: 'Mệnh giá (đ)', kind: 'money', placeholder: 'VD: 100000' },
          { key: 'termValue', label: 'Kỳ hạn trái phiếu', kind: 'number', placeholder: 'VD: 3', hideInView: true },
          { key: 'termUnit', label: 'Đơn vị kỳ hạn', kind: 'select', options: ['Năm', 'Tháng'], hideInView: true },
          {
            key: 'termCombined',
            label: 'Kỳ hạn trái phiếu',
            kind: 'computed',
            compute: (v) => (v.termValue ? `${v.termValue} ${v.termUnit || ''}`.trim() : ''),
          },
          { key: 'issueVolume', label: 'Khối lượng TP phát hành', kind: 'number', span2: true },
          { key: 'issueValue', label: 'Giá trị TP phát hành (đ)', kind: 'money' },
          { key: 'issueValueInWords', label: 'Giá trị TP phát hành (bằng chữ)', placeholder: 'VD: Ba trăm tỷ đồng' },
          { key: 'outstandingVolume', label: 'Khối lượng TP lưu hành', kind: 'number' },
          { key: 'outstandingValue', label: 'Giá trị TP lưu hành (đ)', kind: 'money', hideInView: true },
          { key: 'outstandingValueInWords', label: 'Giá trị TP lưu hành (bằng chữ)', placeholder: 'VD: Ba trăm tỷ đồng', hideInView: true },
          {
            key: 'outstandingValueCombined',
            label: 'Giá trị TP lưu hành - Bằng chữ',
            kind: 'computed',
            compute: (v) =>
              v.outstandingValue !== null && v.outstandingValue !== undefined && v.outstandingValue !== ''
                ? `${formatMoneyVN(v.outstandingValue)}${v.outstandingValueInWords ? ` (${v.outstandingValueInWords})` : ''}`
                : '',
          },
          { key: 'issueDate', label: 'Ngày phát hành', kind: 'date' },
          { key: 'maturityDate', label: 'Ngày đáo hạn', kind: 'date' },
          { key: 'issueMethod', label: 'Phương thức phát hành', placeholder: 'VD: Chào bán riêng lẻ cho NĐT chuyên nghiệp' },
          { key: 'bondClass', label: 'TP thường / TP xanh', kind: 'select', options: ['TP thường', 'TP xanh'] },
          { key: 'principalPaymentMethod', label: 'Phương thức thanh toán gốc', placeholder: 'VD: Thanh toán 1 lần khi đáo hạn' },
          { key: 'interestPaymentMethod', label: 'Phương thức thanh toán lãi', placeholder: 'VD: Chuyển khoản định kỳ' },
          { key: 'issuePurpose', label: 'Mục đích phát hành', placeholder: 'VD: Bổ sung vốn lưu động' },
          { key: 'issueMarket', label: 'Thị trường phát hành', placeholder: 'VD: Thị trường trong nước' },
        ],
      },
      {
        title: 'Lãi suất',
        fields: [
          {
            key: 'interestPaymentType',
            label: 'Loại hình trả lãi',
            kind: 'select',
            options: ['Coupon', 'Trả lãi định kỳ', 'Trả lãi trước', 'Trả lãi sau (đáo hạn)'],
          },
          { key: 'assumedInterestPeriods', label: 'Số kỳ hạn trả lãi giả định', kind: 'number', placeholder: 'VD: 6' },
          { key: 'interestPeriod', label: 'Kỳ hạn trả lãi', kind: 'number', placeholder: 'VD: 6', hideInView: true },
          { key: 'interestPeriodUnit', label: 'Đơn vị kỳ hạn trả lãi', kind: 'select', options: ['Tháng', 'Quý', 'Năm'], hideInView: true },
          {
            key: 'interestPeriodCombined',
            label: 'Kỳ hạn trả lãi',
            kind: 'computed',
            compute: (v) => (v.interestPeriod ? `${v.interestPeriod} ${v.interestPeriodUnit || ''}`.trim() : ''),
          },
          { key: 'firstInterestPaymentDate', label: 'Ngày trả lãi đầu tiên', kind: 'date' },
          { key: 'interestRateType', label: 'Loại lãi suất', kind: 'select', options: RATE_TYPE },
          { key: 'nominalInterestRate', label: 'Lãi suất danh nghĩa (%/năm)', kind: 'number', placeholder: 'VD: 8.5' },
          { key: 'actualIssueInterestRate', label: 'Lãi suất phát hành thực tế (%/năm)', kind: 'number', placeholder: 'VD: 8.7' },
          { key: 'interestRateDeterminationMethod', label: 'Cách xác định lãi suất', placeholder: 'VD: Lãi suất tham chiếu + biên độ 3%' },
        ],
      },
      {
        title: 'Đặc điểm trái phiếu',
        fields: [
          { key: 'isConvertible', label: 'Trái phiếu chuyển đổi', kind: 'toggle' },
          { key: 'conversionRatio', label: 'Tỷ lệ chuyển đổi', kind: 'number', placeholder: 'VD: 10', showIf: 'isConvertible' },
          { key: 'hasWarrant', label: 'Trái phiếu kèm chứng quyền', kind: 'toggle' },
          { key: 'warrantExerciseRatio', label: 'Tỷ lệ thực hiện quyền', kind: 'number', placeholder: 'VD: 1.5', showIf: 'hasWarrant' },
          { key: 'isSecured', label: 'Trái phiếu bảo đảm', kind: 'toggle' },
          { key: 'securityForm', label: 'Hình thức bảo đảm', placeholder: 'VD: Bảo đảm bằng tài sản, bảo lãnh thanh toán...', showIf: 'isSecured' },
          { key: 'buybackSwapInfo', label: 'Mua lại / Hoán đổi', placeholder: 'Thông tin về điều khoản mua lại, hoán đổi (nếu có)' },
          { key: 'bondForm', label: 'Hình thức trái phiếu', kind: 'select', options: ['Ghi sổ', 'Chứng chỉ', 'Dữ liệu điện tử'] },
          { key: 'custodian', label: 'Tổ chức lưu ký', span2: true, placeholder: 'Tên tổ chức lưu ký' },
        ],
      },
      {
        title: 'Hồ sơ pháp lý & công bố thông tin',
        fields: [
          { key: 'officialLetterNo', label: 'Số công văn TCPH' },
          { key: 'officialLetterDate', label: 'Ngày công văn TCPH', kind: 'date' },
          { key: 'bondholderRepresentative', label: 'Tổ chức đại diện người sở hữu trái phiếu', span2: true },
          { key: 'notes', label: 'Ghi chú', kind: 'textarea', span2: true, placeholder: 'Ghi chú thêm (nếu có)' },
        ],
      },
      {
        title: 'Xếp hạng tín nhiệm',
        fields: [
          { key: 'creditRatingCode', label: 'Mã tin xếp hạng tín nhiệm gần nhất' },
          { key: 'creditRatingResult', label: 'Kết quả XHTN gần nhất', placeholder: 'VD: BBB+' },
          { key: 'creditRatingAgency', label: 'Đơn vị xếp hạng tín nhiệm', placeholder: 'VD: FiinRatings, S&I Ratings...' },
          { key: 'creditRatingEffectiveDate', label: 'Ngày hiệu lực xếp hạng', kind: 'date' },
        ],
      },
      {
        title: 'Đăng ký giao dịch',
        fields: [
          { key: 'registrationStatus', label: 'Trạng thái đăng ký giao dịch', span2: true, placeholder: 'VD: Đã đăng ký giao dịch' },
          { key: 'tradingCode', label: 'Mã giao dịch' },
          { key: 'isinCode', label: 'Mã ISIN' },
          { key: 'tprlFirstTradingDate', label: 'Ngày giao dịch đầu tiên', kind: 'date' },
          { key: 'tprlLastTradingDate', label: 'Ngày giao dịch cuối cùng', kind: 'date' },
          { key: 'interestRecordCycle', label: 'Chu kỳ chốt quyền trả lãi (ngày làm việc)', kind: 'number' },
          { key: 'cancelRecordCycle', label: 'Chu kỳ chốt hủy ĐKGD (ngày làm việc)', kind: 'number' },
          { key: 'registeredVolume', label: 'Khối lượng đăng ký giao dịch', kind: 'number' },
          { key: 'tradingEligibility', label: 'Đối tượng giao dịch trái phiếu', placeholder: 'VD: NĐT chứng khoán chuyên nghiệp' },
          { key: 'offeringEligibility', label: 'Đối tượng chào bán', span2: true, placeholder: 'VD: NĐT chứng khoán chuyên nghiệp' },
        ],
      },
    ],
  },
};

/* --------------------------------------------------- Bảng con của TPRL */

export type SubTableKey = 'attachments' | 'volumeChanges' | 'collateralDetails' | 'outstandingDebt' | 'paymentSchedule';

/** Thứ tự hiển thị theo `DOSSIER_TYPES.tprl.subTables` của file mẫu. */
export const TPRL_SUBTABLE_ORDER: readonly SubTableKey[] = [
  'attachments',
  'volumeChanges',
  'collateralDetails',
  'outstandingDebt',
  'paymentSchedule',
];

export const TPRL_SUBTABLES: Record<SubTableKey, { label: string; fields: readonly FieldDef[] }> = {
  paymentSchedule: {
    label: 'Lịch thanh toán gốc/lãi TP',
    fields: [
      { key: 'faceValueCbis', label: 'GT lưu hành theo mệnh giá tại ngày TT danh nghĩa (hệ thống CBIS)', kind: 'money' },
      { key: 'faceValueDN', label: 'GT lưu hành theo mệnh giá tại ngày TT danh nghĩa (DN công bố)', kind: 'money' },
      { key: 'paymentType', label: 'Trả lãi/ gốc', kind: 'select', options: ['Trả lãi', 'Trả gốc', 'Trả gốc và lãi'] },
      { key: 'nominalDate', label: 'Ngày trả gốc/lãi danh nghĩa', kind: 'date' },
      { key: 'plannedDateSystem', label: 'Ngày trả gốc/lãi theo KH (theo lịch hệ thống)', kind: 'date' },
      { key: 'plannedDateDN', label: 'Ngày trả gốc/lãi theo KH (DN công bố)', kind: 'date' },
      { key: 'actualDateDN', label: 'Ngày trả gốc/lãi thực tế (DN công bố)', kind: 'date' },
      { key: 'interestRateInPeriod', label: 'Lãi suất trả lãi trong kỳ (%/năm) (DN công bố)', kind: 'number' },
      { key: 'amountDue', label: 'Số tiền phải TT (DN công bố)', kind: 'money' },
    ],
  },
  outstandingDebt: {
    label: 'Tình hình dư nợ trái phiếu',
    fields: [
      { key: 'reportDate', label: 'Ngày thống kê (DN báo cáo)', kind: 'date' },
      { key: 'outstandingValue', label: 'Giá trị dư nợ gốc theo mệnh giá tại cuối Ngày Thống kê (DN báo cáo)', kind: 'money' },
      { key: 'latestDebtCode', label: 'Mã tin dư nợ gốc gần nhất', placeholder: 'VD: DNG/000001' },
    ],
  },
  collateralDetails: {
    label: 'Chi tiết giá trị bảo đảm',
    fields: [
      { key: 'securityForm', label: 'Hình thức bảo đảm', placeholder: 'VD: Bảo đảm bằng tài sản' },
      { key: 'securityFormDetail', label: 'Chi tiết hình thức bảo đảm' },
      { key: 'assetType', label: 'Loại tài sản bảo đảm', placeholder: 'VD: Chứng khoán, Bất động sản...' },
      { key: 'assetValue', label: 'Giá trị tài sản bảo đảm hoặc Giá trị được bảo lãnh thanh toán theo hợp đồng', kind: 'money' },
      { key: 'assetRatio', label: 'Tỷ lệ giá trị TSBĐ hoặc Giá trị được bảo lãnh / tổng giá trị phát hành (%)', kind: 'number' },
      { key: 'assetList', label: 'Liệt kê tài sản bảo đảm / Hợp đồng bảo lãnh', kind: 'textarea', span2: true, placeholder: 'VD: Cổ phiếu AAA và cổ phiếu HII' },
    ],
  },
  volumeChanges: {
    label: 'Tình hình tăng giảm khối lượng trái phiếu lưu hành',
    fields: [
      { key: 'type', label: 'Loại hình', kind: 'select', options: ['Khởi tạo ban đầu', 'Mua lại trước hạn', 'Phát hành thêm', 'Đáo hạn', 'Khác'] },
      { key: 'bondCode', label: 'Mã TP', placeholder: 'VD: AAAH1821001' },
      { key: 'faceValue', label: 'Mệnh giá', kind: 'money' },
      { key: 'effectiveDate', label: 'Ngày thực hiện', kind: 'date' },
      { key: 'changeVolume', label: 'Khối lượng thực hiện (+/-)', kind: 'number', placeholder: 'Nhập số dương nếu tăng, số âm nếu giảm' },
      { key: 'cumulativeVolume', label: 'Khối lượng lũy kế', kind: 'number' },
    ],
  },
  attachments: {
    label: 'Danh sách văn bản đính kèm',
    fields: [
      { key: 'fileName', label: 'Tên file', span2: true, placeholder: 'VD: NQ-DHDCD-2026.pdf' },
      { key: 'description', label: 'Mô tả', span2: true },
      { key: 'fileType', label: 'Loại file', placeholder: 'VD: PDF, DOCX...' },
      { key: 'fileSize', label: 'Dung lượng (KB)', kind: 'number' },
    ],
  },
};

/* ------------------------------------------------------------ Nhà đầu tư */

export type InvestorKind = 'person' | 'org';

export const INVESTOR_DOC_TYPE_OPTIONS = ['CCCD (Căn cước công dân)', 'Hộ chiếu (Passport)', 'CMND cũ'] as const;

export const INVESTOR_ORG_TYPE_OPTIONS = [
  'Công ty Cổ phần',
  'Công ty TNHH từ 2 TV trở lên',
  'Công ty TNHH Một thành viên',
  'Doanh nghiệp nhà nước',
  'Quỹ Đầu tư / Tổ chức nước ngoài',
] as const;

export const FAMILY_RELATION_OPTIONS = [
  'Vợ/chồng',
  'Bố',
  'Mẹ',
  'Con đẻ',
  'Con rể',
  'Con dâu',
  'Người giám hộ',
  'Khác',
] as const;

export const SHAREHOLDER_ROLES: ReadonlyArray<{ value: string; label: string; badge: string }> = [
  { value: 'CĐL', label: 'Cổ đông lớn', badge: 'bg-[#FEF3C7] text-[#92400E]' },
  { value: 'CĐSL', label: 'Cổ đông sáng lập', badge: 'bg-[#FEE2E2] text-[#991B1B]' },
  { value: 'NNB', label: 'Người nội bộ', badge: 'bg-[#EDE9FE] text-[#5B21B6]' },
  { value: 'NLQ', label: 'Người liên quan', badge: 'bg-[#D1FAE5] text-[#065F46]' },
  { value: 'Nhà nước', label: 'Vốn Nhà nước', badge: 'bg-[#E0F2FE] text-[#075985]' },
  { value: 'Khác', label: 'Khác', badge: 'bg-[#F3F4F6] text-[#4B5563]' },
];

export function roleBadgeClass(role: string): string {
  return SHAREHOLDER_ROLES.find((r) => r.value === role)?.badge ?? 'bg-[#F3F4F6] text-[#4B5563]';
}

export const INVESTOR_SECTIONS: Record<InvestorKind, readonly FieldSection[]> = {
  person: [
    {
      title: 'Thông tin định danh gốc',
      fields: [
        { key: 'name', label: 'Họ và tên cá nhân', required: true, span2: true, placeholder: 'VD: Nguyễn Văn A' },
        { key: 'nationality', label: 'Quốc tịch', kind: 'select', required: true, options: ['Việt Nam', 'Nước ngoài'] },
        { key: 'docType', label: 'Loại giấy tờ định danh', kind: 'select', required: true, options: INVESTOR_DOC_TYPE_OPTIONS },
        { key: 'docNo', label: 'Số giấy tờ định danh', required: true, placeholder: 'Nhập số CCCD/Hộ chiếu' },
        { key: 'dob', label: 'Ngày sinh', kind: 'date' },
        { key: 'docIssueDate', label: 'Ngày cấp định danh', kind: 'date' },
        { key: 'docIssuePlace', label: 'Nơi cấp', span2: true, placeholder: 'VD: Cục Cảnh sát QLHC về trật tự xã hội' },
      ],
    },
    {
      title: 'Thông tin liên lạc',
      fields: [
        { key: 'phone', label: 'Số điện thoại liên hệ', placeholder: 'VD: 0912345678' },
        { key: 'email', label: 'Email nhận thông báo', placeholder: 'VD: nguyenvana@gmail.com' },
        { key: 'permanentAddress', label: 'Địa chỉ thường trú', span2: true, placeholder: 'Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành' },
        { key: 'contactAddress', label: 'Địa chỉ liên hệ / Cư trú', span2: true, placeholder: 'Nếu giống địa chỉ thường trú để trống' },
      ],
    },
  ],
  org: [
    {
      title: 'Thông tin pháp nhân gốc',
      fields: [
        { key: 'name', label: 'Tên tổ chức (tiếng Việt)', required: true, span2: true, placeholder: 'VD: Công ty Cổ phần Đầu tư ABC' },
        { key: 'nameEn', label: 'Tên tiếng Anh', placeholder: 'ABC Investment Joint Stock Company' },
        { key: 'shortName', label: 'Tên viết tắt', placeholder: 'VD: ABC INVEST' },
        { key: 'docNo', label: 'Mã số thuế / Số ĐKKD', required: true, placeholder: 'Mã số doanh nghiệp' },
        { key: 'docIssueDate', label: 'Ngày cấp MST / ĐKKD', kind: 'date' },
        { key: 'orgType', label: 'Loại hình doanh nghiệp', kind: 'select', options: INVESTOR_ORG_TYPE_OPTIONS },
        { key: 'legalRepresentative', label: 'Người đại diện pháp luật', placeholder: 'Họ tên người đại diện' },
        { key: 'nationality', label: 'Quốc gia tổ chức gốc', placeholder: 'VD: Việt Nam' },
      ],
    },
    {
      title: 'Thông tin trụ sở & Liên hệ',
      fields: [
        { key: 'address', label: 'Địa chỉ trụ sở chính', required: true, span2: true, placeholder: 'Ghi theo Giấy ĐKKD' },
        { key: 'phone', label: 'Số điện thoại tổ chức' },
        { key: 'email', label: 'Email liên hệ pháp nhân' },
        { key: 'website', label: 'Website công ty', placeholder: 'https://...' },
      ],
    },
  ],
};
