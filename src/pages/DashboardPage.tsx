import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import type { SkladRequest, RequestType, RequestStatus } from '../types';
import {
  FileText, CheckCircle2, Plus, ArrowRight, Zap,
  AlertTriangle, Package, Wrench, Cpu, Briefcase, Box,
  BarChart3, Activity, Clock, TrendingUp, TrendingDown,
  ChevronRight, Building2, User, Layers, DollarSign,
  ShieldCheck, Truck, HardHat,
} from 'lucide-react';
import {
  formatDate, STATUS_LABELS, STATUS_COLORS,
  needsMyAction, URGENCY_BADGE, URGENCY_COLORS, URGENCY_LABELS,
  REQUEST_TYPE_LABELS, ROLE_LABELS,
} from '../utils';

// ─── константы ────────────────────────────────────────────────────────────────
const TYPE_ICONS  = { materials: Package, tools: Wrench, equipment: Cpu, services: Briefcase, other: Box } as const;
const TYPE_PALETTE: Record<RequestType, { ring: string; bg: string; text: string }> = {
  materials: { ring: '#c89587', bg: '#f7ede7', text: '#a67161' },
  tools:     { ring: '#f59e0b', bg: '#fffbeb', text: '#d97706' },
  equipment: { ring: '#0ea5e9', bg: '#f0f9ff', text: '#0284c7' },
  services:  { ring: '#8b5cf6', bg: '#f5f3ff', text: '#7c3aed' },
  other:     { ring: '#6b7280', bg: '#f9fafb', text: '#4b5563' },
};

const ROLE_ICONS_LUCIDE: Record<string, React.ElementType> = {
  prоrab:    HardHat,
  sklad:     Package,
  nachalnik: Layers,
  finansist: DollarSign,
  snab:      Truck,
  admin:     ShieldCheck,
};

const PIPELINE_STATUSES: { key: RequestStatus; label: string; color: string; desc: string }[] = [
  { key: 'novaya',             label: 'Новая',        color: '#3b82f6', desc: 'Новая заявка — ещё не рассмотрена' },
  { key: 'sklad_review',       label: 'У склада',     color: '#f59e0b', desc: 'Ожидает рассмотрения склада' },
  { key: 'sklad_partial',      label: 'Частично',     color: '#f97316', desc: 'Склад выдал частично — идёт согласование остатка' },
  { key: 'nachalnik_review',   label: 'У нач.',       color: '#8b5cf6', desc: 'Ожидает одобрения начальника участка' },
  { key: 'nachalnik_approved', label: 'Одобр. нач.',  color: '#6366f1', desc: 'Одобрено начальником — ждёт снабжения' },
  { key: 'finansist_review',   label: 'У фин.',       color: '#ec4899', desc: 'На согласовании бюджета у финансиста' },
  { key: 'finansist_approved', label: 'Одобр. фин.',  color: '#a855f7', desc: 'Бюджет согласован — ждёт снабжения' },
  { key: 'snab_process',       label: 'В снабж.',     color: '#06b6d4', desc: 'Снабжение ведёт закупку' },
  { key: 'zakupleno',          label: 'Закуплено',    color: '#14b8a6', desc: 'Товар закуплен — ожидает выдачи' },
];

function getRuGreeting(): string {
  const h = new Date().getHours();
  if (h < 6)  return 'Доброй ночи';
  if (h < 12) return 'Доброе утро';
  if (h < 18) return 'Добрый день';
  return 'Добрый вечер';
}

function formatCurrency(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} млрд`;
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(1)} млн`;
  if (n >= 1_000)         return `${(n / 1_000).toFixed(0)} тыс`;
  return n.toLocaleString('ru-RU');
}

function getDaysOld(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000);
}

const NOW_DATE = new Date().toISOString().slice(0, 10);
function isOverdue(req: SkladRequest): boolean {
  return !!req.plannedDate && req.plannedDate < NOW_DATE &&
    req.status !== 'vydano' && req.status !== 'otkloneno';
}

// ─── кружок SVG (%)
function DonutSegment({ pct, color, size = 56, stroke = 6 }: { pct: number; color: string; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f3f4f6" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
    </svg>
  );
}

function StatusBar({ active, done, rejected }: { active: number; done: number; rejected: number }) {
  const total = active + done + rejected;
  if (total === 0) return <div className="h-2 rounded-full bg-gray-100" />;
  return (
    <div className="flex h-2 rounded-full overflow-hidden gap-px">
      {active   > 0 && <div className="rounded-l-full" style={{ flex: active,   background: '#c89587' }} />}
      {done     > 0 && <div style={{ flex: done,     background: '#22c55e' }} />}
      {rejected > 0 && <div className="rounded-r-full" style={{ flex: rejected, background: '#ef4444' }} />}
    </div>
  );
}

// ─── Блок персонализации по роли ─────────────────────────────────────────────
function RoleSpecificPanel({
  role, requests, loading,
}: { role: string; requests: SkladRequest[]; loading: boolean }) {
  const active = requests.filter(r => r.status !== 'vydano' && r.status !== 'otkloneno');

  // ── Склад ──
  if (role === 'sklad') {
    const toReview = requests.filter(r => r.status === 'sklad_review' || r.status === 'sklad_partial');
    if (!loading && toReview.length === 0) return null;
    const totalItems = toReview.reduce((s, r) => s + r.items.length, 0);
    return (
      <div className="bg-white rounded-2xl border-2 overflow-hidden" style={{ borderColor: '#edd5c8' }}>
        <div className="px-5 py-3 flex items-center gap-3 border-b" style={{ borderColor: '#f7ede7', background: '#fdf9f7' }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#f7ede7' }}>
            <Package className="w-3.5 h-3.5" style={{ color: '#a67161' }} />
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: '#59301f' }}>Нужно рассмотреть — {loading ? '—' : toReview.length} заявок</p>
            <p className="text-xs" style={{ color: '#a67161' }}>{totalItems} позиций к выдаче</p>
          </div>
          <Link to="/requests" className="ml-auto text-xs font-semibold flex items-center gap-1 hover:underline" style={{ color: '#a67161' }}>
            Все <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {loading ? (
          <div className="p-4 space-y-2">{[1,2].map(i => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : (
          <div className="divide-y divide-[#f7ede7]">
            {toReview.slice(0, 5).map(req => (
              <Link key={req.id} to={`/requests/${req.id}`}
                className="flex items-center gap-3 px-5 py-3 hover:bg-[#fdf9f7] transition-colors group">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: req.status === 'sklad_partial' ? '#f97316' : '#f59e0b' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate group-hover:underline" style={{ color: '#59301f' }}>{req.title}</p>
                  <p className="text-xs text-gray-400">{req.objectName} · {req.items.length} поз.</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {(req.urgencyLevel === 'critical' || req.urgencyLevel === 'high') && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${URGENCY_COLORS[req.urgencyLevel]}`}>{URGENCY_BADGE[req.urgencyLevel]}</span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[req.status]}`}>{STATUS_LABELS[req.status]}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Начальник ──
  if (role === 'nachalnik') {
    const toApprove = requests.filter(r => r.status === 'nachalnik_review');
    const byObject: Record<string, { name: string; count: number; cost: number }> = {};
    for (const r of active) {
      const k = r.objectId ?? r.objectName;
      if (!byObject[k]) byObject[k] = { name: r.objectName, count: 0, cost: 0 };
      byObject[k].count++;
      byObject[k].cost += r.estimatedCost ?? 0;
    }
    const objects = Object.values(byObject).sort((a, b) => b.count - a.count).slice(0, 5);
    if (!loading && toApprove.length === 0 && objects.length === 0) return null;
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {toApprove.length > 0 && (
          <div className="bg-white rounded-2xl border-2 overflow-hidden" style={{ borderColor: '#edd5c8' }}>
            <div className="px-5 py-3 flex items-center gap-3 border-b" style={{ borderColor: '#f7ede7', background: '#fdf9f7' }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-purple-100">
                <Layers className="w-3.5 h-3.5 text-purple-600" />
              </div>
              <p className="font-bold text-sm" style={{ color: '#59301f' }}>Ожидают одобрения — {toApprove.length}</p>
              <Link to="/requests" className="ml-auto text-xs font-semibold flex items-center gap-1 hover:underline" style={{ color: '#a67161' }}>
                Все <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-[#f7ede7]">
              {toApprove.slice(0, 4).map(req => (
                <Link key={req.id} to={`/requests/${req.id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-[#fdf9f7] transition-colors group">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate group-hover:underline" style={{ color: '#59301f' }}>{req.title}</p>
                    <p className="text-xs text-gray-400">{req.objectName} · от {req.createdByName}</p>
                  </div>
                  {req.estimatedCost ? <span className="text-xs font-bold shrink-0" style={{ color: '#a67161' }}>{formatCurrency(req.estimatedCost)} сум</span> : null}
                  <ArrowRight className="w-3.5 h-3.5 shrink-0 opacity-30 group-hover:opacity-70" style={{ color: '#c89587' }} />
                </Link>
              ))}
            </div>
          </div>
        )}
        {objects.length > 0 && (
          <div className="bg-white rounded-2xl border-2 p-5" style={{ borderColor: '#edd5c8' }}>
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-4 h-4" style={{ color: '#c89587' }} />
              <h2 className="font-bold text-sm" style={{ color: '#59301f' }}>Активных по объектам</h2>
            </div>
            <div className="space-y-2.5">
              {objects.map(({ name, count, cost }) => (
                <div key={name} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: '#c89587' }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-700 font-medium truncate">{name}</span>
                      <span className="text-xs font-bold ml-2 shrink-0" style={{ color: '#59301f' }}>{count}</span>
                    </div>
                    {cost > 0 && <p className="text-[10px] text-gray-400">{formatCurrency(cost)} сум</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Финансист ──
  if (role === 'finansist') {
    const toApprove = requests.filter(r => r.status === 'finansist_review');
    const totalAmount = toApprove.reduce((s, r) => s + (r.estimatedCost ?? 0), 0);
    if (!loading && toApprove.length === 0) return null;
    return (
      <div className="bg-white rounded-2xl border-2 overflow-hidden" style={{ borderColor: '#edd5c8' }}>
        <div className="px-5 py-3 flex items-center gap-3 border-b" style={{ borderColor: '#f7ede7' }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-pink-100">
            <DollarSign className="w-3.5 h-3.5 text-pink-600" />
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: '#59301f' }}>На согласовании бюджета — {loading ? '—' : toApprove.length} заявок</p>
            {totalAmount > 0 && <p className="text-xs" style={{ color: '#a67161' }}>Общая сумма: {formatCurrency(totalAmount)} сум</p>}
          </div>
          <Link to="/requests" className="ml-auto text-xs font-semibold flex items-center gap-1 hover:underline" style={{ color: '#a67161' }}>
            Открыть <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {loading ? (
          <div className="p-4 space-y-2">{[1,2].map(i => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : (
          <div className="divide-y divide-[#f7ede7]">
            {toApprove.slice(0, 5).map(req => (
              <Link key={req.id} to={`/requests/${req.id}`}
                className="flex items-center gap-3 px-5 py-3 hover:bg-[#fdf9f7] transition-colors group">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate group-hover:underline" style={{ color: '#59301f' }}>{req.title}</p>
                  <p className="text-xs text-gray-400">{req.objectName} · от {req.createdByName}</p>
                </div>
                {req.estimatedCost ? <span className="text-sm font-black shrink-0" style={{ color: '#59301f' }}>{formatCurrency(req.estimatedCost)} сум</span> : null}
                <ArrowRight className="w-3.5 h-3.5 shrink-0 opacity-30 group-hover:opacity-70" style={{ color: '#c89587' }} />
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Снабжение ──
  if (role === 'snab') {
    const inWork = requests.filter(r => r.status === 'snab_process' || r.status === 'zakupleno');
    const totalCost = inWork.reduce((s, r) => s + (r.estimatedCost ?? 0), 0);
    const nachalnikQueue = requests.filter(r => r.status === 'nachalnik_approved' || r.status === 'finansist_approved');
    if (!loading && inWork.length === 0 && nachalnikQueue.length === 0) return null;
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {inWork.length > 0 && (
          <div className="bg-white rounded-2xl border-2 overflow-hidden" style={{ borderColor: '#edd5c8' }}>
            <div className="px-5 py-3 flex items-center gap-3 border-b" style={{ borderColor: '#f7ede7' }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-cyan-100">
                <Truck className="w-3.5 h-3.5 text-cyan-600" />
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: '#59301f' }}>В работе — {inWork.length} заявок</p>
                {totalCost > 0 && <p className="text-xs" style={{ color: '#a67161' }}>На закупку: {formatCurrency(totalCost)} сум</p>}
              </div>
            </div>
            <div className="divide-y divide-[#f7ede7]">
              {inWork.slice(0, 4).map(req => (
                <Link key={req.id} to={`/requests/${req.id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-[#fdf9f7] transition-colors group">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: req.status === 'zakupleno' ? '#14b8a6' : '#06b6d4' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate group-hover:underline" style={{ color: '#59301f' }}>{req.title}</p>
                    <p className="text-xs text-gray-400 truncate">{req.objectName}{req.preferredSupplier ? ` · ${req.preferredSupplier}` : ''}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[req.status]}`}>{STATUS_LABELS[req.status]}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
        {nachalnikQueue.length > 0 && (
          <div className="bg-white rounded-2xl border-2 overflow-hidden" style={{ borderColor: '#edd5c8' }}>
            <div className="px-5 py-3 flex items-center gap-3 border-b" style={{ borderColor: '#f7ede7', background: '#fdf9f7' }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#f0f9ff' }}>
                <BarChart3 className="w-3.5 h-3.5 text-sky-600" />
              </div>
              <p className="font-bold text-sm" style={{ color: '#59301f' }}>Ждут запуска — {nachalnikQueue.length}</p>
            </div>
            <div className="divide-y divide-[#f7ede7]">
              {nachalnikQueue.slice(0, 4).map(req => (
                <Link key={req.id} to={`/requests/${req.id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-[#fdf9f7] transition-colors group">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate group-hover:underline" style={{ color: '#59301f' }}>{req.title}</p>
                    <p className="text-xs text-gray-400">{req.objectName}</p>
                  </div>
                  {req.estimatedCost ? <span className="text-xs font-bold shrink-0" style={{ color: '#a67161' }}>{formatCurrency(req.estimatedCost)} сум</span> : null}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Прораб ──
  if (role === 'prоrab') {
    const myOpen = active.length;
    const myDone = requests.filter(r => r.status === 'vydano').length;
    const myRejected = requests.filter(r => r.status === 'otkloneno').length;
    return (
      <div className="rounded-2xl border-2 overflow-hidden grid grid-cols-1 sm:grid-cols-3" style={{ borderColor: '#edd5c8' }}>
        {[
          { label: 'В работе', val: myOpen, dot: '#c89587' },
          { label: 'Выдано',   val: myDone, dot: '#22c55e' },
          { label: 'Отклонено', val: myRejected, dot: '#ef4444' },
        ].map(({ label, val, dot }, i) => (
          <div key={label} className={`px-5 py-4 flex items-center gap-4 ${i < 2 ? 'border-b sm:border-b-0 sm:border-r' : ''}`}
            style={{ borderColor: '#edd5c8', background: '#fdf9f7' }}>
            <div className="w-3 h-3 rounded-full shrink-0" style={{ background: dot }} />
            <div>
              <p className="text-2xl font-black" style={{ color: '#59301f' }}>{loading ? '—' : val}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return null;
}

function SlaChip({ req }: { req: SkladRequest }) {
  const over = isOverdue(req);
  if (!req.plannedDate) return null;
  const days = Math.floor((new Date(req.plannedDate).getTime() - Date.now()) / 86_400_000);
  if (!over && days > 3) return null;
  if (over) return (
    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold shrink-0">просрочено</span>
  );
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 font-semibold shrink-0">
      {days === 0 ? 'сегодня' : `${days}д`}
    </span>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function DashboardPage() {
  const { currentUser } = useAuth();
  const [requests, setRequests] = useState<SkladRequest[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    const col = collection(db, 'requests');
    const q = currentUser.role === 'prоrab'
      ? query(col, where('createdBy', '==', currentUser.uid), orderBy('createdAt', 'desc'), limit(120))
      : query(col, orderBy('createdAt', 'desc'), limit(120));
    const unsub = onSnapshot(q, snap => {
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as SkladRequest)));
      setLoading(false);
    });
    return unsub;
  }, [currentUser]);

  const stats = useMemo(() => {
    const active   = requests.filter(r => r.status !== 'vydano' && r.status !== 'otkloneno');
    const done     = requests.filter(r => r.status === 'vydano');
    const rejected = requests.filter(r => r.status === 'otkloneno');
    const urgent   = active.filter(r => r.urgencyLevel === 'critical' || r.urgencyLevel === 'high');
    const overdue  = active.filter(isOverdue);
    const myAction = requests.filter(r =>
      currentUser ? needsMyAction(r.status, currentUser.role, r.chain ?? 'full') : false
    );
    const thisMonth  = new Date().toISOString().slice(0, 7);
    const lastMonth  = (() => { const d = new Date(); d.setMonth(d.getMonth()-1); return d.toISOString().slice(0,7); })();
    const doneThisMonth = done.filter(r => r.updatedAt?.startsWith(thisMonth));
    const doneLastMonth = done.filter(r => r.updatedAt?.startsWith(lastMonth));
    const totalCostActive = active.reduce((s, r) => s + (r.estimatedCost ?? 0), 0);
    const totalCostDone   = done.reduce((s,  r) => s + (r.actualCost ?? r.estimatedCost ?? 0), 0);
    const pipeline: Partial<Record<RequestStatus, number>> = {};
    for (const r of active) pipeline[r.status] = (pipeline[r.status] ?? 0) + 1;
    const byType: Partial<Record<RequestType, number>> = {};
    for (const r of requests) byType[r.requestType ?? 'other'] = (byType[r.requestType ?? 'other'] ?? 0) + 1;
    const completionPct = requests.length > 0 ? Math.round((done.length / requests.length) * 100) : 0;
    return { active, done, rejected, urgent, overdue, myAction, doneThisMonth, doneLastMonth,
      totalCostActive, totalCostDone, pipeline, byType, completionPct, total: requests.length };
  }, [requests, currentUser]);

  const RoleIcon = (ROLE_ICONS_LUCIDE[currentUser?.role ?? 'admin'] ?? ShieldCheck) as React.ElementType;

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-8">

      {/* ═══ HEADER ═══════════════════════════════════════════════════════════ */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #59301f 0%, #7d4533 50%, #a67161 100%)' }}>
        <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(255,255,255,0.15)' }}>
              <RoleIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: '#edd5c8' }}>
                {getRuGreeting()} — {ROLE_LABELS[currentUser?.role ?? 'admin']}
              </p>
              <h1 className="text-xl font-display font-bold text-white leading-tight">
                {currentUser?.displayName}
              </h1>
              <p className="text-xs mt-0.5" style={{ color: '#c89587' }}>
                {new Date().toLocaleDateString('ru-RU', {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {stats.myAction.length > 0 && (
              <Link to="/requests"
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                style={{ background: 'rgba(255,255,255,0.15)', color: '#fdf9f7' }}>
                <Activity className="w-4 h-4 text-orange-300" />
                {stats.myAction.length} действ.
              </Link>
            )}
            {(currentUser?.role === 'prоrab' || currentUser?.role === 'admin') && (
              <Link to="/requests/new"
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                style={{ background: '#c89587' }}>
                <Plus className="w-4 h-4" /> Новая заявка
              </Link>
            )}
          </div>
        </div>
        {/* pipeline mini */}
        {!loading && requests.length > 0 && (
          <div className="px-6 pb-4">
            <div className="rounded-xl px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2"
              style={{ background: 'rgba(0,0,0,0.2)' }}>
              <span className="text-xs font-semibold uppercase tracking-widest shrink-0" style={{ color: '#edd5c8' }}>
                Воронка
              </span>
              {PIPELINE_STATUSES.map(({ key, label, color, desc }, idx) => {
                const cnt = stats.pipeline[key] ?? 0;
                return (
                  <div key={key} className="flex items-center gap-2 shrink-0">
                    {idx > 0 && <ChevronRight className="w-3 h-3 opacity-30 text-white" />}
                    {cnt > 0 ? (
                      <Link to="/requests"
                        title={desc}
                        className="group/pip relative flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity">
                        <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                        <span className="text-xs text-white font-semibold">{label}</span>
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded-md" style={{ background: color, color: '#fff' }}>{cnt}</span>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap
                          opacity-0 group-hover/pip:opacity-100 pointer-events-none z-20 transition-all duration-150 shadow-lg"
                          style={{ background: color, color: '#fff', minWidth: '10rem', textAlign: 'center' }}>
                          {desc}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent"
                            style={{ borderBottomColor: color }} />
                        </div>
                      </Link>
                    ) : (
                      <div title={desc} className="flex items-center gap-1.5 cursor-default">
                        <div className="w-2 h-2 rounded-full opacity-20" style={{ background: '#fff' }} />
                        <span className="text-xs opacity-40 text-white">{label}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ═══ ACTION REQUIRED BANNER ══════════════════════════════════════════ */}
      {stats.myAction.length > 0 && (
        <div className="rounded-2xl border-2 overflow-hidden" style={{ borderColor: '#e8c9b9', background: '#fdf9f7' }}>
          <div className="px-5 py-3 flex items-center gap-3 border-b" style={{ borderColor: '#edd5c8', background: '#fdf3ee' }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#c89587' }}>
              <Activity className="w-3.5 h-3.5 text-white" />
            </div>
            <p className="font-bold text-sm" style={{ color: '#59301f' }}>
              Требуют вашего действия — {stats.myAction.length} заявк{stats.myAction.length === 1 ? 'а' : stats.myAction.length < 5 ? 'и' : ''}
            </p>
            <Link to="/requests" className="ml-auto text-xs font-semibold flex items-center gap-1 hover:underline" style={{ color: '#a67161' }}>
              Все <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-[#f7ede7]">
            {stats.myAction.slice(0, 4).map(req => (
              <Link key={req.id} to={`/requests/${req.id}`}
                className="flex items-center gap-3 px-5 py-3 hover:bg-[#fdf3ee] transition-colors group">
                <span className="text-xs text-gray-400 font-mono w-10 shrink-0">#{req.number}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate group-hover:underline" style={{ color: '#59301f' }}>{req.title}</p>
                  <p className="text-xs text-gray-400 truncate">{req.objectName}{req.zone ? ` · ${req.zone}` : ''}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <SlaChip req={req} />
                  {req.urgencyLevel && req.urgencyLevel !== 'low' && req.urgencyLevel !== 'normal' && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${URGENCY_COLORS[req.urgencyLevel]}`}>
                      {URGENCY_BADGE[req.urgencyLevel]}
                    </span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[req.status]}`}>
                    {STATUS_LABELS[req.status]}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-30 group-hover:opacity-70 transition-opacity" style={{ color: '#c89587' }} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ═══ KPI CARDS ═══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        <div className="bg-white rounded-2xl border-2 p-5 flex flex-col gap-3" style={{ borderColor: '#edd5c8' }}>
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#f7ede7' }}>
              <FileText className="w-5 h-5" style={{ color: '#a67161' }} />
            </div>
            <DonutSegment pct={stats.completionPct} color="#c89587" size={44} stroke={5} />
          </div>
          <div>
            <p className="text-3xl font-black" style={{ color: '#59301f' }}>{loading ? '—' : stats.total}</p>
            <p className="text-sm text-gray-500 leading-tight">Всего заявок</p>
          </div>
          <div className="space-y-1">
            <StatusBar active={stats.active.length} done={stats.done.length} rejected={stats.rejected.length} />
            <p className="text-xs" style={{ color: '#a67161' }}>{stats.completionPct}% завершено</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border-2 p-5 flex flex-col gap-3" style={{ borderColor: '#edd5c8' }}>
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#fff7ed' }}>
              <Clock className="w-5 h-5 text-orange-500" />
            </div>
            {stats.overdue.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">{stats.overdue.length} просроч.</span>
            )}
          </div>
          <div>
            <p className="text-3xl font-black" style={{ color: '#59301f' }}>{loading ? '—' : stats.active.length}</p>
            <p className="text-sm text-gray-500 leading-tight">В работе</p>
          </div>
          <div className="text-xs space-y-0.5" style={{ color: '#a67161' }}>
            <p>{stats.rejected.length} отклонено · {stats.done.length} выдано</p>
            {stats.overdue.length > 0
              ? <p className="text-red-500 font-semibold">{stats.overdue.length} с просроченным SLA</p>
              : <p className="text-green-600">Просрочек нет ✓</p>}
          </div>
        </div>

        <div className="bg-white rounded-2xl border-2 p-5 flex flex-col gap-3" style={{ borderColor: '#edd5c8' }}>
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-green-50">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            {stats.doneLastMonth.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-gray-400">
                {stats.doneThisMonth.length >= stats.doneLastMonth.length
                  ? <TrendingUp className="w-3 h-3 text-green-500" />
                  : <TrendingDown className="w-3 h-3 text-red-400" />}
                vs {stats.doneLastMonth.length} пр.мес.
              </div>
            )}
          </div>
          <div>
            <p className="text-3xl font-black" style={{ color: '#59301f' }}>{loading ? '—' : stats.doneThisMonth.length}</p>
            <p className="text-sm text-gray-500 leading-tight">Выдано в этом месяце</p>
          </div>
          <p className="text-xs" style={{ color: '#a67161' }}>Всего выдано: {stats.done.length}</p>
        </div>

        <div className={`rounded-2xl border-2 p-5 flex flex-col gap-3 ${stats.urgent.length > 0 ? 'bg-red-50' : 'bg-white'}`}
          style={{ borderColor: stats.urgent.length > 0 ? '#fca5a5' : '#edd5c8' }}>
          <div className="flex items-start justify-between">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${stats.urgent.length > 0 ? 'bg-red-100' : 'bg-[#f7ede7]'}`}>
              {stats.urgent.length > 0
                ? <Zap className="w-5 h-5 text-red-500" />
                : <BarChart3 className="w-5 h-5" style={{ color: '#a67161' }} />}
            </div>
          </div>
          {stats.urgent.length > 0 ? (
            <div>
              <p className="text-3xl font-black text-red-600">{stats.urgent.length}</p>
              <p className="text-sm text-red-500 leading-tight font-semibold">Срочных заявок</p>
              <p className="text-xs text-red-400 mt-1">Требуют немедленной обработки</p>
            </div>
          ) : (
            <div>
              <p className="text-3xl font-black" style={{ color: '#59301f' }}>
                {loading || stats.totalCostActive === 0 ? '—' : formatCurrency(stats.totalCostActive)}
              </p>
              <p className="text-sm text-gray-500 leading-tight">Сумма активных заявок</p>
              {stats.totalCostDone > 0 && (
                <p className="text-xs mt-1" style={{ color: '#a67161' }}>Выдано на {formatCurrency(stats.totalCostDone)} сум</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══ ROLE BLOCK ══════════════════════════════════════════════════════ */}
      {!loading && (
        <RoleSpecificPanel role={currentUser?.role ?? ''} requests={requests} loading={loading} />
      )}

      {/* ═══ MAIN GRID ═══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Последние заявки */}
        <div className="lg:col-span-2 bg-white rounded-2xl border-2 overflow-hidden" style={{ borderColor: '#edd5c8' }}>
          <div className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: '#f7ede7' }}>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" style={{ color: '#c89587' }} />
              <h2 className="font-bold" style={{ color: '#59301f' }}>
                {currentUser?.role === 'prоrab' ? 'Мои заявки' : 'Последние заявки'}
              </h2>
            </div>
            <Link to="/requests"
              className="text-xs font-semibold flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-[#f7ede7] transition-colors"
              style={{ color: '#a67161' }}>
              Все заявки <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {loading ? (
            <div className="p-5 space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}</div>
          ) : requests.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">Заявок ещё нет</p>
              {(currentUser?.role === 'prоrab' || currentUser?.role === 'admin') && (
                <Link to="/requests/new"
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
                  style={{ background: '#c89587' }}>
                  <Plus className="w-4 h-4" /> Создать первую
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-[#fdf9f7]">
              <div className="px-5 py-2 grid grid-cols-[2rem_1fr_auto] sm:grid-cols-[2rem_1fr_auto_auto] gap-3 items-center">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">#</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Заявка</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 hidden sm:block">Срочность</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Статус</span>
              </div>
              {requests.slice(0, 10).map(req => {
                const TIcon = TYPE_ICONS[req.requestType ?? 'other'];
                const TPal  = TYPE_PALETTE[req.requestType ?? 'other'];
                const over  = isOverdue(req);
                const days  = getDaysOld(req.createdAt);
                return (
                  <Link key={req.id} to={`/requests/${req.id}`}
                    className="px-5 py-3 grid grid-cols-[2rem_1fr_auto] sm:grid-cols-[2rem_1fr_auto_auto] gap-3 items-center hover:bg-[#fdf9f7] transition-colors group">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: TPal.bg }}>
                      <TIcon className="w-3.5 h-3.5" style={{ color: TPal.text }} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        <span className="text-xs text-gray-400 font-mono">#{req.number}</span>
                        {over && <span className="text-[10px] px-1.5 rounded-full bg-red-100 text-red-600 font-bold">SLA!</span>}
                        <SlaChip req={req} />
                      </div>
                      <p className="font-semibold text-sm truncate group-hover:underline" style={{ color: '#59301f' }}>{req.title}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {req.objectName}{req.zone ? ` · ${req.zone}` : ''}{' · '}
                        <span className={days > 14 ? 'text-gray-300' : ''}>{formatDate(req.createdAt)}</span>
                      </p>
                    </div>
                    {req.urgencyLevel && req.urgencyLevel !== 'low' && req.urgencyLevel !== 'normal' ? (
                      <span className={`text-xs px-2 py-0.5 rounded-full hidden sm:inline-block ${URGENCY_COLORS[req.urgencyLevel]}`}>
                        {URGENCY_LABELS[req.urgencyLevel]}
                      </span>
                    ) : <span className="hidden sm:block" />}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLORS[req.status]}`}>
                      {STATUS_LABELS[req.status]}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Правая колонка */}
        <div className="space-y-4">

          {!loading && requests.length > 0 && (
            <div className="bg-white rounded-2xl border-2 p-5" style={{ borderColor: '#edd5c8' }}>
              <div className="flex items-center gap-2 mb-4">
                <Layers className="w-4 h-4" style={{ color: '#c89587' }} />
                <h2 className="font-bold text-sm" style={{ color: '#59301f' }}>По типам</h2>
              </div>
              <div className="space-y-2.5">
                {(['materials','tools','equipment','services','other'] as const).map(type => {
                  const TIcon = TYPE_ICONS[type];
                  const TPal  = TYPE_PALETTE[type];
                  const cnt   = stats.byType[type] ?? 0;
                  const pct   = stats.total > 0 ? Math.round((cnt / stats.total) * 100) : 0;
                  return (
                    <div key={type} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: TPal.bg }}>
                        <TIcon className="w-3 h-3" style={{ color: TPal.text }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs text-gray-600 truncate">{REQUEST_TYPE_LABELS[type]}</span>
                          <span className="text-xs font-bold ml-2 shrink-0" style={{ color: '#59301f' }}>{cnt}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: TPal.ring }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border-2 p-5" style={{ borderColor: '#edd5c8' }}>
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4" style={{ color: '#c89587' }} />
              <h2 className="font-bold text-sm" style={{ color: '#59301f' }}>Сводка</h2>
            </div>
            <div className="space-y-3">
              {[
                { label: 'В работе',   val: stats.active.length,   dot: '#c89587', pct: stats.total > 0 ? (stats.active.length/stats.total)*100 : 0 },
                { label: 'Выдано',     val: stats.done.length,      dot: '#22c55e', pct: stats.total > 0 ? (stats.done.length/stats.total)*100 : 0 },
                { label: 'Отклонено', val: stats.rejected.length,  dot: '#ef4444', pct: stats.total > 0 ? (stats.rejected.length/stats.total)*100 : 0 },
              ].map(({ label, val, dot, pct }) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: dot }} />
                      <span className="text-xs text-gray-600">{label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{Math.round(pct)}%</span>
                      <span className="text-sm font-black w-6 text-right" style={{ color: '#59301f' }}>{loading ? '—' : val}</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: dot }} />
                  </div>
                </div>
              ))}
            </div>
            {(stats.totalCostActive > 0 || stats.totalCostDone > 0) && (
              <div className="mt-4 pt-3 border-t space-y-1" style={{ borderColor: '#f7ede7' }}>
                {stats.totalCostActive > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Активных на сумму</span>
                    <span className="font-bold" style={{ color: '#59301f' }}>{formatCurrency(stats.totalCostActive)} сум</span>
                  </div>
                )}
                {stats.totalCostDone > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Выдано на сумму</span>
                    <span className="font-bold text-green-700">{formatCurrency(stats.totalCostDone)} сум</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {stats.urgent.length > 0 && (
            <div className="rounded-2xl border-2 overflow-hidden" style={{ borderColor: '#fca5a5', background: '#fff5f5' }}>
              <div className="px-4 py-3 flex items-center gap-2 border-b border-red-100">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <h3 className="font-bold text-sm text-red-700">Срочные ({stats.urgent.length})</h3>
              </div>
              <div className="divide-y divide-red-50">
                {stats.urgent.slice(0, 4).map(req => (
                  <Link key={req.id} to={`/requests/${req.id}`}
                    className="flex items-start gap-3 px-4 py-2.5 hover:bg-red-50 transition-colors group">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: req.urgencyLevel === 'critical' ? '#ef4444' : '#f97316' }}>
                      <Zap className="w-2.5 h-2.5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-red-700 group-hover:underline truncate">#{req.number} {req.title}</p>
                      <p className="text-[10px] text-red-400 truncate">{req.objectName}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border-2 p-4" style={{ borderColor: '#edd5c8' }}>
            <h2 className="font-bold text-sm mb-3" style={{ color: '#59301f' }}>Быстрый доступ</h2>
            <div className="space-y-0.5">
              {(currentUser?.role === 'prоrab' || currentUser?.role === 'admin') && (
                <Link to="/requests/new"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors hover:bg-[#f7ede7]"
                  style={{ color: '#c89587' }}>
                  <Plus className="w-4 h-4" /> Новая заявка
                </Link>
              )}
              <Link to="/requests"
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-gray-50 text-sm text-gray-600 transition-colors">
                <FileText className="w-4 h-4 text-gray-400" /> Все заявки
              </Link>
              {(currentUser?.role === 'sklad' || currentUser?.role === 'admin') && (
                <Link to="/warehouse"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-gray-50 text-sm text-gray-600 transition-colors">
                  <Package className="w-4 h-4 text-gray-400" /> Склад
                </Link>
              )}
              {currentUser?.role === 'admin' && (
                <Link to="/users"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-gray-50 text-sm text-gray-600 transition-colors">
                  <User className="w-4 h-4 text-gray-400" /> Пользователи
                </Link>
              )}
              {currentUser?.role === 'admin' && (
                <Link to="/objects"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-gray-50 text-sm text-gray-600 transition-colors">
                  <Building2 className="w-4 h-4 text-gray-400" /> Объекты
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

