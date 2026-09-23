/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Dossier, Holder, Investor, Issuer, OwnershipRelation, ChangeLog } from './dossierStore';
import { Values } from './dossierFields';

/**
 * Dữ liệu mẫu — port từ `hosotcph`, `investors`, `seedHolders`, `newIssuerRows`,
 * `addCp`, `newBondRows` của `docs/quan-ly-danh-muc_80.html`.
 *
 * Như ghi chú của file mẫu: tên lãnh đạo/cổ đông lớn là thông tin đã công bố
 * công khai; CCCD, SĐT, email cá nhân, địa chỉ nhà riêng KHÔNG đưa vào (để trống).
 * Một số trường vận hành (địa chỉ/SĐT/MST của 14 TCPH bổ sung, số liệu cổ phần)
 * là số minh họa.
 */

const AUDIT = { activeFlg: 1 as const, deleteFlg: 0 as const, createdBy: 'Admin', createdDate: '2021-09-01' };

function dossier(values: Values, extra: Partial<Dossier> = {}): Dossier {
  return { values, holders: [], subData: {}, ...extra };
}

interface IssuerSeed {
  values: Values;
  cp?: Values | null;
  tpny?: Values[];
  tprl?: Array<Values | Dossier>;
  parents?: OwnershipRelation[];
  subsidiaries?: OwnershipRelation[];
  affiliates?: OwnershipRelation[];
  changeHistory?: ChangeLog[];
}

let issuerId = 0;
function issuer(s: IssuerSeed): Issuer {
  issuerId += 1;
  const statusFlg = (s.values.statusFlg as 0 | 1 | undefined) ?? 1;
  return {
    id: issuerId,
    ...AUDIT,
    statusFlg,
    kind: 'doanhnghiep',
    values: { fiscalYearStart: '2026-01-01', ...s.values, statusFlg },
    ownership: { parents: s.parents ?? [], subsidiaries: s.subsidiaries ?? [], affiliates: s.affiliates ?? [] },
    changeHistory: s.changeHistory ?? [],
    dossiers: {
      cp: s.cp ? dossier(s.cp) : null,
      tpny: (s.tpny ?? []).map((v) => dossier(v)),
      tprl: (s.tprl ?? []).map((v) => ('values' in v ? (v as Dossier) : dossier(v as Values))),
    },
  };
}

const VSDC = 'Trung tâm Lưu ký Chứng khoán Việt Nam (VSDC)';
const PRO = 'Nhà đầu tư chứng khoán chuyên nghiệp';
const PRIVATE_PRO = 'Chào bán riêng lẻ cho nhà đầu tư chứng khoán chuyên nghiệp';

function schedule(rows: Array<[string, number, number, string, string, number, number]>): Values[] {
  return rows.map(([paymentType, cbis, dn, nominal, actual, rate, due]) => ({
    faceValueCbis: cbis,
    faceValueDN: dn,
    paymentType,
    nominalDate: nominal,
    plannedDateSystem: nominal,
    plannedDateDN: nominal,
    actualDateDN: actual,
    interestRateInPeriod: rate,
    amountDue: due,
  }));
}

const B300 = 300000000000;

const HPG_TPRL: Array<Values | Dossier> = [
  {
    bondCode: 'HPG12022_01', bondName: 'Trái phiếu Hòa Phát 2022-2025', currency: 'VND',
    issueDate: '2022-11-01', maturityDate: '2025-11-01', termValue: 3, termUnit: 'Năm',
    faceValue: 100000, issueVolume: 2000000, issueValue: 200000000000, issueValueInWords: 'Hai trăm tỷ đồng',
    outstandingVolume: 0, outstandingValue: 0, outstandingValueInWords: 'Không đồng (đã tất toán)',
    issueMethod: PRIVATE_PRO, bondClass: 'TP thường',
    issuePurpose: 'Bổ sung vốn lưu động sản xuất thép', issueMarket: 'Thị trường trong nước',
    principalPaymentMethod: 'Thanh toán 1 lần khi đáo hạn', interestPaymentMethod: 'Chuyển khoản định kỳ 6 tháng/lần',
    interestPaymentType: 'Trả lãi định kỳ', assumedInterestPeriods: 6, interestPeriod: 6, interestPeriodUnit: 'Tháng',
    firstInterestPaymentDate: '2023-05-01',
    interestRateType: 'Cố định', nominalInterestRate: 9.8, actualIssueInterestRate: 9.8,
    interestRateDeterminationMethod: 'Lãi suất cố định theo thỏa thuận',
    isConvertible: false, hasWarrant: false, isSecured: false, bondForm: 'Ghi sổ', custodian: VSDC,
    registrationStatus: 'Đã tất toán', tradingCode: 'HPGB2225', isinCode: 'VN0HPG12225',
    tprlFirstTradingDate: '2022-11-15', tprlLastTradingDate: '2025-11-01',
    interestRecordCycle: 5, cancelRecordCycle: 3, registeredVolume: 2000000,
    tradingEligibility: PRO, offeringEligibility: PRO,
    officialLetterNo: '1234/UBCK-QLPH', officialLetterDate: '2022-10-20',
    bondholderRepresentative: 'Công ty CP Chứng khoán SSI', notes: 'Đã tất toán đúng hạn, không phát sinh chậm trả.',
  },
  dossier(
    {
      bondCode: 'HPG12023_01', bondName: 'Trái phiếu Hòa Phát 2023-2026', currency: 'VND',
      issueDate: '2023-05-10', maturityDate: '2026-05-10', termValue: 3, termUnit: 'Năm',
      faceValue: 100000, issueVolume: 3000000, issueValue: B300, issueValueInWords: 'Ba trăm tỷ đồng',
      outstandingVolume: 0, outstandingValue: 0, outstandingValueInWords: 'Không đồng (đã tất toán)',
      issueMethod: PRIVATE_PRO, bondClass: 'TP thường',
      issuePurpose: 'Đầu tư dự án Khu liên hợp gang thép', issueMarket: 'Thị trường trong nước',
      principalPaymentMethod: 'Thanh toán 1 lần khi đáo hạn', interestPaymentMethod: 'Chuyển khoản định kỳ 3 tháng/lần',
      interestPaymentType: 'Trả lãi định kỳ', assumedInterestPeriods: 12, interestPeriod: 3, interestPeriodUnit: 'Tháng',
      firstInterestPaymentDate: '2023-08-10',
      interestRateType: 'Thả nổi', nominalInterestRate: 10.2, actualIssueInterestRate: 10.2,
      interestRateDeterminationMethod: 'Lãi suất tham chiếu (bình quân LSTK 12 tháng 4 NHTM) + biên độ 3,5%/năm',
      isConvertible: false, hasWarrant: false,
      isSecured: true, securityForm: 'Bảo đảm bằng quyền sử dụng đất và tài sản gắn liền với đất',
      bondForm: 'Ghi sổ', custodian: VSDC,
      creditRatingCode: 'XHTN-2023-0456', creditRatingResult: 'BBB+', creditRatingAgency: 'FiinRatings', creditRatingEffectiveDate: '2023-04-20',
      registrationStatus: 'Đã tất toán', tradingCode: 'HPGB2326', isinCode: 'VN0HPG12326',
      tprlFirstTradingDate: '2023-05-25', tprlLastTradingDate: '2026-05-10',
      interestRecordCycle: 5, cancelRecordCycle: 3, registeredVolume: 3000000,
      tradingEligibility: PRO, offeringEligibility: PRO,
      officialLetterNo: '2201/UBCK-QLPH', officialLetterDate: '2023-04-25',
      bondholderRepresentative: 'Công ty CP Chứng khoán SSI', notes: 'Có tài sản bảo đảm là quyền sử dụng đất tại KCN Dung Quất.',
    },
    {
      subData: {
        paymentSchedule: schedule([
          ['Trả lãi', B300, B300, '2023-08-10', '2023-08-10', 10.2, 7650000000],
          ['Trả lãi', B300, B300, '2023-11-10', '2023-11-10', 10.2, 7650000000],
          ['Trả lãi', B300, B300, '2024-02-10', '2024-02-12', 10.0, 7500000000],
          ['Trả lãi', B300, B300, '2024-05-10', '2024-05-10', 10.0, 7500000000],
          ['Trả lãi', B300, B300, '2024-08-10', '2024-08-10', 9.8, 7350000000],
          ['Trả lãi', B300, B300, '2024-11-10', '2024-11-11', 9.8, 7350000000],
          ['Trả lãi', B300, B300, '2025-02-10', '2025-02-10', 9.6, 7200000000],
          ['Trả lãi', B300, B300, '2025-05-10', '2025-05-10', 9.6, 7200000000],
          ['Trả lãi', B300, B300, '2025-08-10', '2025-08-10', 9.5, 7125000000],
          ['Trả lãi', B300, B300, '2025-11-10', '2025-11-10', 9.5, 7125000000],
          ['Trả lãi', B300, B300, '2026-02-10', '2026-02-10', 9.4, 7050000000],
          ['Trả gốc và lãi', B300, 0, '2026-05-10', '2026-05-10', 9.4, 307050000000],
        ]),
      },
    },
  ),
  {
    bondCode: 'HPG12024_01', bondName: 'Trái phiếu Hòa Phát 2024-2027 đợt 1', currency: 'VND',
    issueDate: '2024-03-15', maturityDate: '2027-03-15', termValue: 3, termUnit: 'Năm',
    faceValue: 100000, issueVolume: 3000000, issueValue: B300, issueValueInWords: 'Ba trăm tỷ đồng',
    outstandingVolume: 3000000, outstandingValue: B300, outstandingValueInWords: 'Ba trăm tỷ đồng',
    issueMethod: PRIVATE_PRO, bondClass: 'TP thường',
    issuePurpose: 'Bổ sung vốn lưu động', issueMarket: 'Thị trường trong nước',
    principalPaymentMethod: 'Thanh toán 1 lần khi đáo hạn', interestPaymentMethod: 'Chuyển khoản định kỳ 6 tháng/lần',
    interestPaymentType: 'Trả lãi định kỳ', assumedInterestPeriods: 6, interestPeriod: 6, interestPeriodUnit: 'Tháng',
    firstInterestPaymentDate: '2024-09-15',
    interestRateType: 'Cố định', nominalInterestRate: 9.5, actualIssueInterestRate: 9.5,
    interestRateDeterminationMethod: 'Lãi suất cố định theo thỏa thuận',
    isConvertible: false, hasWarrant: false, isSecured: false, bondForm: 'Ghi sổ', custodian: VSDC,
    registrationStatus: 'Đang lưu hành', tradingCode: 'HPGB2427', isinCode: 'VN0HPG12427',
    tprlFirstTradingDate: '2024-03-29', tprlLastTradingDate: '',
    interestRecordCycle: 5, cancelRecordCycle: 3, registeredVolume: 3000000,
    tradingEligibility: PRO, offeringEligibility: PRO,
    officialLetterNo: '890/UBCK-QLPH', officialLetterDate: '2024-02-28',
    bondholderRepresentative: 'Công ty CP Chứng khoán SSI', notes: '',
  },
  {
    bondCode: 'HPG12024_02', bondName: 'Trái phiếu Hòa Phát 2024-2029 đợt 2', currency: 'VND',
    issueDate: '2024-08-20', maturityDate: '2029-08-20', termValue: 5, termUnit: 'Năm',
    faceValue: 100000, issueVolume: 5000000, issueValue: 500000000000, issueValueInWords: 'Năm trăm tỷ đồng',
    outstandingVolume: 5000000, outstandingValue: 500000000000, outstandingValueInWords: 'Năm trăm tỷ đồng',
    issueMethod: PRIVATE_PRO, bondClass: 'TP xanh',
    issuePurpose: 'Đầu tư dự án năng lượng tái tạo phục vụ sản xuất', issueMarket: 'Thị trường trong nước',
    principalPaymentMethod: 'Thanh toán 1 lần khi đáo hạn', interestPaymentMethod: 'Chuyển khoản định kỳ 6 tháng/lần',
    interestPaymentType: 'Trả lãi định kỳ', assumedInterestPeriods: 10, interestPeriod: 6, interestPeriodUnit: 'Tháng',
    firstInterestPaymentDate: '2025-02-20',
    interestRateType: 'Kết hợp', nominalInterestRate: 8.8, actualIssueInterestRate: 8.9,
    interestRateDeterminationMethod: 'Cố định 3 kỳ đầu, thả nổi các kỳ sau theo lãi suất tham chiếu + 3%',
    isConvertible: false, hasWarrant: true, warrantExerciseRatio: 1.5, isSecured: false,
    bondForm: 'Ghi sổ', custodian: VSDC,
    creditRatingCode: 'XHTN-2024-0812', creditRatingResult: 'A-', creditRatingAgency: 'Saigon Ratings', creditRatingEffectiveDate: '2024-07-30',
    registrationStatus: 'Đang lưu hành', tradingCode: 'HPGB2429', isinCode: 'VN0HPG12429',
    tprlFirstTradingDate: '2024-09-03', tprlLastTradingDate: '',
    interestRecordCycle: 5, cancelRecordCycle: 3, registeredVolume: 5000000,
    tradingEligibility: PRO, offeringEligibility: PRO,
    officialLetterNo: '1567/UBCK-QLPH', officialLetterDate: '2024-08-05',
    bondholderRepresentative: 'Công ty CP Chứng khoán VNDirect', notes: 'Trái phiếu xanh, gắn với dự án điện mặt trời áp mái nhà máy.',
  },
  {
    bondCode: 'HPG12025_01', bondName: 'Trái phiếu chuyển đổi Hòa Phát 2025-2028', currency: 'VND',
    issueDate: '2025-01-15', maturityDate: '2028-01-15', termValue: 3, termUnit: 'Năm',
    faceValue: 100000, issueVolume: 4000000, issueValue: 400000000000, issueValueInWords: 'Bốn trăm tỷ đồng',
    outstandingVolume: 4000000, outstandingValue: 400000000000, outstandingValueInWords: 'Bốn trăm tỷ đồng',
    issueMethod: PRIVATE_PRO, bondClass: 'TP thường',
    issuePurpose: 'Tái cơ cấu nợ vay', issueMarket: 'Thị trường trong nước',
    principalPaymentMethod: 'Thanh toán 1 lần khi đáo hạn hoặc chuyển đổi thành cổ phiếu',
    interestPaymentMethod: 'Chuyển khoản định kỳ 12 tháng/lần',
    interestPaymentType: 'Trả lãi định kỳ', assumedInterestPeriods: 3, interestPeriod: 12, interestPeriodUnit: 'Tháng',
    firstInterestPaymentDate: '2026-01-15',
    interestRateType: 'Cố định', nominalInterestRate: 7.5, actualIssueInterestRate: 7.5,
    interestRateDeterminationMethod: 'Lãi suất cố định theo thỏa thuận',
    isConvertible: true, conversionRatio: 10, hasWarrant: false, isSecured: false,
    bondForm: 'Ghi sổ', custodian: VSDC,
    registrationStatus: 'Đang lưu hành', tradingCode: 'HPGB2528', isinCode: 'VN0HPG12528',
    tprlFirstTradingDate: '2025-01-29', tprlLastTradingDate: '',
    interestRecordCycle: 5, cancelRecordCycle: 3, registeredVolume: 4000000,
    tradingEligibility: PRO, offeringEligibility: PRO,
    officialLetterNo: '234/UBCK-QLPH', officialLetterDate: '2024-12-20',
    bondholderRepresentative: 'Công ty CP Chứng khoán VNDirect',
    notes: 'Tỷ lệ chuyển đổi: 1 trái phiếu mệnh giá 100.000đ đổi được 10 cổ phiếu HPG.',
  },
];

const BASE_ISSUERS: Issuer[] = [
  issuer({
    values: {
      name: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam', englishName: 'Bank for Investment and Development of Vietnam',
      shortName: 'BIDV', tradingName: 'BIDV', taxCode: '0100150619', businessType: 'Ngân hàng thương mại cổ phần',
      industry: 'Ngân hàng', establishedDate: '1957-04-26',
      address: 'Tháp BIDV, 35 Hàng Vôi, Hoàn Kiếm, Hà Nội', phone: '024 2220 5544', fax: '024 2220 0399',
      email: 'bidv@bidv.com.vn', website: 'bidv.com.vn', charterCapital: 68077353240000,
      businessLicenseNo: '0100150619', businessLicenseDate: '1990-11-26', businessLicensePlace: 'Sở Kế hoạch và Đầu tư TP. Hà Nội',
      legalRepresentative: 'Phan Đức Tú', disclosureContactName: 'Trần Thị Minh', disclosureContactPhone: '0912 111 222',
      disclosureContactEmail: 'cbtt@bidv.com.vn',
    },
    subsidiaries: [{ name: 'Công ty TNHH BIDV Cần Thơ', code: 'DN-1102', ratio: '100%' }],
    affiliates: [{ name: 'Công ty Liên doanh Bảo hiểm Lào Việt', code: 'DN-2201', ratio: '35%' }],
    changeHistory: [{ date: '2024-06-10', user: 'Nguyễn Văn A', field: 'Vốn điều lệ', change: '50.585.187.170.000 → 68.077.353.240.000' }],
    cp: {
      stockCode: 'BID', intlCode: '', submissionDate: '2013-11-20', officialApprovalDate: '2013-12-24', firstTradingDate: '2014-01-24',
      initialListedVolume: 2811364242, referencePrice: 18700, issuedShares: 5589408801, outstandingShares: 5589408801,
      treasuryShares: 0, foreignOwnershipLimit: 30,
    },
    tpny: [
      {
        bondCode: 'BID12027', bondName: 'Trái phiếu BIDV 2027', issueDate: '2022-06-15', firstTradingDate: '2022-07-01',
        maturityDate: '2027-06-15', faceValue: 100000, listedVolume: 5000000, totalFaceValue: 500000000000,
        interestRateType: 'Thả nổi', interestRate: 7.2, bondType: 'Trái phiếu thường',
      },
    ],
  }),
  issuer({
    values: {
      name: 'Công ty Cổ phần Tập đoàn Hòa Phát', englishName: 'Hoa Phat Group Joint Stock Company', shortName: 'HPG',
      tradingName: 'Hòa Phát', taxCode: '0900189284', businessType: 'Công ty cổ phần', industry: 'Sản xuất - Công nghiệp',
      establishedDate: '1992-08-09', address: 'Khu công nghiệp Phố Nối A, Văn Lâm, Hưng Yên', phone: '0221 3835 850',
      fax: '0221 3835 851', email: 'info@hoaphat.com.vn', website: 'hoaphat.com.vn', charterCapital: 63899802780000,
      businessLicenseNo: '0900189284', businessLicenseDate: '1992-08-09', businessLicensePlace: 'Sở Kế hoạch và Đầu tư tỉnh Hưng Yên',
      legalRepresentative: 'Trần Đình Long', disclosureContactName: 'Phạm Thị Kim Oanh', disclosureContactPhone: '0913 222 333',
      disclosureContactEmail: 'cbtt@hoaphat.com.vn',
    },
    cp: {
      stockCode: 'HPG', intlCode: '', submissionDate: '2007-10-05', officialApprovalDate: '2007-11-08', firstTradingDate: '2007-11-15',
      initialListedVolume: 59999952, referencePrice: 19000, issuedShares: 6394980278, outstandingShares: 6390125300,
      treasuryShares: 4854978, foreignOwnershipLimit: 49,
    },
    tprl: HPG_TPRL,
    subsidiaries: [
      { name: 'Công ty CP Thép Hòa Phát Dung Quất', code: 'DN-3305', ratio: '100%' },
      { name: 'Công ty TNHH MTV Ống thép Hòa Phát', code: 'DN-3311', ratio: '100%' },
    ],
  }),
  issuer({
    values: {
      name: 'Công ty Cổ phần Sữa Việt Nam', englishName: 'Vietnam Dairy Products Joint Stock Company', shortName: 'VNM',
      tradingName: 'Vinamilk', taxCode: '0300588569', businessType: 'Công ty cổ phần', industry: 'Thương mại - Dịch vụ',
      establishedDate: '1976-08-20', address: '10 Tân Trào, Phường Tân Phú, Quận 7, TP.HCM', phone: '028 5415 5555',
      fax: '028 5415 5099', email: 'vinamilk@vinamilk.com.vn', website: 'vinamilk.com.vn', charterCapital: 20899554450000,
      businessLicenseNo: '0300588569', businessLicenseDate: '1976-08-20', businessLicensePlace: 'Sở Kế hoạch và Đầu tư TP. Hồ Chí Minh',
      legalRepresentative: 'Mai Kiều Liên', disclosureContactName: 'Nguyễn Thị Kim Oanh', disclosureContactPhone: '0914 333 444',
      disclosureContactEmail: 'cbtt@vinamilk.com.vn',
    },
    cp: {
      stockCode: 'VNM', intlCode: '', submissionDate: '2005-12-20', officialApprovalDate: '2006-01-10', firstTradingDate: '2006-01-19',
      initialListedVolume: 159000000, referencePrice: 53000, issuedShares: 2089955445, outstandingShares: 2085900000,
      treasuryShares: 4055445, foreignOwnershipLimit: 100,
    },
    subsidiaries: [{ name: 'Công ty TNHH MTV Bò sữa Việt Nam', code: 'DN-4102', ratio: '100%' }],
  }),
  issuer({
    values: {
      name: 'Công ty Cổ phần Vinhomes', englishName: 'Vinhomes Joint Stock Company', shortName: 'VHM', tradingName: 'Vinhomes',
      taxCode: '0107446819', businessType: 'Công ty cổ phần', industry: 'Bất động sản', establishedDate: '2008-01-14',
      address: '7 Bằng Lăng 1, Vinhomes Riverside, Long Biên, Hà Nội', phone: '024 3974 9999', fax: '024 3974 8888',
      email: 'info@vinhomes.vn', website: 'vinhomes.vn', charterCapital: 43543600700000,
      businessLicenseNo: '0107446819', businessLicenseDate: '2008-01-14', businessLicensePlace: 'Sở Kế hoạch và Đầu tư TP. Hà Nội',
      legalRepresentative: 'Phạm Thiếu Hoa', disclosureContactName: 'Phạm Thúy Hằng', disclosureContactPhone: '0915 444 555',
      disclosureContactEmail: 'cbtt@vinhomes.vn',
    },
    cp: {
      stockCode: 'VHM', intlCode: '', submissionDate: '2018-04-20', officialApprovalDate: '2018-05-08', firstTradingDate: '2018-05-17',
      initialListedVolume: 3350344905, referencePrice: 92100, issuedShares: 4354360070, outstandingShares: 4354360070,
      treasuryShares: 0, foreignOwnershipLimit: 30,
    },
    parents: [{ name: 'Tập đoàn Vingroup - Công ty CP', code: 'DN-0088', ratio: '68,4%' }],
  }),
  issuer({
    values: {
      name: 'Tổng Công ty Cổ phần Bảo hiểm Bưu điện', englishName: 'Post and Telecommunication Joint Stock Insurance Corporation',
      shortName: 'PTI', tradingName: 'PTI', taxCode: '0100776877', businessType: 'Tổng công ty', industry: 'Bảo hiểm',
      statusFlg: 0, establishedDate: '1995-05-01', address: '4B Láng Hạ, Ba Đình, Hà Nội', phone: '024 3773 7373',
      fax: '024 3773 7376', email: 'pti@pti.com.vn', website: 'pti.com.vn', charterCapital: 800000000000,
      businessLicenseNo: '0100776877', businessLicenseDate: '1995-05-01', businessLicensePlace: 'Sở Kế hoạch và Đầu tư TP. Hà Nội',
      legalRepresentative: 'Bùi Nam Cường', disclosureContactName: 'Bùi Thị Hồng', disclosureContactPhone: '0916 555 666',
      disclosureContactEmail: 'cbtt@pti.com.vn',
    },
  }),
  issuer({
    values: {
      name: 'Công ty Cổ phần Chứng khoán SSI', englishName: 'SSI Securities Corporation', shortName: 'SSI', tradingName: 'SSI',
      taxCode: '0300884748', businessType: 'Công ty cổ phần', industry: 'Chứng khoán', establishedDate: '1999-12-30',
      address: '72 Nguyễn Huệ, Bến Nghé, Quận 1, TP.HCM', phone: '028 3824 2897', fax: '028 3824 2898',
      email: 'ssi@ssi.com.vn', website: 'ssi.com.vn', charterCapital: 19639000000000,
      businessLicenseNo: '0300884748', businessLicenseDate: '1999-12-30', businessLicensePlace: 'Sở Kế hoạch và Đầu tư TP. Hồ Chí Minh',
      legalRepresentative: 'Nguyễn Duy Hưng', disclosureContactName: 'Nguyễn Thị Thu Hằng', disclosureContactPhone: '0917 666 777',
      disclosureContactEmail: 'cbtt@ssi.com.vn',
    },
    cp: {
      stockCode: 'SSI', intlCode: '', submissionDate: '2006-10-15', officialApprovalDate: '2006-11-25', firstTradingDate: '2006-12-15',
      initialListedVolume: 52000000, referencePrice: 26000, issuedShares: 1963900000, outstandingShares: 1962800000,
      treasuryShares: 1100000, foreignOwnershipLimit: 100,
    },
    subsidiaries: [{ name: 'Công ty TNHH Quản lý Quỹ SSI', code: 'DN-5210', ratio: '100%' }],
  }),
  issuer({
    values: {
      name: 'Công ty Cổ phần Tập đoàn Xây dựng Hòa Bình', englishName: 'Hoa Binh Construction Group Joint Stock Company',
      shortName: 'HBC', tradingName: 'Hòa Bình', taxCode: '0301446005', businessType: 'Công ty cổ phần', industry: 'Xây dựng',
      establishedDate: '1987-09-27', address: '235 Võ Thị Sáu, Phường 7, Quận 3, TP.HCM', phone: '028 3932 1170',
      fax: '028 3932 1171', email: 'info@hbc.com.vn', website: 'hoabinhcorporation.com', charterCapital: 2741000000000,
      businessLicenseNo: '0301446005', businessLicenseDate: '1987-09-27', businessLicensePlace: 'Sở Kế hoạch và Đầu tư TP. Hồ Chí Minh',
      legalRepresentative: 'Lê Viết Hải', disclosureContactName: 'Lê Thị Kim Ngân', disclosureContactPhone: '0918 777 888',
      disclosureContactEmail: 'cbtt@hbc.com.vn',
    },
    tprl: [
      {
        bondCode: 'HBC12123', bondName: 'Trái phiếu Hòa Bình 2023', issueDate: '2020-12-20', maturityDate: '2023-12-20',
        termValue: 3, termUnit: 'Năm', faceValue: 100000, issueVolume: 2000000, issueValue: 200000000000,
        outstandingVolume: 1500000, outstandingValue: 150000000000, issueMethod: 'Chào bán riêng lẻ cho nhà đầu tư chuyên nghiệp',
        bondClass: 'TP thường', interestPaymentType: 'Trả lãi định kỳ', interestPeriod: 6, interestRateType: 'Cố định',
        nominalInterestRate: 10.5, isConvertible: false, hasWarrant: false, isSecured: true, custodian: VSDC,
      },
    ],
    changeHistory: [
      { date: '2023-11-02', user: 'Hệ thống (đồng bộ CBONDS)', field: 'Người đại diện theo pháp luật', change: 'Lê Văn Nam → Lê Viết Hải' },
    ],
  }),
  issuer({
    values: {
      name: 'Tổng Công ty Điện lực Dầu khí Việt Nam', englishName: 'PetroVietnam Power Corporation', shortName: 'POW',
      tradingName: 'PV Power', taxCode: '0106762066', businessType: 'Tổng công ty', industry: 'Năng lượng',
      establishedDate: '2007-06-08', address: 'Tòa nhà Charmvit, 117 Trần Duy Hưng, Cầu Giấy, Hà Nội', phone: '024 6666 1000',
      fax: '024 6666 1001', email: 'info@pvpower.vn', website: 'pvpower.vn', charterCapital: 23418716150000,
      businessLicenseNo: '0106762066', businessLicenseDate: '2007-06-08', businessLicensePlace: 'Sở Kế hoạch và Đầu tư TP. Hà Nội',
      legalRepresentative: 'Lê Như Linh', disclosureContactName: 'Trịnh Thị Thanh Huyền', disclosureContactPhone: '0919 888 999',
      disclosureContactEmail: 'cbtt@pvpower.vn',
    },
    cp: {
      stockCode: 'POW', intlCode: '', submissionDate: '2018-01-05', officialApprovalDate: '2018-01-15', firstTradingDate: '2018-01-31',
      initialListedVolume: 2342000000, referencePrice: 14900, issuedShares: 2342871305, outstandingShares: 2342871305,
      treasuryShares: 0, foreignOwnershipLimit: 49,
    },
    parents: [{ name: 'Tập đoàn Dầu khí Việt Nam (PVN)', code: 'DN-0011', ratio: '79,9%' }],
  }),
];

/** `newIssuerRows` — tên/mã thật, địa chỉ/SĐT/MST minh họa. */
const EXTRA_ISSUER_ROWS: Array<[string, string, string, string, string, string, string, string, string, string, number]> = [
  ['Ngân hàng TMCP Ngoại thương Việt Nam', 'Joint Stock Commercial Bank for Foreign Trade of Vietnam', 'VCB', 'Vietcombank', '0100112437', 'Ngân hàng thương mại cổ phần', 'Ngân hàng', '1963-04-01', '198 Trần Quang Khải, Hoàn Kiếm, Hà Nội', '024 3934 3137', 55891000000000],
  ['Ngân hàng TMCP Kỹ Thương Việt Nam', 'Vietnam Technological and Commercial Joint Stock Bank', 'TCB', 'Techcombank', '0100230800', 'Ngân hàng thương mại cổ phần', 'Ngân hàng', '1993-09-27', '6 Quang Trung, Hoàn Kiếm, Hà Nội', '024 3944 6368', 35225000000000],
  ['Ngân hàng TMCP Quân đội', 'Military Commercial Joint Stock Bank', 'MBB', 'MB Bank', '0100283873', 'Ngân hàng thương mại cổ phần', 'Ngân hàng', '1994-11-04', '18 Lê Văn Lương, Thanh Xuân, Hà Nội', '024 6266 1088', 52141000000000],
  ['Ngân hàng TMCP Việt Nam Thịnh Vượng', 'Vietnam Prosperity Joint Stock Commercial Bank', 'VPB', 'VPBank', '0100233583', 'Ngân hàng thương mại cổ phần', 'Ngân hàng', '1993-08-12', '89 Láng Hạ, Đống Đa, Hà Nội', '024 3928 8880', 79339000000000],
  ['Công ty Cổ phần Tập đoàn Đầu tư Địa ốc No Va', 'No Va Land Investment Group Corporation', 'NVL', 'Novaland', '0304829885', 'Công ty cổ phần', 'Bất động sản', '1992-09-18', '65 Nguyễn Du, Bến Nghé, Quận 1, TP.HCM', '028 3914 5777', 19506000000000],
  ['Công ty Cổ phần Tập đoàn Đất Xanh', 'Dat Xanh Group Joint Stock Company', 'DXG', 'Đất Xanh Group', '0303701976', 'Công ty cổ phần', 'Bất động sản', '2003-05-05', '93A Điện Biên Phủ, Đa Kao, Quận 1, TP.HCM', '028 3812 0000', 7188000000000],
  ['Công ty Cổ phần Đầu tư Thế Giới Di Động', 'Mobile World Investment Corporation', 'MWG', 'Thế Giới Di Động', '0306731877', 'Công ty cổ phần', 'Thương mại - Dịch vụ', '2004-03-16', '128 Trần Quang Khải, Tân Định, Quận 1, TP.HCM', '028 3622 1024', 14690000000000],
  ['Công ty Cổ phần Bán lẻ Kỹ thuật số FPT', 'FPT Digital Retail Joint Stock Company', 'FRT', 'FPT Retail', '0309675485', 'Công ty cổ phần', 'Thương mại - Dịch vụ', '2007-01-08', '261-263 Khánh Hội, Phường 5, Quận 4, TP.HCM', '028 7300 2222', 1391000000000],
  ['Công ty Cổ phần FPT', 'FPT Corporation', 'FPT', 'FPT Corp', '0101248163', 'Công ty cổ phần', 'Khác', '1988-09-13', 'Tòa nhà FPT, số 10 Phạm Văn Bạch, Cầu Giấy, Hà Nội', '024 7300 7300', 12030000000000],
  ['Tổng Công ty Hàng không Việt Nam', 'Vietnam Airlines JSC', 'HVN', 'Vietnam Airlines', '0100107518', 'Doanh nghiệp nhà nước', 'Khác', '1993-01-27', '200 Nguyễn Sơn, Long Biên, Hà Nội', '024 3872 0500', 22143000000000],
  ['Công ty Cổ phần Hàng không Vietjet', 'Vietjet Aviation Joint Stock Company', 'VJC', 'Vietjet Air', '0102325399', 'Công ty cổ phần', 'Khác', '2007-11-30', 'Số 302/3 Kim Mã, Ba Đình, Hà Nội', '028 3592 0091', 5416000000000],
  ['Công ty Cổ phần Tập đoàn Masan', 'Masan Group Corporation', 'MSN', 'Masan Group', '0303576603', 'Công ty cổ phần', 'Sản xuất - Công nghiệp', '2004-11-18', 'Tầng 8, Tòa nhà Central Plaza, 17 Lê Duẩn, Quận 1, TP.HCM', '028 6256 3862', 14237000000000],
  ['Tổng Công ty CP Bia - Rượu - Nước giải khát Sài Gòn', 'Saigon Beer - Alcohol - Beverage Corporation', 'SAB', 'Sabeco', '0300583659', 'Công ty cổ phần', 'Sản xuất - Công nghiệp', '1977-06-01', '187 Nguyễn Chí Thanh, Phường 12, Quận 5, TP.HCM', '028 3829 4081', 6412000000000],
  ['Công ty Cổ phần Tập đoàn Hoa Sen', 'Hoa Sen Group', 'HSG', 'Hoa Sen Group', '3700381324', 'Công ty cổ phần', 'Sản xuất - Công nghiệp', '2001-08-08', 'KCN Sóng Thần 2, Dĩ An, Bình Dương', '0274 3790 000', 4849000000000],
];

/** `addCp` — ngày niêm yết theo mốc công khai, số liệu cổ phần minh họa. */
const EXTRA_CP: Record<string, Values> = {
  VCB: { stockCode: 'VCB', submissionDate: '2009-05-20', officialApprovalDate: '2009-06-19', firstTradingDate: '2009-06-30', initialListedVolume: 112285240, referencePrice: 50000, issuedShares: 5589180677, outstandingShares: 5589180677, treasuryShares: 0, foreignOwnershipLimit: 30 },
  TCB: { stockCode: 'TCB', submissionDate: '2018-05-04', officialApprovalDate: '2018-05-25', firstTradingDate: '2018-06-04', initialListedVolume: 1165030000, referencePrice: 128000, issuedShares: 7057231628, outstandingShares: 7057231628, treasuryShares: 0, foreignOwnershipLimit: 22.5 },
  MBB: { stockCode: 'MBB', submissionDate: '2011-10-10', officialApprovalDate: '2011-10-25', firstTradingDate: '2011-11-01', initialListedVolume: 730000000, referencePrice: 13300, issuedShares: 5300000000, outstandingShares: 5300000000, treasuryShares: 0, foreignOwnershipLimit: 23.23 },
  VPB: { stockCode: 'VPB', submissionDate: '2017-07-20', officialApprovalDate: '2017-08-08', firstTradingDate: '2017-08-17', initialListedVolume: 1332000000, referencePrice: 39000, issuedShares: 7933944966, outstandingShares: 7933944966, treasuryShares: 0, foreignOwnershipLimit: 15 },
  NVL: { stockCode: 'NVL', submissionDate: '2016-12-01', officialApprovalDate: '2016-12-20', firstTradingDate: '2016-12-28', initialListedVolume: 589461264, referencePrice: 37500, issuedShares: 1950567857, outstandingShares: 1950567857, treasuryShares: 0, foreignOwnershipLimit: 49 },
  MWG: { stockCode: 'MWG', submissionDate: '2014-06-20', officialApprovalDate: '2014-07-04', firstTradingDate: '2014-07-14', initialListedVolume: 44228000, referencePrice: 68000, issuedShares: 1468910000, outstandingShares: 1462000000, treasuryShares: 6910000, foreignOwnershipLimit: 49 },
  FPT: { stockCode: 'FPT', submissionDate: '2006-11-20', officialApprovalDate: '2006-12-04', firstTradingDate: '2006-12-13', initialListedVolume: 60810000, referencePrice: 400000, issuedShares: 1203000000, outstandingShares: 1203000000, treasuryShares: 0, foreignOwnershipLimit: 49 },
  HVN: { stockCode: 'HVN', submissionDate: '2019-04-10', officialApprovalDate: '2019-04-25', firstTradingDate: '2019-05-07', initialListedVolume: 1417467339, referencePrice: 40600, issuedShares: 2214126724, outstandingShares: 2214126724, treasuryShares: 0, foreignOwnershipLimit: 20 },
  MSN: { stockCode: 'MSN', submissionDate: '2009-10-15', officialApprovalDate: '2009-10-30', firstTradingDate: '2009-11-05', initialListedVolume: 200000000, referencePrice: 36000, issuedShares: 1423746487, outstandingShares: 1423746487, treasuryShares: 0, foreignOwnershipLimit: 49 },
  SAB: { stockCode: 'SAB', submissionDate: '2016-11-20', officialApprovalDate: '2016-12-01', firstTradingDate: '2016-12-06', initialListedVolume: 641281186, referencePrice: 110000, issuedShares: 641281186, outstandingShares: 641281186, treasuryShares: 0, foreignOwnershipLimit: 49 },
};

/** `newBondRows` — 14 TPRL cho 7 TCPH. */
const EXTRA_BONDS: Array<[string, string, string, string, string, number, string, number, number, number, number]> = [
  ['VCB', 'VCB12401', 'Trái phiếu Vietcombank 2024-2027', '2024-03-01', '2027-03-01', 3, 'Năm', 100000, 5000000, 500000000000, 8.2],
  ['VCB', 'VCB12402', 'Trái phiếu Vietcombank 2024-2031', '2024-09-15', '2031-09-15', 7, 'Năm', 100000, 3000000, 300000000000, 8.6],
  ['TCB', 'TCB12401', 'Trái phiếu Techcombank 2024-2026', '2024-02-10', '2026-02-10', 2, 'Năm', 100000, 4000000, 400000000000, 7.8],
  ['TCB', 'TCB12402', 'Trái phiếu Techcombank 2024-2028', '2024-07-05', '2028-07-05', 4, 'Năm', 100000, 3500000, 350000000000, 8.1],
  ['MBB', 'MBB12401', 'Trái phiếu MB Bank 2024-2027', '2024-01-20', '2027-01-20', 3, 'Năm', 100000, 4500000, 450000000000, 7.9],
  ['MBB', 'MBB12402', 'Trái phiếu MB Bank 2024-2029', '2024-06-18', '2029-06-18', 5, 'Năm', 100000, 2500000, 250000000000, 8.3],
  ['VPB', 'VPB12401', 'Trái phiếu VPBank 2024-2026', '2024-04-02', '2026-04-02', 2, 'Năm', 100000, 3000000, 300000000000, 8.0],
  ['VPB', 'VPB12402', 'Trái phiếu VPBank 2024-2030', '2024-10-10', '2030-10-10', 6, 'Năm', 100000, 2000000, 200000000000, 8.7],
  ['NVL', 'NVL12301', 'Trái phiếu Novaland 2023-2026', '2023-05-15', '2026-05-15', 3, 'Năm', 100000, 2000000, 200000000000, 11.5],
  ['NVL', 'NVL12401', 'Trái phiếu Novaland 2024-2027', '2024-03-20', '2027-03-20', 3, 'Năm', 100000, 1500000, 150000000000, 11.2],
  ['MSN', 'MSN12401', 'Trái phiếu Masan Group 2024-2027', '2024-02-28', '2027-02-28', 3, 'Năm', 100000, 3000000, 300000000000, 9.5],
  ['MSN', 'MSN12402', 'Trái phiếu Masan Group 2024-2029', '2024-08-12', '2029-08-12', 5, 'Năm', 100000, 2000000, 200000000000, 9.8],
  ['SAB', 'SAB12401', 'Trái phiếu Sabeco 2024-2027', '2024-05-06', '2027-05-06', 3, 'Năm', 100000, 1500000, 150000000000, 7.5],
  ['SAB', 'SAB12402', 'Trái phiếu Sabeco 2024-2028', '2024-11-11', '2028-11-11', 4, 'Năm', 100000, 1000000, 100000000000, 7.7],
];

const EXTRA_ISSUERS: Issuer[] = EXTRA_ISSUER_ROWS.map((r) =>
  issuer({
    values: {
      name: r[0], englishName: r[1], shortName: r[2], tradingName: r[3], taxCode: r[4], businessType: r[5],
      industry: r[6], establishedDate: r[7], address: r[8], phone: r[9], fax: '', email: '', website: '',
      charterCapital: r[10], businessLicenseNo: r[4], businessLicenseDate: r[7], businessLicensePlace: 'Sở Kế hoạch và Đầu tư',
      legalRepresentative: '', disclosureContactName: '', disclosureContactPhone: '', disclosureContactEmail: '',
    },
    cp: EXTRA_CP[r[2]] ?? null,
    tprl: EXTRA_BONDS.filter((b) => b[0] === r[2]).map((b) => ({
      bondCode: b[1], bondName: b[2], currency: 'VND', issueDate: b[3], maturityDate: b[4], termValue: b[5], termUnit: b[6],
      faceValue: b[7], issueVolume: b[8], issueValue: b[9], outstandingVolume: b[8], outstandingValue: b[9],
      issueMethod: PRIVATE_PRO, bondClass: 'TP thường', interestRateType: 'Cố định',
      nominalInterestRate: b[10], actualIssueInterestRate: b[10],
      isConvertible: false, hasWarrant: false, isSecured: b[0] === 'NVL', securityForm: b[0] === 'NVL' ? 'Bảo đảm bằng tài sản' : '',
      bondForm: 'Ghi sổ', custodian: VSDC,
    })),
  }),
);

/* ------------------------------------------------------------ Nhà đầu tư */

function investor(id: number, kind: Investor['kind'], values: Values): Investor {
  return { id, ...AUDIT, statusFlg: 1, kind, values, familyRelations: [] };
}

const CCCD = 'CCCD (Căn cước công dân)';
const person = (id: number, name: string) =>
  investor(id, 'person', { name, nationality: 'Việt Nam', docType: CCCD, docNo: '', dob: '', docIssueDate: '', docIssuePlace: '', phone: '', email: '', permanentAddress: '', contactAddress: '' });
const org = (id: number, v: Values) =>
  investor(id, 'org', { docNo: '', docIssueDate: '', legalRepresentative: '', address: '', phone: '', email: '', website: '', nameEn: '', ...v });

const INVESTORS: Investor[] = [
  person(1, 'Trần Đình Long'),
  person(2, 'Vũ Thị Hiền'),
  person(3, 'Trần Vũ Minh'),
  person(4, 'Mai Kiều Liên'),
  person(5, 'Nguyễn Duy Hưng'),
  person(6, 'Phạm Thiếu Hoa'),
  person(7, 'Phan Đức Tú'),
  org(8, { name: 'Tổng công ty Đầu tư và Kinh doanh vốn Nhà nước', nameEn: 'State Capital Investment Corporation', shortName: 'SCIC', orgType: 'Doanh nghiệp nhà nước', nationality: 'Việt Nam', website: 'https://scic.vn' }),
  org(9, { name: 'F&N Dairy Investments Pte. Ltd.', nameEn: 'F&N Dairy Investments Pte. Ltd.', shortName: 'FNDI', orgType: 'Quỹ Đầu tư / Tổ chức nước ngoài', nationality: 'Singapore' }),
  org(10, { name: 'Dragon Capital', nameEn: 'Dragon Capital Group', shortName: 'Dragon Capital', orgType: 'Quỹ Đầu tư / Tổ chức nước ngoài', nationality: 'Việt Nam', website: 'https://dragoncapital.com.vn' }),
  org(11, { name: 'Công ty TNHH Thương mại và Đầu tư Đại Phong', shortName: 'Đại Phong', orgType: 'Công ty TNHH Một thành viên', legalRepresentative: 'Trần Vũ Minh', nationality: 'Việt Nam' }),
  org(12, { name: 'Tập đoàn Vingroup - Công ty Cổ phần', nameEn: 'Vingroup Joint Stock Company', shortName: 'Vingroup', orgType: 'Công ty Cổ phần', nationality: 'Việt Nam', website: 'https://vingroup.net' }),
];

/** Quan hệ gia đình đã công bố: ông Long — bà Hiền (vợ/chồng) — ông Minh (con). */
INVESTORS[0].familyRelations.push({ relatedId: 2, relation: 'Vợ/chồng' }, { relatedId: 3, relation: 'Con đẻ' });
INVESTORS[1].familyRelations.push({ relatedId: 1, relation: 'Vợ/chồng' }, { relatedId: 3, relation: 'Con đẻ' });
INVESTORS[2].familyRelations.push({ relatedId: 1, relation: 'Bố' }, { relatedId: 2, relation: 'Mẹ' });

/* --------------------------------------------------------- Cổ đông / NNB */

const ALL_ISSUERS = [...BASE_ISSUERS, ...EXTRA_ISSUERS];

function holder(investorId: number, roles: string[], holdingQty: number | null, ratio: number | null, startDate: string, position = ''): Holder {
  return { investorId, roles, position, holdingQty, ratio, startDate, tradingAccounts: [] };
}

function seedHolders(shortName: string, holders: Holder[]) {
  const cp = ALL_ISSUERS.find((i) => i.values.shortName === shortName)?.dossiers.cp;
  if (cp) cp.holders = holders;
}

seedHolders('HPG', [
  holder(1, ['CĐL', 'NNB'], 1980000000, 25.8, '2007-11-15', 'Chủ tịch HĐQT'),
  holder(2, ['CĐL', 'NLQ'], 528000000, 6.88, '2007-11-15'),
  holder(3, ['NLQ'], 206700000, 2.73, '2007-11-15'),
  holder(11, ['NLQ'], 3600000, 0.047, '2007-11-15'),
  holder(10, ['CĐL'], null, null, ''),
]);
seedHolders('BIDV', [holder(7, ['NNB'], null, null, '2014-01-24')]);
seedHolders('VNM', [
  holder(8, ['CĐL'], 752500000, 36, '2006-01-19'),
  holder(9, ['CĐL'], 522300000, 24.99, '2017-12-01'),
  holder(4, ['NNB'], null, null, '2006-01-19'),
]);
seedHolders('VHM', [holder(12, ['CĐL'], null, 68.4, '2018-05-17'), holder(6, ['NNB'], null, null, '2018-05-17')]);
seedHolders('SSI', [holder(5, ['NNB'], null, null, '2006-12-15')]);

export const SEED_ISSUERS: readonly Issuer[] = ALL_ISSUERS;
export const SEED_INVESTORS: readonly Investor[] = INVESTORS;
