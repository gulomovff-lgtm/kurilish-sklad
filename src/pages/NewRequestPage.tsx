import { useState, useEffect, useRef, FormEvent, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection, addDoc, getDocs, query, orderBy, limit, onSnapshot,
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import type { RequestItem, RequestType, RequestChain, UrgencyLevel, ConstructionObject, AppUser } from '../types';
import {
  Plus, Trash2, ChevronLeft, Info, AlertTriangle, Zap, Package, Wrench,
  Truck, HardHat, MoreHorizontal, Search, ArrowDown, ArrowRight, ArrowUp,
  Lock, Unlock, Save, BookOpen, MapPin, User, Eye, Paperclip, X, Check,
  UserCheck, Users, Tag, Building2,
} from 'lucide-react';
import {
  UNITS, CATEGORIES, REQUEST_TYPE_LABELS, DEFAULT_CHAIN,
  CHAIN_LABELS, CHAIN_DESCRIPTIONS, URGENCY_LABELS, MATERIALS_CATALOG, MATERIAL_TAGS,
} from '../utils';
import { sendRequestNotification } from '../services/telegram';
import toast from 'react-hot-toast';

// ─── Icons map ────────────────────────────────────────────────────────────────
const TYPE_ICONS: Record<RequestType, React.ComponentType<{ className?: string }>> = {
  materials: Package, tools: Wrench, equipment: Truck, services: HardHat, other: MoreHorizontal,
};

const URGENCY_OPTIONS: { value: UrgencyLevel; Icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { value: 'low',      Icon: ArrowDown,  color: 'text-gray-400' },
  { value: 'normal',   Icon: ArrowRight, color: 'text-blue-500' },
  { value: 'high',     Icon: ArrowUp,    color: 'text-orange-500' },
  { value: 'critical', Icon: Zap,        color: 'text-red-500' },
];

// ─── Draft autosave ───────────────────────────────────────────────────────────
const DRAFT_KEY = 'nirvana_request_draft';
const TEMPLATES_KEY = 'nirvana_request_templates';

interface DraftState {
  title: string; objectId: string; objectName: string; requestType: RequestType;
  chain: RequestChain; urgencyLevel: UrgencyLevel; plannedDate: string;
  deliveryAddress: string; zone: string; comment: string;
  budgetCode: string; preferredSupplier: string;
  subcontractors: string[]; responsibleUid: string;
  tags: string[];
  items: Omit<RequestItem, 'id'>[];
}

interface SavedTemplate { name: string; draft: DraftState; }

export default function NewRequestPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Core fields
  const [title, setTitle] = useState('');
  const [objectName, setObjectName] = useState('');
  const [objectId, setObjectId] = useState('');
  const [requestType, setRequestType] = useState<RequestType>('materials');
  const [chain, setChain] = useState<RequestChain>('full');
  const [urgencyLevel, setUrgencyLevel] = useState<UrgencyLevel>('normal');
  const [plannedDate, setPlannedDate] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [chainOverride, setChainOverride] = useState(false);

  // New fields
  const [zone, setZone] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [budgetCode, setBudgetCode] = useState('');
  const [preferredSupplier, setPreferredSupplier] = useState('');
  const [subcontractors, setSubcontractors] = useState<string[]>([]);
  const [subInput, setSubInput] = useState('');
  const [responsibleUid, setResponsibleUid] = useState('');

  // Files
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Autocomplete
  const [suggestions, setSuggestions] = useState<{ index: number; items: typeof MATERIALS_CATALOG }>({ index: -1, items: [] });

  // Data
  const [objects, setObjects] = useState<ConstructionObject[]>([]);
  const [objectBlocks, setObjectBlocks] = useState<{ id: string; name: string }[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [items, setItems] = useState<Omit<RequestItem, 'id'>[]>([
    { name: '', unit: 'шт', quantity: 1, category: '' },
  ]);

  // Duplicate warning
  const [duplicateWarning, setDuplicateWarning] = useState('');

  // Templates
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);

  // Preview
  const [showPreview, setShowPreview] = useState(false);

  // ── Load objects + users ──────────────────────────────────────────────────
  useEffect(() => {
    const unsub1 = onSnapshot(
      query(collection(db, 'objects'), orderBy('name')),
      snap => setObjects(
        snap.docs.map(d => ({ id: d.id, ...d.data() } as ConstructionObject)).filter(o => o.isActive)
      )
    );
    const unsub2 = onSnapshot(
      collection(db, 'users'),
      snap => setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as AppUser)).filter(u => u.isActive !== false))
    );
    return () => { unsub1(); unsub2(); };
  }, []);

  // ── Auto chain from type ──────────────────────────────────────────────────
  useEffect(() => {
    if (!chainOverride) setChain(DEFAULT_CHAIN[requestType]);
  }, [requestType, chainOverride]);

  // ── Load templates ────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(TEMPLATES_KEY);
      if (raw) setSavedTemplates(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  // ── Autosave draft ────────────────────────────────────────────────────────
  const getDraftState = (): DraftState => ({
    title, objectId, objectName, requestType, chain, urgencyLevel,
    plannedDate, deliveryAddress, zone, comment, budgetCode,
    preferredSupplier, subcontractors, responsibleUid, tags, items,
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const hasData = title || objectName || items.some(it => it.name) || zone || subcontractors.length > 0;
    if (hasData) localStorage.setItem(DRAFT_KEY, JSON.stringify(getDraftState()));
  }, [title, objectId, objectName, requestType, chain, urgencyLevel, plannedDate,
      deliveryAddress, zone, comment, budgetCode, preferredSupplier, subcontractors, responsibleUid, items]); // eslint-disable-line

  // ── Duplicate check ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!title.trim() || title.length < 5) { setDuplicateWarning(''); return; }
    const timer = setTimeout(async () => {
      try {
        const snap = await getDocs(query(collection(db, 'requests'), orderBy('createdAt', 'desc'), limit(50)));
        const found = snap.docs.find(d => {
          const t = (d.data().title || '').toLowerCase();
          return t.includes(title.toLowerCase().slice(0, 10)) && t.length > 4;
        });
        if (found) {
          const d = found.data();
          setDuplicateWarning(`Похожая заявка уже есть: №${d.number} "${d.title}" (${d.status})`);
        } else {
          setDuplicateWarning('');
        }
      } catch { /* ignore */ }
    }, 800);
    return () => clearTimeout(timer);
  }, [title]);

  // ── Restore draft ─────────────────────────────────────────────────────────
  const restoreDraft = () => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return toast('Черновик не найден');
      const d: DraftState = JSON.parse(raw);
      setTitle(d.title || ''); setObjectId(d.objectId || ''); setObjectName(d.objectName || '');
      setRequestType(d.requestType || 'materials'); setChain(d.chain || 'full');
      setUrgencyLevel(d.urgencyLevel || 'normal'); setPlannedDate(d.plannedDate || '');
      setDeliveryAddress(d.deliveryAddress || ''); setZone(d.zone || '');
      setComment(d.comment || ''); setBudgetCode(d.budgetCode || '');
      setPreferredSupplier(d.preferredSupplier || ''); setSubcontractors(d.subcontractors || []);
      setResponsibleUid(d.responsibleUid || ''); setTags(d.tags || []);
      setItems(d.items?.length ? d.items : [{ name: '', unit: 'шт', quantity: 1, category: '' }]);
      toast.success('Черновик восстановлен');
    } catch { toast.error('Ошибка при чтении черновика'); }
  };

  // ── Templates ─────────────────────────────────────────────────────────────
  const saveTemplate = () => {
    if (!templateName.trim()) return toast.error('Введите название шаблона');
    const t: SavedTemplate = { name: templateName.trim(), draft: getDraftState() };
    const updated = [...savedTemplates.filter(s => s.name !== t.name), t];
    setSavedTemplates(updated);
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(updated));
    setTemplateName(''); setShowSaveTemplate(false);
    toast.success('Шаблон сохранён');
  };

  const loadTemplate = (t: SavedTemplate) => {
    setTitle(t.draft.title || ''); setObjectId(t.draft.objectId || '');
    setObjectName(t.draft.objectName || ''); setRequestType(t.draft.requestType || 'materials');
    setChain(t.draft.chain || 'full'); setUrgencyLevel(t.draft.urgencyLevel || 'normal');
    setPlannedDate(''); setDeliveryAddress(t.draft.deliveryAddress || '');
    setZone(t.draft.zone || ''); setComment(t.draft.comment || '');
    setBudgetCode(t.draft.budgetCode || ''); setPreferredSupplier(t.draft.preferredSupplier || '');
    setSubcontractors(t.draft.subcontractors || []); setResponsibleUid(t.draft.responsibleUid || '');
    setTags(t.draft.tags || []);
    setItems(t.draft.items?.length ? t.draft.items : [{ name: '', unit: 'шт', quantity: 1, category: '' }]);
    setShowTemplates(false);
    toast.success(`Шаблон "${t.name}" загружен`);
  };

  const deleteTemplate = (name: string) => {
    const updated = savedTemplates.filter(s => s.name !== name);
    setSavedTemplates(updated);
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(updated));
  };

  // ── Subcontractors ────────────────────────────────────────────────────────
  const addSubcontractor = () => {
    const val = subInput.trim();
    if (!val) return;
    if (!subcontractors.includes(val)) setSubcontractors(prev => [...prev, val]);
    setSubInput('');
  };

  // ── Items ─────────────────────────────────────────────────────────────────
  const handleObjectSelect = (id: string) => {
    setObjectId(id);
    const obj = objects.find(o => o.id === id);
    if (obj) {
      setObjectName(obj.name);
      if (obj.address) setDeliveryAddress(obj.address);
      setObjectBlocks(obj.blocks ?? []);
    } else {
      setObjectName('');
      setObjectBlocks([]);
    }
  };

  const addItem = () => setItems(prev => [...prev, { name: '', unit: 'шт', quantity: 1, category: '' }]);
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof Omit<RequestItem, 'id'>, val: string | number) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: val } : it));

  const handleNameInput = (idx: number, val: string) => {
    updateItem(idx, 'name', val);
    if (val.length >= 2) {
      const q = val.toLowerCase();
      const filtered = MATERIALS_CATALOG.filter(m =>
        m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q)
      ).slice(0, 8);
      setSuggestions({ index: idx, items: filtered });
    } else {
      setSuggestions({ index: -1, items: [] });
    }
  };

  const applySuggestion = (idx: number, mat: typeof MATERIALS_CATALOG[0]) => {
    setItems(prev => prev.map((it, i) => i === idx
      ? { ...it, name: mat.name, unit: mat.unit, category: mat.category, estimatedPrice: mat.defaultPrice }
      : it));
    setSuggestions({ index: -1, items: [] });
  };

  // ── File attachments ──────────────────────────────────────────────────────
  const handleFilePick = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const picked = Array.from(e.target.files);
    setAttachments(prev => {
      const existing = new Set(prev.map(f => f.name + f.size));
      return [...prev, ...picked.filter(f => !existing.has(f.name + f.size))];
    });
    e.target.value = '';
  };

  const uploadAttachments = async (requestId: string): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of attachments) {
      const path = `requests/${requestId}/${Date.now()}_${file.name}`;
      const snap = await uploadBytes(storageRef(storage, path), file);
      urls.push(await getDownloadURL(snap.ref));
    }
    return urls;
  };

  // ── Progress ──────────────────────────────────────────────────────────────
  const progressSteps = [
    !!title.trim(), !!objectName.trim(), !!plannedDate,
    items.some(it => it.name.trim()), items.some(it => it.estimatedPrice),
    !!zone.trim(), subcontractors.length > 0, !!responsibleUid,
  ];
  const progressPct = Math.round((progressSteps.filter(Boolean).length / progressSteps.length) * 100);
  const estimatedTotal = items.reduce((s, it) => s + (Number(it.estimatedPrice) || 0) * Number(it.quantity), 0);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!title.trim()) return toast.error('Введите название заявки');
    if (!objectName.trim()) return toast.error('Укажите объект');
    if (items.some(it => !it.name.trim())) return toast.error('Заполните название всех позиций');
    if (items.some(it => Number(it.quantity) <= 0)) return toast.error('Количество > 0');
    if (!currentUser) return;

    setLoading(true);
    setShowPreview(false);
    try {
      const snap = await getDocs(query(collection(db, 'requests'), orderBy('number', 'desc'), limit(1)));
      const lastNum = snap.empty ? 0 : (snap.docs[0].data().number ?? 0);
      const now = new Date().toISOString();

      const reqItems: RequestItem[] = items.map((it, i) => {
        const item: RequestItem = { id: `item_${i}_${Date.now()}`, name: it.name, unit: it.unit, quantity: Number(it.quantity) };
        if (it.category) item.category = it.category;
        if (it.estimatedPrice && Number(it.estimatedPrice) > 0) item.estimatedPrice = Number(it.estimatedPrice);
        return item;
      });

      const isUrgent = urgencyLevel === 'high' || urgencyLevel === 'critical';
      const responsibleUser = users.find(u => u.uid === responsibleUid);

      const docData: Record<string, unknown> = {
        number: lastNum + 1, title: title.trim(), objectName: objectName.trim(),
        ...(objectId && objectId !== '__custom__' ? { objectId } : {}),
        createdBy: currentUser.uid, createdByName: currentUser.displayName,
        createdAt: now, updatedAt: now, status: 'novaya',
        chain, requestType, urgencyLevel, items: reqItems,
        priority: isUrgent ? 'urgent' : 'normal',
        ...(comment.trim() ? { commentProrab: comment.trim() } : {}),
        ...(plannedDate ? { plannedDate } : {}),
        ...(deliveryAddress.trim() ? { deliveryAddress: deliveryAddress.trim() } : {}),
        ...(zone.trim() ? { zone: zone.trim() } : {}),
        ...(budgetCode.trim() ? { budgetCode: budgetCode.trim() } : {}),
        ...(preferredSupplier.trim() ? { preferredSupplier: preferredSupplier.trim() } : {}),
        ...(subcontractors.length > 0 ? { subcontractors } : {}),
        ...(responsibleUid ? { responsibleUid, responsibleName: responsibleUser?.displayName || '' } : {}),
        ...(estimatedTotal > 0 ? { estimatedCost: estimatedTotal } : {}),
        ...(tags.length > 0 ? { tags } : {}),
        slaEnteredAt: now,
        history: [{
          at: now, by: currentUser.uid, byName: currentUser.displayName,
          action: 'Заявка создана', toStatus: 'novaya',
          ...(comment.trim() ? { comment: comment.trim() } : {}),
        }],
      };

      const ref = await addDoc(collection(db, 'requests'), docData);

      if (attachments.length > 0) {
        try {
          const urls = await uploadAttachments(ref.id);
          const { updateDoc, doc } = await import('firebase/firestore');
          await updateDoc(doc(db, 'requests', ref.id), { attachments: urls });
        } catch (e) {
          toast.error('Ошибка загрузки файлов, заявка создана без вложений');
          console.error(e);
        }
      }

      const reqForTg = { id: ref.id, ...docData } as Parameters<typeof sendRequestNotification>[0];
      await sendRequestNotification(reqForTg, 'request_created', comment.trim() || undefined);
      if (isUrgent) await sendRequestNotification(reqForTg, 'urgent_created');
      await sendRequestNotification(reqForTg, chain === 'purchase_only' ? 'nachalnik_needed' : 'sklad_needed');

      localStorage.removeItem(DRAFT_KEY);
      toast.success(`Заявка №${lastNum + 1} создана!`);
      navigate('/requests');
    } catch (err) {
      toast.error('Ошибка при создании заявки');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const hasDraft = !!localStorage.getItem(DRAFT_KEY);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">Новая заявка</h1>
          <p className="text-gray-500 text-sm">Материалы, инструменты, услуги</p>
        </div>
        <div className="flex gap-2">
          {hasDraft && (
            <button type="button" onClick={restoreDraft}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors">
              <BookOpen className="w-3.5 h-3.5" /> Черновик
            </button>
          )}
          <button type="button" onClick={() => setShowTemplates(v => !v)}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 bg-gray-50 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
            <Save className="w-3.5 h-3.5" /> Шаблоны
          </button>
        </div>
      </div>

      {/* Templates panel */}
      {showTemplates && (
        <div className="bg-white border border-[#edd5c8] rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-gray-800">Шаблоны заявок</h3>
            <button onClick={() => setShowSaveTemplate(v => !v)} className="text-xs text-[#a67161] hover:underline">
              {showSaveTemplate ? 'Отмена' : '+ Сохранить текущее'}
            </button>
          </div>
          {showSaveTemplate && (
            <div className="flex gap-2">
              <input value={templateName} onChange={e => setTemplateName(e.target.value)}
                placeholder="Название шаблона"
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c89587]" />
              <button onClick={saveTemplate}
                className="px-3 py-1.5 bg-[#c89587] text-white rounded-lg text-sm hover:bg-[#a67161] transition-colors">
                Сохранить
              </button>
            </div>
          )}
          {savedTemplates.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-2">Нет сохранённых шаблонов</p>
          ) : (
            <div className="space-y-1.5">
              {savedTemplates.map(t => (
                <div key={t.name} className="flex items-center justify-between p-2.5 bg-[#fdf9f7] border border-[#edd5c8] rounded-xl">
                  <span className="text-sm text-gray-700 font-medium">{t.name}</span>
                  <div className="flex gap-2">
                    <button onClick={() => loadTemplate(t)} className="text-xs text-[#a67161] hover:underline px-2">Загрузить</button>
                    <button onClick={() => deleteTemplate(t.name)} className="text-xs text-red-400 hover:text-red-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Progress bar */}
      <div className="bg-white rounded-2xl border border-gray-200 px-5 py-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-gray-500">Заполненность формы</span>
          <span className="text-xs font-semibold text-gray-700">{progressPct}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%`, background: progressPct === 100 ? '#22c55e' : progressPct >= 60 ? '#c89587' : '#fbbf24' }} />
        </div>
        <div className="flex gap-1 mt-2 flex-wrap">
          {[
            { label: 'Название', done: !!title.trim() },
            { label: 'Объект',   done: !!objectName.trim() },
            { label: 'Дата',     done: !!plannedDate },
            { label: 'Позиции',  done: items.some(it => it.name.trim()) },
            { label: 'Цены',     done: items.some(it => it.estimatedPrice) },
            { label: 'Зона',     done: !!zone.trim() },
            { label: 'Субподр.', done: subcontractors.length > 0 },
            { label: 'Получат.', done: !!responsibleUid },
          ].map(s => (
            <span key={s.label} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              s.done ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
            }`}>{s.done ? '✓ ' : ''}{s.label}</span>
          ))}
        </div>
      </div>

      {/* Duplicate warning */}
      {duplicateWarning && (
        <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{duplicateWarning}</span>
        </div>
      )}

      <form onSubmit={e => { e.preventDefault(); setShowPreview(true); }} className="space-y-5">

        {/* Тип заявки */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-3">Тип заявки</h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {(Object.keys(REQUEST_TYPE_LABELS) as RequestType[]).map(type => {
              const Icon = TYPE_ICONS[type];
              return (
                <button key={type} type="button"
                  onClick={() => { setRequestType(type); setChainOverride(false); }}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-medium transition-all ${
                    requestType === type ? 'border-[#c89587] bg-[#f7ede7] text-[#59301f]' : 'border-gray-200 text-gray-600 hover:border-[#edd5c8]'
                  }`}>
                  <Icon className="w-5 h-5" />
                  <span>{REQUEST_TYPE_LABELS[type]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Срочность */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-3">Срочность</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {URGENCY_OPTIONS.map(opt => (
              <button key={opt.value} type="button" onClick={() => setUrgencyLevel(opt.value)}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  urgencyLevel === opt.value ? 'border-[#c89587] bg-[#f7ede7] text-[#59301f]' : 'border-gray-200 text-gray-600 hover:border-[#edd5c8]'
                }`}>
                <opt.Icon className={`w-4 h-4 ${urgencyLevel === opt.value ? 'text-[#a67161]' : opt.color}`} />
                {URGENCY_LABELS[opt.value]}
              </button>
            ))}
          </div>
          {(urgencyLevel === 'high' || urgencyLevel === 'critical') && (
            <div className="mt-3 flex items-center gap-2 p-3 bg-orange-50 rounded-xl text-sm text-orange-700">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>Срочная заявка — Telegram уведомление уйдёт немедленно</span>
            </div>
          )}
        </div>

        {/* Основная информация */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">Основная информация</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Название заявки <span className="text-red-500">*</span></label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c89587]"
              placeholder="Материалы для фундамента блок А" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Building2 className="inline w-3.5 h-3.5 mr-1 text-gray-400" />
                Объект <span className="text-red-500">*</span>
              </label>
              {objects.length > 0 ? (
                <>
                  <select value={objectId} onChange={e => handleObjectSelect(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c89587] bg-white mb-2">
                    <option value="">— Выбрать объект —</option>
                    {objects.map(o => <option key={o.id} value={o.id}>{o.code} — {o.name}</option>)}
                    <option value="__custom__">Другой объект</option>
                  </select>
                  {objectId === '__custom__' && (
                    <input type="text" value={objectName} onChange={e => setObjectName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c89587]"
                      placeholder="Название объекта" />
                  )}
                </>
              ) : (
                <input type="text" value={objectName} onChange={e => setObjectName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c89587]"
                  placeholder="Название объекта" />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Нужно к дате</label>
              <input type="date" value={plannedDate} onChange={e => setPlannedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c89587]" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MapPin className="inline w-3.5 h-3.5 mr-1 text-gray-400" />
                Участок / место на объекте
              </label>
              {objectBlocks.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {objectBlocks.map(b => (
                    <button key={b.id} type="button"
                      onClick={() => setZone(b.name)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all font-medium ${
                        zone === b.name
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                      }`}>
                      {b.name}
                    </button>
                  ))}
                </div>
              )}
              <input type="text" value={zone} onChange={e => setZone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c89587]"
                placeholder={objectBlocks.length > 0 ? 'Или введите вручную…' : 'Блок А, этаж 3, секция 12'} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Адрес доставки / место выдачи</label>
              <input type="text" value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c89587]"
                placeholder="Куда доставить или где выдать" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Комментарий</label>
            <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c89587] resize-none"
              placeholder="Особые указания..." />
          </div>

          {/* Теги */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Tag className="inline w-3.5 h-3.5 mr-1 text-gray-400" />
              Теги для группировки закупок
            </label>
            <div className="flex flex-wrap gap-2">
              {MATERIAL_TAGS.map(t => {
                const active = tags.includes(t.id);
                return (
                  <button key={t.id} type="button"
                    onClick={() => setTags(prev => active ? prev.filter(x => x !== t.id) : [...prev, t.id])}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                      active ? 'border-transparent text-white' : 'border-gray-200 text-gray-600 bg-white hover:border-gray-300'
                    }`}
                    style={active ? { background: t.color } : {}}>
                    <span>{t.emoji}</span>
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Участники — субподрядчики + ответственный */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">Участники</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Users className="inline w-3.5 h-3.5 mr-1 text-gray-400" />
              Субподрядчики
            </label>
            {subcontractors.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {subcontractors.map(s => (
                  <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#f7ede7] text-[#59301f] text-xs rounded-lg border border-[#edd5c8]">
                    {s}
                    <button type="button" onClick={() => setSubcontractors(prev => prev.filter(x => x !== s))}
                      className="ml-0.5 hover:text-red-600 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input type="text" value={subInput} onChange={e => setSubInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubcontractor(); } }}
                placeholder="Название / ФИО — Enter для добавления"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c89587]" />
              <button type="button" onClick={addSubcontractor}
                className="px-3 py-2 bg-[#f7ede7] text-[#a67161] border border-[#edd5c8] rounded-lg hover:bg-[#edd5c8] transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Можно добавить несколько субподрядчиков</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <UserCheck className="inline w-3.5 h-3.5 mr-1 text-gray-400" />
              Ответственный получатель
            </label>
            <select value={responsibleUid} onChange={e => setResponsibleUid(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c89587] bg-white">
              <option value="">— Не указан —</option>
              {users.map(u => <option key={u.uid} value={u.uid}>{u.displayName} ({u.role})</option>)}
            </select>
          </div>
        </div>

        {/* Финансирование */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">Финансирование</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Tag className="inline w-3.5 h-3.5 mr-1 text-gray-400" />
                Код бюджетной статьи
              </label>
              <input type="text" value={budgetCode} onChange={e => setBudgetCode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c89587]"
                placeholder="Например: C-04-2025" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <User className="inline w-3.5 h-3.5 mr-1 text-gray-400" />
                Предпочтительный поставщик
              </label>
              <input type="text" value={preferredSupplier} onChange={e => setPreferredSupplier(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c89587]"
                placeholder="Название компании или ИП" />
            </div>
          </div>
        </div>

        {/* Цепочка согласования */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800">Цепочка согласования</h2>
            <button type="button" onClick={() => setChainOverride(v => !v)}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-medium transition-all border ${
                chainOverride
                  ? 'bg-[#f7ede7] text-[#a67161] border-[#edd5c8] hover:bg-[#edd5c8]'
                  : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
              }`}>
              {chainOverride ? <><Unlock className="w-3 h-3" /> Ручной режим</> : <><Lock className="w-3 h-3" /> Изменить вручную</>}
            </button>
          </div>
          {!chainOverride && (
            <div className="p-3 rounded-xl border-2 border-[#c89587] bg-[#f7ede7]">
              <p className="text-sm font-medium text-gray-800">{CHAIN_LABELS[chain]}</p>
              <p className="text-xs text-gray-500 mt-0.5">{CHAIN_DESCRIPTIONS[chain]}</p>
            </div>
          )}
          {chainOverride && (
            <div className="space-y-2">
              {(['full', 'warehouse_only', 'purchase_only', 'full_finance', 'finance_only'] as RequestChain[]).map(c => (
                <label key={c} className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  chain === c ? 'border-[#c89587] bg-[#f7ede7]' : 'border-gray-200 hover:border-[#edd5c8]'
                }`}>
                  <input type="radio" name="chain" value={c} checked={chain === c}
                    onChange={() => setChain(c)} className="mt-0.5 accent-[#c89587]" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{CHAIN_LABELS[c]}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{CHAIN_DESCRIPTIONS[c]}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
          <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
            <Info className="w-3.5 h-3.5" />
            {chainOverride ? 'Цепочка выбрана вручную' : 'Цепочка выбрана автоматически по типу заявки'}
          </div>
        </div>

        {/* Позиции */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Позиции <span className="text-gray-400 font-normal text-sm">({items.length})</span></h2>
            <button type="button" onClick={addItem}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f7ede7] text-[#a67161] text-sm rounded-lg hover:bg-[#edd5c8] transition-colors border border-[#edd5c8]">
              <Plus className="w-4 h-4" /> Добавить
            </button>
          </div>
          {items.map((item, idx) => (
            <div key={idx} className="border border-gray-200 rounded-xl p-3 space-y-2">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input type="text" value={item.name}
                      onChange={e => handleNameInput(idx, e.target.value)}
                      onBlur={() => setTimeout(() => setSuggestions({ index: -1, items: [] }), 200)}
                      placeholder={`Позиция ${idx + 1} — начните печатать для поиска`}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c89587]" />
                  </div>
                  {suggestions.index === idx && suggestions.items.length > 0 && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                      {suggestions.items.map((mat, mi) => (
                        <button key={mi} type="button" onMouseDown={() => applySuggestion(idx, mat)}
                          className="w-full text-left px-3 py-2 hover:bg-[#f7ede7] transition-colors border-b border-gray-100 last:border-0">
                          <div className="text-sm font-medium text-gray-800">{mat.name}</div>
                          <div className="text-xs text-gray-500">{mat.category} · {mat.unit}{mat.defaultPrice ? ` · ~${mat.defaultPrice.toLocaleString('ru-RU')} сум` : ''}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItem(idx)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors self-start mt-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Кол-во</label>
                  <input type="number" value={item.quantity} min="0.001" step="0.001"
                    onChange={e => updateItem(idx, 'quantity', e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c89587]" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Ед. изм.</label>
                  <select value={item.unit} onChange={e => updateItem(idx, 'unit', e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c89587] bg-white">
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Категория</label>
                  <select value={item.category ?? ''} onChange={e => updateItem(idx, 'category', e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c89587] bg-white">
                    <option value="">—</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Ориент. цена за ед. (сум)</label>
                <input type="number" value={item.estimatedPrice ?? ''} placeholder="0"
                  onChange={e => updateItem(idx, 'estimatedPrice', e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c89587]" />
              </div>
            </div>
          ))}
          {estimatedTotal > 0 && (
            <div className="flex justify-between items-center px-3 py-2 bg-[#f7ede7] border border-[#edd5c8] rounded-lg text-sm font-medium">
              <span className="text-[#59301f]">Ориентировочная стоимость:</span>
              <span className="text-[#59301f] font-bold">{estimatedTotal.toLocaleString('ru-RU')} сум</span>
            </div>
          )}
        </div>

        {/* Прикрепить файлы */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">
              <Paperclip className="inline w-4 h-4 mr-1.5 text-gray-400" />
              Прикрепить файлы
            </h2>
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f7ede7] text-[#a67161] text-sm rounded-lg hover:bg-[#edd5c8] transition-colors border border-[#edd5c8]">
              <Plus className="w-4 h-4" /> Добавить
            </button>
          </div>
          <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
            onChange={handleFilePick} className="hidden" />
          {attachments.length === 0 ? (
            <div onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-[#c89587] hover:bg-[#fdf9f7] transition-all">
              <Paperclip className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Фото, чертежи, накладные, PDF</p>
              <p className="text-xs text-gray-300 mt-1">Нажмите для выбора файлов</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {attachments.map((f, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100">
                  <Paperclip className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-700 flex-1 truncate">{f.name}</span>
                  <span className="text-xs text-gray-400">{(f.size / 1024).toFixed(0)} КБ</span>
                  <button type="button" onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                    className="text-gray-300 hover:text-red-500 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="w-full text-xs text-[#a67161] hover:underline text-center py-1">
                + Добавить ещё
              </button>
            </div>
          )}
        </div>

        {/* Кнопки */}
        <div className="flex gap-3 pb-6">
          <button type="button" onClick={() => navigate(-1)}
            className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors">
            Отмена
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-white rounded-xl font-medium disabled:opacity-60 transition-colors"
            style={{ background: '#c89587' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#a67161')}
            onMouseLeave={e => (e.currentTarget.style.background = '#c89587')}>
            {loading
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Создание...</>
              : <><Eye className="w-4 h-4" /> Предпросмотр и отправка</>
            }
          </button>
        </div>
      </form>

      {/* ── Preview modal ──────────────────────────────────────────────────── */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="font-bold text-gray-900 text-lg">Предпросмотр заявки</h3>
              <button onClick={() => setShowPreview(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex gap-2 flex-wrap">
                <span className="px-3 py-1 bg-[#f7ede7] text-[#59301f] text-sm rounded-lg font-medium border border-[#edd5c8]">
                  {REQUEST_TYPE_LABELS[requestType]}
                </span>
                <span className={`px-3 py-1 text-sm rounded-lg font-medium border ${
                  urgencyLevel === 'critical' ? 'bg-red-50 text-red-700 border-red-200' :
                  urgencyLevel === 'high'     ? 'bg-orange-50 text-orange-700 border-orange-200' :
                  urgencyLevel === 'normal'   ? 'bg-blue-50 text-blue-700 border-blue-200' :
                  'bg-gray-50 text-gray-600 border-gray-200'
                }`}>{URGENCY_LABELS[urgencyLevel]}</span>
                <span className="px-3 py-1 bg-[#f7ede7] text-[#59301f] text-sm rounded-lg font-medium border border-[#edd5c8]">
                  {CHAIN_LABELS[chain]}
                </span>
              </div>

              <div className="space-y-2 text-sm divide-y divide-gray-50">
                {[
                  { label: 'Название',  val: title },
                  { label: 'Объект',    val: objectName },
                  { label: 'Зона',      val: zone },
                  { label: 'К дате',    val: plannedDate ? new Date(plannedDate).toLocaleDateString('ru-RU') : '' },
                  { label: 'Доставка',  val: deliveryAddress },
                  { label: 'Бюдж. статья', val: budgetCode },
                  { label: 'Поставщик', val: preferredSupplier },
                  { label: 'Получатель', val: users.find(u => u.uid === responsibleUid)?.displayName || '' },
                  { label: 'Файлы',     val: attachments.length > 0 ? `${attachments.length} файл(ов)` : '' },
                ].filter(r => r.val).map(r => (
                  <div key={r.label} className="flex justify-between py-1.5">
                    <span className="text-gray-500">{r.label}</span>
                    <span className="font-medium text-gray-900 text-right max-w-[60%]">{r.val}</span>
                  </div>
                ))}
                {subcontractors.length > 0 && (
                  <div className="flex justify-between items-start py-1.5">
                    <span className="text-gray-500">Субподрядчики</span>
                    <div className="flex flex-wrap gap-1 justify-end max-w-[60%]">
                      {subcontractors.map(s => (
                        <span key={s} className="px-2 py-0.5 bg-[#f7ede7] text-[#59301f] text-xs rounded">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Позиции ({items.length})</p>
                <div className="space-y-1.5">
                  {items.map((it, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                      <span className="text-gray-800 flex-1">{it.name}</span>
                      <span className="text-gray-500 ml-2">{it.quantity} {it.unit}</span>
                      {it.estimatedPrice && (
                        <span className="text-gray-700 ml-2 font-medium">
                          {(Number(it.estimatedPrice) * Number(it.quantity)).toLocaleString('ru-RU')} сум
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                {estimatedTotal > 0 && (
                  <div className="flex justify-between items-center mt-2 px-2 py-1.5 bg-[#f7ede7] rounded-lg">
                    <span className="text-sm text-[#59301f]">Итого:</span>
                    <span className="text-sm font-bold text-[#59301f]">{estimatedTotal.toLocaleString('ru-RU')} сум</span>
                  </div>
                )}
              </div>

              {comment && (
                <div className="p-3 bg-gray-50 rounded-xl text-sm text-gray-700">
                  <span className="font-medium text-gray-500 block text-xs mb-1">Комментарий</span>
                  {comment}
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-4 flex gap-3 rounded-b-2xl">
              <button onClick={() => setShowPreview(false)}
                className="flex-1 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors text-sm">
                Редактировать
              </button>
              <button onClick={handleSubmit} disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-white rounded-xl font-medium text-sm disabled:opacity-60 transition-colors"
                style={{ background: '#c89587' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#a67161')}
                onMouseLeave={e => (e.currentTarget.style.background = '#c89587')}>
                {loading
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Создание...</>
                  : <><Check className="w-4 h-4" /> Подтвердить и создать</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
