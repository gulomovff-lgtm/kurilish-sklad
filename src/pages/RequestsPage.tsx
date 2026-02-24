import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import type { SkladRequest, RequestStatus, RequestType, UrgencyLevel } from '../types';
import { Plus, Search, Filter, FileText, ChevronDown, X, Clock, Bell, Building2, User, ArrowRightLeft, Package, Wrench, Cpu, Briefcase, Box, LayoutList, LayoutGrid, Download } from 'lucide-react';
import {
  formatDate, formatDateShort, STATUS_LABELS, STATUS_COLORS,
  REQUEST_TYPE_LABELS, REQUEST_TYPE_ICONS,
  URGENCY_LABELS, URGENCY_COLORS,
  CHAIN_LABELS, needsMyAction,
} from '../utils';

const TYPE_ICONS = { materials: Package, tools: Wrench, equipment: Cpu, services: Briefcase, other: Box };
const TYPE_COLORS: Record<string, { bg: string; icon: string }> = {
  materials: { bg: 'bg-[#f7ede7]', icon: 'text-[#a67161]' },
  tools:      { bg: 'bg-amber-50',  icon: 'text-amber-600' },
  equipment:  { bg: 'bg-sky-50',    icon: 'text-sky-600' },
  services:   { bg: 'bg-violet-50', icon: 'text-violet-600' },
  other:      { bg: 'bg-gray-100',  icon: 'text-gray-500' },
};

const ALL_STATUSES: RequestStatus[] = [
  'novaya','sklad_review','sklad_partial','nachalnik_review',
  'nachalnik_approved','finansist_review','finansist_approved',
  'snab_process','zakupleno','vydano','otkloneno',
];

type QuickFilter = 'all' | 'mine' | 'need_action' | 'urgent' | 'open' | 'done';

export default function RequestsPage() {
  const { currentUser } = useAuth();
  const [requests, setRequests] = useState<SkladRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<RequestStatus | 'all'>('all');
  const [filterType, setFilterType] = useState<RequestType | 'all'>('all');
  const [filterUrgency, setFilterUrgency] = useState<UrgencyLevel | 'all'>('all');
  const [filterObject, setFilterObject] = useState('');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

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

  const KANBAN_COLUMNS = [
    { id: 'novaya',   label: 'Новые',        statuses: ['novaya'] as RequestStatus[],                                                             color: '#3b82f6', bg: '#eff6ff' },
    { id: 'sklad',    label: 'У склада',     statuses: ['sklad_review','sklad_partial'] as RequestStatus[],                                        color: '#f59e0b', bg: '#fffbeb' },
    { id: 'approval', label: 'Согласование', statuses: ['nachalnik_review','nachalnik_approved','finansist_review','finansist_approved'] as RequestStatus[], color: '#8b5cf6', bg: '#f5f3ff' },
    { id: 'supply',   label: 'Закупка',      statuses: ['snab_process','zakupleno'] as RequestStatus[],                                              color: '#06b6d4', bg: '#ecfeff' },
    { id: 'done',     label: 'Завершено',    statuses: ['vydano','otkloneno'] as RequestStatus[],                                                    color: '#22c55e', bg: '#f0fdf4' },
  ];

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
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {KANBAN_COLUMNS.map(col => {
              const colCards = filtered.filter(r => col.statuses.includes(r.status));
              return (
                <div key={col.id} className="w-72 flex flex-col gap-2">
                  {/* Column header */}
                  <div className="flex items-center justify-between px-3 py-2 rounded-xl"
                    style={{ background: col.bg }}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                      <span className="text-sm font-bold" style={{ color: col.color }}>{col.label}</span>
                    </div>
                    <span className="text-xs font-black px-1.5 py-0.5 rounded-full" style={{ background: col.color, color:'#fff' }}>
                      {colCards.length}
                    </span>
                  </div>
                  {/* Cards */}
                  <div className="flex flex-col gap-2">
                    {colCards.length === 0 ? (
                      <div className="text-center py-8 text-xs text-gray-300 border-2 border-dashed border-gray-200 rounded-xl">
                        Пусто
                      </div>
                    ) : colCards.map(req => {
                      const action = isNeedAction(req);
                      const isUrgent = req.urgencyLevel === 'critical' || req.urgencyLevel === 'high';
                      const TI = TYPE_ICONS[req.requestType ?? 'other'];
                      const TC = TYPE_COLORS[req.requestType ?? 'other'];
                      return (
                        <Link key={req.id} to={`/requests/${req.id}`}
                          className={`block bg-white rounded-xl border p-3 hover:shadow-md transition-all ${
                            action ? 'border-yellow-400' : isUrgent ? 'border-orange-300' : 'border-gray-200 hover:border-gray-300'
                          }`}>
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${TC.bg}`}>
                              <TI className={`w-3 h-3 ${TC.icon}`} />
                            </div>
                            <span className="text-xs font-mono text-gray-400">#{req.number}</span>
                            {action && <Bell className="w-3 h-3 text-yellow-500 ml-auto" />}
                          </div>
                          <p className="text-sm font-semibold text-gray-900 leading-tight mb-1.5 line-clamp-2">{req.title}</p>
                          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                            <Building2 className="w-3 h-3 shrink-0" />
                            <span className="truncate">{req.objectName}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">{req.createdByName.split(' ')[0]}</span>
                            <div className="flex items-center gap-1">
                              {isUrgent && (
                                <span className={`text-xs px-1.5 py-0.5 rounded-full ${URGENCY_COLORS[req.urgencyLevel ?? 'normal']}`}>
                                  {URGENCY_LABELS[req.urgencyLevel ?? 'normal'].split(' ')[0]}
                                </span>
                              )}
                              {req.estimatedCost ? (
                                <span className="text-xs text-gray-400">{(req.estimatedCost/1000).toFixed(0)}к</span>
                              ) : null}
                            </div>
                          </div>
                          {req.plannedDate && (
                            <div className="flex items-center gap-1 text-xs text-gray-400 mt-1.5 pt-1.5 border-t border-gray-100">
                              <Clock className="w-2.5 h-2.5" /> к {req.plannedDate}
                            </div>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
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
