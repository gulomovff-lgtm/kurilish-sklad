import { useEffect, useState, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import type { SkladRequest, RequestStatus, RequestType } from '../types';
import {
  FileText, CheckCircle2, AlertTriangle, DollarSign,
  Building2, Users, TrendingUp, Clock,
} from 'lucide-react';
import {
  STATUS_LABELS, STATUS_COLORS, REQUEST_TYPE_LABELS, URGENCY_LABELS,
} from '../utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatCurrency(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} млрд`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} млн`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} тыс`;
  return n.toLocaleString('ru-RU');
}

function HBar({ value, max, color, bg }: { value: number; max: number; color: string; bg?: string }) {
  const pct = max > 0 ? Math.max(3, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: bg ?? '#f3f4f6' }}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-sm font-bold tabular-nums w-8 text-right" style={{ color }}>{value}</span>
    </div>
  );
}

const ALL_STATUSES: RequestStatus[] = [
  'novaya', 'sklad_review', 'sklad_partial', 'nachalnik_review',
  'nachalnik_approved', 'finansist_review', 'finansist_approved',
  'snab_process', 'zakupleno', 'vydano', 'otkloneno',
];

const ALL_TYPES: RequestType[] = ['materials', 'tools', 'equipment', 'services', 'other'];

const TYPE_COLORS: Record<RequestType, string> = {
  materials: '#a67161',
  tools: '#f59e0b',
  equipment: '#0ea5e9',
  services: '#8b5cf6',
  other: '#6b7280',
};

type Period = '7d' | '30d' | '90d' | 'all';

// ─── Main component ───────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const { currentUser } = useAuth();
  const [requests, setRequests] = useState<SkladRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('30d');

  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'requests'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as SkladRequest)));
      setLoading(false);
    });
    return unsub;
  }, [currentUser]);

  const periodFiltered = useMemo(() => {
    if (period === 'all') return requests;
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutStr = cutoff.toISOString();
    return requests.filter(r => r.createdAt >= cutStr);
  }, [requests, period]);

  const stats = useMemo(() => {
    const total = periodFiltered.length;
    const done = periodFiltered.filter(r => r.status === 'vydano').length;
    const rejected = periodFiltered.filter(r => r.status === 'otkloneno').length;
    const active = total - done - rejected;
    const totalCost = periodFiltered.reduce((s, r) => s + (r.estimatedCost ?? 0), 0);
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

    // By status
    const byStatus: Record<string, number> = {};
    for (const r of periodFiltered) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;

    // By type
    const byType: Record<string, number> = {};
    for (const r of periodFiltered) {
      const t = r.requestType ?? 'other';
      byType[t] = (byType[t] ?? 0) + 1;
    }

    // By object
    const byObjectMap: Record<string, { name: string; count: number; cost: number; done: number }> = {};
    for (const r of periodFiltered) {
      const k = r.objectName;
      if (!byObjectMap[k]) byObjectMap[k] = { name: k, count: 0, cost: 0, done: 0 };
      byObjectMap[k].count++;
      byObjectMap[k].cost += r.estimatedCost ?? 0;
      if (r.status === 'vydano') byObjectMap[k].done++;
    }
    const topObjects = Object.values(byObjectMap).sort((a, b) => b.count - a.count).slice(0, 8);
    const maxObject = Math.max(...topObjects.map(o => o.count), 1);

    // Team workload (by creator)
    const byCreatorMap: Record<string, { name: string; total: number; active: number; done: number; cost: number }> = {};
    for (const r of periodFiltered) {
      const k = r.createdBy;
      if (!byCreatorMap[k]) byCreatorMap[k] = { name: r.createdByName, total: 0, active: 0, done: 0, cost: 0 };
      byCreatorMap[k].total++;
      if (r.status === 'vydano') byCreatorMap[k].done++;
      else if (r.status !== 'otkloneno') byCreatorMap[k].active++;
      byCreatorMap[k].cost += r.estimatedCost ?? 0;
    }
    const workload = Object.values(byCreatorMap).sort((a, b) => b.total - a.total).slice(0, 10);
    const maxWork = Math.max(...workload.map(w => w.total), 1);

    // Urgency
    const byUrgency: Record<string, number> = { low: 0, normal: 0, high: 0, critical: 0 };
    for (const r of periodFiltered) byUrgency[r.urgencyLevel ?? 'normal']++;

    // Monthly trend (from ALL requests, last 7 months)
    const monthMap: Record<string, number> = {};
    for (const r of requests) {
      const m = r.createdAt.slice(0, 7);
      monthMap[m] = (monthMap[m] ?? 0) + 1;
    }
    const months = Object.keys(monthMap).sort().slice(-7);
    const monthData = months.map(m => ({
      month: m,
      label: new Date(m + '-01').toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' }),
      count: monthMap[m],
    }));
    const maxMonth = Math.max(...monthData.map(m => m.count), 1);

    // Avg days to complete (from novaya → vydano using history)
    const completedWithHistory = periodFiltered.filter(r => r.status === 'vydano' && r.history?.length > 0);
    let avgDays = 0;
    if (completedWithHistory.length > 0) {
      const totalDays = completedWithHistory.reduce((s, r) => {
        const first = r.history[0]?.at;
        const last = [...r.history].reverse().find(e => e.toStatus === 'vydano')?.at;
        if (first && last) {
          return s + (new Date(last).getTime() - new Date(first).getTime()) / 86_400_000;
        }
        return s;
      }, 0);
      avgDays = Math.round(totalDays / completedWithHistory.length);
    }

    return {
      total, done, rejected, active, totalCost, completionRate, avgDays,
      byStatus, byType, topObjects, maxObject,
      workload, maxWork,
      byUrgency,
      monthData, maxMonth,
    };
  }, [periodFiltered, requests]);

  const PERIODS: { id: Period; label: string }[] = [
    { id: '7d',  label: '7 дней' },
    { id: '30d', label: '30 дней' },
    { id: '90d', label: '90 дней' },
    { id: 'all', label: 'Всё время' },
  ];

  if (loading) {
    return (
      <div className="p-6 space-y-4 max-w-7xl mx-auto">
        <div className="h-8 w-48 bg-gray-100 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
        {[1,2].map(i => <div key={i} className="h-64 bg-gray-100 rounded-2xl animate-pulse" />)}
      </div>
    );
  }

  const maxStatus = Math.max(...Object.values(stats.byStatus), 1);
  const maxType = Math.max(...Object.values(stats.byType), 1);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">

      {/* ─── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black" style={{ color: '#59301f' }}>Аналитика</h1>
          <p className="text-sm text-gray-500">
            {periodFiltered.length} заявок · обновляется в реальном времени
          </p>
        </div>
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
          {PERIODS.map(p => (
            <button key={p.id} onClick={() => setPeriod(p.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                period === p.id ? 'text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
              }`}
              style={period === p.id ? { background: '#c89587' } : {}}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── KPI Row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Всего заявок', value: stats.total, sub: `${stats.active} в работе`,
            icon: FileText, color: '#3b82f6', bg: '#eff6ff',
          },
          {
            label: 'Выполнено', value: `${stats.done}`, sub: `${stats.completionRate}% завершения`,
            icon: CheckCircle2, color: '#22c55e', bg: '#f0fdf4',
          },
          {
            label: 'Отклонено', value: `${stats.rejected}`, sub: stats.total > 0 ? `${Math.round(stats.rejected/stats.total*100)}% от всех` : '—',
            icon: AlertTriangle, color: '#ef4444', bg: '#fef2f2',
          },
          {
            label: 'Бюджет (смета)', value: `${formatCurrency(stats.totalCost)} сум`, sub: 'суммарная оценка',
            icon: DollarSign, color: '#a67161', bg: '#f7ede7',
          },
        ].map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4 shadow-sm">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg }}>
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-black text-gray-900 truncate">{value}</p>
              <p className="text-xs font-semibold text-gray-500">{label}</p>
              <p className="text-xs text-gray-400">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Extra KPI row ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Срочных/критичных', value: (stats.byUrgency['critical'] ?? 0) + (stats.byUrgency['high'] ?? 0),
            sub: 'высокий и критичный', icon: AlertTriangle, color: '#f97316', bg: '#fff7ed',
          },
          {
            label: 'Ср. дней на выполнение', value: stats.avgDays > 0 ? `${stats.avgDays} дн.` : '—',
            sub: 'от создания до выдачи', icon: Clock, color: '#6366f1', bg: '#eef2ff',
          },
          {
            label: 'Объектов', value: Object.keys(stats.topObjects).length || stats.topObjects.length,
            sub: 'активных строек', icon: Building2, color: '#0ea5e9', bg: '#f0f9ff',
          },
          {
            label: 'Прорабов/команда', value: stats.workload.length,
            sub: 'подают заявки', icon: Users, color: '#8b5cf6', bg: '#f5f3ff',
          },
        ].map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 shadow-sm">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg }}>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-black text-gray-900">{value}</p>
              <p className="text-xs font-medium text-gray-500 leading-tight">{label}</p>
              <p className="text-xs text-gray-400">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Charts Grid ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* By Status */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4" style={{ color: '#c89587' }} />
            <h2 className="font-bold" style={{ color: '#59301f' }}>Распределение по статусам</h2>
          </div>
          <div className="space-y-3">
            {ALL_STATUSES.filter(s => (stats.byStatus[s] ?? 0) > 0).map(s => (
              <div key={s}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[s]}`}>{STATUS_LABELS[s]}</span>
                </div>
                <HBar value={stats.byStatus[s] ?? 0} max={maxStatus} color="#c89587" />
              </div>
            ))}
            {Object.keys(stats.byStatus).length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">Нет данных за период</p>
            )}
          </div>
        </div>

        {/* By Type */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4" style={{ color: '#c89587' }} />
            <h2 className="font-bold" style={{ color: '#59301f' }}>По типу заявки</h2>
          </div>
          <div className="space-y-4">
            {ALL_TYPES.filter(t => (stats.byType[t] ?? 0) > 0).map(t => {
              const count = stats.byType[t] ?? 0;
              const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
              return (
                <div key={t}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-gray-700">{REQUEST_TYPE_LABELS[t]}</span>
                    <span className="text-xs font-bold" style={{ color: TYPE_COLORS[t] }}>{pct}%</span>
                  </div>
                  <HBar value={count} max={maxType} color={TYPE_COLORS[t]} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Objects */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4" style={{ color: '#c89587' }} />
            <h2 className="font-bold" style={{ color: '#59301f' }}>Топ объектов</h2>
          </div>
          <div className="space-y-3">
            {stats.topObjects.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">Нет данных</p>
            )}
            {stats.topObjects.map(({ name, count, cost, done }, i) => (
              <div key={name} className="flex items-center gap-3">
                <span className="text-xs text-gray-300 font-mono w-4 shrink-0 text-right">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 truncate">{name}</span>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {cost > 0 && <span className="text-xs text-gray-400">{formatCurrency(cost)} сум</span>}
                      <span className="text-xs text-green-600 font-medium">{done} ✓</span>
                    </div>
                  </div>
                  <HBar value={count} max={stats.maxObject} color="#8b5cf6" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Team Workload */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4" style={{ color: '#c89587' }} />
            <h2 className="font-bold" style={{ color: '#59301f' }}>Загрузка команды</h2>
          </div>
          <div className="space-y-3">
            {stats.workload.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">Нет данных</p>
            )}
            {stats.workload.map(({ name, total, active, done, cost }) => (
              <div key={name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700 truncate flex-1">{name}</span>
                  <div className="flex items-center gap-2 text-xs shrink-0 ml-2">
                    <span className="text-orange-500 font-medium">{active} ⏳</span>
                    <span className="text-green-600 font-medium">{done} ✓</span>
                    {cost > 0 && <span className="text-gray-400">{formatCurrency(cost)} сум</span>}
                  </div>
                </div>
                <HBar value={total} max={stats.maxWork} color="#06b6d4" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Monthly Trend ───────────────────────────────────────────── */}
      {stats.monthData.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-4 h-4" style={{ color: '#c89587' }} />
            <h2 className="font-bold" style={{ color: '#59301f' }}>Тренд по месяцам (все заявки)</h2>
          </div>
          <div className="flex items-end justify-around gap-3 h-44">
            {stats.monthData.map(({ month, label, count }) => {
              const h = stats.maxMonth > 0 ? Math.max(10, Math.round((count / stats.maxMonth) * 160)) : 10;
              const isLatest = month === stats.monthData[stats.monthData.length - 1].month;
              return (
                <div key={month} className="flex flex-col items-center gap-2 flex-1 min-w-0">
                  <span className="text-xs font-bold text-gray-700">{count}</span>
                  <div className="w-full rounded-t-xl transition-all duration-700 relative"
                    style={{
                      height: `${h}px`,
                      background: isLatest
                        ? 'linear-gradient(to top, #a67161, #edd5c8)'
                        : 'linear-gradient(to top, #c89587, #f0d8cf)',
                    }}>
                  </div>
                  <span className="text-xs text-gray-400 text-center truncate w-full">{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Urgency ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h2 className="font-bold mb-4" style={{ color: '#59301f' }}>По срочности</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { key: 'critical', label: 'Критично',  emoji: '🔴', color: '#ef4444', bg: '#fef2f2' },
            { key: 'high',     label: 'Высокая',   emoji: '🟠', color: '#f97316', bg: '#fff7ed' },
            { key: 'normal',   label: 'Обычная',   emoji: '🔵', color: '#3b82f6', bg: '#eff6ff' },
            { key: 'low',      label: 'Низкая',    emoji: '⚪', color: '#6b7280', bg: '#f9fafb' },
          ].map(({ key, label, emoji, color, bg }) => {
            const count = stats.byUrgency[key] ?? 0;
            const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
            return (
              <div key={key} className="rounded-2xl p-4 text-center" style={{ background: bg }}>
                <p className="text-3xl">{emoji}</p>
                <p className="text-2xl font-black mt-1" style={{ color }}>{count}</p>
                <p className="text-xs font-semibold text-gray-600 mt-0.5">{label}</p>
                <p className="text-xs text-gray-400">{pct}%</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Bottom spacer ───────────────────────────────────────────── */}
      <div className="h-4" />
    </div>
  );
}
