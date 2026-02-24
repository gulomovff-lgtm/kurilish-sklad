import { useEffect, useState, useMemo, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import type { SkladRequest, RequestStatus, RequestType, UrgencyLevel, RequestHistoryEntry } from '../types';
import {
  Plus, Search, Filter, FileText, ChevronDown, X, Clock, Bell, Building2, User,
  ArrowRightLeft, Package, Wrench, Cpu, Briefcase, Box, LayoutList, LayoutGrid, Download,
  ChevronsLeft, ArrowUpDown, Layers, AlertTriangle, SlidersHorizontal, TableProperties,
  CalendarDays, DollarSign, Flame, CircleCheck, RotateCcw, ShoppingCart,
  ChevronRight, Zap, GitBranch, CheckCircle2, XCircle,
} from 'lucide-react';
import {
  formatDate, formatDateShort, STATUS_LABELS, STATUS_COLORS,
  REQUEST_TYPE_LABELS, REQUEST_TYPE_ICONS,
  URGENCY_LABELS, URGENCY_COLORS, URGENCY_BADGE,
  CHAIN_LABELS, needsMyAction, getNextStatuses, getChainSteps,
  MATERIAL_TAGS, SLA_HOURS,
} from '../utils';
import toast from 'react-hot-toast';
import CreatePurchaseOrderModal from '../components/CreatePurchaseOrderModal';

const TYPE_ICONS = { materials: Package, tools: Wrench, equipment: Cpu, services: Briefcase, other: Box };
const TYPE_COLORS: Record<string, { bg: string; icon: string }> = {
  materials: { bg: 'bg-[#f7ede7]', icon: 'text-[#a67161]' },
  tools:      { bg: 'bg-amber-50',  icon: 'text-amber-600' },
  equipment:  { bg: 'bg-sky-50',    icon: 'text-sky-600' },
  services:   { bg: 'bg-violet-50', icon: 'text-violet-600' },
  other:      { bg: 'bg-gray-100',  icon: 'text-gray-500' },
};

const URGENCY_COLOR_HEX: Record<string, string> = {
  critical: '#ef4444',
  high:     '#f97316',
  normal:   '#3b82f6',
  low:      '#d1d5db',
};

const ALL_STATUSES: RequestStatus[] = [
  'novaya','sklad_review','sklad_partial','nachalnik_review',
  'nachalnik_approved','finansist_review','finansist_approved',
  'snab_process','zakupleno','v_puti','vydano','polucheno','otkloneno',
];

const KANBAN_COLUMNS = [
  { id: 'novaya',    label: 'Новые',         icon: '📋', statuses: ['novaya'] as RequestStatus[],
    color: '#6b7280', bg: '#f3f4f6', wipLimit: 10 },
  { id: 'sklad',     label: 'У склада',       icon: '📦', statuses: ['sklad_review','sklad_partial'] as RequestStatus[],
    color: '#d97706', bg: '#fffbeb', wipLimit: 8  },
  { id: 'nachalnik', label: 'Согласование', icon: '👔', statuses: ['nachalnik_review','nachalnik_approved'] as RequestStatus[],
    color: '#2563eb', bg: '#eff6ff', wipLimit: 12 },
  { id: 'finansist', label: 'Финансы',       icon: '💰', statuses: ['finansist_review','finansist_approved'] as RequestStatus[],
    color: '#7c3aed', bg: '#f5f3ff', wipLimit: 8  },
  { id: 'supply',    label: 'Закупка',        icon: '🚚', statuses: ['snab_process','zakupleno','v_puti'] as RequestStatus[],
    color: '#0891b2', bg: '#ecfeff', wipLimit: 15 },
  { id: 'vydano',    label: 'У прораба',      icon: '📬', statuses: ['vydano'] as RequestStatus[],
    color: '#16a34a', bg: '#f0fdf4', wipLimit: 999 },
  { id: 'done',      label: 'Закрыто',        icon: '✅', statuses: ['polucheno','otkloneno'] as RequestStatus[],
    color: '#059669', bg: '#ecfdf5', wipLimit: 999 },
];

// ─── helpers ──────────────────────────────────────────────────────────────────
function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}
function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}
function highlightText(text: string, q: string): React.ReactNode {
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  return <>{text.slice(0, idx)}<mark className="bg-yellow-200 text-gray-900 rounded px-0.5">{text.slice(idx, idx + q.length)}</mark>{text.slice(idx + q.length)}</>;
}
function formatK(n: number): string {
  if (n >= 1_000_000_000) return `${(n/1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `${(n/1_000_000).toFixed(1)}M`;
  if (n >= 1_000)         return `${(n/1_000).toFixed(0)}K`;
  return String(n);
}

// ─── ChainTimeline ─────────────────────────────────────────────────────────────
function ChainTimeline({ req }: { req: SkladRequest }) {
  const steps = getChainSteps(req.chain ?? 'full');
  const isDone = req.status === 'vydano';
  const isRejected = req.status === 'otkloneno';

  // Build map: status → arrival ISO from history
  const arrivedAt: Record<string, string> = { novaya: req.createdAt };
  (req.history ?? []).forEach(h => { if (h.toStatus) arrivedAt[h.toStatus] = h.at; });

  const currentIdx = (isDone || isRejected)
    ? steps.length
    : steps.findIndex(s => s.status === req.status);

  return (
    <div className="flex items-start overflow-x-auto pb-1" style={{ gap: 0 }}>
      {steps.map((step, i) => {
        const isPast = i < currentIdx;
        const isCurrent = i === currentIdx && !isDone && !isRejected;

        const thisTime = arrivedAt[step.status];
        const nextStep = steps[i + 1];
        const nextTime = nextStep
          ? (arrivedAt[nextStep.status] ?? null)
          : (isDone ? req.updatedAt : null);
        const duration = thisTime && nextTime
          ? Math.max(0, Math.round((new Date(nextTime).getTime() - new Date(thisTime).getTime()) / 86_400_000))
          : null;

        return (
          <div key={step.status} className="flex items-start shrink-0">
            {/* Node */}
            <div className="flex flex-col items-center" style={{ minWidth: '38px' }}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border-2 ${
                isPast
                  ? 'border-gray-300 bg-gray-200 text-gray-400'
                  : isCurrent
                  ? 'border-blue-500 bg-blue-500 text-white'
                  : 'border-gray-200 bg-white text-gray-300'
              }`}>
                {isPast ? '✓' : i + 1}
              </div>
              <span className={`text-[8px] text-center leading-tight mt-0.5 w-10 truncate ${
                isPast ? 'text-gray-300' : isCurrent ? 'text-blue-600 font-bold' : 'text-gray-200'
              }`}>
                {step.label}
              </span>
            </div>
            {/* Connector */}
            {i < steps.length - 1 && (
              <div className="flex flex-col items-center mt-2 mx-0.5 shrink-0" style={{ minWidth: '24px' }}>
                <div className={`h-0.5 w-full rounded ${isPast ? 'bg-gray-300' : 'bg-gray-100'}`} />
                {duration !== null && isPast && (
                  <span className="text-[8px] text-gray-300 mt-0.5 whitespace-nowrap">{duration === 0 ? '<1д' : `${duration}д`}</span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Status action button styles ──────────────────────────────────────────────
const STATUS_ACTION_STYLE: Partial<Record<RequestStatus, string>> = {
  vydano:             'bg-lime-500   hover:bg-lime-600   text-white',
  polucheno:          'bg-green-600  hover:bg-green-700  text-white',
  nachalnik_approved: 'bg-indigo-500 hover:bg-indigo-600 text-white',
  finansist_approved: 'bg-violet-500 hover:bg-violet-600 text-white',
  snab_process:       'bg-cyan-500   hover:bg-cyan-600   text-white',
  zakupleno:          'bg-teal-500   hover:bg-teal-600   text-white',
  v_puti:             'bg-sky-500    hover:bg-sky-600    text-white',
  otkloneno:          'bg-red-500    hover:bg-red-600    text-white',
  sklad_partial:      'bg-orange-500 hover:bg-orange-600 text-white',
  nachalnik_review:   'bg-purple-500 hover:bg-purple-600 text-white',
  finansist_review:   'bg-pink-500   hover:bg-pink-600   text-white',
};

// ─── KanbanCard ───────────────────────────────────────────────────────────────
function KanbanCard({
  req, myAction, search, compact, multi,
  currentUserRole, currentUserUid, currentUserName,
  selectable, selected, onToggleSelect,
}: {
  req: SkladRequest;
  myAction: boolean;
  search: string;
  compact: boolean;
  multi: boolean;
  currentUserRole: string;
  currentUserUid: string;
  currentUserName: string;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const [showChain, setShowChain] = useState(false);
  const [updating, setUpdating] = useState(false);

  const isUrgent   = req.urgencyLevel === 'critical' || req.urgencyLevel === 'high';
  const isCritical = req.urgencyLevel === 'critical';
  const TI = TYPE_ICONS[req.requestType ?? 'other'];
  const TC = TYPE_COLORS[req.requestType ?? 'other'];
  const urgColor = URGENCY_COLOR_HEX[req.urgencyLevel ?? 'normal'];
  const today = new Date().toISOString().slice(0, 10);
  const isOverdue  = req.plannedDate && req.plannedDate < today && req.status !== 'vydano' && req.status !== 'polucheno' && req.status !== 'otkloneno';
  const daysIn  = daysSince(req.updatedAt ?? req.createdAt);
  const daysLeft = req.plannedDate ? daysUntil(req.plannedDate) : null;
  const isRejected = req.status === 'otkloneno';
  const isDone     = req.status === 'vydano' || req.status === 'polucheno' || req.status === 'otkloneno';

  // SLA calc
  const slaHrs = SLA_HOURS[req.status];
  const slaEntry = req.slaEnteredAt ?? req.updatedAt;
  const hrsInStatus = (Date.now() - new Date(slaEntry).getTime()) / 3_600_000;
  const slaOverdue = !isDone && slaHrs !== undefined && hrsInStatus > slaHrs;
  const slaWarning = !isDone && slaHrs !== undefined && !slaOverdue && hrsInStatus > slaHrs * 0.75;
  const slaRemainingH = slaHrs !== undefined ? Math.max(0, slaHrs - hrsInStatus) : null;

  // Tags
  const reqTags = (req.tags ?? [])
    .map(id => MATERIAL_TAGS.find(t => t.id === id))
    .filter(Boolean) as typeof MATERIAL_TAGS;

  const nextStatuses = currentUserRole
    ? getNextStatuses(req.status, currentUserRole as any, req.chain ?? 'full')
    : [];

  const handleStatusChange = async (newStatus: RequestStatus, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (updating) return;
    setUpdating(true);
    try {
      const entry: RequestHistoryEntry = {
        at: new Date().toISOString(),
        by: currentUserUid,
        byName: currentUserName,
        action: `${STATUS_LABELS[req.status]} → ${STATUS_LABELS[newStatus]}`,
        fromStatus: req.status,
        toStatus: newStatus,
      };
      await updateDoc(doc(db, 'requests', req.id), {
        status: newStatus,
        updatedAt: new Date().toISOString(),
        slaEnteredAt: new Date().toISOString(),
        history: [...(req.history ?? []), entry],
      });
      toast.success(STATUS_LABELS[newStatus]);
      setShowActions(false);
    } catch {
      toast.error('Ошибка при обновлении');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div
      className={`group relative bg-white rounded-xl border border-gray-100 border-l-4 transition-all hover:shadow-md ${isRejected ? 'opacity-60' : ''} ${slaOverdue ? 'ring-2 ring-red-400' : slaWarning ? 'ring-1 ring-orange-300' : ''}`}
      style={{
        borderLeftColor: myAction ? '#fbbf24' : isOverdue ? '#f87171' : urgColor,
        boxShadow: myAction
          ? '0 0 0 1px #fde68a, 0 1px 4px rgba(0,0,0,0.07)'
          : '0 1px 4px rgba(0,0,0,0.06)',
      }}>

      {/* Critical pulse */}
      {isCritical && !isRejected && (
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse z-10" />
      )}

      {/* Чекбокс выбора (для колонки Закупка) */}
      {selectable && onToggleSelect && (
        <button
          onClick={e => { e.preventDefault(); e.stopPropagation(); onToggleSelect(req.id); }}
          className={`absolute top-2 right-2 z-20 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
            selected
              ? 'bg-cyan-600 border-cyan-600 text-white'
              : 'bg-white border-gray-300 hover:border-cyan-400'
          }`}
        >
          {selected && <span className="text-[10px] text-white font-bold">✓</span>}
        </button>
      )}

      {/* Clickable body → detail page */}
      <Link to={`/requests/${req.id}`} className="block">
        <div className={`px-3 ${compact ? 'py-2' : 'pt-3 pb-2'}`}>
          {/* Row 1: type icon + number + badge */}
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${TC.bg}`}>
              <TI className={`w-3.5 h-3.5 ${TC.icon}`} />
            </div>
            <span className="text-xs font-mono text-gray-300">#{req.number}</span>
            {multi && (
              <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[req.status]}`}>
                {STATUS_LABELS[req.status]}
              </span>
            )}
            {!multi && myAction && !showActions && (
              <span className="ml-auto flex items-center gap-0.5 text-[10px] font-bold text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded-full">
                <Bell className="w-2.5 h-2.5" /> Действие
              </span>
            )}
          </div>

          {/* Title */}
          <p className={`font-semibold text-gray-900 leading-tight mb-1.5 ${
            compact ? 'text-xs line-clamp-1' : 'text-sm line-clamp-2'
          }`}>
            {highlightText(req.title, search)}
          </p>

          {!compact && (
            <div className="flex items-center gap-1 text-xs text-gray-400 mb-2">
              <Building2 className="w-3 h-3 shrink-0" />
              <span className="truncate">{highlightText(req.objectName, search)}</span>
            </div>
          )}

          {/* Footer: avatar + cost + urgency */}
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1">
              <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500 shrink-0">
                {req.createdByName.charAt(0).toUpperCase()}
              </div>
              {!compact && (
                <span className="text-[11px] text-gray-400 truncate max-w-[70px]">{req.createdByName.split(' ')[0]}</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {req.estimatedCost ? (
                <span className="text-[11px] font-bold text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded">
                  {formatK(req.estimatedCost)}
                </span>
              ) : null}
              {isUrgent && (
                <span className={`text-[10px] px-1 py-0.5 rounded font-bold ${URGENCY_COLORS[req.urgencyLevel ?? 'normal']}`}>
                  {URGENCY_BADGE[req.urgencyLevel ?? 'normal']}
                </span>
              )}
            </div>
          </div>

          {/* Dates */}
          {!compact && (req.plannedDate || daysIn > 0) && (
            <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-gray-50">
              {req.plannedDate ? (
                <div className={`flex items-center gap-1 text-[11px] font-medium ${
                  isOverdue ? 'text-red-500' : daysLeft !== null && daysLeft <= 2 ? 'text-orange-500' : 'text-gray-400'
                }`}>
                  {isOverdue ? <AlertTriangle className="w-3 h-3" /> : <CalendarDays className="w-3 h-3" />}
                  {isOverdue
                    ? `Просрочено ${Math.abs(daysLeft ?? 0)}д`
                    : `${daysLeft}д до срока`}
                </div>
              ) : <span />}
              <div className="flex items-center gap-1 text-[11px] text-gray-300">
                <Clock className="w-2.5 h-2.5" />{daysIn}д
              </div>
            </div>
          )}
        </div>
      </Link>

      {/* ── SLA индикатор ── */}
      {!isDone && slaHrs !== undefined && !compact && (
        <div className={`mx-3 mb-1.5 flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-bold ${
          slaOverdue ? 'bg-red-50 text-red-700 border border-red-200' : slaWarning ? 'bg-orange-50 text-orange-600' : 'bg-gray-50 text-gray-400'
        }`}>
          <Clock className="w-3 h-3 shrink-0" />
          {slaOverdue
            ? `⚠ SLA просрочен на ${Math.round(hrsInStatus - slaHrs)}ч`
            : `SLA: ещё ~${slaRemainingH !== null && slaRemainingH < 1 ? '< 1ч' : `${Math.round(slaRemainingH ?? 0)}ч`}`}
        </div>
      )}

      {/* ── Теги ── */}
      {reqTags.length > 0 && !compact && (
        <div className="px-3 pb-1.5 flex flex-wrap gap-1">
          {reqTags.map(t => (
            <span key={t.id} className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
              style={{ background: t.bg, color: t.color }}>
              {t.emoji} {t.label}
            </span>
          ))}
        </div>
      )}

      {/* ── Chain timeline (expandable) ── */}
      {!compact && (
        <div className="px-3 pb-1.5">
          <button
            onClick={e => { e.preventDefault(); e.stopPropagation(); setShowChain(v => !v); }}
            className="flex items-center gap-1 text-[10px] text-gray-300 hover:text-gray-500 transition-colors"
          >
            <GitBranch className="w-3 h-3" />
            <span>{showChain ? 'Скрыть цепочку' : 'Показать цепочку'}</span>
            <ChevronRight className={`w-3 h-3 transition-transform ${showChain ? 'rotate-90' : ''}`} />
          </button>
          {showChain && (
            <div className="mt-1.5 rounded-lg bg-gray-50 px-2 py-2">
              <ChainTimeline req={req} />
            </div>
          )}
        </div>
      )}

      {/* ── Inline status actions ── */}
      {nextStatuses.length > 0 && (
        <div className="px-3 pb-2.5">
          {!showActions ? (
            <button
              onClick={e => { e.preventDefault(); e.stopPropagation(); setShowActions(true); }}
              disabled={isDone}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-bold text-yellow-700 bg-yellow-50 border border-yellow-200 hover:bg-yellow-100 transition-colors"
            >
              <Zap className="w-3 h-3" />
              Обработать
            </button>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Перевести в:</span>
                <button
                  onClick={e => { e.preventDefault(); e.stopPropagation(); setShowActions(false); }}
                  className="p-0.5 text-gray-300 hover:text-gray-500"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {nextStatuses.map(status => (
                <button
                  key={status}
                  onClick={e => handleStatusChange(status, e)}
                  disabled={updating}
                  className={`w-full text-[11px] font-bold py-1.5 px-2 rounded-lg transition-colors disabled:opacity-50 ${
                    STATUS_ACTION_STYLE[status] ?? 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  {STATUS_LABELS[status]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── KanbanBoard ──────────────────────────────────────────────────────────────
function KanbanBoard({
  filtered, isNeedAction, search, userRole, currentUserUid, currentUserName, allRequests,
}: {
  filtered: SkladRequest[];
  isNeedAction: (r: SkladRequest) => boolean;
  search: string;
  userRole: string;
  currentUserUid: string;
  currentUserName: string;
  allRequests: SkladRequest[];
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [compact, setCompact] = useState(false);
  const [groupByObj, setGroupByObj] = useState(false);
  const [sortBy, setSortBy] = useState<'urgency' | 'date' | 'cost' | 'updated'>('urgency');
  const [showDone, setShowDone] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showPOModal, setShowPOModal] = useState(false);

  // Summary
  const totalCost = filtered.reduce((s, r) => s + (r.estimatedCost ?? 0), 0);
  const actionCount = filtered.filter(r => isNeedAction(r)).length;
  const overdueCount = filtered.filter(r => {
    const today = new Date().toISOString().slice(0, 10);
    return r.plannedDate && r.plannedDate < today && r.status !== 'vydano' && r.status !== 'otkloneno';
  }).length;

  const toggleCol = (id: string) => setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));

  // Чекбоксы для колонки «Закупка»
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const selectedRequests = allRequests.filter(r => selectedIds.has(r.id));

  // Sorting
  const URGENCY_ORDER: Record<string, number> = { critical: 0, high: 1, normal: 2, low: 3 };
  const sortCards = (cards: SkladRequest[]) => {
    const c = [...cards];
    if (sortBy === 'urgency') return c.sort((a, b) => (URGENCY_ORDER[a.urgencyLevel ?? 'normal'] ?? 2) - (URGENCY_ORDER[b.urgencyLevel ?? 'normal'] ?? 2));
    if (sortBy === 'date')    return c.sort((a, b) => (a.plannedDate ?? '9999') < (b.plannedDate ?? '9999') ? -1 : 1);
    if (sortBy === 'cost')    return c.sort((a, b) => (b.estimatedCost ?? 0) - (a.estimatedCost ?? 0));
    if (sortBy === 'updated') return c.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return c;
  };

  const visibleCols = showDone ? KANBAN_COLUMNS : KANBAN_COLUMNS.filter(c => c.id !== 'done');

  // GroupBy Object — build swimlanes
  const objectNames = useMemo(() => {
    const names = [...new Set(filtered.map(r => r.objectName))].sort();
    return names;
  }, [filtered]);

  const SORT_OPTIONS: { id: typeof sortBy; label: string }[] = [
    { id: 'urgency', label: 'По срочности' },
    { id: 'date',    label: 'По дате' },
    { id: 'cost',    label: 'По сумме' },
    { id: 'updated', label: 'По обновлению' },
  ];

  return (
    <div className="space-y-3">
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3 flex-wrap bg-white rounded-2xl border border-gray-100 px-4 py-3 shadow-sm">
        {/* Stats */}
        <div className="flex items-center gap-4 flex-1 flex-wrap">
          <div className="flex items-center gap-1.5 text-sm">
            <FileText className="w-4 h-4 text-gray-400" />
            <span className="font-bold text-gray-700">{filtered.length}</span>
            <span className="text-gray-400 hidden sm:inline">заявок</span>
          </div>
          {actionCount > 0 && (
            <div className="flex items-center gap-1.5 text-sm">
              <Bell className="w-4 h-4 text-yellow-500" />
              <span className="font-bold text-yellow-600">{actionCount}</span>
              <span className="text-gray-400 hidden sm:inline">действий</span>
            </div>
          )}
          {overdueCount > 0 && (
            <div className="flex items-center gap-1.5 text-sm">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="font-bold text-red-500">{overdueCount}</span>
              <span className="text-gray-400 hidden sm:inline">просрочено</span>
            </div>
          )}
          {totalCost > 0 && (
            <div className="flex items-center gap-1.5 text-sm">
              <DollarSign className="w-4 h-4 text-gray-400" />
              <span className="font-bold text-gray-700">{formatK(totalCost)}</span>
              <span className="text-gray-400 hidden sm:inline">сум</span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sort */}
          <div className="relative">
            <div className="group flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 cursor-pointer hover:bg-gray-50 transition-colors">
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{SORT_OPTIONS.find(s => s.id === sortBy)?.label}</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as typeof sortBy)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full"
              >
                {SORT_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Group toggle */}
          <button
            onClick={() => setGroupByObj(!groupByObj)}
            title={groupByObj ? 'Группировка по объекту (вкл)' : 'Группировка по объекту (выкл)'}
            className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium transition-colors ${
              groupByObj ? 'border-violet-400 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{groupByObj ? 'По объектам' : 'По объектам'}</span>
          </button>

          {/* Show done */}
          <button
            onClick={() => setShowDone(!showDone)}
            title={showDone ? 'Скрыть завершённые' : 'Показать завершённые'}
            className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium transition-colors ${
              showDone ? 'border-green-300 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}>
            <CircleCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{showDone ? 'С завершёнными' : 'Без завершённых'}</span>
          </button>

          {/* Compact */}
          <button
            onClick={() => setCompact(!compact)}
            title={compact ? 'Компактный режим (вкл)' : 'Компактный режим'}
            className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium transition-colors ${
              compact ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{compact ? 'Компакт' : 'Компакт'}</span>
          </button>

          {/* Expand all collapsed */}
          {Object.values(collapsed).some(Boolean) && (
            <button
              onClick={() => setCollapsed({})}
              title="Развернуть все"
              className="flex items-center gap-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-500 hover:bg-gray-50 transition-colors">
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* ── Board ── */}
      <div className="overflow-x-auto pb-4">
        {!groupByObj ? (
          /* ── NORMAL MODE: Status columns ── */
          <div className="flex gap-3" style={{ minWidth: `${visibleCols.filter(c => !collapsed[c.id]).length * 280 + visibleCols.filter(c => collapsed[c.id]).length * 48}px` }}>
            {visibleCols.map(col => {
              const cards = sortCards(filtered.filter(r => col.statuses.includes(r.status)));
              const totalColCost = cards.reduce((s, r) => s + (r.estimatedCost ?? 0), 0);
              const actionCards = cards.filter(r => isNeedAction(r)).length;
              const isCollapsed = collapsed[col.id];
              const overWip = cards.length > col.wipLimit;

              if (isCollapsed) {
                return (
                  <div key={col.id}
                    className="w-12 flex flex-col items-center gap-2 cursor-pointer shrink-0"
                    onClick={() => toggleCol(col.id)}>
                    <div className="w-full py-3 rounded-xl flex flex-col items-center gap-2"
                      style={{ background: col.bg }}>
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: col.color }} />
                      <span className="text-xs font-black" style={{ color: col.color,
                        writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)' }}>
                        {col.label}
                      </span>
                      <span className="text-xs font-black px-1 py-0.5 rounded-md text-white" style={{ background: col.color }}>
                        {cards.length}
                      </span>
                    </div>
                  </div>
                );
              }

              return (
                <div key={col.id} className="flex flex-col gap-0 shrink-0 rounded-2xl overflow-hidden shadow-sm border border-gray-200"
                  style={{ width: '276px', background: '#f8f9fa' }}>
                  {/* Column header — solid color top bar */}
                  <div style={{ background: col.color }}>
                    <div className="flex items-center gap-2 px-3 py-2.5">
                      <span className="text-base">{col.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{col.label}</span>
                          <span className={`text-xs font-black px-2 py-0.5 rounded-full bg-white/20 text-white ${
                            overWip ? 'animate-pulse !bg-red-600' : ''
                          }`}>
                            {cards.length}{overWip ? ' ⚠' : ''}
                          </span>
                          {actionCards > 0 && (
                            <span className="text-xs font-bold text-yellow-900 bg-yellow-300 px-1.5 py-0.5 rounded-full">
                              🔔 {actionCards}
                            </span>
                          )}
                        </div>
                        {totalColCost > 0 && (
                          <p className="text-xs font-medium text-white/70 mt-0.5">
                            {formatK(totalColCost)} сум
                          </p>
                        )}
                      </div>
                      <button onClick={() => toggleCol(col.id)}
                        className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/20 transition-all"
                        title="Свернуть">
                        <ChevronsLeft className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {/* WIP progress bar */}
                    {col.wipLimit < 999 && (
                      <div className="h-1 bg-white/20">
                        <div className="h-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, (cards.length / col.wipLimit) * 100)}%`,
                            background: overWip ? '#ef4444' : 'rgba(255,255,255,0.7)',
                          }} />
                      </div>
                    )}
                  </div>

                  {/* Cards area */}
                  <div className="flex flex-col gap-2 p-2.5 flex-1">
                    {cards.length === 0 ? (
                      <div className="py-10 text-center border-2 border-dashed border-gray-200 rounded-xl bg-white">
                        <p className="text-xs text-gray-300">Нет заявок</p>
                      </div>
                    ) : cards.map(req => (
                      <KanbanCard key={req.id} req={req} myAction={isNeedAction(req)}
                        search={search} compact={compact} multi={col.statuses.length > 1}
                        currentUserRole={userRole} currentUserUid={currentUserUid} currentUserName={currentUserName}
                        selectable={col.id === 'supply' && (userRole === 'snab' || userRole === 'admin')}
                        selected={selectedIds.has(req.id)}
                        onToggleSelect={toggleSelect} />
                    ))}
                  </div>

                  {/* Column footer */}
                  {cards.length > 3 && (
                    <div className="text-center py-1.5 text-xs text-gray-400 bg-white/50 border-t border-gray-100">
                      {cards.length} карточек
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* ── SWIMLANE MODE: Group by Object ── */
          <div className="space-y-4" style={{ minWidth: `${visibleCols.length * 220 + 160}px` }}>
            {/* Sticky header row */}
            <div className="flex gap-2">
              <div className="w-40 shrink-0" />
              {visibleCols.map(col => (
                <div key={col.id} className="flex-1 rounded-xl px-3 py-2 flex items-center gap-2" style={{ background: col.bg }}>
                  <span>{col.icon}</span>
                  <span className="text-xs font-bold" style={{ color: col.color }}>{col.label}</span>
                  <span className="ml-auto text-xs font-black text-white px-1.5 py-0.5 rounded-full" style={{ background: col.color }}>
                    {filtered.filter(r => col.statuses.includes(r.status)).length}
                  </span>
                </div>
              ))}
            </div>

            {/* Object rows */}
            {objectNames.map(objName => {
              const objRequests = filtered.filter(r => r.objectName === objName);
              const objTotal = objRequests.reduce((s, r) => s + (r.estimatedCost ?? 0), 0);
              return (
                <div key={objName} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                  {/* Swimlane header */}
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                    <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="font-bold text-sm text-gray-700 truncate flex-1">{objName}</span>
                    <span className="text-xs text-gray-400">{objRequests.length} заявок</span>
                    {objTotal > 0 && <span className="text-xs font-bold text-gray-600">{formatK(objTotal)} сум</span>}
                  </div>
                  {/* Grid */}
                  <div className="flex gap-2 p-2">
                    {visibleCols.map(col => {
                      const cards = sortCards(objRequests.filter(r => col.statuses.includes(r.status)));
                      return (
                        <div key={col.id} className="flex-1 flex flex-col gap-1.5 min-w-0">
                          {cards.length === 0 ? (
                            <div className="h-14 border border-dashed border-gray-100 rounded-lg flex items-center justify-center">
                              <span className="text-xs text-gray-200">—</span>
                            </div>
                          ) : cards.map(req => (
                            <KanbanCard key={req.id} req={req} myAction={isNeedAction(req)}
                              search={search} compact={true} multi={col.statuses.length > 1}
                              currentUserRole={userRole} currentUserUid={currentUserUid} currentUserName={currentUserName} />
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {objectNames.length === 0 && (
              <div className="text-center py-16 text-gray-300">
                <TableProperties className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Нет данных</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══ BATCH ACTION BAR ══ */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gray-900 text-white rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-4 min-w-[320px]">
          <div className="flex-1">
            <span className="text-sm font-bold">Выбрано: {selectedIds.size}</span>
            <span className="text-xs text-gray-400 ml-2">заявок</span>
          </div>
          <button
            onClick={() => setShowPOModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-xl hover:bg-cyan-400 transition-colors font-semibold text-sm"
          >
            <ShoppingCart className="w-4 h-4" />
            Сформировать сводный заказ
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ══ CREATE PO MODAL ══ */}
      {showPOModal && selectedRequests.length > 0 && (
        <CreatePurchaseOrderModal
          requests={selectedRequests}
          onClose={() => setShowPOModal(false)}
          onDone={() => { setShowPOModal(false); setSelectedIds(new Set()); }}
        />
      )}
    </div>
  );
}

type QuickFilter = 'all' | 'mine' | 'need_action' | 'urgent' | 'open' | 'done';

export default function RequestsPage() {
  const { currentUser } = useAuth();
  const location = useLocation();
  const [requests, setRequests] = useState<SkladRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(() => sessionStorage.getItem('req_search') ?? '');
  const [filterStatus, setFilterStatus] = useState<RequestStatus | 'all'>('all');
  const [filterType, setFilterType] = useState<RequestType | 'all'>('all');
  const [filterUrgency, setFilterUrgency] = useState<UrgencyLevel | 'all'>('all');
  const [filterObject, setFilterObject] = useState('');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>(() => {
    const s = sessionStorage.getItem('req_quickFilter');
    return (['all','mine','need_action','urgent','open','done'].includes(s ?? '')) ? s as QuickFilter : 'all';
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  // Kanban is primary view; restored from session
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>(() => {
    const s = sessionStorage.getItem('req_viewMode');
    return s === 'list' ? 'list' : 'kanban';
  });

  // ── Persist state in sessionStorage ───────────────────────────────────────
  useEffect(() => { sessionStorage.setItem('req_viewMode', viewMode); }, [viewMode]);
  useEffect(() => { sessionStorage.setItem('req_quickFilter', quickFilter); }, [quickFilter]);
  useEffect(() => { sessionStorage.setItem('req_search', search); }, [search]);

  // ── Scroll restoration when navigating back ────────────────────────────────
  useEffect(() => {
    const saved = sessionStorage.getItem('req_scrollY');
    if (saved) {
      const y = parseInt(saved, 10);
      requestAnimationFrame(() => window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior }));
      sessionStorage.removeItem('req_scrollY');
    }
    return () => {
      sessionStorage.setItem('req_scrollY', String(window.scrollY));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    if (!currentUser) return;
    const col = collection(db, 'requests');
    let q;
    if (currentUser.role === 'prоrab') {
      q = query(col, where('createdBy', '==', currentUser.uid), orderBy('createdAt', 'desc'));
    } else {
      q = query(col, orderBy('createdAt', 'desc'));
    }
    const unsub = onSnapshot(q, snap => {
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as SkladRequest)));
      setLoading(false);
    });
    return unsub;
  }, [currentUser]);

  const filtered = requests.filter(r => {
    // Быстрый фильтр
    if (quickFilter === 'mine' && r.createdBy !== currentUser?.uid) return false;
    if (quickFilter === 'need_action' && currentUser && !needsMyAction(r.status, currentUser.role, r.chain ?? 'full')) return false;
    if (quickFilter === 'urgent' && r.urgencyLevel !== 'high' && r.urgencyLevel !== 'critical') return false;
    if (quickFilter === 'open' && (r.status === 'vydano' || r.status === 'otkloneno')) return false;
    if (quickFilter === 'done' && r.status !== 'vydano') return false;

    // Поиск
    if (search) {
      const s = search.toLowerCase();
      const match = r.title.toLowerCase().includes(s)
        || r.objectName.toLowerCase().includes(s)
        || String(r.number).includes(s)
        || r.createdByName.toLowerCase().includes(s)
        || (r.deliveryAddress ?? '').toLowerCase().includes(s);
      if (!match) return false;
    }

    // Фильтры
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (filterType !== 'all' && r.requestType !== filterType) return false;
    if (filterUrgency !== 'all' && r.urgencyLevel !== filterUrgency) return false;
    if (filterObject && !r.objectName.toLowerCase().includes(filterObject.toLowerCase())) return false;

    // Даты
    if (dateFrom && r.createdAt < dateFrom) return false;
    if (dateTo && r.createdAt > dateTo + 'T23:59:59') return false;

    return true;
  });

  const myActionCount = requests.filter(r =>
    currentUser && needsMyAction(r.status, currentUser.role, r.chain ?? 'full')
  ).length;

  const urgentCount = requests.filter(r =>
    (r.urgencyLevel === 'high' || r.urgencyLevel === 'critical') &&
    r.status !== 'vydano' && r.status !== 'otkloneno'
  ).length;

  const isNeedAction = (r: SkladRequest) =>
    !!currentUser && needsMyAction(r.status, currentUser.role, r.chain ?? 'full');

  const exportCSV = () => {
    const headers = ['№','Название','Объект','Прораб','Тип','Статус','Срочность','Создана','К дате','Смета (сум)'];
    const rows = filtered.map(r => [
      r.number,
      `"${r.title.replace(/"/g,'""')}"`,
      `"${r.objectName.replace(/"/g,'""')}"`,
      `"${r.createdByName.replace(/"/g,'""')}"`,
      REQUEST_TYPE_LABELS[r.requestType ?? 'other'],
      STATUS_LABELS[r.status],
      URGENCY_LABELS[r.urgencyLevel ?? 'normal'],
      r.createdAt.slice(0,10),
      r.plannedDate ?? '',
      r.estimatedCost ?? '',
    ]);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff'+csv], { type:'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `заявки_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  const quickButtons: { id: QuickFilter; label: string; count?: number; color: string }[] = [
    { id: 'all', label: 'Все', color: 'bg-gray-100 text-gray-700' },
    { id: 'need_action', label: 'Мои действия', count: myActionCount, color: 'bg-yellow-100 text-yellow-800' },
    { id: 'urgent', label: 'Срочные', count: urgentCount, color: 'bg-red-100 text-red-800' },
    { id: 'mine', label: 'Мои заявки', color: 'bg-blue-100 text-blue-800' },
    { id: 'open', label: 'В работе', color: 'bg-green-100 text-green-800' },
    { id: 'done', label: 'Выданные', color: 'bg-gray-100 text-gray-600' },
  ];

  const hasActiveFilters = filterStatus !== 'all' || filterType !== 'all' || filterUrgency !== 'all' || filterObject || dateFrom || dateTo;

  const clearFilters = () => {
    setFilterStatus('all');
    setFilterType('all');
    setFilterUrgency('all');
    setFilterObject('');
    setDateFrom('');
    setDateTo('');
    setSearch('');
    setQuickFilter('all');
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Заголовок */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Заявки</h1>
          <p className="text-sm text-gray-500">{requests.length} всего</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex border border-gray-200 rounded-xl overflow-hidden">
            <button onClick={() => setViewMode('list')}
              className={`p-2 transition-colors ${viewMode === 'list' ? 'text-white' : 'text-gray-400 hover:bg-gray-50'}`}
              style={viewMode === 'list' ? { background: '#c89587' } : {}} title="Список">
              <LayoutList className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('kanban')}
              className={`p-2 transition-colors ${viewMode === 'kanban' ? 'text-white' : 'text-gray-400 hover:bg-gray-50'}`}
              style={viewMode === 'kanban' ? { background: '#c89587' } : {}} title="Канбан">
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
          {/* Export */}
          {filtered.length > 0 && (
            <button onClick={exportCSV} title="Скачать CSV"
              className="p-2 border border-gray-200 rounded-xl text-gray-400 hover:bg-gray-50 hover:text-gray-700 transition-colors">
              <Download className="w-4 h-4" />
            </button>
          )}
          {(currentUser?.role === 'prоrab' || currentUser?.role === 'admin') && (
            <Link to="/requests/new"
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm text-white transition-colors"
              style={{ background: '#c89587' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#a67161')}
              onMouseLeave={e => (e.currentTarget.style.background = '#c89587')}>
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Новая заявка</span>
              <span className="sm:hidden">+</span>
            </Link>
          )}
        </div>
      </div>

      {/* Быстрые фильтры */}
      <div className="flex gap-2 flex-wrap">
        {quickButtons.map(btn => (
          <button
            key={btn.id}
            onClick={() => setQuickFilter(btn.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all border-2 ${
              quickFilter === btn.id
                ? `${btn.color} border-current`
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {btn.label}
            {btn.count !== undefined && btn.count > 0 && (
              <span className="bg-current bg-opacity-20 rounded-full px-1.5 py-0.5 text-xs font-bold min-w-[20px] text-center">
                {btn.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Поиск и фильтры */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск: номер, название, объект, прораб..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-sm transition-colors ${
              showAdvanced || hasActiveFilters
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Фильтры
            {hasActiveFilters && <span className="bg-blue-600 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center">!</span>}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {showAdvanced && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-gray-100">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Статус</label>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as RequestStatus | 'all')}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="all">Все статусы</option>
                {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Тип заявки</label>
              <select value={filterType} onChange={e => setFilterType(e.target.value as RequestType | 'all')}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="all">Все типы</option>
                {(Object.keys(REQUEST_TYPE_LABELS) as RequestType[]).map(t => (
                  <option key={t} value={t}>{REQUEST_TYPE_ICONS[t]} {REQUEST_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Срочность</label>
              <select value={filterUrgency} onChange={e => setFilterUrgency(e.target.value as UrgencyLevel | 'all')}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="all">Любая</option>
                {(['low','normal','high','critical'] as UrgencyLevel[]).map(u => (
                  <option key={u} value={u}>{URGENCY_LABELS[u]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Объект</label>
              <input value={filterObject} onChange={e => setFilterObject(e.target.value)}
                placeholder="Фильтр по объекту..."
                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Дата от</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Дата до</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {hasActiveFilters && (
              <div className="col-span-2 flex items-end">
                <button onClick={clearFilters}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <X className="w-4 h-4" /> Сбросить фильтры
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── КАНБАН ── */}
      {!loading && viewMode === 'kanban' && (
        <KanbanBoard
          filtered={filtered}
          isNeedAction={isNeedAction}
          search={search}
          userRole={currentUser?.role ?? ''}
          currentUserUid={currentUser?.uid ?? ''}
          currentUserName={currentUser?.displayName ?? ''}
          allRequests={requests}
        />
      )}

      {/* ── СПИСОК ── */}
      {viewMode === 'list' && loading ? (
        <div className="space-y-2">
          {[1,2,3,4].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : viewMode === 'list' && filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 py-16 text-center text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Заявок не найдено</p>
          <p className="text-sm mt-1">Попробуйте изменить фильтры</p>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="mt-3 text-sm text-blue-600 hover:underline">
              Сбросить все фильтры
            </button>
          )}
        </div>
      ) : viewMode === 'list' ? (
        <div className="space-y-2">
          {filtered.map(req => {
            const action = isNeedAction(req);
            const isUrgent = req.urgencyLevel === 'critical' || req.urgencyLevel === 'high';
            return (
              <Link
                key={req.id}
                to={`/requests/${req.id}`}
                className={`block bg-white rounded-2xl border p-4 hover:shadow-md transition-all ${
                  action ? 'border-yellow-400 bg-yellow-50' :
                  isUrgent ? 'border-orange-300' :
                  'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Type icon */}
                  {(() => { const TI = TYPE_ICONS[req.requestType ?? 'other']; const TC = TYPE_COLORS[req.requestType ?? 'other']; return (
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${TC.bg}`}>
                      <TI className={`w-4 h-4 ${TC.icon}`} />
                    </div>
                  ); })()}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-mono text-gray-400">#{req.number}</span>
                      {req.urgencyLevel && req.urgencyLevel !== 'normal' && req.urgencyLevel !== 'low' && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${URGENCY_COLORS[req.urgencyLevel]}`}>
                          {URGENCY_LABELS[req.urgencyLevel]}
                        </span>
                      )}
                      {action && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-200 text-yellow-800 font-medium flex items-center gap-1">
                          <Bell className="w-3 h-3" /> Требует действия
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-gray-900 truncate">{req.title}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                      <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {req.objectName}</span>
                      <span className="flex items-center gap-1"><User className="w-3 h-3" /> {req.createdByName}</span>
                      {req.chain && <span className="flex items-center gap-1"><ArrowRightLeft className="w-3 h-3" /> {CHAIN_LABELS[req.chain]}</span>}
                      {req.plannedDate && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          к {formatDateShort(req.plannedDate)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${STATUS_COLORS[req.status]}`}>
                      {STATUS_LABELS[req.status]}
                    </span>
                    <span className="text-xs text-gray-400">{formatDate(req.updatedAt)}</span>
                    {req.estimatedCost && (
                      <span className="text-xs text-gray-500">
                        ~{req.estimatedCost.toLocaleString('ru-RU')} сум
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
          <div className="text-center text-xs text-gray-400 py-2">
            Показано {filtered.length} из {requests.length} заявок
          </div>
        </div>
      ) : null}
    </div>
  );
}
