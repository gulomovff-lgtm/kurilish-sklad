import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getDocs, collection, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Building2, Shield, Lock, Mail, User, CheckCircle2, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SetupPage() {
  const [checking, setChecking] = useState(true);
  const [adminExists, setAdminExists] = useState(false);
  const [rulesError, setRulesError] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const { createUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    getDocs(query(collection(db, 'users'), where('role', '==', 'admin')))
      .then(snap => {
        setAdminExists(snap.size > 0);
        setChecking(false);
      })
      .catch((err) => {
        // Если нет прав на чтение (правила Firestore) — значит база пустая
        // и первоначальная настройка ещё не выполнялась
        console.warn('Firestore read denied (expected on first setup):', err.code);
        setAdminExists(false);
        setRulesError(true);
        setChecking(false);
      });
  }, []);

  const handleSetup = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Введите имя администратора');
    if (!email.trim()) return toast.error('Введите email');
    if (password.length < 6) return toast.error('Пароль минимум 6 символов');
    if (password !== confirm) return toast.error('Пароли не совпадают');

    setLoading(true);
    try {
      await createUser(email, password, name, 'admin');
      setDone(true);
      toast.success('Администратор создан! Войдите в систему.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('email-already-in-use')) {
        toast.error('Email уже зарегистрирован');
      } else {
        toast.error('Ошибка: ' + msg);
      }
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-800 to-blue-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-lg mb-4">
            <Building2 className="w-9 h-9 text-blue-700" />
          </div>
          <h1 className="text-3xl font-bold text-white">Курилиш</h1>
          <p className="text-blue-200 mt-1">Первоначальная настройка</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Admin already exists */}
          {adminExists && !done ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Система уже настроена</h2>
              <p className="text-gray-500 text-sm">
                Главный администратор уже существует. Страница первоначальной настройки недоступна.
              </p>
              <Link to="/login" className="btn-primary flex items-center justify-center gap-2 w-full">
                <ArrowLeft className="w-4 h-4" />
                Перейти к входу
              </Link>
            </div>
          ) : done ? (
            /* Success state */
            <div className="text-center space-y-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Администратор создан!</h2>
              <p className="text-gray-500 text-sm">
                Войдите в систему используя созданный аккаунт.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                Войти в систему
              </button>
            </div>
          ) : (
            /* Setup form */
            <>
              <div className="flex items-center gap-2 mb-6">
                <Shield className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-800">Создать главного администратора</h2>
              </div>

              <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                <p className="font-medium mb-1">⚠️ Важно!</p>
                <p>Этот аккаунт будет иметь полный доступ ко всем функциям системы: управление пользователями, склад, заявки.</p>
              </div>

              {rulesError && (
                <div className="mb-5 p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs">
                  <p className="font-semibold text-blue-800 mb-2">📋 Сначала настройте правила Firestore</p>
                  <p className="text-blue-700 mb-3">
                    Перейдите в <b>Firebase Console → Firestore Database → Rules</b> и замените правила на:
                  </p>
                  <pre className="bg-blue-100 text-blue-900 rounded-lg p-3 overflow-x-auto text-xs leading-relaxed whitespace-pre">{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}`}</pre>
                  <p className="text-blue-600 mt-2">После сохранения правил обновите эту страницу — форма заработает.</p>
                </div>
              )}

              <form onSubmit={handleSetup} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Полное имя *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="input-field pl-10"
                      placeholder="Иванов Иван Иванович"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="input-field pl-10"
                      placeholder="admin@kurilish.uz"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Пароль * (мин. 6 символов)</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="input-field pl-10"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Подтвердите пароль *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="password"
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      className={`input-field pl-10 ${confirm && confirm !== password ? 'border-red-400 focus:ring-red-400' : ''}`}
                      placeholder="••••••••"
                    />
                  </div>
                  {confirm && confirm !== password && (
                    <p className="text-red-500 text-xs mt-1">Пароли не совпадают</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-3"
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Shield className="w-5 h-5" />
                      Создать администратора
                    </>
                  )}
                </button>
              </form>

              <div className="mt-4 text-center">
                <Link to="/login" className="text-sm text-blue-600 hover:underline flex items-center justify-center gap-1">
                  <ArrowLeft className="w-3 h-3" />
                  Вернуться к входу
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
