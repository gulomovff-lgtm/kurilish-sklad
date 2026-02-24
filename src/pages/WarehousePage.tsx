import { useEffect, useState } from 'react';
import {
  collection, onSnapshot, addDoc, updateDoc, doc,
  orderBy, query
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import type { StockItem, StockMovement } from '../types';
import {
  Plus, Package, AlertTriangle, ArrowUpCircle, ArrowDownCircle,
  Edit2, Search, X, History, BarChart2, Layers, Archive,
} from 'lucide-react';
import { UNITS, CATEGORIES, formatDate } from '../utils';
import toast from 'react-hot-toast';

export default function WarehousePage() {
  const { currentUser } = useAuth();
  const [items, setItems] = useState<StockItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [tab, setTab] = useState<'stock' | 'movements'>('stock');

  // Модалки
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<StockItem | null>(null);
  const [showMove, setShowMove] = useState<StockItem | null>(null);

  const canEdit = currentUser?.role === 'sklad' || currentUser?.role === 'admin';

  useEffect(() => {
    const q1 = query(collection(db, 'stockItems'), orderBy('name'));
    const q2 = query(collection(db, 'stockMovements'), orderBy('createdAt', 'desc'));

    const u1 = onSnapshot(q1, snap => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as StockItem)));
      setLoading(false);
    });
    const u2 = onSnapshot(q2, snap => {
      setMovements(snap.docs.map(d => ({ id: d.id, ...d.data() } as StockMovement)));
    });
    return () => { u1(); u2(); };
  }, []);

  const filtered = items.filter(it => {
    const matchSearch = !search ||
      it.name.toLowerCase().includes(search.toLowerCase()) ||
      it.category.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === 'all' || it.category === filterCat;
    return matchSearch && matchCat;
  });

  const lowStock = items.filter(it => it.quantity <= it.minQuantity);
  const totalValue = items.reduce((s, it) => s + ((it.price ?? 0) * it.quantity), 0);
  const usedCategories = ['all', ...Array.from(new Set(items.map(i => i.category)))];
  const today = new Date().toISOString().slice(0, 10);
  const todayIn  = movements.filter(m => m.createdAt.startsWith(today) && m.type === 'in').reduce((s, m) => s + m.quantity, 0);
  const todayOut = movements.filter(m => m.createdAt.startsWith(today) && m.type === 'out').reduce((s, m) => s + m.quantity, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold" style={{ color: '#59301f' }}>Склад</h1>
          <p className="text-sm mt-0.5" style={{ color: '#a67161' }}>
            {loading ? '...' : `${items.length} позиций`}
            {totalValue > 0 && ` · ${(totalValue / 1_000_000).toFixed(2)} млн сум`}
          </p>
        </div>
        {canEdit && (
          <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Добавить позицию
          </button>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Позиций на складе', value: loading ? '—' : String(items.length), icon: Layers, bg: 'bg-[#f7ede7]', ic: 'text-[#a67161]', sub: `${usedCategories.length - 1} категорий`, accent: false },
          { label: 'Мало остатка', value: loading ? '—' : String(lowStock.length), icon: AlertTriangle, bg: lowStock.length > 0 ? 'bg-red-50' : 'bg-gray-50', ic: lowStock.length > 0 ? 'text-red-500' : 'text-gray-400', sub: lowStock.length > 0 ? 'Нужен мониторинг' : 'Всё в норме', accent: lowStock.length > 0 },
          { label: 'Приход сегодня', value: loading ? '—' : `+${todayIn}`, icon: ArrowUpCircle, bg: 'bg-green-50', ic: 'text-green-600', sub: 'ед. сегодня', accent: false },
          { label: 'Расход сегодня', value: loading ? '—' : `-${todayOut}`, icon: ArrowDownCircle, bg: 'bg-[#f7ede7]', ic: 'text-[#a67161]', sub: 'ед. сегодня', accent: false },
        ].map(({ label, value, icon: Icon, bg, ic, sub, accent }) => (
          <div key={label}
            className={`bg-white rounded-2xl border-2 p-4 ${accent ? 'border-red-200' : ''}`}
            style={!accent ? { borderColor: '#edd5c8' } : {}}>
            <div className={`${bg} w-9 h-9 rounded-xl flex items-center justify-center mb-2.5`}>
              <Icon className={`w-4 h-4 ${ic}`} />
            </div>
            <p className={`text-2xl font-bold ${accent ? 'text-red-500' : ''}`}
              style={!accent ? { color: '#59301f' } : {}}>{value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{label}</p>
            <p className="text-xs mt-0.5" style={{ color: '#a67161' }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Low stock alert */}
      {!loading && lowStock.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-2xl border-2" style={{ background: '#fff5f5', borderColor: '#fecaca' }}>
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-700">Критически низкий остаток — {lowStock.length} позиций</p>
            <p className="text-sm text-red-600 mt-1 leading-relaxed">
              {lowStock.map(it => (
                <span key={it.id} className="inline-block bg-red-100 text-red-700 rounded px-1.5 py-0.5 mr-1 mb-1 text-xs font-medium">
                  {it.name}: {it.quantity} / мин {it.minQuantity} {it.unit}
                </span>
              ))}
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: '#f7ede7' }}>
        <button
          onClick={() => setTab('stock')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'stock' ? 'bg-white shadow-sm' : 'hover:bg-white/50'}`}
          style={{ color: tab === 'stock' ? '#59301f' : '#a67161' }}>
          <span className="flex items-center gap-1.5"><Package className="w-4 h-4" />Остатки</span>
        </button>
        <button
          onClick={() => setTab('movements')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'movements' ? 'bg-white shadow-sm' : 'hover:bg-white/50'}`}
          style={{ color: tab === 'movements' ? '#59301f' : '#a67161' }}>
          <span className="flex items-center gap-1.5"><History className="w-4 h-4" />Движение</span>
        </button>
      </div>

      {tab === 'stock' && (
        <>
          {/* Filters */}
          <div className="bg-white rounded-2xl border-2 p-4 space-y-3" style={{ borderColor: '#edd5c8' }}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Поиск по названию или категории..."
                className="w-full pl-9 pr-9 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c89587]"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {usedCategories.map(cat => (
                <button key={cat} onClick={() => setFilterCat(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium border-2 transition-all ${
                    filterCat === cat ? 'text-white border-transparent' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                  style={filterCat === cat ? { background: '#c89587', borderColor: '#c89587' } : {}}>
                  {cat === 'all' ? 'Все категории' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Stock table */}
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="card text-center py-12 text-gray-400">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Позиций не найдено</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border-2 overflow-hidden" style={{ borderColor: '#edd5c8' }}>
              <table className="w-full text-sm">
                <thead style={{ background: '#fdf9f7', borderBottom: '2px solid #edd5c8' }}>
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide" style={{ color: '#a67161' }}>Наименование</th>
                    <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide hidden md:table-cell" style={{ color: '#a67161' }}>Категория</th>
                    <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide" style={{ color: '#a67161' }}>Остаток</th>
                    <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide hidden sm:table-cell" style={{ color: '#a67161' }}>Мин.</th>
                    <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide hidden lg:table-cell" style={{ color: '#a67161' }}>Место</th>
                    {canEdit && <th className="px-4 py-3 w-20"></th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item, idx) => {
                    const isLow = item.quantity <= item.minQuantity;
                    return (
                      <tr key={item.id}
                        className="border-b hover:bg-[#fdf9f7] transition-colors"
                        style={{ borderColor: '#f7ede7', background: isLow ? '#fff5f5' : idx % 2 === 0 ? '' : 'rgba(253,249,247,0.5)' }}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {isLow && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                            <div>
                              <p className="font-medium" style={{ color: '#59301f' }}>{item.name}</p>
                              {isLow && <span className="text-xs font-medium text-red-500">Мало на складе</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-sm hidden md:table-cell">{item.category}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-bold text-base ${isLow ? 'text-red-600' : ''}`}
                            style={!isLow ? { color: '#59301f' } : {}}>{item.quantity}</span>
                          <span className="text-xs text-gray-400 ml-1">{item.unit}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-400 text-sm hidden sm:table-cell">{item.minQuantity} {item.unit}</td>
                        <td className="px-4 py-3 text-gray-400 text-sm hidden lg:table-cell">{item.location || '—'}</td>
                        {canEdit && (
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 justify-end">
                              <button onClick={() => setShowMove(item)}
                                className="p-1.5 rounded-lg transition-colors hover:bg-[#f7ede7]" style={{ color: '#c89587' }} title="Движение">
                                <BarChart2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => setEditItem(item)}
                                className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors" title="Редактировать">
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="px-4 py-3 text-xs text-gray-400 border-t" style={{ borderColor: '#edd5c8', background: '#fdf9f7' }}>
                Показано {filtered.length} из {items.length} позиций
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'movements' && (
        <div className="bg-white rounded-2xl border-2 overflow-hidden" style={{ borderColor: '#edd5c8' }}>
          <table className="w-full text-sm">
            <thead style={{ background: '#fdf9f7', borderBottom: '2px solid #edd5c8' }}>
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide" style={{ color: '#a67161' }}>Дата</th>
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide" style={{ color: '#a67161' }}>Материал</th>
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide hidden sm:table-cell" style={{ color: '#a67161' }}>Тип</th>
                <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide" style={{ color: '#a67161' }}>Кол-во</th>
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide hidden md:table-cell" style={{ color: '#a67161' }}>Причина</th>
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide hidden lg:table-cell" style={{ color: '#a67161' }}>Пользователь</th>
              </tr>
            </thead>
            <tbody>
              {movements.slice(0, 50).map((m, idx) => (
                <tr key={m.id} className="border-b hover:bg-[#fdf9f7] transition-colors"
                  style={{ borderColor: '#f7ede7', background: idx % 2 !== 0 ? 'rgba(253,249,247,0.5)' : '' }}>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">{formatDate(m.createdAt)}</td>
                  <td className="px-4 py-3 font-medium" style={{ color: '#59301f' }}>{m.itemName}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {m.type === 'in' ? (
                      <span className="flex items-center gap-1.5 text-green-700 text-xs font-medium bg-green-50 px-2 py-1 rounded-lg w-fit">
                        <ArrowUpCircle className="w-3.5 h-3.5" /> Приход
                      </span>
                    ) : m.type === 'out' ? (
                      <span className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg w-fit" style={{ background: '#f7ede7', color: '#a67161' }}>
                        <ArrowDownCircle className="w-3.5 h-3.5" /> Расход
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-gray-600 text-xs font-medium bg-gray-100 px-2 py-1 rounded-lg w-fit">
                        <Archive className="w-3.5 h-3.5" /> Коррекция
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-bold">
                    <span className={m.type === 'in' ? 'text-green-600' : m.type === 'out' ? 'text-red-500' : 'text-gray-500'}>
                      {m.type === 'in' ? '+' : m.type === 'out' ? '−' : '='}{m.quantity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-sm hidden md:table-cell">{m.reason}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs hidden lg:table-cell">{m.createdByName}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {movements.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Движений пока нет</p>
            </div>
          )}
          {movements.length > 0 && (
            <div className="px-4 py-3 text-xs text-gray-400 border-t" style={{ borderColor: '#edd5c8', background: '#fdf9f7' }}>
              Показано последних {Math.min(movements.length, 50)} движений
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Item Modal */}
      {(showAdd || editItem) && (
        <ItemModal
          item={editItem}
          onClose={() => { setShowAdd(false); setEditItem(null); }}
          currentUser={currentUser!}
        />
      )}

      {/* Movement Modal */}
      {showMove && (
        <MovementModal
          item={showMove}
          onClose={() => setShowMove(null)}
          currentUser={currentUser!}
        />
      )}
    </div>
  );
}

// ---- Item Modal ----
function ItemModal({ item, onClose, currentUser }: {
  item: StockItem | null;
  onClose: () => void;
  currentUser: { uid: string; displayName: string };
}) {
  const [name, setName] = useState(item?.name || '');
  const [unit, setUnit] = useState(item?.unit || 'шт');
  const [category, setCategory] = useState(item?.category || CATEGORIES[0]);
  const [quantity, setQuantity] = useState(item?.quantity ?? 0);
  const [minQty, setMinQty] = useState(item?.minQuantity ?? 5);
  const [location, setLocation] = useState(item?.location || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return toast.error('Введите название');
    setLoading(true);
    try {
      const now = new Date().toISOString();
      const data = {
        name, unit, category, quantity, minQuantity: minQty,
        location, updatedAt: now,
        updatedBy: currentUser.uid,
        updatedByName: currentUser.displayName,
      };
      if (item) {
        await updateDoc(doc(db, 'stockItems', item.id), data);
        toast.success('Позиция обновлена');
      } else {
        await addDoc(collection(db, 'stockItems'), data);
        toast.success('Позиция добавлена');
      }
      onClose();
    } catch (err) {
      toast.error('Ошибка сохранения');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-bold text-lg">{item ? 'Редактировать позицию' : 'Добавить позицию'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Наименование *</label>
            <input value={name} onChange={e => setName(e.target.value)} className="input-field" placeholder="Название материала" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ед. изм.</label>
              <select value={unit} onChange={e => setUnit(e.target.value)} className="input-field">
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Категория</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="input-field">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Количество</label>
              <input type="number" value={quantity} onChange={e => setQuantity(parseFloat(e.target.value)||0)} className="input-field" min="0" step="0.01" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Мин. остаток</label>
              <input type="number" value={minQty} onChange={e => setMinQty(parseFloat(e.target.value)||0)} className="input-field" min="0" step="0.01" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Место хранения</label>
            <input value={location} onChange={e => setLocation(e.target.value)} className="input-field" placeholder="Стеллаж А-1..." />
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t">
          <button onClick={onClose} className="btn-secondary flex-1">Отмена</button>
          <button onClick={handleSave} disabled={loading} className="btn-primary flex-1">
            {loading ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Movement Modal ----
function MovementModal({ item, onClose, currentUser }: {
  item: StockItem;
  onClose: () => void;
  currentUser: { uid: string; displayName: string };
}) {
  const [type, setType] = useState<'in' | 'out' | 'adjustment'>('in');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!reason.trim()) return toast.error('Введите причину');
    if (quantity <= 0) return toast.error('Количество должно быть больше 0');
    setLoading(true);
    try {
      const now = new Date().toISOString();
      // Вычислить новый остаток
      let newQty = item.quantity;
      if (type === 'in') newQty += quantity;
      else if (type === 'out') newQty = Math.max(0, newQty - quantity);
      else newQty = quantity;

      // Обновить остаток
      await updateDoc(doc(db, 'stockItems', item.id), {
        quantity: newQty,
        updatedAt: now,
        updatedBy: currentUser.uid,
        updatedByName: currentUser.displayName,
      });

      // Записать движение
      await addDoc(collection(db, 'stockMovements'), {
        itemId: item.id,
        itemName: item.name,
        type,
        quantity,
        reason,
        createdAt: now,
        createdBy: currentUser.uid,
        createdByName: currentUser.displayName,
      });

      toast.success('Движение записано');
      onClose();
    } catch (err) {
      toast.error('Ошибка');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const previewQty = type === 'in'
    ? item.quantity + quantity
    : type === 'out'
      ? Math.max(0, item.quantity - quantity)
      : quantity;
  const quickAmounts = [1, 5, 10, 50, 100];
  const typeConfig = {
    in:         { label: 'Приход',        active: 'bg-green-600 text-white border-green-600',   idle: 'bg-white text-gray-600 border-gray-200 hover:border-green-400' },
    out:        { label: 'Расход',        active: 'bg-red-500 text-white border-red-500',        idle: 'bg-white text-gray-600 border-gray-200 hover:border-red-400' },
    adjustment: { label: 'Корректировка', active: 'bg-gray-600 text-white border-gray-600',       idle: 'bg-white text-gray-600 border-gray-200 hover:border-gray-400' },
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: '#edd5c8' }}>
          <div>
            <h2 className="font-display text-lg font-semibold" style={{ color: '#59301f' }}>Движение товара</h2>
            <p className="text-sm mt-0.5" style={{ color: '#a67161' }}>{item.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          {/* Type */}
          <div className="flex gap-2">
            {(Object.keys(typeConfig) as ('in' | 'out' | 'adjustment')[]).map(t => (
              <button key={t} onClick={() => setType(t)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border-2 transition-all ${type === t ? typeConfig[t].active : typeConfig[t].idle}`}>
                {typeConfig[t].label}
              </button>
            ))}
          </div>
          {/* Before / After */}
          <div className="grid grid-cols-2 gap-2 rounded-xl overflow-hidden border" style={{ borderColor: '#edd5c8' }}>
            <div className="p-3 text-center" style={{ background: '#fdf9f7' }}>
              <p className="text-xs text-gray-400 mb-0.5">Сейчас</p>
              <p className="text-xl font-bold" style={{ color: '#59301f' }}>{item.quantity}</p>
              <p className="text-xs text-gray-400">{item.unit}</p>
            </div>
            <div className="p-3 text-center border-l" style={{ borderColor: '#edd5c8' }}>
              <p className="text-xs text-gray-400 mb-0.5">Станет</p>
              <p className={`text-xl font-bold ${previewQty < item.minQuantity ? 'text-red-500' : 'text-green-600'}`}>{previewQty}</p>
              <p className="text-xs text-gray-400">{item.unit}</p>
            </div>
          </div>
          {/* Quantity */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#a67161' }}>
              {type === 'adjustment' ? 'Новое количество' : 'Количество'}
            </label>
            <div className="flex items-center gap-2">
              <button onClick={() => setQuantity(q => Math.max(0.01, parseFloat((q - 1).toFixed(2))))}
                className="w-9 h-9 rounded-xl border-2 font-bold text-gray-600 hover:bg-gray-50 flex items-center justify-center"
                style={{ borderColor: '#edd5c8' }}>−</button>
              <input type="number" value={quantity} onChange={e => setQuantity(parseFloat(e.target.value) || 0)}
                className="flex-1 text-center px-3 py-2 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#c89587]"
                min="0.01" step="0.01" />
              <button onClick={() => setQuantity(q => parseFloat((q + 1).toFixed(2)))}
                className="w-9 h-9 rounded-xl border-2 font-bold text-gray-600 hover:bg-gray-50 flex items-center justify-center"
                style={{ borderColor: '#edd5c8' }}>+</button>
            </div>
            <div className="flex gap-1.5 mt-2">
              {quickAmounts.map(a => (
                <button key={a} onClick={() => setQuantity(a)}
                  className="flex-1 py-1 text-xs font-medium rounded-lg border-2 transition-all hover:bg-[#f7ede7]"
                  style={{ borderColor: '#edd5c8', color: '#a67161' }}>{a}</button>
              ))}
            </div>
          </div>
          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#a67161' }}>Причина *</label>
            <input value={reason} onChange={e => setReason(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c89587]"
              placeholder="Например: Поступление от поставщика..." />
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t" style={{ borderColor: '#edd5c8' }}>
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border font-medium text-sm hover:bg-gray-50 transition-colors"
            style={{ borderColor: '#edd5c8', color: '#59301f' }}>Отмена</button>
          <button onClick={handleSave} disabled={loading} className="flex-1 px-4 py-2.5 rounded-xl font-medium text-sm text-white transition-colors disabled:opacity-50"
            style={{ background: '#c89587' }}>
            {loading ? 'Сохранение...' : 'Записать'}
          </button>
        </div>
      </div>
    </div>
  );
}
