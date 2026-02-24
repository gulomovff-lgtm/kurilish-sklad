import { useState } from 'react';
import { collection, addDoc, getDocs, writeBatch, doc, arrayUnion, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import type { SkladRequest, PurchaseOrderItem } from '../types';
import { ShoppingCart, X, CalendarDays, Building2, DollarSign, AlertTriangle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { sendRequestNotification } from '../services/telegram';

interface Props {
  requests: SkladRequest[];
  onClose: () => void;
  onDone: () => void;
}

export default function CreatePurchaseOrderModal({ requests, onClose, onDone }: Props) {
  const { currentUser } = useAuth();
  const [supplierName, setSupplierName] = useState('');
  const [supplierContact, setSupplierContact] = useState('');
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [actualCost, setActualCost] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Агрегация позиций: суммируем одинаковые по наименованию
  const aggregatedItems = (() => {
    const map = new Map<string, PurchaseOrderItem>();
    for (const req of requests) {
      for (const item of req.items) {
        const key = item.name.trim().toLowerCase();
        if (map.has(key)) {
          const existing = map.get(key)!;
          map.set(key, {
            ...existing,
            totalQty: existing.totalQty + (item.quantity ?? 0),
            requestIds: [...new Set([...existing.requestIds, req.id])],
          });
        } else {
          map.set(key, {
            name: item.name,
            unit: item.unit,
            totalQty: item.quantity ?? 0,
            requestIds: [req.id],
          });
        }
      }
    }
    return Array.from(map.values());
  })();

  // Проверка критичных тегов
  const hasCriticalTags = requests.some(r =>
    r.tags?.some(t => t === 'hot' || t === 'Горящее')
    || r.urgencyLevel === 'critical'
  );

  const canSubmit = supplierName.trim().length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!currentUser || !canSubmit) return;
    setSubmitting(true);
    try {
      const now = new Date().toISOString();

      // Номер заказа
      const poSnap = await getDocs(collection(db, 'purchase_orders'));
      const maxNum = poSnap.docs.reduce((mx, d) => Math.max(mx, (d.data().number ?? 0)), 0);
      const newNum = maxNum + 1;
      const poRef = await addDoc(collection(db, 'purchase_orders'), {
        number: newNum,
        supplierName: supplierName.trim(),
        supplierContact: supplierContact.trim() || null,
        expectedDelivery: expectedDelivery || null,
        actualCost: actualCost ? parseFloat(actualCost) : null,
        status: 'pending',
        linkedRequests: requests.map(r => r.id),
        items: aggregatedItems,
        note: note.trim() || null,
        createdAt: now,
        createdBy: currentUser.uid,
        createdByName: currentUser.displayName,
        updatedAt: now,
        telegramNotified: false,
      });

      // Обновляем каждую заявку: добавляем purchaseOrderId + запись в историю
      const batch = writeBatch(db);
      for (const req of requests) {
        batch.update(doc(db, 'requests', req.id), {
          purchaseOrderId: poRef.id,
          updatedAt: now,
          history: arrayUnion({
            at: now,
            by: currentUser.uid,
            byName: currentUser.displayName,
            action: `Включена в сводный заказ #ЗП-${String(newNum).padStart(3,'0')} · поставщик «${supplierName.trim()}»`,
          }),
        });
      }
      await batch.commit();

      // Telegram: уведомление если есть критичные теги
      if (hasCriticalTags) {
        // Найдём первую критичную заявку для уведомления
        const critReq = requests.find(r =>
          r.tags?.some(t => t === 'hot') || r.urgencyLevel === 'critical'
        );
        if (critReq) {
          await sendRequestNotification(
            critReq,
            'snab_needed',
            `🔥 Критичные позиции в сводном заказе #ЗП-${String(newNum).padStart(3,'0')} у поставщика «${supplierName.trim()}»`,
            currentUser.displayName
          ).catch(() => {});
        }
      }

      toast.success(`Сводный заказ #ЗП-${String(newNum).padStart(3,'0')} создан · ${requests.length} заявок объединено`);
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка при создании заказа');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 md:p-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col">

        {/* Шапка */}
        <div className="flex items-center gap-3 p-5 border-b border-gray-100">
          <div className="w-10 h-10 bg-cyan-100 rounded-full flex items-center justify-center shrink-0">
            <ShoppingCart className="w-5 h-5 text-cyan-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900">Сводный заказ поставщику</h2>
            <p className="text-sm text-gray-500">Выделено заявок: {requests.length}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">

          {hasCriticalTags && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2 text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Среди выбранных есть заявки с тегом 🔥 «Горящее» или уровнем «Критично» — будет отправлено Telegram-уведомление снабженцу.</span>
            </div>
          )}

          {/* Сводная таблица */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Сводная таблица позиций</h3>
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="grid bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200"
                style={{ gridTemplateColumns: '1fr 70px 80px' }}>
                <div className="px-3 py-2.5">Наименование</div>
                <div className="px-2 py-2.5 text-center">Ед.</div>
                <div className="px-2 py-2.5 text-center">Итого</div>
              </div>
              {aggregatedItems.map((item, i) => (
                <div key={i} className="grid items-center border-b border-gray-100 last:border-0"
                  style={{ gridTemplateColumns: '1fr 70px 80px' }}>
                  <div className="px-3 py-2.5">
                    <p className="text-sm text-gray-800">{item.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.requestIds.length} заявок</p>
                  </div>
                  <div className="px-2 py-2.5 text-xs text-gray-500 text-center">{item.unit}</div>
                  <div className="px-2 py-2.5 text-sm font-bold text-cyan-700 text-center">{item.totalQty}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Включённые заявки */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Включённые заявки</h3>
            <div className="flex flex-wrap gap-1.5">
              {requests.map(req => (
                <span key={req.id} className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">
                  <Building2 className="w-3 h-3" />
                  #{req.number} · {req.objectName}
                </span>
              ))}
            </div>
          </div>

          {/* Форма */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Поставщик <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={supplierName}
                onChange={e => setSupplierName(e.target.value)}
                placeholder="Название компании-поставщика"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Контакт поставщика</label>
              <input
                type="text"
                value={supplierContact}
                onChange={e => setSupplierContact(e.target.value)}
                placeholder="+998 00 000-00-00"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5" /> Ожидаемая дата доставки
              </label>
              <input
                type="date"
                value={expectedDelivery}
                onChange={e => setExpectedDelivery(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5" /> Стоимость (сум)
              </label>
              <input
                type="number"
                value={actualCost}
                onChange={e => setActualCost(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Примечание</label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={2}
                placeholder="Условия поставки, особые требования…"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Футер */}
        <div className="p-5 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-none w-28 px-4 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium text-sm"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition-colors font-semibold text-sm disabled:opacity-50"
          >
            {submitting
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <CheckCircle2 className="w-4 h-4" />
            }
            Сформировать сводный заказ
          </button>
        </div>
      </div>
    </div>
  );
}
