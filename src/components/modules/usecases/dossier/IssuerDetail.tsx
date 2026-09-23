/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ChevronLeft, Inbox, Pencil, Plus, Search, Trash2, Users } from 'lucide-react';

import {
  BTN_OUTLINE,
  BTN_PRIMARY,
  ColumnsButton,
  ColumnSpec,
  ConfirmDeleteDialog,
  TD_CLASS,
  TH_CLASS,
  useColumnVisibility,
} from '../catalogUi';
import {
  DOSSIER_TYPES,
  DossierType,
  SubTableKey,
  TPRL_SUBTABLES,
  TPRL_SUBTABLE_ORDER,
  Values,
  allFields,
  displayField,
  emptyValues,
  formatDateVN,
  formatNumberVN,
  roleBadgeClass,
  todayISO,
} from './dossierFields';
import {
  FieldErrors,
  FilterChip,
  PillTab,
  RowIconButton,
  SectionsForm,
  SectionsView,
  Surface,
  hasErrors,
  validateRequired,
} from './FieldSections';
import {
  DossierCreateModal,
  DossierPickerModal,
  FamilySuggestModal,
  HolderModal,
  SubRowModal,
  issuerSectionsFor,
} from './IssuerModals';
import {
  Dossier,
  DossierKey,
  FamilyRelation,
  Holder,
  Investor,
  Issuer,
  getDossier,
  isMatured,
  parseDossierKey,
  str,
  updateIssuer,
} from './dossierStore';

const CURRENT_USER = 'nqt.hnx';

export interface IssuerDetailInitial {
  primaryTab?: 'tcph' | 'chungkhoan';
  dossierKey?: DossierKey | null;
  holdersTab?: boolean;
  /** `'tcph'` hoặc một khóa hồ sơ — mở thẳng ở chế độ sửa. */
  editing?: 'tcph' | DossierKey | null;
}

interface IssuerDetailProps {
  issuer: Issuer;
  investors: readonly Investor[];
  initial: IssuerDetailInitial;
  onBack: () => void;
  onDeleteIssuer: () => void;
  toast: (kind: 'success' | 'danger', message: string) => void;
}

type Confirm =
  | { kind: 'dossier'; key: DossierKey; label: string }
  | { kind: 'holder'; index: number; label: string }
  | { kind: 'subrow'; subKey: SubTableKey; index: number };

function dossierEntries(issuer: Issuer): Array<{ key: DossierKey; type: DossierType; dossier: Dossier }> {
  const out: Array<{ key: DossierKey; type: DossierType; dossier: Dossier }> = [];
  if (issuer.dossiers.cp) out.push({ key: 'cp', type: 'cp', dossier: issuer.dossiers.cp });
  issuer.dossiers.tpny.forEach((d, i) => out.push({ key: `tpny-${i}`, type: 'tpny', dossier: d }));
  issuer.dossiers.tprl.forEach((d, i) => out.push({ key: `tprl-${i}`, type: 'tprl', dossier: d }));
  return out;
}

/** `getDossierSummary` của file mẫu. */
export function dossierSummary(type: DossierType, v: Values) {
  if (type === 'cp') {
    return { code: str(v.stockCode) || '—', sub: '', date: str(v.firstTradingDate), active: true, label: 'Đang niêm yết' };
  }
  const matured = isMatured(v);
  return {
    code: str(v.bondCode) || '—',
    sub: str(v.bondName),
    date: str(v.issueDate),
    active: !matured,
    label: matured ? 'Đã đáo hạn' : 'Đang lưu hành',
  };
}

const TYPE_BADGE: Record<DossierType, string> = {
  cp: 'bg-[#009F5F]/14 text-[#00663D]',
  tpny: 'bg-[#FDF1E0] text-[#B9691B]',
  tprl: 'bg-[#EAF1FB] text-[#2456A6]',
};

const StatusBadge: React.FC<{ active: boolean; label: string }> = ({ active, label }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
      active ? 'bg-[#E6F4EA] text-[#1E7A42]' : 'bg-[#FDF1E0] text-[#B9691B]'
    }`}
  >
    <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-[#22AF73]' : 'bg-[#E8A33D]'}`} />
    {label}
  </span>
);

const EmptyState: React.FC<{ title: string; hint?: string; icon?: React.ReactNode }> = ({ title, hint, icon }) => (
  <div className="px-5 py-12 text-center text-slate-500">
    {icon ?? <Inbox className="mx-auto mb-2.5 h-10 w-10 opacity-50" />}
    <div className="mb-1 text-sm font-medium text-[#525252]">{title}</div>
    {hint && <div className="text-[13px]">{hint}</div>}
  </div>
);

/* --------------------------------------------------------- bảng con TPRL */

const SubTable: React.FC<{
  subKey: SubTableKey;
  rows: readonly Values[];
  onAdd: () => void;
  onEdit: (i: number) => void;
  onDelete: (i: number) => void;
}> = ({ subKey, rows, onAdd, onEdit, onDelete }) => {
  const cfg = TPRL_SUBTABLES[subKey];
  const specs: ColumnSpec[] = cfg.fields.map((f) => ({ key: f.key, label: f.label }));
  const columns = useColumnVisibility(specs);
  const visible = cfg.fields.filter((f) => columns.isVisible(f.key));

  return (
    <div className="mt-7">
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-bold text-[#292929]">{cfg.label}</div>
        <div className="flex gap-2">
          <ColumnsButton columns={columns} />
          <button type="button" className={BTN_PRIMARY} onClick={onAdd}>
            <Plus className="h-4 w-4" />
            Thêm dòng
          </button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-max border-separate border-spacing-0">
          <thead className="bg-[#F9FAFB]">
            <tr>
              <th className={`${TH_CLASS} w-14 text-center`}>STT</th>
              {visible.map((f) => (
                <th key={f.key} className={`${TH_CLASS} min-w-36 max-w-60 align-bottom whitespace-normal!`}>
                  {f.label}
                </th>
              ))}
              <th className={`${TH_CLASS} text-center`}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={visible.length + 2} className="px-3 py-3.5 text-center text-[13px] text-slate-500">
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={i} className="hover:bg-[#F8FAFC]">
                  <td className={`${TD_CLASS} text-center text-slate-500`}>{i + 1}</td>
                  {visible.map((f) => (
                    <td key={f.key} className={`${TD_CLASS} ${f.kind === 'money' || f.kind === 'number' ? 'text-right tabular-nums' : ''}`}>
                      {displayField(r, f) || <span className="text-slate-300">-</span>}
                    </td>
                  ))}
                  <td className={`${TD_CLASS} whitespace-nowrap text-center`}>
                    <RowIconButton label="Sửa dòng" onClick={() => onEdit(i)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </RowIconButton>
                    <RowIconButton label="Xóa dòng" danger onClick={() => onDelete(i)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </RowIconButton>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------ trang chính */

export const IssuerDetail: React.FC<IssuerDetailProps> = ({ issuer, investors, initial, onBack, onDeleteIssuer, toast }) => {
  const [primaryTab, setPrimaryTab] = useState<'tcph' | 'chungkhoan'>(initial.primaryTab ?? 'tcph');
  const [detailTab, setDetailTab] = useState<'chung' | 'sohuu' | 'lichsu'>('chung');
  const [ownFilter, setOwnFilter] = useState<'all' | 'parent' | 'sub' | 'affiliate'>('all');
  const [dossierFilter, setDossierFilter] = useState<'all' | DossierType>('all');
  const [dossierSearch, setDossierSearch] = useState('');
  const [dossierKey, setDossierKey] = useState<DossierKey | null>(initial.dossierKey ?? null);
  const [holdersTab, setHoldersTab] = useState(!!initial.holdersTab);
  const [editing, setEditing] = useState<'tcph' | DossierKey | null>(initial.editing ?? null);
  const [draft, setDraft] = useState<Values>(() => startDraft(initial.editing ?? null));
  const [errors, setErrors] = useState<FieldErrors>({});

  const [picker, setPicker] = useState(false);
  const [createType, setCreateType] = useState<DossierType | null>(null);
  const [holderEdit, setHolderEdit] = useState<{ index: number | null } | null>(null);
  const [suggest, setSuggest] = useState<{ base: Investor; candidates: FamilyRelation[] } | null>(null);
  const [subRow, setSubRow] = useState<{ subKey: SubTableKey; index: number | null } | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);

  function startDraft(target: 'tcph' | DossierKey | null): Values {
    if (target === null) return {};
    if (target === 'tcph') return { ...emptyValues(issuerSectionsFor(issuer.kind)), ...issuer.values };
    const d = getDossier(issuer, target);
    const { type } = parseDossierKey(target);
    return d ? { ...emptyValues(DOSSIER_TYPES[type].sections), ...d.values } : {};
  }

  const beginEdit = (target: 'tcph' | DossierKey) => {
    setEditing(target);
    setDraft(startDraft(target));
    setErrors({});
  };
  const cancelEdit = () => {
    setEditing(null);
    setErrors({});
  };

  const nameOf = (id: number) => str(investors.find((i) => i.id === id)?.values.name) || '—';
  const title = str(issuer.values.name);
  const entries = dossierEntries(issuer);
  const currentDossier = dossierKey ? getDossier(issuer, dossierKey) : null;
  const currentType = dossierKey ? parseDossierKey(dossierKey).type : null;

  /* ---------------------------------------------------------- lưu sửa */

  const saveEdit = () => {
    if (editing === null) return;
    const now = todayISO();

    if (editing === 'tcph') {
      const sections = issuerSectionsFor(issuer.kind);
      const found = validateRequired(sections, draft);
      setErrors(found);
      if (hasErrors(found)) return;

      /** Ghi lịch sử theo từng trường đổi giá trị — tab "Lịch sử thay đổi" đọc từ đây. */
      const logs = allFields(sections)
        .filter((f) => f.kind !== 'computed' && displayField(issuer.values, f) !== displayField(draft, f))
        .map((f) => ({
          date: now,
          user: CURRENT_USER,
          field: f.label,
          change: `${displayField(issuer.values, f) || '(trống)'} → ${displayField(draft, f) || '(trống)'}`,
        }));

      updateIssuer(issuer.id, (d) => {
        d.values = { ...draft, name: str(draft.name).trim() };
        d.statusFlg = draft.statusFlg === 0 ? 0 : 1;
        d.changeHistory = [...logs, ...d.changeHistory];
        d.updatedBy = CURRENT_USER;
        d.updatedDate = now;
      });
      toast('success', logs.length ? `Đã lưu thay đổi (${logs.length} trường)` : 'Không có thay đổi nào');
    } else {
      const { type, idx } = parseDossierKey(editing);
      const found = validateRequired(DOSSIER_TYPES[type].sections, draft);
      setErrors(found);
      if (hasErrors(found)) return;
      updateIssuer(issuer.id, (d) => {
        const target = type === 'cp' ? d.dossiers.cp : d.dossiers[type][idx ?? -1];
        if (target) target.values = draft;
        d.updatedBy = CURRENT_USER;
        d.updatedDate = now;
      });
      toast('success', 'Đã lưu thay đổi hồ sơ');
    }
    setEditing(null);
  };

  /* ----------------------------------------------------- hồ sơ chứng khoán */

  const createDossier = (type: DossierType, values: Values) => {
    const next = type === 'cp' ? 'cp' : `${type}-${issuer.dossiers[type].length}`;
    updateIssuer(issuer.id, (d) => {
      const fresh: Dossier = { values, holders: [], subData: {} };
      if (type === 'cp') d.dossiers.cp = fresh;
      else d.dossiers[type].push(fresh);
    });
    setCreateType(null);
    setPrimaryTab('chungkhoan');
    setDossierFilter('all');
    setDossierKey(next);
    setHoldersTab(false);
    toast('success', `Đã tạo ${DOSSIER_TYPES[type].label.toLowerCase()}`);
  };

  const mutateCurrent = (fn: (d: Dossier) => void) => {
    if (!dossierKey) return;
    const { type, idx } = parseDossierKey(dossierKey);
    updateIssuer(issuer.id, (draftIssuer) => {
      const target = type === 'cp' ? draftIssuer.dossiers.cp : draftIssuer.dossiers[type][idx ?? -1];
      if (target) fn(target);
    });
  };

  const saveHolder = (holder: Holder) => {
    const editIndex = holderEdit?.index ?? null;
    mutateCurrent((d) => {
      if (editIndex === null) d.holders.push(holder);
      else d.holders[editIndex] = holder;
    });
    setHolderEdit(null);
    if (editIndex !== null) {
      toast('success', 'Đã lưu thay đổi');
      return;
    }
    toast('success', 'Đã gắn nhà đầu tư vào mã chứng khoán');
    const base = investors.find((i) => i.id === holder.investorId);
    const already = new Set([...(currentDossier?.holders ?? []).map((h) => h.investorId), holder.investorId]);
    const candidates = (base?.familyRelations ?? []).filter(
      (r) => !already.has(r.relatedId) && investors.some((i) => i.id === r.relatedId && i.deleteFlg === 0),
    );
    if (base && candidates.length) setSuggest({ base, candidates });
  };

  const addSuggested = (ids: number[]) => {
    mutateCurrent((d) => {
      ids.forEach((id) => {
        if (!d.holders.some((h) => h.investorId === id)) {
          d.holders.push({ investorId: id, roles: ['NLQ'], position: '', holdingQty: null, ratio: null, startDate: '', tradingAccounts: [] });
        }
      });
    });
    setSuggest(null);
    toast('success', `Đã gắn thêm ${ids.length} người liên quan (NLQ)`);
  };

  const saveSubRow = (values: Values) => {
    if (!subRow) return;
    const { subKey, index } = subRow;
    mutateCurrent((d) => {
      const rows = d.subData[subKey] ?? [];
      if (index === null) rows.push(values);
      else rows[index] = values;
      d.subData[subKey] = rows;
    });
    setSubRow(null);
    toast('success', index === null ? 'Đã thêm dòng mới' : 'Đã lưu thay đổi');
  };

  const runConfirm = () => {
    if (!confirm) return;
    if (confirm.kind === 'dossier') {
      const { type, idx } = parseDossierKey(confirm.key);
      updateIssuer(issuer.id, (d) => {
        if (type === 'cp') d.dossiers.cp = null;
        else d.dossiers[type].splice(idx ?? -1, 1);
      });
      setDossierKey(null);
      setEditing(null);
      toast('danger', 'Đã xóa hồ sơ');
    } else if (confirm.kind === 'holder') {
      const i = confirm.index;
      mutateCurrent((d) => d.holders.splice(i, 1));
      toast('danger', 'Đã bỏ gắn nhà đầu tư');
    } else {
      const { subKey, index } = confirm;
      mutateCurrent((d) => d.subData[subKey]?.splice(index, 1));
      toast('danger', 'Đã xóa dòng dữ liệu');
    }
    setConfirm(null);
  };

  const openDossier = (key: DossierKey, edit = false) => {
    setDossierKey(key);
    setHoldersTab(false);
    if (edit) beginEdit(key);
    else cancelEdit();
  };

  /* ------------------------------------------------------ các khối nội dung */

  const infoTab = <Surface><SectionsView sections={issuerSectionsFor(issuer.kind)} values={issuer.values} /></Surface>;

  const relations = [
    ...issuer.ownership.parents.map((o) => ({ ...o, type: 'parent' as const, typeLabel: 'Công ty mẹ' })),
    ...issuer.ownership.subsidiaries.map((o) => ({ ...o, type: 'sub' as const, typeLabel: 'Công ty con' })),
    ...issuer.ownership.affiliates.map((o) => ({ ...o, type: 'affiliate' as const, typeLabel: 'Liên doanh, liên kết' })),
  ];
  const shownRelations = ownFilter === 'all' ? relations : relations.filter((r) => r.type === ownFilter);
  const REL_BADGE = { parent: 'bg-[#FDF1E0] text-[#B9691B]', sub: 'bg-[#E6F4EA] text-[#1E7A42]', affiliate: 'bg-[#009F5F]/12 text-[#00663D]' };

  const ownershipTab = (
    <Surface>
      <h3 className="mb-4 text-[13px] font-bold uppercase tracking-[.02em] text-[#00663D]">Cơ cấu sở hữu (nhóm công ty)</h3>
      <div className="mb-4 flex flex-wrap gap-2.5">
        <FilterChip active={ownFilter === 'all'} onClick={() => setOwnFilter('all')}>Tất cả ({relations.length})</FilterChip>
        <FilterChip active={ownFilter === 'parent'} onClick={() => setOwnFilter('parent')}>Công ty mẹ ({issuer.ownership.parents.length})</FilterChip>
        <FilterChip active={ownFilter === 'sub'} onClick={() => setOwnFilter('sub')}>Công ty con ({issuer.ownership.subsidiaries.length})</FilterChip>
        <FilterChip active={ownFilter === 'affiliate'} onClick={() => setOwnFilter('affiliate')}>Liên doanh, liên kết ({issuer.ownership.affiliates.length})</FilterChip>
      </div>
      <table className="w-full border-collapse">
        <thead className="bg-[#F9FAFB]">
          <tr>
            <th className={`${TH_CLASS} w-42`}>Loại quan hệ</th>
            <th className={TH_CLASS}>Tên công ty</th>
            <th className={`${TH_CLASS} w-32`}>Mã DN</th>
            <th className={`${TH_CLASS} w-24`}>Tỷ lệ SH</th>
          </tr>
        </thead>
        <tbody>
          {shownRelations.length === 0 ? (
            <tr><td colSpan={4}><EmptyState title="Chưa có dữ liệu" hint="Tổ chức này chưa ghi nhận quan hệ sở hữu nào" /></td></tr>
          ) : (
            shownRelations.map((r) => (
              <tr key={`${r.type}-${r.code}`}>
                <td className={TD_CLASS}><span className={`rounded-full px-2.25 py-0.5 text-[11px] font-semibold ${REL_BADGE[r.type]}`}>{r.typeLabel}</span></td>
                <td className={TD_CLASS}>{r.name}</td>
                <td className={`${TD_CLASS} text-slate-400`}>{r.code}</td>
                <td className={TD_CLASS}>{r.ratio}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </Surface>
  );

  const historyTab = (
    <Surface>
      <h3 className="mb-4 text-[13px] font-bold uppercase tracking-[.02em] text-[#00663D]">Lịch sử thay đổi hồ sơ TCPH</h3>
      <table className="w-full border-collapse">
        <thead className="bg-[#F9FAFB]">
          <tr>
            <th className={`${TH_CLASS} w-30`}>Thời gian</th>
            <th className={`${TH_CLASS} w-42`}>Người thực hiện</th>
            <th className={`${TH_CLASS} w-55`}>Trường thay đổi</th>
            <th className={TH_CLASS}>Giá trị cũ → mới</th>
          </tr>
        </thead>
        <tbody>
          {issuer.changeHistory.length === 0 ? (
            <tr><td colSpan={4}><EmptyState title="Chưa có lịch sử thay đổi" hint="Mọi thay đổi trên hồ sơ này sẽ được ghi lại tại đây" /></td></tr>
          ) : (
            issuer.changeHistory.map((h, i) => (
              <tr key={i}>
                <td className={TD_CLASS}>{formatDateVN(h.date)}</td>
                <td className={TD_CLASS}>{h.user}</td>
                <td className={TD_CLASS}>{h.field}</td>
                <td className={`${TD_CLASS} whitespace-normal text-slate-500`}>{h.change}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </Surface>
  );

  const counts = {
    all: entries.length,
    cp: entries.filter((e) => e.type === 'cp').length,
    tpny: entries.filter((e) => e.type === 'tpny').length,
    tprl: entries.filter((e) => e.type === 'tprl').length,
  };
  const q = dossierSearch.trim().toLowerCase();
  const shownEntries = entries
    .filter((e) => dossierFilter === 'all' || e.type === dossierFilter)
    .filter((e) => {
      if (!q) return true;
      const s = dossierSummary(e.type, e.dossier.values);
      return s.code.toLowerCase().includes(q) || s.sub.toLowerCase().includes(q);
    });

  const dossierList = (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <FilterChip active={dossierFilter === 'all'} onClick={() => setDossierFilter('all')}>Tất cả ({counts.all})</FilterChip>
        <FilterChip active={dossierFilter === 'cp'} onClick={() => setDossierFilter('cp')}>Cổ phiếu ({counts.cp})</FilterChip>
        <FilterChip active={dossierFilter === 'tpny'} onClick={() => setDossierFilter('tpny')}>TP niêm yết ({counts.tpny})</FilterChip>
        <FilterChip active={dossierFilter === 'tprl'} onClick={() => setDossierFilter('tprl')}>TP riêng lẻ ({counts.tprl})</FilterChip>
        <div className="flex-1" />
        <div className="flex h-9 w-55 items-center gap-2 rounded-lg border border-slate-300 bg-[#F9FAFB] px-3">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={dossierSearch}
            onChange={(e) => setDossierSearch(e.target.value)}
            placeholder="Tìm theo mã..."
            aria-label="Tìm hồ sơ theo mã"
            className="w-full border-none bg-transparent text-[13px] outline-none"
          />
        </div>
        <button type="button" className={BTN_PRIMARY} onClick={() => setPicker(true)}>
          <Plus className="h-4 w-4" />
          Tạo hồ sơ mới
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full border-separate border-spacing-0">
          <thead className="bg-[#F9FAFB]">
            <tr>
              <th className={`${TH_CLASS} w-22`}>Loại</th>
              <th className={TH_CLASS}>Mã chứng khoán</th>
              <th className={`${TH_CLASS} w-48`}>Ngày phát hành / niêm yết</th>
              <th className={`${TH_CLASS} w-38`}>Trạng thái</th>
              <th className={`${TH_CLASS} w-25 text-center`}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {shownEntries.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <EmptyState
                    title={entries.length ? 'Không tìm thấy hồ sơ phù hợp' : 'Chưa có hồ sơ chứng khoán nào'}
                    hint={entries.length ? 'Thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm' : 'Bấm "Tạo hồ sơ mới" để thêm hồ sơ Cổ phiếu hoặc Trái phiếu cho tổ chức này'}
                  />
                </td>
              </tr>
            ) : (
              shownEntries.map((e) => {
                const s = dossierSummary(e.type, e.dossier.values);
                return (
                  <tr key={e.key} className="hover:bg-[#F8FAFC]">
                    <td className={TD_CLASS}>
                      <span className={`rounded-full px-2.25 py-0.75 text-[11px] font-bold ${TYPE_BADGE[e.type]}`}>{DOSSIER_TYPES[e.type].shortTag}</span>
                    </td>
                    <td className={TD_CLASS}>
                      <button type="button" onClick={() => openDossier(e.key)} className="font-semibold text-[#00663D] hover:underline">
                        {s.code}
                      </button>
                      {s.sub && <div className="mt-0.5 text-[11.5px] text-slate-500">{s.sub}</div>}
                    </td>
                    <td className={TD_CLASS}>{formatDateVN(s.date) || <span className="text-slate-300">-</span>}</td>
                    <td className={TD_CLASS}><StatusBadge active={s.active} label={s.label} /></td>
                    <td className={`${TD_CLASS} whitespace-nowrap text-center`}>
                      <RowIconButton label={`Sửa ${s.code}`} onClick={() => openDossier(e.key, true)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </RowIconButton>
                      <RowIconButton label={`Xóa ${s.code}`} danger onClick={() => setConfirm({ kind: 'dossier', key: e.key, label: s.code })}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </RowIconButton>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );

  const holdersPanel = currentDossier && (
    <>
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-bold text-[#292929]">Danh sách Cổ đông lớn, Người nội bộ &amp; Người liên quan</div>
        <button type="button" className={BTN_PRIMARY} onClick={() => setHolderEdit({ index: null })}>
          <Plus className="h-4 w-4" />
          Gắn nhà đầu tư
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-max border-separate border-spacing-0">
          <thead className="bg-[#F9FAFB]">
            <tr>
              {['Nhà đầu tư', 'Vai trò', 'Chức vụ', 'SL nắm giữ', 'Tỷ lệ', 'Ngày bắt đầu', 'Tài khoản GD'].map((h) => (
                <th key={h} className={`${TH_CLASS} ${h === 'SL nắm giữ' || h === 'Tỷ lệ' ? 'text-right' : ''}`}>{h}</th>
              ))}
              <th className={`${TH_CLASS} text-center`}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {currentDossier.holders.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <EmptyState
                    icon={<Users className="mx-auto mb-2.5 h-10 w-10 opacity-50" />}
                    title="Chưa có cổ đông/NNB/NLQ nào"
                    hint='Bấm "Gắn nhà đầu tư" để thêm từ Hồ sơ Nhà đầu tư'
                  />
                </td>
              </tr>
            ) : (
              currentDossier.holders.map((h, i) => {
                const inv = investors.find((x) => x.id === h.investorId);
                const name = nameOf(h.investorId);
                return (
                  <tr key={h.investorId} className="hover:bg-[#F8FAFC]">
                    <td className={TD_CLASS}>
                      <div className="flex items-center gap-2.5">
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${inv?.kind === 'org' ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-[#EDE9FE] text-[#5B21B6]'}`}>
                          {name.split(/\s+/).slice(-2).map((w) => w[0]).join('').toUpperCase()}
                        </span>
                        {name}
                      </div>
                    </td>
                    <td className={TD_CLASS}>
                      <div className="flex flex-wrap gap-1">
                        {h.roles.map((r) => (
                          <span key={r} className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${roleBadgeClass(r)}`}>{r}</span>
                        ))}
                      </div>
                    </td>
                    <td className={TD_CLASS}>{h.position || <span className="text-slate-300">—</span>}</td>
                    <td className={`${TD_CLASS} text-right tabular-nums`}>{formatNumberVN(h.holdingQty) || '-'}</td>
                    <td className={`${TD_CLASS} text-right tabular-nums`}>{h.ratio !== null ? `${h.ratio}%` : '-'}</td>
                    <td className={TD_CLASS}>{formatDateVN(h.startDate) || '-'}</td>
                    <td className={TD_CLASS}>{h.tradingAccounts.join(', ') || <span className="text-slate-300">-</span>}</td>
                    <td className={`${TD_CLASS} whitespace-nowrap text-center`}>
                      <RowIconButton label="Sửa" onClick={() => setHolderEdit({ index: i })}><Pencil className="h-3.5 w-3.5" /></RowIconButton>
                      <RowIconButton label="Bỏ gắn" danger onClick={() => setConfirm({ kind: 'holder', index: i, label: name })}><Trash2 className="h-3.5 w-3.5" /></RowIconButton>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );

  let dossierDetail: React.ReactNode = null;
  if (dossierKey && currentType) {
    const cfg = DOSSIER_TYPES[currentType];
    const isEditingThis = editing === dossierKey;
    const summary = currentDossier ? dossierSummary(currentType, currentDossier.values) : null;
    dossierDetail = (
      <>
        <button type="button" onClick={() => { setDossierKey(null); cancelEdit(); }} className="mb-2.5 inline-flex items-center gap-1.5 text-[13px] text-[#525252] hover:text-[#00663D]">
          <ChevronLeft className="h-4 w-4" />
          Quay lại danh sách hồ sơ chứng khoán
        </button>
        {!currentDossier ? (
          <Surface><EmptyState title="Không tìm thấy hồ sơ" /></Surface>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.25 py-0.75 text-[11px] font-bold ${TYPE_BADGE[currentType]}`}>{cfg.shortTag}</span>
                <span className="text-[15px] font-bold text-[#292929]">{summary?.code}</span>
                <span className="text-[13px] text-slate-500">· {cfg.label}</span>
                {summary && <StatusBadge active={summary.active} label={summary.label} />}
              </div>
              {!isEditingThis && (
                <div className="flex gap-2">
                  <button type="button" className={BTN_OUTLINE} onClick={() => beginEdit(dossierKey)}>
                    <Pencil className="h-4 w-4" />
                    Chỉnh sửa hồ sơ
                  </button>
                  <button type="button" className={BTN_OUTLINE} onClick={() => setConfirm({ kind: 'dossier', key: dossierKey, label: summary?.code ?? '' })}>
                    <Trash2 className="h-4 w-4" />
                    Xóa hồ sơ
                  </button>
                </div>
              )}
            </div>
            {currentType === 'cp' && !isEditingThis && (
              <div className="mb-4.5 flex gap-1.5">
                <PillTab active={!holdersTab} onClick={() => setHoldersTab(false)}>Thông tin chung</PillTab>
                <PillTab active={holdersTab} onClick={() => setHoldersTab(true)}>Cổ đông, NNB &amp; NLQ ({currentDossier.holders.length})</PillTab>
              </div>
            )}
            {isEditingThis ? (
              <Surface>
                <SectionsForm sections={cfg.sections} values={draft} errors={errors} onChange={(k, v) => { setDraft((p) => ({ ...p, [k]: v })); setErrors((p) => ({ ...p, [k]: undefined })); }} />
              </Surface>
            ) : currentType === 'cp' && holdersTab ? (
              holdersPanel
            ) : (
              <>
                <Surface><SectionsView sections={cfg.sections} values={currentDossier.values} /></Surface>
                {currentType === 'tprl' &&
                  TPRL_SUBTABLE_ORDER.map((sk) => (
                    <SubTable
                      key={sk}
                      subKey={sk}
                      rows={currentDossier.subData[sk] ?? []}
                      onAdd={() => setSubRow({ subKey: sk, index: null })}
                      onEdit={(i) => setSubRow({ subKey: sk, index: i })}
                      onDelete={(i) => setConfirm({ kind: 'subrow', subKey: sk, index: i })}
                    />
                  ))}
              </>
            )}
          </>
        )}
      </>
    );
  }

  let content: React.ReactNode;
  if (primaryTab === 'chungkhoan') {
    content = dossierKey ? dossierDetail : dossierList;
  } else if (editing === 'tcph') {
    content = (
      <Surface>
        <SectionsForm sections={issuerSectionsFor(issuer.kind)} values={draft} errors={errors} onChange={(k, v) => { setDraft((p) => ({ ...p, [k]: v })); setErrors((p) => ({ ...p, [k]: undefined })); }} />
      </Surface>
    );
  } else {
    content = (
      <>
        <div className="mb-4.5 flex flex-wrap gap-1.5">
          <PillTab active={detailTab === 'chung'} onClick={() => setDetailTab('chung')}>Thông tin chung</PillTab>
          <PillTab active={detailTab === 'sohuu'} onClick={() => setDetailTab('sohuu')}>Cơ cấu sở hữu</PillTab>
          <PillTab active={detailTab === 'lichsu'} onClick={() => setDetailTab('lichsu')}>Lịch sử thay đổi ({issuer.changeHistory.length})</PillTab>
        </div>
        {detailTab === 'chung' ? infoTab : detailTab === 'sohuu' ? ownershipTab : historyTab}
      </>
    );
  }

  const statusActive = issuer.statusFlg === 1;
  const isOther = issuer.kind === 'tochuckhac';

  return (
    <div className={`p-6 ${editing ? 'pb-28' : ''}`}>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="sticky top-0 z-20 rounded-t-xl border-b border-slate-200 bg-white px-6 pt-6">
          <button type="button" onClick={onBack} className="mb-2.5 inline-flex items-center gap-1.5 text-[13px] text-[#525252] hover:text-[#00663D]">
            <ChevronLeft className="h-4 w-4" />
            Quay lại danh sách
          </button>
          <nav aria-label="Đường dẫn" className="mb-4 flex flex-wrap items-center text-xs text-slate-500">
            <span>Quản lý hồ sơ</span>
            <span aria-hidden="true" className="mx-1.5">›</span>
            <span>Tổ chức phát hành</span>
            <span aria-hidden="true" className="mx-1.5">›</span>
            <span aria-current="page" className="font-medium text-slate-800">{title}</span>
          </nav>
          <div className="mb-4.5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-[19px] font-bold text-[#292929]">{title}</h1>
                <span className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${statusActive ? 'bg-[#E6F4EA] text-[#1E7A42]' : 'bg-slate-100 text-slate-500'}`}>
                  {statusActive ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                </span>
                {isOther && <span className="rounded-full bg-[#EFF6FF] px-2.5 py-0.5 text-[11.5px] font-semibold text-[#1D4ED8]">Tổ chức khác</span>}
              </div>
              <div className="mt-1 text-[12.5px] text-slate-500">
                {isOther ? 'Mã TCPH' : 'Mã số thuế'}: <b className="font-semibold text-[#525252]">{str(isOther ? issuer.values.tcphCode : issuer.values.taxCode) || '-'}</b>
                {str(issuer.values.shortName) && (
                  <>
                    {' · '}Tên viết tắt: <b className="font-semibold text-[#525252]">{str(issuer.values.shortName)}</b>
                  </>
                )}
              </div>
            </div>
            {primaryTab === 'tcph' && editing !== 'tcph' && (
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => beginEdit('tcph')} className={BTN_PRIMARY}>
                  <Pencil className="h-4 w-4" />
                  Chỉnh sửa
                </button>
                <button type="button" onClick={onDeleteIssuer} className={BTN_OUTLINE}>
                  <Trash2 className="h-4 w-4" />
                  Xóa hồ sơ
                </button>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center">
            {([
              { key: 'tcph', label: 'Chi tiết hồ sơ TCPH' },
              { key: 'chungkhoan', label: 'Hồ sơ chứng khoán', count: entries.length },
            ] as const).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setPrimaryTab(t.key);
                  cancelEdit();
                }}
                className={`mr-5.5 flex items-center gap-1.5 border-b-2 px-1 py-2.5 text-[13.5px] ${
                  primaryTab === t.key ? 'border-[#00663D] font-semibold text-[#00663D]' : 'border-transparent font-medium text-slate-500 hover:text-[#292929]'
                }`}
              >
                {t.label}
                {'count' in t && <span className="rounded-full bg-[#E6F4EA] px-1.75 py-px text-[10px] font-bold text-[#1E7A42]">{t.count}</span>}
              </button>
            ))}
          </div>
        </div>
        <div className="p-6">{content}</div>
      </div>

      {editing && (
        <div className="fixed right-0 bottom-0 left-0 z-40 flex items-center justify-end gap-2.5 border-t border-slate-200 bg-white px-7 py-3.5 shadow-[0_-4px_16px_rgba(16,24,32,0.08)] md:left-64">
          <span className="mr-auto text-[12.5px] text-slate-500">
            {editing === 'tcph' ? 'Đang chỉnh sửa hồ sơ TCPH' : 'Đang chỉnh sửa hồ sơ chứng khoán'}
          </span>
          <button type="button" onClick={cancelEdit} className={BTN_OUTLINE}>Hủy</button>
          <button type="button" onClick={saveEdit} className={BTN_PRIMARY}>Lưu thông tin</button>
        </div>
      )}

      {picker && (
        <DossierPickerModal
          issuer={issuer}
          onClose={() => setPicker(false)}
          onCreate={(type) => {
            setPicker(false);
            setCreateType(type);
          }}
          onGotoCp={() => {
            setPicker(false);
            openDossier('cp');
          }}
        />
      )}
      {createType && <DossierCreateModal type={createType} onCancel={() => setCreateType(null)} onSave={(v) => createDossier(createType, v)} />}
      {holderEdit && currentDossier && (
        <HolderModal
          investors={investors}
          existing={currentDossier.holders}
          editing={holderEdit.index === null ? null : currentDossier.holders[holderEdit.index] ?? null}
          onCancel={() => setHolderEdit(null)}
          onSave={saveHolder}
        />
      )}
      {suggest && (
        <FamilySuggestModal base={suggest.base} candidates={suggest.candidates} nameOf={nameOf} onClose={() => setSuggest(null)} onAdd={addSuggested} />
      )}
      {subRow && (
        <SubRowModal
          subKey={subRow.subKey}
          editing={subRow.index === null ? null : currentDossier?.subData[subRow.subKey]?.[subRow.index] ?? null}
          onCancel={() => setSubRow(null)}
          onSave={saveSubRow}
        />
      )}
      {confirm && (
        <ConfirmDeleteDialog
          recordLabel={confirm.kind === 'subrow' ? `dòng ${confirm.index + 1} — ${TPRL_SUBTABLES[confirm.subKey].label}` : confirm.label}
          note={
            confirm.kind === 'holder'
              ? 'Chỉ bỏ gắn khỏi mã chứng khoán này — hồ sơ nhà đầu tư gốc không bị ảnh hưởng.'
              : 'Hành động này không thể hoàn tác.'
          }
          onCancel={() => setConfirm(null)}
          onConfirm={runConfirm}
        />
      )}
    </div>
  );
};

