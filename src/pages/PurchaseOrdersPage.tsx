import { useEffect, useState } from 'react';
import {
  collection, onSnapshot, doc, updateDoc, writeBatch, getDocs,
  query, where, arrayUnion,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import type { PurchaseOrder, PurchaseOrderStatus } from '../types';
import {
  ShoppingCart, CheckCircle2, Clock, Package, Truck,
  Building2, AlertTriangle, ChevronDown, ChevronRight,
  DollarSign, CalendarDays, User, X, ExternalLink,
} from 'lucide-react';
import { formatDate } from '../utils';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

const STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  draft:      'Черновик',
  pending:    'В ожидании',
  delivered:  'Доставлено ✓',
  cancelled:  'Отменено',
};

const STATUS_COLORS: Record<PurchaseOrderStatus, string> = {
  draft:      'bg-gray-100 text-gray-600',
  pending:    'bg-amber-100 text-amber-700',
  delivered:  'bg-green-100 text-green-700',
  cancelled:  'bg-red-100 text-red-600',
};

export default function PurchaseOrdersPage() {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [delivering, setDelivering] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'purchase_orders')),
      snap => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as PurchaseOrder));
        data.sort((a, b) => b.number - a.number);
        setOrders(data);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  // ── Отметить заказ как «Доставлено» ─────────────────────────────────────
  const markDelivered = async (order: PurchaseOrder) => {
    if (!currentUser) return;
    setDelivering(order.id);
    try {
      const now = new Date().toISOString();
      const batch = writeBatch(db);

      // 1. Обновить сам purchase_order
      batch.update(doc(db, 'purchase_orders', order.id), {
        status: 'delivered',
        deliveredAt: now,
        updatedAt: now,
      });

      // 2. Изменить статус всех связанных заявок на v_puti + записать в историю
      for (const reqId of order.linkedRequests) {
        const reqRef = doc(db, 'requests', reqId);
        batch.update(reqRef, {
          status: 'v_puti',
          updatedAt: now,
          slaEnteredAt: now,
          purchaseOrderId: order.id,
          history: arrayUnion({
            at: now,
            by: currentUser.uid,
            byName: currentUser.displayName,
            action: `Закуплено в рамках сводного заказа #ЗП-${String(order.number).padStart(3,'0')} у поставщика «${order.supplierName}»`,
            fromStatus: 'zakupleno',
            toStatus: 'v_puti',
          }),
        });
      }

      await batch.commit();
      toast.success(`Заказ #ЗП-${String(order.number).padStart(3,'0')} отмечен как «Доставлено» — ${order.linkedRequests.length} заявок переведено в «В пути»`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка при обновлении');
    } finally {
      setDelivering(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const pending = orders.filter(o => o.status === 'pending' || o.status === 'draft');
  const done    = orders.filter(o => o.status === 'delivered' || o.status === 'cancelled');

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">

      {/* Шапка */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-cyan-600" />
            Сводные заказы поставщику
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Консолидированные закупки · ЗП-серия</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-medium">
            {pending.length} активных
          </span>
          <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">
            {done.length} закрытых
          </span>
        </div>
      </div>

      {orders.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Нет сводных заказов</p>
          <p className="text-sm mt-1">Создавайте заказы из канбана, выделяя заявки в колонке «Закупка»</p>
        </div>
      )}

      {/* Активные заказы */}
      {pending.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Активные</h2>
          {pending.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              expanded={expandedId === order.id}
              onToggle={() => setExpandedId(prev => prev === order.id ? null : order.id)}
              delivering={delivering === order.id}
              onMarkDelivered={() => markDelivered(order)}
              currentUserRole={currentUser?.role}
            />
          ))}
        </section>
      )}

      {/* Закрытые заказы */}
      {done.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Завершённые</h2>
          {done.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              expanded={expandedId === order.id}
              onToggle={() => setExpandedId(prev => prev === order.id ? null : order.id)}
              delivering={false}
              onMarkDelivered={() => {}}
              currentUserRole={currentUser?.role}
            />
          ))}
        </section>
      )}
    </div>
  );
}

// ─── Карточка заказа ────────────────────────────────────────────────────────
interface OrderCardProps {
  order: PurchaseOrder;
  expanded: boolean;
  onToggle: () => void;
  delivering: boolean;
  onMarkDelivered: () => void;
  currentUserRole?: string;
}

function OrderCard({ order, expanded, onToggle, delivering, onMarkDelivered, currentUserRole }: OrderCardProps) {
  const poNum = `ЗП-${String(order.number).padStart(3, '0')}`;
  const canDeliver = (currentUserRole === 'snab' || currentUserRole === 'admin')
    && (order.status === 'pending' || order.status === 'draft');

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Строка-заголовок */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
          order.status === 'delivered' ? 'bg-green-100' : 'bg-cyan-100'
        }`}>
          {order.status === 'delivered'
            ? <CheckCircle2 className="w-4.5 h-4.5 text-green-600" />
            : <Truck className="w-4.5 h-4.5 text-cyan-600" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-gray-900 font-mono">{poNum}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status]}`}>
              {STATUS_LABELS[order.status]}
            </span>
            {order.items.some(i => i.requestIds.length > 0) && (
              <span className="text-xs bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded-full">
                {order.linkedRequests.length} заявок
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-sm text-gray-500 flex-wrap">
            <span className="flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" />
              {order.supplierName}
            </span>
            {order.expectedDelivery && (
              <span className="flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5" />
                до {new Date(order.expectedDelivery).toLocaleDateString('ru-RU')}
              </span>
            )}
            {order.actualCost != null && (
              <span className="flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5" />
                {order.actualCost.toLocaleString('ru-RU')} сум
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0">
          {expanded
            ? <ChevronDown className="w-4 h-4 text-gray-400" />
            : <ChevronRight className="w-4 h-4 text-gray-400" />
          }
        </div>
      </button>

      {/* Развёрнутый контент */}
      {expanded && (
        <div className="border-t border-gray-100 p-4 space-y-4">

          {/* Сводная таблица позиций */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Позиции</h4>
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="grid bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200"
                style={{ gridTemplateColumns: '1fr 80px 80px' }}>
                <div className="px-3 py-2">Наименование</div>
                <div className="px-2 py-2 text-center">Ед.</div>
                <div className="px-2 py-2 text-center">Кол-во</div>
              </div>
              {order.items.map((item, i) => (
                <div key={i} className="grid items-center border-b border-gray-100 last:border-0 hover:bg-gray-50"
                  style={{ gridTemplateColumns: '1fr 80px 80px' }}>
                  <div className="px-3 py-2 text-sm text-gray-800">{item.name}</div>
                  <div className="px-2 py-2 text-xs text-gray-500 text-center">{item.unit}</div>
                  <div className="px-2 py-2 text-sm font-semibold text-gray-700 text-center">{item.totalQty}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Связанные заявки */}
          {order.linkedRequests.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Связанные заявки</h4>
              <div className="flex flex-wrap gap-2">
                {order.linkedRequests.map(reqId => (
                  <Link key={reqId} to={`/requests/${reqId}`}
                    className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full hover:bg-blue-100 transition-colors">
                    <ExternalLink className="w-3 h-3" />
                    Заявка →
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Доп. поля */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-400">Создал</p>
              <p className="font-medium text-gray-700">{order.createdByName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Создан</p>
              <p className="font-medium text-gray-700">{formatDate(order.createdAt)}</p>
            </div>
            {order.note && (
              <div className="col-span-2">
                <p className="text-xs text-gray-400">Примечание</p>
                <p className="text-gray-700">{order.note}</p>
              </div>
            )}
            {order.deliveredAt && (
              <div className="col-span-2">
                <p className="text-xs text-gray-400">Дата доставки</p>
                <p className="font-medium text-green-700">{formatDate(order.deliveredAt)}</p>
              </div>
            )}
          </div>

          {/* Кнопка доставки */}
          {canDeliver && (
            <button
              onClick={onMarkDelivered}
              disabled={delivering}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-semibold disabled:opacity-50"
            >
              {delivering
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <CheckCircle2 className="w-4 h-4" />
              }
              Отметить как «Доставлено» — перевести заявки в «В пути»
            </button>
          )}
        </div>
      )}
    </div>
  );
}
