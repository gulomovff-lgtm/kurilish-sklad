import { useState, useEffect } from 'react';
import {
  collection, addDoc, updateDoc, deleteDoc, onSnapshot, doc, query, orderBy
} from 'firebase/firestore';
import { db } from '../firebase';
import type { ConstructionObject, ObjectBlock } from '../types';
import { formatDateShort, formatMoney } from '../utils';
import { useAuth } from '../contexts/AuthContext';
import {
  Building2, Plus, Pencil, Trash2, Search, CheckCircle2,
  XCircle, MapPin, DollarSign, User, Hash, Layers, X, GripVertical
} from 'lucide-react';
import toast from 'react-hot-toast';

const emptyForm = (): Omit<ConstructionObject, 'id' | 'createdAt'> => ({
  name: '',
  code: '',
  address: '',
  managerName: '',
  managerUid: '',
  isActive: true,
  budget: undefined,
  spent: 0,
  blocks: [],
});

function newBlock(): ObjectBlock {
  return { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name: '' };
}

export default function ObjectsPage() {
  const { currentUser } = useAuth();
  const [objects, setObjects] = useState<ConstructionObject[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ConstructionObject | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'nachalnik';

  useEffect(() => {
    const q = query(collection(db, 'objects'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, snap => {
      setObjects(snap.docs.map(d => ({ id: d.id, ...d.data() } as ConstructionObject)));
    });
  }, []);

  const filtered = objects.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.code.toLowerCase().includes(search.toLowerCase()) ||
    (o.address ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setShowModal(true);
  };

  const openEdit = (obj: ConstructionObject) => {
    setEditing(obj);
    setForm({
      name: obj.name,
      code: obj.code,
      address: obj.address ?? '',
      managerName: obj.managerName ?? '',
      managerUid: obj.managerUid ?? '',
      isActive: obj.isActive,
      budget: obj.budget,
      spent: obj.spent ?? 0,
      blocks: obj.blocks ? [...obj.blocks] : [],
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Введите название объекта');
    if (!form.code.trim()) return toast.error('Введите код объекта');
    setSaving(true);
    try {
      if (editing) {
        await updateDoc(doc(db, 'objects', editing.id), { ...form });
        toast.success('Объект обновлён');
      } else {
        await addDoc(collection(db, 'objects'), {
          ...form,
          createdAt: new Date().toISOString(),
        });
        toast.success('Объект создан');
      }
      setShowModal(false);
    } catch {
      toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'objects', id));
      toast.success('Объект удалён');
      setDeleteConfirm(null);
    } catch {
      toast.error('Ошибка удаления');
    }
  };

  const toggleActive = async (obj: ConstructionObject) => {
    await updateDoc(doc(db, 'objects', obj.id), { isActive: !obj.isActive });
    toast.success(obj.isActive ? 'Объект деактивирован' : 'Объект активирован');
  };

  const budgetPercent = (obj: ConstructionObject) => {
    if (!obj.budget || obj.budget === 0) return null;
    return Math.min(100, Math.round(((obj.spent ?? 0) / obj.budget) * 100));
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Заголовок */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Объекты строительства</h1>
            <p className="text-sm text-gray-500">{objects.filter(o => o.isActive).length} активных</p>
          </div>
        </div>
        {canEdit && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            Новый объект
          </button>
        )}
      </div>

      {/* Поиск */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск по названию, коду, адресу..."
          className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
        />
      </div>

      {/* Список */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{search ? 'Ничего не найдено' : 'Объектов нет. Создайте первый!'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(obj => {
            const pct = budgetPercent(obj);
            return (
              <div
                key={obj.id}
                className={`bg-white rounded-2xl border p-5 space-y-3 ${
                  obj.isActive ? 'border-gray-200' : 'border-gray-100 opacity-60'
                }`}
              >
                {/* Шапка */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-mono bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-lg">
                        {obj.code}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        obj.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {obj.isActive ? 'Активен' : 'Завершён'}
                      </span>
                    </div>
                    <p className="font-semibold text-gray-900 truncate">{obj.name}</p>
                  </div>
                </div>

                {/* Детали */}
                <div className="space-y-1.5 text-sm text-gray-600">
                  {obj.address && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{obj.address}</span>
                    </div>
                  )}
                  {obj.managerName && (
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span>Прораб: {obj.managerName}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Hash className="w-3 h-3" />
                    <span>Создан {formatDateShort(obj.createdAt)}</span>
                  </div>
                </div>

                {/* Блоки/участки */}
                {obj.blocks && obj.blocks.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1 text-xs text-gray-400 mb-1.5">
                      <Layers className="w-3 h-3" />
                      <span>Участки / блоки:</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {obj.blocks.map(b => (
                        <span key={b.id}
                          className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                          {b.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Бюджет */}
                {obj.budget && obj.budget > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        Бюджет
                      </span>
                      <span>
                        {formatMoney(obj.spent ?? 0)} / {formatMoney(obj.budget)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          (pct ?? 0) >= 90 ? 'bg-red-500' :
                          (pct ?? 0) >= 70 ? 'bg-orange-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${pct ?? 0}%` }}
                      />
                    </div>
                    <p className="text-xs text-right text-gray-400">{pct}% использовано</p>
                  </div>
                )}

                {/* Кнопки */}
                {canEdit && (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => openEdit(obj)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Изменить
                    </button>
                    <button
                      onClick={() => toggleActive(obj)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs border rounded-lg transition-colors ${
                        obj.isActive
                          ? 'border-orange-200 text-orange-600 hover:bg-orange-50'
                          : 'border-green-200 text-green-600 hover:bg-green-50'
                      }`}
                    >
                      {obj.isActive ? (
                        <><XCircle className="w-3.5 h-3.5" /> Закрыть</>
                      ) : (
                        <><CheckCircle2 className="w-3.5 h-3.5" /> Открыть</>
                      )}
                    </button>
                    {deleteConfirm === obj.id ? (
                      <button
                        onClick={() => handleDelete(obj.id)}
                        className="flex items-center justify-center gap-1 py-1.5 px-2 text-xs bg-red-600 text-white border border-red-600 rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Удалить?
                      </button>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(obj.id)}
                        className="flex items-center justify-center p-1.5 border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-200 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Модальное окно */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900">
              {editing ? 'Редактировать объект' : 'Новый объект'}
            </h2>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Код *</label>
                  <input
                    value={form.code}
                    onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                    placeholder="ОБЪ-01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Название *</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="ЖК Звезда, блок А"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Адрес</label>
                <input
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="ул. Строителей, 12"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Прораб</label>
                <input
                  value={form.managerName}
                  onChange={e => setForm(f => ({ ...f, managerName: e.target.value }))}
                  placeholder="Иванов Иван"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Бюджет (сум)</label>
                <input
                  type="number"
                  value={form.budget ?? ''}
                  onChange={e => setForm(f => ({ ...f, budget: e.target.value ? Number(e.target.value) : undefined }))}
                  placeholder="50 000 000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* ── Блоки / Участки ── */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-emerald-600" />
                    Блоки / Участки
                    <span className="ml-1 text-gray-400 font-normal">(произвольные названия)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, blocks: [...(f.blocks ?? []), newBlock()] }))}
                    className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" /> Добавить
                  </button>
                </div>
                {(form.blocks ?? []).length === 0 && (
                  <p className="text-xs text-gray-400 italic py-2 text-center border border-dashed border-gray-200 rounded-lg">
                    Нет участков — заявки будут без привязки к блоку
                  </p>
                )}
                <div className="space-y-2">
                  {(form.blocks ?? []).map((block, idx) => (
                    <div key={block.id} className="flex items-center gap-2">
                      <GripVertical className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                      <input
                        value={block.name}
                        onChange={e => setForm(f => ({
                          ...f,
                          blocks: (f.blocks ?? []).map((b, i) =>
                            i === idx ? { ...b, name: e.target.value } : b
                          ),
                        }))}
                        placeholder={`Блок ${idx + 1}: «Секция А», «Этаж 3», «Кровля»…`}
                        className="flex-1 px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      />
                      <button
                        type="button"
                        onClick={() => setForm(f => ({
                          ...f,
                          blocks: (f.blocks ?? []).filter((_, i) => i !== idx),
                        }))}
                        className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                  className="w-4 h-4 accent-emerald-600"
                />
                <span className="text-sm text-gray-700">Активный объект</span>
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors font-medium"
              >
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
