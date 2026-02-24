import { useEffect, useState } from 'react';
import {
  collection, getDocs, writeBatch, doc, addDoc, arrayUnion, updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import type { SkladRequest, RequestItem, StockItem } from '../types';
import { Scissors, AlertTriangle, CheckCircle2, X, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

interface SplitRow {
  item: RequestItem;
  stock: number;      // остаток на складе (0 если нет записи)
  stockId?: string;   // id из /stock
  toIssue: number;    // 🟢 Выдать
  toPurchase: number; // 🔵 В закуп
}

interface Props {
  request: SkladRequest;
  onClose: () => void;
  onDone: () => void;
}

export default function SplitRequestModal({ request, onClose, onDone }: Props) {
  const { currentUser } = useAuth();
  const [rows, setRows] = useState<SplitRow[]>([]);
  const [loadingStock, setLoadingStock] = useState(true);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ── Загрузить остатки склада ──────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, 'stock'));
      const stockMap = new Map<string, { qty: number; id: string }>();
      snap.docs.forEach(d => {
        const s = d.data() as StockItem;
        stockMap.set(s.name.trim().toLowerCase(), { qty: s.quantity ?? 0, id: d.id });
      });

      const initialRows: SplitRow[] = request.items.map(item => {
        const key = item.name.trim().toLowerCase();
        const stockEntry = stockMap.get(key);
        const stockQty = stockEntry?.qty ?? 0;
        // По умолчанию: выдаём сколько есть на складе, остаток в закуп
        const canIssue = Math.min(stockQty, item.quantity);
        return {
          item,
          stock: stockQty,
          stockId: stockEntry?.id,
          toIssue: canIssue,
          toPurchase: item.quantity - canIssue,
        };
      });
      setRows(initialRows);
      setLoadingStock(false);
    })();
  }, [request.items]);

  // ── Пересчёт при изменении «Выдать» ──────────────────────────────────────
  const handleIssueChange = (idx: number, raw: string) => {
    const val = parseFloat(raw);
    const safeVal = isNaN(val) ? 0 : Math.max(0, val);
    setRows(prev => prev.map((r, i) => {
      if (i !== idx) return r;
      const issue = Math.min(safeVal, r.item.quantity);
      return { ...r, toIssue: issue, toPurchase: r.item.quantity - issue };
    }));
  };

  // ── Пересчёт при изменении «В закуп» ─────────────────────────────────────
  const handlePurchaseChange = (idx: number, raw: string) => {
    const val = parseFloat(raw);
    const safeVal = isNaN(val) ? 0 : Math.max(0, val);
    setRows(prev => prev.map((r, i) => {
      if (i !== idx) return r;
      const purchase = Math.min(safeVal, r.item.quantity);
      return { ...r, toPurchase: purchase, toIssue: r.item.quantity - purchase };
    }));
  };

  // ── Быстрые действия ─────────────────────────────────────────────────────
  const setAllFromStock = (idx: number) => {
    setRows(prev => prev.map((r, i) => {
      if (i !== idx) return r;
      const issue = Math.min(r.stock, r.item.quantity);
      return { ...r, toIssue: issue, toPurchase: r.item.quantity - issue };
    }));
  };

  const setAllToPurchase = (idx: number) => {
    setRows(prev => prev.map((r, i) => {
      if (i !== idx) return r;
      return { ...r, toIssue: 0, toPurchase: r.item.quantity };
    }));
  };

  // ── Валидация ─────────────────────────────────────────────────────────────
  type RowError = 'deficit' | 'negative' | 'mismatch' | null;
  const getError = (r: SplitRow): RowError => {
    if (r.toIssue < 0 || r.toPurchase < 0) return 'negative';
    if (Math.abs(r.toIssue + r.toPurchase - r.item.quantity) > 0.001) return 'mismatch';
    if (r.toIssue > r.stock + 0.001) return 'deficit';
    return null;
  };

  const errors = rows.map(getError);
  const hasErrors = errors.some(e => e !== null);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!currentUser || hasErrors) return;
    setSubmitting(true);
    try {
      const now = new Date().toISOString();

      const toIssueRows = rows.filter(r => r.toIssue > 0);
      const toPurchaseRows = rows.filter(r => r.toPurchase > 0);

      // ── 1. Списание со склада (batch) ─────────────────────────────────
      if (toIssueRows.length > 0) {
        const batch = writeBatch(db);
        for (const r of toIssueRows) {
          if (!r.stockId) continue; // нет записи в /stock — пропускаем
          const newQty = r.stock - r.toIssue;
          batch.update(doc(db, 'stock', r.stockId), {
            quantity: newQty,
            updatedAt: now,
            updatedBy: currentUser.uid,
            updatedByName: currentUser.displayName,
          });
          const movRef = doc(collection(db, 'movements'));
          batch.set(movRef, {
            id: movRef.id,
            itemId: r.stockId,
            itemName: r.item.name,
            type: 'out',
            quantity: r.toIssue,
            reason: `Выдано по заявке #${request.number} — ${request.title}`,
            requestId: request.id,
            requestNumber: request.number,
            createdAt: now,
            createdBy: currentUser.uid,
            createdByName: currentUser.displayName,
          });
        }
        await batch.commit();
        toast.success(`Списано ${toIssueRows.length} позиц. со склада ✓`);
      }

      // ── 2. Создать дочернюю заявку (в закуп) ─────────────────────────
      let childNum = 0;
      if (toPurchaseRows.length > 0) {
        const allSnap = await getDocs(collection(db, 'requests'));
        const maxNum = allSnap.docs.reduce((mx, d) => Math.max(mx, (d.data().number ?? 0)), 0);
        childNum = maxNum + 1;

        const childItems: RequestItem[] = toPurchaseRows.map(r => ({
          ...r.item,
          quantity: r.toPurchase,
          issuedQty: 0,
        }));

        const childRef = await addDoc(collection(db, 'requests'), {
          number: childNum,
          title: `[Закупка] ${request.title}`,
          objectName: request.objectName,
          objectId: request.objectId,
          createdBy: request.createdBy,
          createdByName: request.createdByName,
          createdAt: now,
          updatedAt: now,
          status: 'nachalnik_review',
          chain: request.chain,
          requestType: request.requestType,
          urgencyLevel: request.urgencyLevel,
          priority: request.priority,
          items: childItems,
          history: [{
            at: now,
            by: currentUser.uid,
            byName: currentUser.displayName,
            action: `Создана как дочерняя заявка (сплит из #${request.number})`,
            toStatus: 'nachalnik_review',
          }],
          parentId: request.id,
          isSplit: true,
          splitNote: comment || `Дочерняя заявка — позиции к закупке из #${request.number}`,
          zone: request.zone,
          tags: request.tags,
          plannedDate: request.plannedDate,
          slaEnteredAt: now,
          tgNotified: false,
        });

        // ── 3. Обновить родительскую заявку ──────────────────────────────
        await updateDoc(doc(db, 'requests', request.id), {
          status: 'vydano',
          updatedAt: now,
          slaEnteredAt: now,
          history: arrayUnion({
            at: now,
            by: currentUser.uid,
            byName: currentUser.displayName,
            action: `Частичная выдача: ${toIssueRows.length} поз. выдано, ${toPurchaseRows.length} поз. → заявка #${childNum}`,
            fromStatus: request.status,
            toStatus: 'vydano',
            comment: comment || undefined,
          }),
          items: request.items.map(it => {
            const row = rows.find(r => r.item.id === it.id);
            return { ...it, issuedQty: row?.toIssue ?? 0 };
          }),
          childIds: arrayUnion(childRef.id),
          splitNote: comment || undefined,
          skladProcessedBy: currentUser.uid,
          skladProcessedByName: currentUser.displayName,
          commentSklad: comment || undefined,
        });

        toast.success(`Сплит выполнен! Создана заявка #${childNum} на закупку`);
      } else {
        // Нет позиций в закуп — просто переводим в vydano
        await updateDoc(doc(db, 'requests', request.id), {
          status: 'vydano',
          updatedAt: now,
          slaEnteredAt: now,
          history: arrayUnion({
            at: now,
            by: currentUser.uid,
            byName: currentUser.displayName,
            action: `Выдача полностью (со склада)`,
            fromStatus: request.status,
            toStatus: 'vydano',
            comment: comment || undefined,
          }),
          items: request.items.map(it => {
            const row = rows.find(r => r.item.id === it.id);
            return { ...it, issuedQty: row?.toIssue ?? it.quantity };
          }),
          skladProcessedBy: currentUser.uid,
          skladProcessedByName: currentUser.displayName,
          commentSklad: comment || undefined,
        });
        toast.success(`Выдано полностью ✓`);
      }

      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка при разделении заявки');
    } finally {
      setSubmitting(false);
    }
  };

  const errorLabel: Record<NonNullable<RowError>, string> = {
    deficit: 'Недостаточно на складе',
    negative: 'Значение не может быть отрицательным',
    mismatch: 'Сумма должна равняться «Запрошено»',
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 md:p-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col">

        {/* Шапка */}
        <div className="flex items-center gap-3 p-5 border-b border-gray-100">
          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center shrink-0">
            <Scissors className="w-5 h-5 text-orange-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900">Разделить заявку #{request.number}</h2>
            <p className="text-sm text-gray-500 truncate">{request.title}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Контент */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>Выданные позиции будут автоматически списаны со склада. Позиции «В закуп» создадут дочернюю заявку на согласование.</span>
          </div>

          {loadingStock ? (
            <div className="flex items-center justify-center h-24 gap-3 text-gray-400">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              <span className="text-sm">Загружаем остатки склада…</span>
            </div>
          ) : (
            <>
              {/* Таблица */}
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                {/* Заголовок таблицы */}
                <div className="grid bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  style={{ gridTemplateColumns: '1fr 70px 90px 130px 130px 90px' }}>
                  <div className="px-3 py-2.5">Наименование</div>
                  <div className="px-2 py-2.5 text-center">Ед.</div>
                  <div className="px-2 py-2.5 text-center">Запрошено</div>
                  <div className="px-2 py-2.5 text-center">Остаток на складе</div>
                  <div className="px-2 py-2.5 text-center text-green-700">🟢 Выдать</div>
                  <div className="px-2 py-2.5 text-center text-blue-700">🔵 В закуп</div>
                </div>

                {/* Строки */}
                {rows.map((row, idx) => {
                  const err = errors[idx];
                  const stockPct = row.item.quantity > 0
                    ? Math.min(100, (row.stock / row.item.quantity) * 100)
                    : 0;
                  const stockColor = row.stock >= row.item.quantity
                    ? 'text-green-600' : row.stock > 0 ? 'text-amber-600' : 'text-red-500';

                  return (
                    <div
                      key={row.item.id}
                      className={`grid items-center border-b border-gray-100 last:border-0 transition-colors ${
                        err ? 'bg-red-50' : 'hover:bg-gray-50'
                      }`}
                      style={{ gridTemplateColumns: '1fr 70px 90px 130px 130px 90px' }}
                    >
                      {/* Наименование + ошибка + быстрые кнопки */}
                      <div className="px-3 py-2.5">
                        <p className="text-sm font-medium text-gray-800 leading-tight">{row.item.name}</p>
                        {err && (
                          <p className="text-xs text-red-600 mt-0.5 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            {errorLabel[err]}
                          </p>
                        )}
                        {/* Быстрые кнопки */}
                        <div className="flex gap-2 mt-1.5">
                          <button
                            onClick={() => setAllFromStock(idx)}
                            className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors font-medium"
                          >
                            Всё со склада
                          </button>
                          <button
                            onClick={() => setAllToPurchase(idx)}
                            className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors font-medium"
                          >
                            Всё в закуп
                          </button>
                        </div>
                      </div>

                      {/* Единица */}
                      <div className="px-2 py-2.5 text-center text-xs text-gray-500">{row.item.unit}</div>

                      {/* Запрошено (readonly) */}
                      <div className="px-2 py-2.5 text-center">
                        <span className="text-sm font-semibold text-gray-700">{row.item.quantity}</span>
                      </div>

                      {/* Остаток на складе (readonly + визуальная полоска) */}
                      <div className="px-2 py-2.5 text-center">
                        <span className={`text-sm font-semibold ${stockColor}`}>{row.stock}</span>
                        {row.item.quantity > 0 && (
                          <div className="mt-1 h-1 rounded-full bg-gray-200 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                stockPct >= 100 ? 'bg-green-500' : stockPct > 0 ? 'bg-amber-400' : 'bg-red-400'
                              }`}
                              style={{ width: `${stockPct}%` }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Выдать (input) */}
                      <div className="px-2 py-2.5">
                        <input
                          type="number"
                          min={0}
                          max={row.item.quantity}
                          step={0.01}
                          value={row.toIssue}
                          onChange={e => handleIssueChange(idx, e.target.value)}
                          className={`w-full px-2 py-1.5 text-sm text-right border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                            err === 'deficit' || err === 'negative' || err === 'mismatch'
                              ? 'border-red-400 bg-red-50 focus:ring-red-300'
                              : 'border-green-300 bg-green-50 focus:ring-green-400'
                          }`}
                        />
                      </div>

                      {/* В закуп (input) */}
                      <div className="px-2 py-2.5">
                        <input
                          type="number"
                          min={0}
                          max={row.item.quantity}
                          step={0.01}
                          value={row.toPurchase}
                          onChange={e => handlePurchaseChange(idx, e.target.value)}
                          className={`w-full px-2 py-1.5 text-sm text-right border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                            err === 'mismatch' || err === 'negative'
                              ? 'border-red-400 bg-red-50 focus:ring-red-300'
                              : 'border-blue-300 bg-blue-50 focus:ring-blue-400'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Превью карточек А/Б */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                  <p className="text-xs font-bold text-green-700 mb-2 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Карточка А — Выдать со склада
                  </p>
                  {rows.filter(r => r.toIssue > 0).length > 0
                    ? rows.filter(r => r.toIssue > 0).map(r => (
                        <p key={r.item.id} className="text-xs text-gray-700 py-0.5">
                          {r.item.name}: <span className="font-semibold text-green-700">{r.toIssue}</span> {r.item.unit}
                        </p>
                      ))
                    : <p className="text-xs text-gray-400 italic">Нет позиций</p>
                  }
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <p className="text-xs font-bold text-blue-700 mb-2 flex items-center gap-1">
                    <ChevronRight className="w-3.5 h-3.5" />
                    Карточка Б — В закупку
                  </p>
                  {rows.filter(r => r.toPurchase > 0).length > 0
                    ? rows.filter(r => r.toPurchase > 0).map(r => (
                        <p key={r.item.id} className="text-xs text-gray-700 py-0.5">
                          {r.item.name}: <span className="font-semibold text-blue-700">{r.toPurchase}</span> {r.item.unit}
                        </p>
                      ))
                    : <p className="text-xs text-gray-400 italic">Нет позиций — всё выдаётся</p>
                  }
                </div>
              </div>

              {/* Комментарий */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Комментарий к разделению
                </label>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Причина частичной выдачи, заметки для снабженца…"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                />
              </div>
            </>
          )}
        </div>

        {/* Футер */}
        <div className="p-5 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
          {hasErrors && (
            <p className="text-xs text-red-600 flex items-center gap-1 sm:flex-1">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              Исправьте ошибки перед отправкой
            </p>
          )}
          <button
            onClick={onClose}
            className="flex-1 sm:flex-none sm:w-32 px-4 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium text-sm"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || hasErrors || loadingStock}
            className="flex-1 px-4 py-2.5 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Scissors className="w-4 h-4" />
            }
            Разделить и выдать
          </button>
        </div>
      </div>
    </div>
  );
}
