import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, arrayUnion, collection, addDoc, writeBatch, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import type { SkladRequest, RequestStatus, RequestItem, TelegramEvent, RequestChain, StockItem } from '../types';
import {
  ChevronLeft, CheckCircle2, XCircle, Package,
  ShoppingCart, AlertTriangle, Clock, User, MapPin,
  Calendar, DollarSign, Hash, ChevronRight, History, Settings,
  Timer, GitBranch, UserCheck, AlertCircle, Flame,
  Circle, MessageSquare, Building2, Users, Paperclip, Banknote,
  Store, Trophy, Scissors, Truck, ThumbsUp, ArrowLeftRight,
} from 'lucide-react';
import {
  formatDate, formatDateShort, STATUS_LABELS, STATUS_COLORS,
  getNextStatuses, getStatusProgress, getChainSteps,
  REQUEST_TYPE_LABELS, REQUEST_TYPE_ICONS,
  URGENCY_LABELS, URGENCY_COLORS, URGENCY_BADGE,
  CHAIN_LABELS,
} from '../utils';
import { sendRequestNotification } from '../services/telegram';
import SplitRequestModal from '../components/SplitRequestModal';
import { usePermission } from '../hooks/usePermission';
import toast from 'react-hot-toast';

const STATUS_TO_TG_EVENT: Partial<Record<RequestStatus, TelegramEvent>> = {
  sklad_review: 'sklad_needed',
  nachalnik_review: 'nachalnik_needed',
  nachalnik_approved: 'nachalnik_approved',
  finansist_review: 'finansist_needed',
  finansist_approved: 'finansist_approved',
  snab_process: 'snab_needed',
  zakupleno: 'zakupleno',
  v_puti: 'v_puti',
  vydano: 'vydano',
  polucheno: 'polucheno',
  otkloneno: 'otkloneno',
};

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useAuth();
  const { canViewFinancial } = usePermission();
  const navigate = useNavigate();

  const [request, setRequest] = useState<SkladRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [issuedQty, setIssuedQty] = useState<Record<string, number>>({});
  const [showHistory, setShowHistory] = useState(false);
  const [adminStatus, setAdminStatus] = useState<RequestStatus | ''>('');
  const [adminChain, setAdminChain] = useState<RequestChain | ''>('');
  const [showSplitModal, setShowSplitModal] = useState(false);
  // (splitQty удалён — логика перенесена в SplitRequestModal)

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, 'requests', id), snap => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() } as SkladRequest;
        setRequest(data);
        const initial: Record<string, number> = {};
        data.items.forEach(it => { initial[it.id] = it.issuedQty ?? it.quantity; });
        setIssuedQty(initial);
      }
      setLoading(false);
    });
    return unsub;
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="text-center py-12 text-gray-400">
        <AlertTriangle className="w-10 h-10 mx-auto mb-2" />
        <p>Заявка не найдена</p>
      </div>
    );
  }

  const chain = request.chain ?? 'full';
  const nextStatuses = currentUser ? getNextStatuses(request.status, currentUser.role, chain) : [];
  const canAct = nextStatuses.length > 0 && currentUser?.role !== 'admin';
  const isAdmin = currentUser?.role === 'admin';
  const progress = getStatusProgress(request.status);
  const chainSteps = getChainSteps(chain);

  // ═══════════════════════════════════════════════════════════════════
  // АВТОМАТИЧЕСКОЕ СПИСАНИЕ СО СКЛАДА при выдаче
  // ═══════════════════════════════════════════════════════════════════
  const deductStockForIssue = async (issueMap: Record<string, number>) => {
    const snap = await getDocs(collection(db, 'stock'));
    const stockItems = snap.docs.map(d => ({ id: d.id, ...d.data() } as StockItem & { id: string }));
    const now = new Date().toISOString();
    const errors: string[] = [];
    const deductions: { stockId: string; newQty: number; itemName: string; qty: number; unit: string }[] = [];

    for (const item of request!.items) {
      const qty = issueMap[item.id] ?? 0;
      if (qty <= 0) continue;
      const stockItem = stockItems.find(
        s => s.name.trim().toLowerCase() === item.name.trim().toLowerCase()
      );
      if (!stockItem) continue; // не отслеживается — пропускаем
      const after = stockItem.quantity - qty;
      if (after < 0) {
        errors.push(`«${item.name}»: нужно ${qty} ${item.unit}, остаток ${stockItem.quantity} ${item.unit}`);
      } else {
        deductions.push({ stockId: stockItem.id, newQty: after, itemName: item.name, qty, unit: item.unit });
      }
    }

    if (errors.length > 0) {
      throw new Error(`Недостаточно на складе:\n${errors.join('\n')}`);
    }

    if (deductions.length === 0) return;

    const batch = writeBatch(db);
    for (const d of deductions) {
      batch.update(doc(db, 'stock', d.stockId), {
        quantity: d.newQty,
        updatedAt: now,
        updatedBy: currentUser!.uid,
        updatedByName: currentUser!.displayName,
      });
      const movRef = doc(collection(db, 'movements'));
      batch.set(movRef, {
        id: movRef.id,
        itemId: d.stockId,
        itemName: d.itemName,
        type: 'out',
        quantity: d.qty,
        reason: `Выдано по заявке #${request!.number} — ${request!.title}`,
        requestId: request!.id,
        requestNumber: request!.number,
        createdAt: now,
        createdBy: currentUser!.uid,
        createdByName: currentUser!.displayName,
      });
    }
    await batch.commit();
    toast.success(`Списано ${deductions.length} позиц. со склада ✓`);
  };

  // ═══════════════════════════════════════════════════════════════════
  // handleSplit удалён — логика перенесена в <SplitRequestModal />

  const updateStatus = async (newStatus: RequestStatus) => {
    if (!currentUser || !id) return;
    setActionLoading(true);
    try {
      const now = new Date().toISOString();
      const historyEntry = {
        at: now,
        by: currentUser.uid,
        byName: currentUser.displayName,
        action: `Статус изменён: ${STATUS_LABELS[request.status]} → ${STATUS_LABELS[newStatus]}`,
        fromStatus: request.status,
        toStatus: newStatus,
        comment: comment.trim() || null,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updates: Record<string, any> = {
        status: newStatus,
        updatedAt: now,
        slaEnteredAt: now,
        history: arrayUnion(historyEntry),
      };

      if (currentUser.role === 'sklad' &&
        (newStatus === 'vydano' || newStatus === 'sklad_partial' || newStatus === 'nachalnik_review')) {
        updates.items = request.items.map(it => ({
          ...it,
          issuedQty: issuedQty[it.id] ?? it.quantity
        }));
        updates.skladProcessedBy = currentUser.uid;
        updates.skladProcessedByName = currentUser.displayName;
        updates.commentSklad = comment.trim();
      }
      if (currentUser.role === 'nachalnik') {
        updates.nachalnikProcessedBy = currentUser.uid;
        updates.nachalnikProcessedByName = currentUser.displayName;
        updates.commentNachalnik = comment.trim();
      }
      if (currentUser.role === 'finansist') {
        updates.finansistProcessedBy = currentUser.uid;
        updates.finansistProcessedByName = currentUser.displayName;
        updates.commentFinansist = comment.trim();
      }
      if (currentUser.role === 'snab') {
        updates.snabProcessedBy = currentUser.uid;
        updates.snabProcessedByName = currentUser.displayName;
        updates.commentSnab = comment.trim();
        if (newStatus === 'zakupleno') {
          updates.items = request.items.map(it => ({
            ...it,
            purchasedQty: issuedQty[it.id] ?? it.quantity
          }));
        }
      }
      // Прораб подтверждает приёмку
      if (currentUser.role === 'prоrab' && newStatus === 'polucheno') {
        updates.prorabConfirmedAt = now;
        updates.prorabConfirmedBy = currentUser.uid;
        updates.prorabConfirmedByName = currentUser.displayName;
      }

      // Автоматическое списание со склада при выдаче (только склад, только vydano)
      if (currentUser.role === 'sklad' && newStatus === 'vydano') {
        await deductStockForIssue(issuedQty);
      }
      // Списание при сплите v_puti → vydano (склад принял доставку и выдал)
      if (currentUser.role === 'sklad' && newStatus === 'vydano' && request.status === 'v_puti') {
        // при этом переходе issuedQty уже проставлены ранее — списываем по ним
      }

      await updateDoc(doc(db, 'requests', id), updates);

      // Telegram
      const tgEvent = STATUS_TO_TG_EVENT[newStatus];
      if (tgEvent) {
        const updated = { ...request, status: newStatus };
        await sendRequestNotification(
          updated as SkladRequest,
          tgEvent,
          comment.trim() || undefined,
          currentUser.displayName
        );
      }

      toast.success(`Статус: ${STATUS_LABELS[newStatus]}`);
      setComment('');
      setAdminStatus('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ошибка при обновлении';
      toast.error(msg);
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const changeChain = async (newChain: RequestChain) => {
    if (!currentUser || !id) return;
    setActionLoading(true);
    try {
      const now = new Date().toISOString();
      const historyEntry = {
        at: now,
        by: currentUser.uid,
        byName: currentUser.displayName,
        action: `Цепочка изменена: ${CHAIN_LABELS[chain]} → ${CHAIN_LABELS[newChain]}`,
        comment: comment.trim() || null,
      };
      await updateDoc(doc(db, 'requests', id), {
        chain: newChain,
        updatedAt: now,
        history: arrayUnion(historyEntry),
      });
      toast.success(`Цепочка: ${CHAIN_LABELS[newChain]}`);
      setComment('');
      setAdminChain('');
    } catch (err) {
      toast.error('Ошибка при смене цепочки');
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const actionConfig: Partial<Record<RequestStatus, { label: string; className: string; icon: React.ElementType; openSplit?: boolean }>> = {
    vydano:       { label: 'Выдать полностью ✓',          className: 'flex items-center gap-2 px-4 py-2 bg-lime-600 text-white rounded-xl hover:bg-lime-700 transition-colors font-medium', icon: CheckCircle2 },
    sklad_partial: { label: 'Частичная выдача (разделить)', className: 'flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-medium', icon: Scissors, openSplit: true },
    nachalnik_review:   { label: 'Направить нач. участка',  className: 'flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium', icon: Clock },
    nachalnik_approved: { label: 'Одобрить ✓',                  className: 'flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium', icon: CheckCircle2 },
    finansist_review:   { label: 'Направить финансисту',     className: 'flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-xl hover:bg-pink-700 transition-colors font-medium', icon: Clock },
    finansist_approved: { label: 'Одобрить фин. ✓',            className: 'flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors font-medium', icon: CheckCircle2 },
    snab_process:       { label: 'Взять в работу',              className: 'flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium', icon: ShoppingCart },
    zakupleno:          { label: 'Закуплено ✓',                 className: 'flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors font-medium', icon: CheckCircle2 },
    v_puti:             { label: 'Отгрузить → В пути',           className: 'flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-xl hover:bg-sky-700 transition-colors font-medium', icon: Truck },
    polucheno:          { label: '✔ Подтвердить приёмку',       className: 'flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-semibold text-base shadow-md', icon: ThumbsUp },
    otkloneno:          { label: 'Отклонить',                    className: 'flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium', icon: XCircle },
  };

  const isCompleted = request.status === 'vydano' || request.status === 'polucheno' || request.status === 'otkloneno';

  // Все статусы для ручной смены (admin)
  const ALL_STATUSES: RequestStatus[] = [
    'novaya', 'sklad_review', 'sklad_partial', 'nachalnik_review',
    'nachalnik_approved', 'finansist_review', 'finansist_approved',
    'snab_process', 'zakupleno', 'v_puti', 'vydano', 'polucheno', 'otkloneno',
  ];

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-5">

      {/* ══ SPLIT MODAL (компонент SplitRequestModal) ═══════════════════ */}
      {showSplitModal && request && (
        <SplitRequestModal
          request={request}
          onClose={() => setShowSplitModal(false)}
          onDone={() => setShowSplitModal(false)}
        />
      )}

      {/* ══ БАННЕР: Ожидает подтверждения прораба ══════════════════════ */}
      {request.status === 'vydano' && (
        <div className="bg-emerald-50 border-2 border-emerald-400 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
            <ThumbsUp className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-emerald-800">Ожидает подтверждения прораба</p>
            <p className="text-sm text-emerald-600">Материалы выданы. Прораб <strong>{request.createdByName}</strong> должен подтвердить фактическое получение.</p>
          </div>
          {request.prorabConfirmedAt && (
            <span className="text-xs text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full">
              Подтверждено {new Date(request.prorabConfirmedAt).toLocaleDateString('ru-RU')}
            </span>
          )}
        </div>
      )}

      {/* ══ БАННЕР: Дочерняя заявка (сплит) ════════════════════════════ */}
      {(request.parentId || (request.childIds && request.childIds.length > 0)) && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center gap-3">
          <ArrowLeftRight className="w-5 h-5 text-orange-500 shrink-0" />
          <div className="flex-1 text-sm">
            {request.isSplit && request.parentId && (
              <p className="text-orange-800">
                <strong>Дочерняя заявка (закупка)</strong> — создана при разделении родительской.{' '}
                <Link to={`/requests/${request.parentId}`} className="underline text-orange-700">Открыть родительскую →</Link>
              </p>
            )}
            {request.childIds && request.childIds.length > 0 && (
              <p className="text-orange-800">
                <strong>К этой заявке привязана закупочная карточка.</strong>{' '}
                {request.childIds.map((cid, i) => (
                  <Link key={cid} to={`/requests/${cid}`} className="underline text-orange-700">Дочерняя заявка {i + 1} →</Link>
                ))}
              </p>
            )}
            {request.splitNote && <p className="text-orange-600 mt-0.5">{request.splitNote}</p>}
          </div>
        </div>
      )}
      {/* Заголовок */}
      <div className="flex items-start gap-3">
        <button onClick={() => navigate(-1)}
          className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors mt-0.5">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-gray-400 font-mono text-sm">#{request.number}</span>
            {request.requestType && (
              <span className="text-sm">{REQUEST_TYPE_ICONS[request.requestType]}</span>
            )}
            {request.urgencyLevel && request.urgencyLevel !== 'normal' && request.urgencyLevel !== 'low' && (
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${URGENCY_COLORS[request.urgencyLevel]}`}>
                {URGENCY_BADGE[request.urgencyLevel]}
              </span>
            )}
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[request.status]}`}>
              {STATUS_LABELS[request.status]}
            </span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">{request.title}</h1>
          <p className="text-gray-500 text-sm mt-0.5 flex items-center gap-1.5 flex-wrap">
            <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span>{request.objectName}</span>
            <span className="text-gray-300">·</span>
            <GitBranch className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span>{CHAIN_LABELS[chain]}</span>
          </p>
        </div>
      </div>

      {/* Цепочка согласования */}
      <ChainTimeline request={request} />

      {/* Информация */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
          <h3 className="font-semibold text-gray-700">Информация о заявке</h3>
          <InfoRow icon={User} label="Прораб" value={request.createdByName} />
          <InfoRow icon={Hash} label="Тип" value={`${REQUEST_TYPE_ICONS[request.requestType ?? 'other']} ${REQUEST_TYPE_LABELS[request.requestType ?? 'other']}`} />
          {request.urgencyLevel && (
            <InfoRow icon={AlertTriangle} label="Срочность" value={URGENCY_LABELS[request.urgencyLevel]} />
          )}
          <InfoRow icon={Clock} label="Создана" value={formatDate(request.createdAt)} />
          <InfoRow icon={Clock} label="Обновлена" value={formatDate(request.updatedAt)} />
          {request.plannedDate && (
            <InfoRow icon={Calendar} label="К дате" value={formatDateShort(request.plannedDate)} />
          )}
          {request.deliveryAddress && (
            <InfoRow icon={MapPin} label="Адрес" value={request.deliveryAddress} />
          )}
          {canViewFinancial && request.estimatedCost && (
            <InfoRow icon={DollarSign} label="Смета" value={`${request.estimatedCost.toLocaleString('ru-RU')} сум`} />
          )}
          {request.zone && (
            <InfoRow icon={MapPin} label="Зона" value={request.zone} />
          )}
          {request.responsibleName && (
            <InfoRow icon={UserCheck} label="Получатель" value={request.responsibleName} />
          )}
          {canViewFinancial && request.budgetCode && (
            <InfoRow icon={Banknote} label="Код бюджета" value={request.budgetCode} />
          )}
          {request.preferredSupplier && (
            <InfoRow icon={Store} label="Поставщик" value={request.preferredSupplier} />
          )}
          {request.attachments && request.attachments.length > 0 && (
            <InfoRow icon={Paperclip} label="Вложений" value={`${request.attachments.length} файл(ов)`} />
          )}
          {request.subcontractors && request.subcontractors.length > 0 && (
            <div className="flex items-start gap-3 py-1.5">
              <Users className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1.5">Субподрядчики</p>
                <div className="flex flex-wrap gap-1.5">
                  {request.subcontractors.map(s => (
                    <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-[#edd5c8] text-[#59301f] font-medium">{s}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Комментарии */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-2">
          <h3 className="font-semibold text-gray-700">Комментарии</h3>
          {request.commentProrab && <CommentRow role="Прораб" text={request.commentProrab} />}
          {request.commentSklad && <CommentRow role="Склад" text={request.commentSklad} name={request.skladProcessedByName} />}
          {request.commentNachalnik && <CommentRow role="Нач. участка" text={request.commentNachalnik} name={request.nachalnikProcessedByName} />}
          {request.commentFinansist && <CommentRow role="Финансист" text={request.commentFinansist} name={request.finansistProcessedByName} />}
          {request.commentSnab && <CommentRow role="Снабжение" text={request.commentSnab} name={request.snabProcessedByName} />}
          {!request.commentProrab && !request.commentSklad && !request.commentNachalnik && !request.commentFinansist && !request.commentSnab && (
            <p className="text-gray-400 text-sm">Комментариев нет</p>
          )}
        </div>
      </div>

      {/* Позиции */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-700 mb-3">Позиции ({request.items.length})</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 text-xs">
                <th className="text-left py-2 font-medium">Наименование</th>
                <th className="text-right py-2 font-medium w-24">Запрошено</th>
                {canAct && currentUser?.role === 'sklad' && (
                  <th className="text-right py-2 font-medium w-28">Выдать</th>
                )}
                {canAct && currentUser?.role === 'snab' && nextStatuses.includes('zakupleno') && (
                  <th className="text-right py-2 font-medium w-28">Закупить</th>
                )}
                {request.items.some(it => it.issuedQty !== undefined) && (
                  <th className="text-right py-2 font-medium w-24 text-green-600">Выдано</th>
                )}
                {request.items.some(it => it.purchasedQty !== undefined) && (
                  <th className="text-right py-2 font-medium w-24 text-teal-600">Закуплено</th>
                )}
                {canViewFinancial && request.items.some(it => (it.estimatedPrice ?? 0) > 0) && (
                  <th className="text-right py-2 font-medium w-28 text-gray-400">Цена/ед.</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {request.items.map((item: RequestItem) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="py-2.5">
                    <div>
                      <p className="font-medium text-gray-800">{item.name}</p>
                      {item.category && <p className="text-xs text-gray-400">{item.category}</p>}
                    </div>
                  </td>
                  <td className="py-2.5 text-right text-gray-600 tabular-nums">
                    {item.quantity} {item.unit}
                  </td>
                  {canAct && currentUser?.role === 'sklad' && (
                    <td className="py-2.5 text-right">
                      <input type="number" min="0" max={item.quantity} step="0.01"
                        value={issuedQty[item.id] ?? item.quantity}
                        onChange={e => setIssuedQty(prev => ({ ...prev, [item.id]: parseFloat(e.target.value) || 0 }))}
                        className="w-24 px-2 py-1 border border-gray-300 rounded-lg text-right text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </td>
                  )}
                  {canAct && currentUser?.role === 'snab' && nextStatuses.includes('zakupleno') && (
                    <td className="py-2.5 text-right">
                      <input type="number" min="0" step="0.01"
                        value={issuedQty[item.id] ?? item.quantity}
                        onChange={e => setIssuedQty(prev => ({ ...prev, [item.id]: parseFloat(e.target.value) || 0 }))}
                        className="w-24 px-2 py-1 border border-gray-300 rounded-lg text-right text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </td>
                  )}
                  {request.items.some(it => it.issuedQty !== undefined) && (
                    <td className="py-2.5 text-right tabular-nums text-green-600 font-medium">
                      {item.issuedQty !== undefined ? `${item.issuedQty} ${item.unit}` : '—'}
                    </td>
                  )}
                  {request.items.some(it => it.purchasedQty !== undefined) && (
                    <td className="py-2.5 text-right tabular-nums text-teal-600 font-medium">
                      {item.purchasedQty !== undefined ? `${item.purchasedQty} ${item.unit}` : '—'}
                    </td>
                  )}
                  {canViewFinancial && request.items.some(it => (it.estimatedPrice ?? 0) > 0) && (
                    <td className="py-2.5 text-right tabular-nums text-gray-400 text-xs">
                      {item.estimatedPrice ? `${item.estimatedPrice.toLocaleString('ru-RU')}` : '—'}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            {canViewFinancial && request.estimatedCost && (
              <tfoot>
                <tr className="border-t-2 border-gray-200">
                  <td colSpan={2} className="py-2 text-right text-sm font-semibold text-gray-700">
                    Ориент. итого:
                  </td>
                  <td className="py-2 text-right text-sm font-bold text-gray-900 tabular-nums">
                    {request.estimatedCost.toLocaleString('ru-RU')} сум
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Ручное управление для admin */}
      {isAdmin && (
        <div className="bg-gray-50 border-2 border-gray-300 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Settings className="w-4 h-4 text-gray-500" />
            <h3 className="font-semibold text-gray-700">Ручное управление (админ)</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">Новый статус</label>
              <select
                value={adminStatus}
                onChange={e => setAdminStatus(e.target.value as RequestStatus | '')}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white"
              >
                <option value="">— выберите статус —</option>
                {ALL_STATUSES.filter(s => s !== request.status).map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">Комментарий</label>
              <input
                type="text"
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Причина изменения..."
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => { if (adminStatus) updateStatus(adminStatus as RequestStatus); }}
                disabled={!adminStatus || actionLoading}
                className="px-5 py-2 bg-gray-700 text-white rounded-xl hover:bg-gray-800 transition-colors font-medium text-sm disabled:opacity-40"
              >
                Установить
              </button>
            </div>
          </div>

          {/* Смена цепочки */}
          <div className="flex flex-wrap gap-3 pt-3 border-t border-gray-200 mt-1">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">Сменить цепочку согласования</label>
              <select
                value={adminChain}
                onChange={e => setAdminChain(e.target.value as RequestChain | '')}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white"
              >
                <option value="">— текущая: {CHAIN_LABELS[chain]} —</option>
                {(['full', 'warehouse_only', 'purchase_only', 'full_finance', 'finance_only'] as RequestChain[]).filter(c => c !== chain).map(c => (
                  <option key={c} value={c}>{CHAIN_LABELS[c]}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => { if (adminChain) changeChain(adminChain as RequestChain); }}
                disabled={!adminChain || actionLoading}
                className="px-5 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium text-sm disabled:opacity-40"
              >
                Сменить цепочку
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Панель действий */}
      {canAct && !isCompleted && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5">
          <h3 className="font-semibold text-blue-800 mb-3">Ваши действия</h3>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Комментарий (необязательно)
            </label>
            <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Добавьте комментарий..." />
          </div>
          <div className="flex flex-wrap gap-2">
            {nextStatuses.map(status => {
              const cfg = actionConfig[status];
              if (!cfg) return null;
              const Icon = cfg.icon;
              return (
                <button key={status}
                  onClick={() => {
                    if (cfg.openSplit) {
                      setShowSplitModal(true);
                    } else {
                      updateStatus(status);
                    }
                  }}
                  disabled={actionLoading}
                  className={`${cfg.className} disabled:opacity-50`}>
                  {actionLoading
                    ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Icon className="w-4 h-4" />
                  }
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* История */}
      {request.history && request.history.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center justify-between w-full"
          >
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-gray-500" />
              <h3 className="font-semibold text-gray-700">История ({request.history.length})</h3>
            </div>
            <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${showHistory ? 'rotate-90' : ''}`} />
          </button>
          {showHistory && (
            <div className="mt-4 space-y-3">
              {[...request.history].reverse().map((entry, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs text-gray-500">
                    {idx === 0 ? '●' : '○'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-gray-800">{entry.action}</p>
                      <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(entry.at)}</span>
                    </div>
                    <p className="text-xs text-gray-500">{entry.byName}</p>
                    {entry.comment && (
                      <p className="text-xs text-gray-600 mt-1 bg-gray-50 rounded-lg px-2 py-1">{entry.comment}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
      <span className="text-sm text-gray-500 shrink-0">{label}:</span>
      <span className="text-sm text-gray-800 font-medium">{value}</span>
    </div>
  );
}

function CommentRow({ role, text, name }: { role: string; text: string; name?: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <p className="text-xs font-semibold text-blue-700">{role}{name ? ` — ${name}` : ''}</p>
      <p className="text-sm text-gray-700 mt-1">{text}</p>
    </div>
  );
}


// ============================================================
// ВИЗУАЛИЗАЦИЯ ЦЕПОЧКИ СОГЛАСОВАНИЯ
// ============================================================
function ChainTimeline({ request }: { request: SkladRequest }) {
  const chain = request.chain ?? 'full';
  const chainSteps = getChainSteps(chain);
  const history = request.history ?? [];
  const now = new Date();
  const isRejected = request.status === 'otkloneno';
  const isDone = request.status === 'polucheno';
  const progress = getStatusProgress(request.status);
  const { canViewFinancial } = usePermission();

  // SLA норма на каждый этап (часы)
  const SLA_HOURS: Partial<Record<RequestStatus, number>> = {
    sklad_review:      8,
    nachalnik_review: 24,
    finansist_review: 48,
    snab_process:     72,
    zakupleno:        24,
    v_puti:           48,
  };

  const STATUS_ORDER: RequestStatus[] = [
    'novaya','sklad_review','sklad_partial','nachalnik_review','nachalnik_approved',
    'finansist_review','finansist_approved','snab_process','zakupleno','v_puti','vydano','polucheno',
  ];

  const currentIdx = STATUS_ORDER.indexOf(request.status);
  const rejectEntry = isRejected
    ? [...history].reverse().find(e => e.toStatus === 'otkloneno')
    : null;
  const rejectedFromStatus = rejectEntry?.fromStatus;
  const rejectedFromIdx = rejectedFromStatus ? STATUS_ORDER.indexOf(rejectedFromStatus) : -1;

  const formatDur = (hours: number): string => {
    if (hours < 1) return `${Math.round(hours * 60)} мин`;
    if (hours < 24) return `${Math.round(hours)} ч`;
    const d = Math.floor(hours / 24);
    const h = Math.round(hours % 24);
    return h > 0 ? `${d} дн ${h} ч` : `${d} дн`;
  };

  type StepState = 'done' | 'active' | 'pending' | 'rejected' | 'skipped';

  interface EnrichedStep {
    label: string;
    status: RequestStatus;
    state: StepState;
    enteredAt?: string;
    completedAt?: string;
    durationHours?: number;
    isOverdue: boolean;
    overdueHours: number;
    processedByName?: string;
    comment?: string;
    stepIndex: number;
  }

  const enriched: EnrichedStep[] = chainSteps.map((step, idx) => {
    const stepIdx = STATUS_ORDER.indexOf(step.status);
    let state: StepState = 'pending';

    if (isRejected) {
      if (rejectedFromIdx >= 0 && stepIdx < rejectedFromIdx) state = 'done';
      else if (step.status === rejectedFromStatus) state = 'rejected';
      else state = 'skipped';
    } else if (isDone) {
      state = 'done';
    } else if (currentIdx > stepIdx) {
      state = 'done';
    } else if (currentIdx === stepIdx) {
      state = 'active';
    }

    const enteredEntry = step.status === 'novaya'
      ? null
      : history.find(e => e.toStatus === step.status);
    const exitEntry = history.find(e => e.fromStatus === step.status);
    const enteredAt = step.status === 'novaya' ? request.createdAt : enteredEntry?.at;
    const completedAt = exitEntry?.at;

    let durationHours: number | undefined;
    let isOverdue = false;
    let overdueHours = 0;

    if (enteredAt) {
      const start = new Date(enteredAt);
      const end = completedAt ? new Date(completedAt) : (state === 'active' ? now : null);
      if (end) {
        durationHours = (end.getTime() - start.getTime()) / 3_600_000;
        const sla = SLA_HOURS[step.status];
        if (state === 'active' && sla && durationHours > sla) {
          isOverdue = true;
          overdueHours = durationHours - sla;
        }
      }
    }

    let processedByName: string | undefined;
    let comment: string | undefined;
    switch (step.status) {
      case 'novaya':
        processedByName = request.createdByName;
        comment = request.commentProrab;
        break;
      case 'sklad_review': case 'sklad_partial':
        processedByName = request.skladProcessedByName;
        comment = request.commentSklad;
        break;
      case 'nachalnik_review': case 'nachalnik_approved':
        processedByName = request.nachalnikProcessedByName;
        comment = request.commentNachalnik;
        break;
      case 'finansist_review': case 'finansist_approved':
        processedByName = request.finansistProcessedByName;
        comment = request.commentFinansist;
        break;
      case 'snab_process': case 'zakupleno':
        processedByName = request.snabProcessedByName;
        comment = request.commentSnab;
        break;
    }

    return { ...step, state, enteredAt, completedAt, durationHours, isOverdue, overdueHours, processedByName, comment, stepIndex: idx };
  });

  const totalHours = (now.getTime() - new Date(request.createdAt).getTime()) / 3_600_000;
  const plannedOverdueDays = request.plannedDate && !isDone && !isRejected
    ? Math.max(0, Math.floor((now.getTime() - new Date(request.plannedDate).getTime()) / 86_400_000))
    : 0;

  const activeStep = enriched.find(s => s.state === 'active');
  const doneCount = enriched.filter(s => s.state === 'done').length;

  // Цвета по состоянию — «нирвана»-бренд для активного
  const headerBg = isRejected ? 'bg-red-50' : isDone ? 'bg-green-50' : 'bg-[#f7ede7]';
  const headerBorder = isRejected ? 'border-red-100' : isDone ? 'border-green-100' : 'border-[#edd5c8]';
  const iconColor = isRejected ? 'text-red-500' : isDone ? 'text-green-600' : 'text-[#c89587]';
  const progressBarColor = isRejected ? 'bg-red-500' : isDone ? 'bg-green-500' : 'bg-[#c89587]';
  const bigNumColor = isRejected ? 'text-red-500' : isDone ? 'text-green-600' : 'text-[#a67161]';

  // Есть ли дополнительные поля
  const hasExtra = !!(
    request.zone ||
    (request.subcontractors && request.subcontractors.length > 0) ||
    request.responsibleName ||
    request.budgetCode ||
    request.preferredSupplier ||
    (request.attachments && request.attachments.length > 0)
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">

      {/* Шапка */}
      <div className={`px-5 py-4 border-b ${headerBorder} ${headerBg}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <GitBranch className={`w-4 h-4 ${iconColor}`} />
              <h3 className="font-semibold text-gray-800">Цепочка согласования</h3>
              <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-200">
                {CHAIN_LABELS[chain]}
              </span>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-gray-600">
                <Timer className="w-3.5 h-3.5 text-gray-400" />
                В работе: <strong>{formatDur(totalHours)}</strong>
              </span>
              <span className="flex items-center gap-1.5 text-gray-500">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                Пройдено этапов: <strong>{doneCount} из {enriched.length}</strong>
              </span>
              {request.plannedDate && (
                <span className={`flex items-center gap-1.5 ${
                  plannedOverdueDays > 0 ? 'text-red-600 font-semibold' : 'text-gray-500'
                }`}>
                  <Calendar className="w-3.5 h-3.5" />
                  Дедлайн: {new Date(request.plannedDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                  {plannedOverdueDays > 0 && (
                    <span className="ml-1 bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">
                      +{plannedOverdueDays} дн просрочка
                    </span>
                  )}
                </span>
              )}
              {activeStep?.isOverdue && (
                <span className="flex items-center gap-1.5 text-red-600 font-semibold animate-pulse">
                  <Flame className="w-3.5 h-3.5" />
                  Застряло: {activeStep.label}
                </span>
              )}
            </div>
          </div>

          {/* Индикатор прогресса */}
          <div className="shrink-0 flex flex-col items-center">
            {isRejected ? (
              <div className="w-12 h-12 rounded-full bg-red-100 border-2 border-red-300 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-500" />
              </div>
            ) : isDone ? (
              <div className="w-12 h-12 rounded-full bg-green-100 border-2 border-green-300 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-green-600" />
              </div>
            ) : (
              <div className="relative w-12 h-12">
                <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#edd5c8" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#c89587" strokeWidth="3"
                    strokeDasharray={`${progress} ${100 - progress}`} strokeLinecap="round" />
                </svg>
                <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${bigNumColor}`}>
                  {progress}%
                </span>
              </div>
            )}
            <div className="text-xs text-gray-400 mt-1 text-center">
              {isRejected ? 'Отклонено' : isDone ? 'Выполнено' : 'прогресс'}
            </div>
          </div>
        </div>

        {/* Прогресс-бар */}
        <div className="mt-3 bg-white/70 rounded-full h-1.5">
          <div className={`h-1.5 rounded-full transition-all duration-700 ${progressBarColor}`}
            style={{ width: `${isRejected ? 100 : progress}%` }} />
        </div>
      </div>

      {/* Дополнительные поля заявки */}
      {hasExtra && (
        <div className="px-5 py-3 bg-gray-50/60 border-b border-gray-100 flex flex-wrap gap-x-5 gap-y-2">
          {request.zone && (
            <span className="flex items-center gap-1.5 text-sm text-gray-600">
              <MapPin className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-gray-400 text-xs">Зона:</span>
              <strong className="text-gray-700">{request.zone}</strong>
            </span>
          )}
          {request.responsibleName && (
            <span className="flex items-center gap-1.5 text-sm text-gray-600">
              <UserCheck className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-gray-400 text-xs">Получатель:</span>
              <strong className="text-gray-700">{request.responsibleName}</strong>
            </span>
          )}
          {canViewFinancial && request.budgetCode && (
            <span className="flex items-center gap-1.5 text-sm text-gray-600">
              <Banknote className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-gray-400 text-xs">Бюджет:</span>
              <strong className="text-gray-700">{request.budgetCode}</strong>
            </span>
          )}
          {request.preferredSupplier && (
            <span className="flex items-center gap-1.5 text-sm text-gray-600">
              <Store className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-gray-400 text-xs">Поставщик:</span>
              <strong className="text-gray-700">{request.preferredSupplier}</strong>
            </span>
          )}
          {request.attachments && request.attachments.length > 0 && (
            <span className="flex items-center gap-1.5 text-sm text-gray-600">
              <Paperclip className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-gray-400 text-xs">Файлов:</span>
              <strong className="text-gray-700">{request.attachments.length}</strong>
            </span>
          )}
          {request.subcontractors && request.subcontractors.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap w-full pt-0.5">
              <Users className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="text-xs text-gray-400">Субподрядчики:</span>
              {request.subcontractors.map(s => (
                <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-[#edd5c8] text-[#59301f] font-medium">
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Таймлайн */}
      <div className="p-5 space-y-0">
        {enriched.map((step, idx) => {
          const isLast = idx === enriched.length - 1;
          const { state, durationHours, isOverdue, overdueHours, processedByName, comment, enteredAt } = step;
          const slaHours = SLA_HOURS[step.status];

          // Стили узла
          let nodeClass = 'bg-gray-100 border-gray-300 text-gray-400';
          let lineClass = 'bg-gray-200';
          let cardClass = 'border border-gray-100 bg-white';
          let nodeIcon: React.ReactNode = <span className="text-xs font-bold text-gray-400">{idx + 1}</span>;

          if (state === 'done') {
            nodeClass = 'bg-green-500 border-green-500 text-white';
            lineClass = 'bg-green-200';
            cardClass = 'border border-green-100 bg-green-50/40';
            nodeIcon = <CheckCircle2 className="w-4 h-4" />;
          } else if (state === 'active' && !isOverdue) {
            nodeClass = 'bg-[#c89587] border-[#a67161] text-white ring-4 ring-[#edd5c8] animate-pulse';
            lineClass = 'bg-gray-200';
            cardClass = 'border-2 border-[#edd5c8] bg-[#f7ede7]';
            nodeIcon = <Clock className="w-4 h-4" />;
          } else if (state === 'active' && isOverdue) {
            nodeClass = 'bg-red-500 border-red-400 text-white ring-4 ring-red-100 animate-pulse';
            lineClass = 'bg-gray-200';
            cardClass = 'border-2 border-red-300 bg-red-50';
            nodeIcon = <Flame className="w-4 h-4" />;
          } else if (state === 'rejected') {
            nodeClass = 'bg-red-500 border-red-500 text-white';
            lineClass = 'bg-red-200';
            cardClass = 'border border-red-200 bg-red-50';
            nodeIcon = <XCircle className="w-4 h-4" />;
          } else if (state === 'skipped') {
            nodeClass = 'bg-gray-100 border-gray-200 text-gray-300';
            lineClass = 'bg-gray-100';
            cardClass = 'border border-gray-100 bg-gray-50 opacity-50';
          }

          // SLA прогресс
          const slaPercent = slaHours && durationHours !== undefined
            ? Math.min(100, Math.round((durationHours / slaHours) * 100))
            : null;
          const slaColor = slaPercent !== null
            ? slaPercent <= 80 ? 'bg-green-400'
            : slaPercent <= 100 ? 'bg-amber-400'
            : 'bg-red-400'
            : 'bg-gray-300';

          return (
            <div key={step.status} className="flex gap-3">
              {/* Левая колонка */}
              <div className="flex flex-col items-center w-9 shrink-0">
                <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center shrink-0 ${nodeClass}`}>
                  {nodeIcon}
                </div>
                {!isLast && (
                  <div className={`w-0.5 flex-1 min-h-[20px] my-1 transition-colors ${lineClass}`} />
                )}
              </div>

              {/* Карточка этапа */}
              <div className={`flex-1 mb-3 rounded-xl p-3.5 ${cardClass}`}>

                {/* Заголовок этапа */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center flex-wrap gap-2">
                    <span className={`font-semibold text-sm ${
                      state === 'pending' || state === 'skipped' ? 'text-gray-400' : 'text-gray-800'
                    }`}>
                      {step.label.toUpperCase()}
                    </span>
                    {state === 'done' && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                        <CheckCircle2 className="w-3 h-3" /> Выполнено
                      </span>
                    )}
                    {state === 'active' && !isOverdue && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[#edd5c8] text-[#59301f] font-medium animate-pulse">
                        <Circle className="w-2.5 h-2.5 fill-[#c89587] text-[#c89587]" /> В работе
                      </span>
                    )}
                    {state === 'active' && isOverdue && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-200 text-red-700 font-bold animate-pulse">
                        <AlertCircle className="w-3 h-3" /> Просрочено
                      </span>
                    )}
                    {state === 'rejected' && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                        <XCircle className="w-3 h-3" /> Отклонено здесь
                      </span>
                    )}
                    {state === 'pending' && (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                        <Circle className="w-2.5 h-2.5 text-gray-300" /> Ожидает
                      </span>
                    )}
                    {state === 'skipped' && (
                      <span className="text-xs text-gray-300">— Пропущен</span>
                    )}
                  </div>

                  {/* Время на этапе */}
                  {(state === 'done' || state === 'active' || state === 'rejected') && enteredAt && (
                    <div className="text-right shrink-0">
                      <div className="text-xs text-gray-400">
                        {new Date(enteredAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                        {' '}
                        {new Date(enteredAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      {durationHours !== undefined && (
                        <div className={`flex items-center justify-end gap-1 text-xs font-semibold ${
                          state === 'active' && isOverdue ? 'text-red-600' :
                          state === 'active' ? 'text-[#a67161]' : 'text-gray-500'
                        }`}>
                          <Clock className="w-3 h-3" />
                          {formatDur(durationHours)}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Ответственный */}
                {processedByName && (state === 'done' || state === 'active' || state === 'rejected') && (
                  <div className="flex items-center gap-1.5 mt-2 text-sm text-gray-600">
                    <UserCheck className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>{processedByName}</span>
                  </div>
                )}
                {state === 'active' && !processedByName && (
                  <div className="flex items-center gap-1.5 mt-2 text-sm text-gray-400">
                    <UserCheck className="w-3.5 h-3.5 shrink-0" />
                    <span className="italic">Ожидается ответственного…</span>
                  </div>
                )}

                {/* SLA прогресс-бар */}
                {slaHours !== undefined && durationHours !== undefined && (state === 'done' || state === 'active' || state === 'rejected') && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Timer className="w-3 h-3" />
                        SLA {slaHours} ч
                      </span>
                      {state === 'active' && !isOverdue && (
                        <span className="text-[#a67161]">Осталось: {formatDur(slaHours - durationHours)}</span>
                      )}
                      {state === 'active' && isOverdue && (
                        <span className="text-red-600 font-semibold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> +{formatDur(overdueHours)} сверх SLA
                        </span>
                      )}
                      {state === 'done' && slaPercent !== null && (
                        <span className={slaPercent > 100 ? 'text-red-500 font-semibold' : 'text-gray-400'}>
                          {slaPercent}% от SLA
                        </span>
                      )}
                      {state === 'rejected' && slaPercent !== null && (
                        <span className="text-red-500">{slaPercent}% от SLA</span>
                      )}
                    </div>
                    <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${slaColor}`}
                        style={{ width: `${Math.min(slaPercent ?? 0, 100)}%` }} />
                    </div>
                  </div>
                )}

                {/* Комментарий */}
                {comment && (
                  <div className="flex items-start gap-1.5 mt-2 bg-white/70 rounded-lg px-2.5 py-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-600 italic">«{comment}»</p>
                  </div>
                )}

                {state === 'pending' && (
                  <p className="text-xs text-gray-400 mt-1 italic">Этот этап ещё не начался</p>
                )}
              </div>
            </div>
          );
        })}

        {/* Финальный узел: ОТКЛОНЕНО */}
        {isRejected && rejectEntry && (
          <div className="flex gap-3">
            <div className="w-9 shrink-0 flex items-center justify-center">
              <div className="w-9 h-9 rounded-full bg-red-600 border-2 border-red-600 text-white flex items-center justify-center">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="flex-1 rounded-xl border-2 border-red-300 bg-red-100 p-3.5">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="flex items-center gap-2 font-black text-sm text-red-800 uppercase tracking-wide">
                  <XCircle className="w-4 h-4" /> Заявка отклонена
                </span>
                <span className="text-xs text-red-500">
                  {new Date(rejectEntry.at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                  {' '}{new Date(rejectEntry.at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {rejectEntry.byName && (
                <div className="flex items-center gap-1.5 text-sm text-red-700 mb-1.5">
                  <UserCheck className="w-3.5 h-3.5 shrink-0" />
                  {rejectEntry.byName}
                </div>
              )}
              {rejectEntry.comment && (
                <div className="flex items-start gap-1.5 mt-1">
                  <MessageSquare className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800 font-medium italic">«{rejectEntry.comment}»</p>
                </div>
              )}
              <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                <Timer className="w-3 h-3" /> Общее время обработки: {formatDur(totalHours)}
              </p>
            </div>
          </div>
        )}

        {/* Финальный узел: ВЫПОЛНЕНО */}
        {isDone && (
          <div className="flex gap-3">
            <div className="w-9 shrink-0 flex items-center justify-center">
              <div className="w-9 h-9 rounded-full bg-green-600 border-2 border-green-600 text-white flex items-center justify-center">
                <Trophy className="w-4 h-4" />
              </div>
            </div>
            <div className="flex-1 rounded-xl border-2 border-green-300 bg-green-100 p-3.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-black text-sm text-green-800 uppercase tracking-wide">
                  <CheckCircle2 className="w-4 h-4" /> Заявка выполнена
                </span>
                <span className="flex items-center gap-1 text-sm text-green-600 font-semibold">
                  <Timer className="w-3.5 h-3.5" /> {formatDur(totalHours)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
