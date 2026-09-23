/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  INITIAL_ORGANIZATIONS,
  INITIAL_SECURITIES,
  INITIAL_EQUITY_PROFILES,
  INITIAL_BOND_PROFILES,
  INITIAL_SUBMISSIONS,
  INITIAL_ALERTS,
  INITIAL_SURVEILLANCE_RECORDS,
  INITIAL_DOSSIERS,
  INITIAL_OBLIGATIONS,
  INITIAL_USERS,
  INITIAL_TEMPLATES,
  INITIAL_AUDIT_LOGS,
  INITIAL_NOTIFICATIONS,
} from './data/mockData';
import {
  UserAccount,
  Submission,
  SubmissionStatus,
  AuditLog,
  NotificationItem,
  Alert,
  SurveillanceRecord,
  RegistrationDossier,
  TemplateDefinition,
  FeeRecord,
} from './types/hnx';
import { notificationService } from './services/notificationService';
import { buildAiDraftTranslation } from './data/translationGlossary';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { ImsTopHeader } from './components/layout/ImsTopHeader';
import { AuditHistoryModal } from './components/common/AuditHistoryModal';
import { PublicCorporateNews } from './components/portals/PublicCorporateNews';
import { PublicNewsHeader } from './components/portals/PublicNewsHeader';
import { CorporatePortal } from './components/portals/CorporatePortal';
import { DashboardModule } from './components/modules/DashboardModule';
import { ListingModule } from './components/modules/ListingModule';
import { AiCenterModule } from './components/modules/AiCenterModule';
import { BondModule } from './components/modules/BondModule';
import { DisclosureModule } from './components/modules/DisclosureModule';
import { AdminModule } from './components/modules/AdminModule';
import { MetadataModule } from './components/modules/MetadataModule';
import { AccessModule } from './components/modules/AccessModule';
import { SurveillanceModule } from './components/modules/SurveillanceModule';
import { OwnershipModule } from './components/modules/OwnershipModule';
import { BondExtraModule } from './components/modules/BondExtraModule';
import { DisclosureExtraModule } from './components/modules/DisclosureExtraModule';
import { ReportModule } from './components/modules/ReportModule';
import { SurveyModule } from './components/modules/SurveyModule';
import { LoginScreen } from './components/layout/LoginScreen';
import { INITIAL_SECURITY_POLICY } from './data/accessMock';
import { EXTRA_TEMPLATES } from './data/businessMock';
import { usePortalRoute, portalFromPath } from './lib/portalRoute';
import {
  DEFAULT_IMS_MODULE,
  imsModuleFromPath,
  imsPathForModule,
  isImsUseCaseModule,
} from './lib/imsRoutes';
import { UseCaseRouter } from './components/modules/usecases';

export default function App() {
  /**
   * Ba cổng là ba địa chỉ URL riêng (/ims, /icds, /hnxcns) chứ không phải ba tab.
   * `usePortalRoute` đọc đường dẫn hiện tại và nghe nút Back của trình duyệt.
   */
  const { portal: activePortal } = usePortalRoute();

  /**
   * Module mặc định phụ thuộc cổng: vào /icds là vào thẳng dashboard doanh
   * nghiệp, không phải dashboard nội bộ.
   */
  const [activeModule, setActiveModule] = useState<string>(() => {
    const path = typeof window === 'undefined' ? '/hnxcns' : window.location.pathname;
    if (portalFromPath(path) === 'corporate') return 'corp_dashboard';
    return imsModuleFromPath(path) ?? DEFAULT_IMS_MODULE;
  });

  /**
   * Bấm menu /ims phải đổi cả màn hình lẫn đường dẫn.
   *
   * Các chức năng có SRS mang một URL thật (`/ims/<ma-uc>`) nên gửi link được;
   * những module chỉ điều hướng bằng state như trước (qlny_*, meta_*...) không có
   * slug riêng, `imsPathForModule` trả về `/ims` và đường dẫn giữ nguyên.
   */
  const changeModule = useCallback(
    (moduleCode: string) => {
      setActiveModule(moduleCode);

      if (activePortal !== 'internal') return;

      const nextPath = imsPathForModule(moduleCode);
      if (window.location.pathname !== nextPath) {
        window.history.pushState({}, '', nextPath);
      }
    },
    [activePortal],
  );

  /**
   * Nút Back/Forward của trình duyệt phải kéo màn hình đi theo. `usePortalRoute`
   * chỉ nghe popstate để biết đang ở cổng nào — nó không biết gì về module.
   */
  useEffect(() => {
    const onPop = () => {
      const moduleCode = imsModuleFromPath(window.location.pathname);
      if (moduleCode) setActiveModule(moduleCode);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const [lang, setLang] = useState<'vi' | 'en'>('vi');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Personas
  const [users] = useState<UserAccount[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<UserAccount>(INITIAL_USERS[1]); // Cán bộ P.QLNY by default

  /** FR-060 — trạng thái đăng nhập của cổng IMS. */
  const [authenticated, setAuthenticated] = useState(false);

  /**
   * Phiên đăng nhập của ICDS và Corporate News.
   *
   * Cả ba cổng giờ đều bắt đăng nhập, nhưng mỗi cổng nhận đúng một nhóm tài
   * khoản (`PORTAL_ACTOR_TYPE`) nên không thể dùng chung `currentUser`/
   * `authenticated` của IMS — một tài khoản HNX đang mở /ims không có nghĩa là
   * đã đăng nhập /icds. `null` = chưa đăng nhập cổng đó.
   */
  const [icdsUser, setIcdsUser] = useState<UserAccount | null>(null);
  const [newsUser, setNewsUser] = useState<UserAccount | null>(null);

  // Entities Data
  const [organizations] = useState(INITIAL_ORGANIZATIONS);
  const [securities] = useState(INITIAL_SECURITIES);
  const [equityProfiles] = useState(INITIAL_EQUITY_PROFILES);
  const [bondProfiles] = useState(INITIAL_BOND_PROFILES);
  const [submissions, setSubmissions] = useState<Submission[]>(INITIAL_SUBMISSIONS);
  const [alerts] = useState<Alert[]>(INITIAL_ALERTS);
  const [surveillanceRecords] = useState<SurveillanceRecord[]>(INITIAL_SURVEILLANCE_RECORDS);
  const [dossiers, setDossiers] = useState<RegistrationDossier[]>(INITIAL_DOSSIERS);
  const [obligations] = useState(INITIAL_OBLIGATIONS);
  /**
   * EXTRA_TEMPLATES bổ sung mẫu cho bốn nhóm tin trước đây không có mẫu nào
   * (BOND, TRADING, ON_DEMAND, OFFERING). Thiếu chúng thì FR-035/036/037 tuy có
   * nhóm tin trong enum nhưng doanh nghiệp mở màn nộp hồ sơ ra không chọn được gì.
   */
  const [templates, setTemplates] = useState<TemplateDefinition[]>([
    ...INITIAL_TEMPLATES,
    ...EXTRA_TEMPLATES,
  ]);
  const [tasks] = useState([]);
  const [fees] = useState<FeeRecord[]>([
    {
      id: 1,
      createdAt: '2026-01-01T00:00:00Z',
      createdBy: 1,
      versionNo: 1,
      isCurrent: true,
      feeSchemaId: 1, // Phí quản lý niêm yết thường niên
      organizationId: 1,
      securityId: 1,
      periodFrom: '2026-01-01',
      periodTo: '2026-12-31',
      calcBasisJson: { basis: 'ANNUAL_LISTING_FEE', year: 2026, dueDate: '2026-03-31' },
      calculatedAmount: 50000000,
      finalAmount: 50000000,
      calcMode: 'AUTO',
      paymentStatus: 'CONFIRMED',
    },
  ]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
  const [notifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);

  // Generate deadline notifications dynamically using NotificationService
  const deadlineNotifications = useMemo(() => {
    return notificationService.generateDeadlineNotifications(obligations);
  }, [obligations]);

  const allNotifications = useMemo(() => {
    return [...deadlineNotifications, ...notifications];
  }, [deadlineNotifications, notifications]);

  // Audit History Modal State
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditEntity, setAuditEntity] = useState<{ type: string; id: number; label: string }>({
    type: '',
    id: 0,
    label: '',
  });
  const [selectedAuditLogs, setSelectedAuditLogs] = useState<AuditLog[]>([]);

  // Workflow Handlers
  /** Ghi một dòng Audit Trail cho việc chuyển trạng thái hồ sơ (X3). */
  const logSubmissionTransition = (
    sub: Submission,
    action: AuditLog['action'],
    fromStatus: SubmissionStatus,
    afterJson: Record<string, any>,
    reason: string
  ) => {
    setAuditLogs((prev) => [
      {
        id: prev.reduce((max, l) => Math.max(max, l.id), 0) + 1,
        occurredAt: new Date().toISOString(),
        actorId: currentUser.id,
        actorName: currentUser.fullName,
        actorRole: currentUser.roleCode,
        actorIp: '127.0.0.1',
        correlationId: `req-${Date.now()}`,
        entityType: 'SUBMISSION',
        entityId: sub.id,
        entityLabel: sub.submissionNo || `Hồ sơ ID #${sub.id}`,
        action,
        beforeJson: { status: fromStatus },
        afterJson,
        diffJson: { status: `${fromStatus} -> ${afterJson.status}` },
        reason,
        result: 'SUCCESS',
      },
      ...prev,
    ]);
  };

  /** Chuyên viên Sở soát xét xong: SUBMITTED -> REVIEWED (FR-039). */
  const handleReviewSubmission = (subId: number) => {
    const sub = submissions.find((s) => s.id === subId);
    if (!sub) return;

    setSubmissions((prev) =>
      prev.map((s) =>
        s.id === subId
          ? { ...s, status: 'REVIEWED', reviewedAt: new Date().toISOString() }
          : s
      )
    );
    logSubmissionTransition(sub, 'REVIEW', sub.status, { status: 'REVIEWED' }, 'Hoàn tất soát xét hồ sơ');
    alert('Đã hoàn tất soát xét, hồ sơ được trình Lãnh đạo Sở phê duyệt.');
  };

  /**
   * Phê duyệt bản tiếng Việt (FR-033). KHÔNG công bố ngay — mẫu tin thuộc nhóm
   * được cấu hình dịch sẽ sinh bản EN nháp và chờ chuyên viên hiệu đính; việc
   * công bố VI + EN là một hành động riêng, duy nhất (PRD v1.2 §7.4 FR-065).
   */
  const handleApproveSubmission = (subId: number, comment: string) => {
    const sub = submissions.find((s) => s.id === subId);
    if (!sub) return;

    const template = templates.find((t) => t.id === sub.templateId);
    // AC-065-6: nhóm tin không bật auto_translate thì không sinh bản dịch.
    const needsTranslation = Boolean(template?.autoTranslate);
    const now = new Date().toISOString();

    const draft = needsTranslation
      ? buildAiDraftTranslation(sub.titleVi, String(sub.payload?.summary_note || ''))
      : null;

    setSubmissions((prev) =>
      prev.map((s) =>
        s.id === subId
          ? {
              ...s,
              status: 'APPROVED',
              approvedAt: now,
              updatedAt: now,
              updatedBy: currentUser.id,
              translationStatus: needsTranslation ? 'AI_DRAFT' : 'NONE',
              ...(draft ? { titleEn: draft.titleEn, contentEn: draft.contentEn } : {}),
            }
          : s
      )
    );

    logSubmissionTransition(
      sub,
      'APPROVE',
      sub.status,
      { status: 'APPROVED', translationStatus: needsTranslation ? 'AI_DRAFT' : 'NONE' },
      comment || 'Phê duyệt bản tiếng Việt'
    );

    alert(
      needsTranslation
        ? 'Đã phê duyệt bản tiếng Việt. Hệ thống đã sinh bản dịch tiếng Anh — vui lòng hiệu đính trước khi công bố.'
        : 'Đã phê duyệt bản tiếng Việt. Mẫu tin này không thuộc nhóm dịch tự động, có thể công bố ngay.'
    );
  };

  /** Lưu kết quả hiệu đính bản EN: AI_DRAFT -> HUMAN_REVIEWED (AC-065-4). */
  const handleSaveTranslation = (subId: number, titleEn: string, contentEn: string) => {
    const sub = submissions.find((s) => s.id === subId);
    if (!sub) return;

    const now = new Date().toISOString();
    setSubmissions((prev) =>
      prev.map((s) =>
        s.id === subId
          ? {
              ...s,
              titleEn,
              contentEn,
              translationStatus: 'HUMAN_REVIEWED',
              translationReviewedAt: now,
              translationReviewedBy: currentUser.id,
              updatedAt: now,
              updatedBy: currentUser.id,
            }
          : s
      )
    );

    setAuditLogs((prev) => [
      {
        id: prev.reduce((max, l) => Math.max(max, l.id), 0) + 1,
        occurredAt: now,
        actorId: currentUser.id,
        actorName: currentUser.fullName,
        actorRole: currentUser.roleCode,
        actorIp: '127.0.0.1',
        correlationId: `req-${Date.now()}`,
        entityType: 'SUBMISSION',
        entityId: sub.id,
        entityLabel: sub.submissionNo,
        action: 'UPDATE',
        beforeJson: { translationStatus: sub.translationStatus || 'AI_DRAFT' },
        afterJson: { translationStatus: 'HUMAN_REVIEWED' },
        diffJson: { translationStatus: `${sub.translationStatus || 'AI_DRAFT'} -> HUMAN_REVIEWED` },
        reason: 'Hiệu đính bản dịch tiếng Anh',
        result: 'SUCCESS',
      },
      ...prev,
    ]);

    alert('Đã lưu bản hiệu đính tiếng Anh. Hồ sơ sẵn sàng công bố song ngữ.');
  };

  /**
   * Công bố VI + EN trong MỘT hành động duy nhất — hai bản có cùng `publishedAt`
   * (AC-065-4). Không có vòng phê duyệt riêng cho bản EN.
   */
  const handlePublishBilingual = (subId: number, comment: string) => {
    const sub = submissions.find((s) => s.id === subId);
    if (!sub) return;

    const template = templates.find((t) => t.id === sub.templateId);
    const needsTranslation = Boolean(template?.autoTranslate);

    if (needsTranslation && sub.translationStatus !== 'HUMAN_REVIEWED') {
      alert(
        'Chưa công bố được: bản dịch tiếng Anh phải qua bước hiệu đính của chuyên viên trước khi công bố.'
      );
      return;
    }

    const now = new Date().toISOString();
    setSubmissions((prev) =>
      prev.map((s) =>
        s.id === subId
          ? {
              ...s,
              status: 'PUBLISHED',
              isPublic: true,
              publishedAt: now,
              updatedAt: now,
              updatedBy: currentUser.id,
              translationStatus: needsTranslation ? 'APPROVED' : s.translationStatus,
            }
          : s
      )
    );

    logSubmissionTransition(
      sub,
      'PUBLISH',
      sub.status,
      { status: 'PUBLISHED', isPublic: true },
      comment || (needsTranslation ? 'Công bố thông tin VI + EN' : 'Công bố thông tin')
    );

    alert(
      needsTranslation
        ? 'Đã công bố đồng thời bản tiếng Việt và bản tiếng Anh lên Corporate News.'
        : 'Đã công bố thông tin lên Corporate News.'
    );
  };

  const handleRejectSubmission = (subId: number, reason: string) => {
    const sub = submissions.find((s) => s.id === subId);
    if (!sub) return;

    // Lưu lý do ngay trên hồ sơ: widget "Danh sách Tin bị từ chối" của Cổng Doanh
    // nghiệp phải hiện được lý do, không bắt DN đi tra Audit Log.
    const now = new Date().toISOString();
    setSubmissions((prev) =>
      prev.map((s) =>
        s.id === subId
          ? {
              ...s,
              status: 'CANCELLED',
              rejectReason: reason || 'Từ chối phê duyệt',
              rejectedAt: now,
              updatedAt: now,
              updatedBy: currentUser.id,
            }
          : s
      )
    );
    logSubmissionTransition(
      sub,
      'REJECT',
      sub.status,
      { status: 'CANCELLED' },
      reason || 'Từ chối phê duyệt'
    );
    alert('Đã từ chối hồ sơ và gửi thông báo yêu cầu đính chính!');
  };

  /** Gỡ tin đã công bố khỏi Corporate News, bắt buộc có lý do (FR-042). */
  const handleHideSubmission = (subId: number, reason: string) => {
    const sub = submissions.find((s) => s.id === subId);
    if (!sub) return;

    const now = new Date().toISOString();
    setSubmissions((prev) =>
      prev.map((s) =>
        s.id === subId
          ? {
              ...s,
              status: 'HIDDEN',
              isPublic: false,
              hiddenAt: now,
              hiddenBy: currentUser.id,
              hideReason: reason,
            }
          : s
      )
    );
    logSubmissionTransition(
      sub,
      'HIDE',
      sub.status,
      { status: 'HIDDEN', isPublic: false },
      reason || 'Gỡ tin đã công bố'
    );
    alert('Đã gỡ tin khỏi chuyên trang Công bố Thông tin công khai.');
  };

  /**
   * Xác nhận đã thanh toán phí ĐKGD — mở guard trình duyệt của Mẫu 06
   * (FR-006 AC-006-2: ghi audit log ai xác nhận lúc nào).
   */
  const handleConfirmDossierFee = (dossierId: number) => {
    const dossier = dossiers.find((d) => d.id === dossierId);
    if (!dossier || dossier.feePaymentStatus === 'CONFIRMED') return;

    const now = new Date().toISOString();
    setDossiers((prev) =>
      prev.map((d) =>
        d.id === dossierId
          ? {
              ...d,
              feePaymentStatus: 'CONFIRMED',
              feeConfirmedAt: now,
              feeConfirmedBy: currentUser.fullName,
              updatedAt: now,
              updatedBy: currentUser.id,
            }
          : d
      )
    );

    setAuditLogs((prev) => [
      {
        id: prev.reduce((max, l) => Math.max(max, l.id), 0) + 1,
        occurredAt: now,
        actorId: currentUser.id,
        actorName: currentUser.fullName,
        actorRole: currentUser.roleCode,
        actorIp: '127.0.0.1',
        correlationId: `req-${Date.now()}`,
        entityType: 'REGISTRATION_DOSSIER',
        entityId: dossier.id,
        entityLabel: dossier.dossierNo,
        action: 'UPDATE',
        beforeJson: { feePaymentStatus: 'PENDING' },
        afterJson: { feePaymentStatus: 'CONFIRMED' },
        diffJson: { feePaymentStatus: 'PENDING -> CONFIRMED' },
        reason: 'Xác nhận doanh nghiệp đã thanh toán phí đăng ký giao dịch',
        result: 'SUCCESS',
      },
      ...prev,
    ]);

    alert('Đã cập nhật "Đã thanh toán phí". Nút Trình duyệt đã được mở.');
  };

  const handleOpenAuditHistory = (type: string, id: number, label: string) => {
    const filtered = (auditLogs || []).filter(
      (log) => log.entityType === type && log.entityId === id
    );
    setSelectedAuditLogs(filtered);
    setAuditEntity({ type, id, label });
    setAuditModalOpen(true);
  };

  /**
   * Cả ba cổng đều bắt đăng nhập, mỗi cổng bằng một phiên riêng
   * (`authenticated` cho IMS, `icdsUser`/`newsUser` cho hai cổng còn lại) vì mỗi
   * cổng chỉ nhận đúng một nhóm tài khoản (`PORTAL_ACTOR_TYPE`).
   */
  if (activePortal === 'internal' && !authenticated) {
    return (
      <LoginScreen
        portal="internal"
        users={users}
        policy={INITIAL_SECURITY_POLICY}
        onAuthenticated={(user) => {
          setCurrentUser(user);
          setAuthenticated(true);
          // Người dùng gõ thẳng /ims/ims-004 rồi mới đăng nhập thì vào đúng màn
          // hình đó, không bị đẩy về màn hình mặc định.
          setActiveModule(imsModuleFromPath(window.location.pathname) ?? DEFAULT_IMS_MODULE);
        }}
      />
    );
  }
  if (activePortal === 'corporate' && !icdsUser) {
    return (
      <LoginScreen
        portal="corporate"
        users={users}
        policy={INITIAL_SECURITY_POLICY}
        onAuthenticated={(user) => {
          setIcdsUser(user);
          setActiveModule('corp_dashboard');
        }}
      />
    );
  }
  if (activePortal === 'public' && !newsUser) {
    return (
      <LoginScreen
        portal="public"
        users={users}
        policy={INITIAL_SECURITY_POLICY}
        onAuthenticated={(user) => setNewsUser(user)}
      />
    );
  }

  const portalUser =
    activePortal === 'corporate' ? icdsUser! : activePortal === 'public' ? newsUser! : currentUser;

  /**
   * Ba khoi JSX dung cho ca hai bo cuc ben duoi, tach ra de khong phai viet hai
   * lan: noi dung cua /ims, va popup lich su chinh sua.
   */
  const imsContent = (
    <>
      {/* Các chức năng đã có SRS — xem `lib/imsRoutes.ts`. */}
      {isImsUseCaseModule(activeModule) && (
        <UseCaseRouter activeModule={activeModule} onNavigate={changeModule} />
      )}

      {activeModule === 'dashboard' && (
        <DashboardModule
          submissions={submissions}
          alerts={alerts}
          obligations={obligations}
          tasks={tasks}
          currentUser={currentUser}
          securities={securities}
          organizations={organizations}
          onNavigateToModule={(mod) => setActiveModule(mod)}
        />
      )}

      {activeModule === 'ai_center' && <AiCenterModule />}

      {activeModule.startsWith('qlny_') && (
        <ListingModule
          activeModule={activeModule}
          onChangeModule={setActiveModule}
          organizations={organizations}
          securities={securities}
          equityProfiles={equityProfiles}
          bondProfiles={bondProfiles}
          alerts={alerts}
          surveillanceRecords={surveillanceRecords}
          dossiers={dossiers}
          fees={fees}
          userRole={currentUser.roleCode}
          onAuditHistory={handleOpenAuditHistory}
          onConfirmDossierFee={handleConfirmDossierFee}
        />
      )}

      {activeModule.startsWith('tttp_') && (
        <BondModule
          activeModule={activeModule}
          onChangeModule={setActiveModule}
          bonds={bondProfiles}
          onAuditHistory={handleOpenAuditHistory}
        />
      )}

      {activeModule.startsWith('tttt_') && (
        <DisclosureModule
          activeModule={activeModule}
          submissions={submissions}
          organizations={organizations}
          alerts={alerts}
          templates={templates}
          onReviewSubmission={handleReviewSubmission}
          onApproveSubmission={handleApproveSubmission}
          onSaveTranslation={handleSaveTranslation}
          onPublishBilingual={handlePublishBilingual}
          onRejectSubmission={handleRejectSubmission}
          onHideSubmission={handleHideSubmission}
          onAuditHistory={handleOpenAuditHistory}
          currentUserId={currentUser.id}
        />
      )}

      {activeModule.startsWith('admin_') && (
        <AdminModule
          activeModule={activeModule}
          users={users}
          currentUser={currentUser}
          templates={templates}
          onUpdateTemplate={(updated) =>
            setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
          }
        />
      )}

      {activeModule.startsWith('meta_') && (
        <MetadataModule
          activeModule={activeModule}
          userRole={currentUser.roleCode}
          templates={templates}
        />
      )}

      {activeModule.startsWith('access_') && (
        <AccessModule
          activeModule={activeModule}
          userRole={currentUser.roleCode}
          organizations={organizations}
        />
      )}

      {activeModule.startsWith('surv_') && (
        <SurveillanceModule
          activeModule={activeModule}
          organizations={organizations}
          userRole={currentUser.roleCode}
        />
      )}

      {activeModule.startsWith('own_') && (
        <OwnershipModule
          activeModule={activeModule}
          securities={securities}
          organizations={organizations}
          userRole={currentUser.roleCode}
        />
      )}

      {activeModule.startsWith('bond_') && (
        <BondExtraModule
          activeModule={activeModule}
          bondProfiles={bondProfiles}
          securities={securities}
          organizations={organizations}
          userRole={currentUser.roleCode}
        />
      )}

      {activeModule.startsWith('cbtt_') && (
        <DisclosureExtraModule
          activeModule={activeModule}
          submissions={submissions}
          templates={templates}
          organizations={organizations}
          userRole={currentUser.roleCode}
          onHideSubmission={(id, reason) => handleHideSubmission(id, reason)}
        />
      )}

      {(activeModule.startsWith('report_') || activeModule.startsWith('survey_')) && (
        activeModule.startsWith('report_') ? (
          <ReportModule
            activeModule={activeModule}
            organizations={organizations}
            securities={securities}
            submissions={submissions}
            bondProfiles={bondProfiles}
            obligations={obligations}
            userRole={currentUser.roleCode}
          />
        ) : (
          <SurveyModule activeModule={activeModule} userRole={currentUser.roleCode} />
        )
      )}
    </>
  );

  const auditModal = (
    <AuditHistoryModal
      isOpen={auditModalOpen}
      onClose={() => setAuditModalOpen(false)}
      entityType={auditEntity.type}
      entityId={auditEntity.id}
      entityLabel={auditEntity.label}
      auditLogs={selectedAuditLogs}
    />
  );

  /**
   * BO CUC /ims — theo `docs/quan-ly-danh-muc_2.html`.
   *
   * Sidebar cao het trang o ben trai (logo o dau, card nguoi dung o chan), con
   * thanh tren trang chi chiem cot ben phai sidebar. Thanh banner toi chay het
   * chieu ngang mang chu "IMS — Cong Noi bo HNX" da bo han: ten cong khong con
   * la thong tin dang chiem mot dai ngang, va logo o dau sidebar da noi ro day
   * la he thong nao.
   *
   * Nen trang giu #EBEBEB va chu #292929 theo bang mau Figma.
   */
  if (activePortal === 'internal') {
    return (
      <div className="flex min-h-screen bg-[#EBEBEB] font-sans text-[#292929] antialiased">
        <Sidebar
          activeModule={activeModule}
          setActiveModule={changeModule}
          userRole={currentUser.roleCode}
          activePortal="internal"
          mobileOpen={sidebarOpen}
          onCloseMobile={() => setSidebarOpen(false)}
          currentUser={currentUser}
          onLogout={() => {
            setAuthenticated(false);
            setActiveModule(DEFAULT_IMS_MODULE);
          }}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          {/*
            Không truyền `lang`/`setLang`: /ims không còn nút chuyển ngôn ngữ, và
            không màn hình nào trong cổng nội bộ đọc cờ này. State `lang` vẫn ở
            đây vì /icds và /hnxcns dùng.
          */}
          <ImsTopHeader
            currentUser={currentUser}
            notifications={allNotifications}
            onOpenMenu={() => setSidebarOpen(true)}
            onNavigate={changeModule}
          />

          {/*
            Khong dat `overflow-y-auto` o day: trang cuon o cap body, sidebar
            `sticky` dung yen theo — dung nhu file mau. Mot vung cuon rieng o day
            se cat mat cac dropdown `absolute` ben trong (menu Columns, popup).
          */}
          <main className="min-w-0 flex-1 bg-[#EBEBEB]">{imsContent}</main>
        </div>

        {auditModal}
      </div>
    );
  }

  /** ICDS va Corporate News giu nguyen bo cuc cu — khong nam trong pham vi doi UI. */
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased">
      {/* Header — cổng công khai có bố cục hoàn toàn khác (mega-menu + thanh chỉ
          số) nên dùng component riêng thay vì nhồi thêm nhánh vào Header dùng
          chung của hai cổng còn lại. */}
      {activePortal === 'public' ? (
        <PublicNewsHeader currentUser={portalUser} onLogout={() => setNewsUser(null)} />
      ) : (
        <Header
          activePortal={activePortal}
          currentUser={portalUser}
          notifications={allNotifications}
          lang={lang}
          setLang={setLang}
          onOpenMenu={() => setSidebarOpen(true)}
          onLogout={() => {
            /*
              Nhánh này giờ CHỈ còn /icds.

              /ims đã tách ra shell riêng ở nhánh `return` phía trên (sidebar cao
              hết trang + ImsTopHeader), còn /hnxcns dùng `PublicNewsHeader` ở
              trên. Nên không cần kiểm tra `activePortal` nữa — bỏ luôn cả nhánh
              `internal` cũ, vì để lại một nhánh không bao giờ chạy chỉ khiến
              người đọc sau tưởng /ims vẫn đăng xuất qua đây.

              Đăng xuất chỉ xoá phiên của cổng đang mở — quay lại đúng cổng đó sẽ
              gặp lại LoginScreen thay vì bị đẩy sang cổng khác.
            */
            setIcdsUser(null);
            setActiveModule('corp_dashboard');
          }}
        />
      )}

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          activeModule={activeModule}
          setActiveModule={changeModule}
          userRole={portalUser.roleCode}
          activePortal={activePortal}
          mobileOpen={sidebarOpen}
          onCloseMobile={() => setSidebarOpen(false)}
        />

        {/* Content View */}
        <main className="flex-1 overflow-y-auto bg-slate-50">
          {activePortal === 'public' && (
            <PublicCorporateNews
              organizations={organizations}
              securities={securities}
              submissions={submissions}
              lang={lang}
            />
          )}

          {activePortal === 'corporate' && (
            <CorporatePortal
              activeModule={activeModule}
              currentUser={portalUser}
              organizations={organizations}
              obligations={obligations}
              submissions={submissions}
              templates={templates}
              securities={securities}
              alerts={alerts}
              onSubmitNewFiling={(newSub) => {
                setSubmissions((prev) => [newSub, ...prev]);
                alert('Đã nộp báo cáo E-Form thành công sang Hàng đợi Sở HNX!');
              }}
            />
          )}

        </main>
      </div>

      {auditModal}
    </div>
  );
}
