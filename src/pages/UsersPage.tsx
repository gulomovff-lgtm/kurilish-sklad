import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import type { AppUser, UserRole } from '../types';
import {
  UserPlus, Users, X, Shield, Edit2, Trash2, Lock, Unlock,
  ChevronDown, Search, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { ROLE_LABELS, formatDate } from '../utils';
import toast from 'react-hot-toast';

const ROLES: UserRole[] = ['prоrab', 'sklad', 'nachalnik', 'finansist', 'snab', 'admin'];

const ROLE_COLORS: Record<UserRole, string> = {
  prоrab: 'bg-blue-100 text-blue-700',
  sklad: 'bg-green-100 text-green-700',
  nachalnik: 'bg-purple-100 text-purple-700',
  finansist: 'bg-pink-100 text-pink-700',
  snab: 'bg-orange-100 text-orange-700',
  admin: 'bg-red-100 text-red-700',
};

export default function UsersPage() {
  const { createUser, updateUserRole, updateUserName, toggleUserActive, deleteUserDoc, currentUser, adminCount } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<AppUser | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<AppUser | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setUsers(snap.docs.map(d => d.data() as AppUser));
      setLoading(false);
    });
    return unsub;
  }, []);

  const filtered = users.filter(u => {
    const matchSearch = !search ||
      u.displayName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'all' || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const handleToggleActive = async (user: AppUser) => {
    if (user.role === 'admin' && adminCount <= 1 && !user.isActive) return;
    if (user.uid === currentUser?.uid) {
      return toast.error('Нельзя заблокировать свой аккаунт');
    }
    const newState = user.isActive === false ? true : false;
    await toggleUserActive(user.uid, newState);
    toast.success(newState ? 'Пользователь разблокирован' : 'Пользователь заблокирован');
  };

  const handleDelete = async (user: AppUser) => {
    if (user.uid === currentUser?.uid) return toast.error('Нельзя удалить свой аккаунт');
    if (user.role === 'admin' && adminCount <= 1) {
      return toast.error('Нельзя удалить единственного администратора');
    }
    await deleteUserDoc(user.uid);
    toast.success('Пользователь удалён из системы');
    setDeleteConfirm(null);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Управление пользователями</h1>
          <p className="text-gray-500 text-sm">{users.length} пользователей в системе</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          Добавить
        </button>
      </div>

      {/* Role stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {ROLES.map(role => {
          const count = users.filter(u => u.role === role).length;
          return (
            <button
              key={role}
              onClick={() => setFilterRole(prev => prev === role ? 'all' : role)}
              className={`card text-center transition-all border-2 ${
                filterRole === role ? 'border-blue-400 bg-blue-50' : 'border-transparent hover:border-gray-300'
              }`}
            >
              <p className="text-2xl font-bold text-gray-800">{count}</p>
              <span className={`badge mt-1 ${ROLE_COLORS[role]}`}>{ROLE_LABELS[role]}</span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск по имени или email..."
              className="input-field pl-9"
            />
          </div>
          <select
            value={filterRole}
            onChange={e => setFilterRole(e.target.value as UserRole | 'all')}
            className="input-field sm:w-48"
          >
            <option value="all">Все роли</option>
            {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
        </div>
      </div>

      {/* Users table */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Пользователь</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium hidden sm:table-cell">Email</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Роль</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium hidden md:table-cell">Добавлен</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Статус</th>
                <th className="px-4 py-3 text-gray-500 font-medium text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(user => {
                const isMe = user.uid === currentUser?.uid;
                const blocked = user.isActive === false;
                return (
                  <tr key={user.uid} className={`hover:bg-gray-50 transition-colors ${blocked ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 ${
                          ROLE_COLORS[user.role]
                        }`}>
                          {user.displayName?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">
                            {user.displayName}
                            {isMe && <span className="ml-1 text-xs text-blue-500">(вы)</span>}
                          </p>
                          <p className="text-xs text-gray-400 sm:hidden">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{user.email}</td>
                    <td className="px-4 py-3">
                      <RoleSelect
                        uid={user.uid}
                        role={user.role}
                        isMe={isMe}
                        adminCount={adminCount}
                        onUpdate={updateUserRole}
                      />
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">
                      {user.createdAt ? formatDate(user.createdAt) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {blocked ? (
                        <span className="badge bg-red-100 text-red-700">Заблокирован</span>
                      ) : (
                        <span className="badge bg-green-100 text-green-700">Активен</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {/* Edit */}
                        <button
                          onClick={() => setEditUser(user)}
                          className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Редактировать"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {/* Block/Unblock */}
                        {!isMe && (
                          <button
                            onClick={() => handleToggleActive(user)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              blocked
                                ? 'text-green-600 hover:bg-green-50'
                                : 'text-yellow-600 hover:bg-yellow-50'
                            }`}
                            title={blocked ? 'Разблокировать' : 'Заблокировать'}
                          >
                            {blocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                          </button>
                        )}
                        {/* Delete */}
                        {!isMe && (
                          <button
                            onClick={() => setDeleteConfirm(user)}
                            className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                            title="Удалить"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Пользователей не найдено</p>
            </div>
          )}
          <div className="px-4 py-3 bg-gray-50 border-t text-sm text-gray-500">
            Найдено: {filtered.length}
          </div>
        </div>
      )}

      {/* Create user modal */}
      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreate={createUser}
        />
      )}

      {/* Edit user modal */}
      {editUser && (
        <EditUserModal
          user={editUser}
          adminCount={adminCount}
          currentUserId={currentUser?.uid || ''}
          onClose={() => setEditUser(null)}
          onUpdateRole={updateUserRole}
          onUpdateName={updateUserName}
        />
      )}

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center space-y-4">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="font-bold text-lg">Удалить пользователя?</h2>
            <p className="text-gray-500 text-sm">
              <span className="font-semibold text-gray-700">{deleteConfirm.displayName}</span> будет удалён из базы данных системы. Аккаунт Firebase Auth останется, но войти в систему будет невозможно.
            </p>
            {deleteConfirm.role === 'admin' && adminCount > 1 && (
              <p className="text-amber-600 text-sm bg-amber-50 p-2 rounded-lg">
                ⚠️ Вы удаляете администратора. Убедитесь, что есть другие администраторы.
              </p>
            )}
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">Отмена</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="btn-danger flex-1">Удалить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Role dropdown inline ----
function RoleSelect({ uid, role, isMe, adminCount, onUpdate }: {
  uid: string;
  role: UserRole;
  isMe: boolean;
  adminCount: number;
  onUpdate: (uid: string, role: UserRole) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);

  const handleChange = async (newRole: UserRole) => {
    if (newRole === role) return;
    if (role === 'admin' && adminCount <= 1) {
      return toast.error('Нельзя понизить единственного администратора');
    }
    setLoading(true);
    try {
      await onUpdate(uid, newRole);
      toast.success('Роль изменена');
    } catch {
      toast.error('Ошибка изменения роли');
    } finally {
      setLoading(false);
    }
  };

  if (isMe) {
    return (
      <span className={`badge ${ROLE_COLORS[role]}`}>
        {ROLE_LABELS[role]}
      </span>
    );
  }

  return (
    <div className="relative inline-flex items-center">
      <select
        value={role}
        onChange={e => handleChange(e.target.value as UserRole)}
        disabled={loading}
        className={`${ROLE_COLORS[role]} text-xs font-medium px-2 py-1 rounded-full border-0 appearance-none pr-5 cursor-pointer disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-400`}
      >
        {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
      </select>
      <ChevronDown className="absolute right-1 w-3 h-3 pointer-events-none opacity-60" />
    </div>
  );
}

// ---- Create User Modal ----
function CreateUserModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (email: string, password: string, name: string, role: UserRole) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('prоrab');
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) return toast.error('Заполните все поля');
    if (password.length < 6) return toast.error('Пароль минимум 6 символов');
    setLoading(true);
    try {
      await onCreate(email, password, name, role);
      setCreated(true);
      toast.success(`Пользователь "${name}" создан`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка';
      if (msg.includes('email-already-in-use')) toast.error('Email уже используется');
      else toast.error('Ошибка: ' + msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-lg">Новый пользователь</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X /></button>
        </div>

        {created ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="font-bold text-lg text-gray-800">Пользователь создан!</h3>
            <p className="text-gray-500 text-sm">{name} добавлен как <b>{ROLE_LABELS[role]}</b>.<br />Email: {email}</p>
            <div className="flex gap-3">
              <button onClick={() => { setName(''); setEmail(''); setPassword(''); setRole('prоrab'); setCreated(false); }} className="btn-secondary flex-1">
                Добавить ещё
              </button>
              <button onClick={onClose} className="btn-primary flex-1">Закрыть</button>
            </div>
          </div>
        ) : (
          <>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Полное имя *</label>
                <input value={name} onChange={e => setName(e.target.value)} className="input-field" placeholder="Фамилия Имя Отчество" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-field" placeholder="email@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Пароль * (мин. 6 символов)</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input-field" placeholder="Временный пароль" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Роль</label>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors text-left ${
                        role === r
                          ? `${ROLE_COLORS[r]} border-current`
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      {r === 'admin' && <Shield className="w-3 h-3 inline mr-1" />}
                      {ROLE_LABELS[r]}
                    </button>
                  ))}
                </div>
              </div>
              {role === 'admin' && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <p className="font-medium">⚠️ Администратор</p>
                  <p className="mt-0.5">Этот пользователь получит полный доступ ко всем функциям системы.</p>
                </div>
              )}
            </div>
            <div className="flex gap-3 p-5 border-t">
              <button onClick={onClose} className="btn-secondary flex-1">Отмена</button>
              <button onClick={handleCreate} disabled={loading} className="btn-primary flex-1">
                {loading ? 'Создание...' : 'Создать'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---- Edit User Modal ----
function EditUserModal({ user, adminCount, currentUserId, onClose, onUpdateRole, onUpdateName }: {
  user: AppUser;
  adminCount: number;
  currentUserId: string;
  onClose: () => void;
  onUpdateRole: (uid: string, role: UserRole) => Promise<void>;
  onUpdateName: (uid: string, name: string) => Promise<void>;
}) {
  const [name, setName] = useState(user.displayName);
  const [role, setRole] = useState<UserRole>(user.role);
  const [loading, setLoading] = useState(false);
  const isMe = user.uid === currentUserId;

  const handleSave = async () => {
    if (!name.trim()) return toast.error('Введите имя');
    if (user.role === 'admin' && role !== 'admin' && adminCount <= 1) {
      return toast.error('Нельзя понизить единственного администратора');
    }
    setLoading(true);
    try {
      const promises: Promise<void>[] = [];
      if (name !== user.displayName) promises.push(onUpdateName(user.uid, name));
      if (role !== user.role) promises.push(onUpdateRole(user.uid, role));
      await Promise.all(promises);
      toast.success('Данные обновлены');
      onClose();
    } catch {
      toast.error('Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${ROLE_COLORS[user.role]}`}>
              {user.displayName?.[0]?.toUpperCase()}
            </div>
            <div>
              <h2 className="font-bold text-lg">Редактировать</h2>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Полное имя</label>
            <input value={name} onChange={e => setName(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Роль</label>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map(r => (
                <button
                  key={r}
                  type="button"
                  disabled={isMe && r !== 'admin'}
                  onClick={() => !isMe && setRole(r)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed ${
                    role === r
                      ? `${ROLE_COLORS[r]} border-current`
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {r === 'admin' && <Shield className="w-3 h-3 inline mr-1" />}
                  {ROLE_LABELS[r]}
                </button>
              ))}
            </div>
            {isMe && (
              <p className="text-xs text-amber-600 mt-2">Нельзя изменить свою роль</p>
            )}
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
