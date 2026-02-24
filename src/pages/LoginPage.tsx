import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Заполните все поля');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка входа';
      if (msg.includes('invalid-credential') || msg.includes('wrong-password') || msg.includes('user-not-found')) {
        toast.error('Неверный email или пароль');
      } else {
        toast.error('Ошибка: ' + msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#fdf9f7' }}>
      {/* Left decorative panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-[45%] shrink-0 p-12"
        style={{ background: 'linear-gradient(160deg, #2a1208 0%, #4f2415 60%, #a67161 100%)' }}
      >
        <div>
          <img
            src="https://nirvanaresidence.uz/assets/img/logo.svg"
            alt="Nirvana"
            className="w-24 mb-16 opacity-90"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <h2 className="font-display text-white text-5xl font-light leading-tight mb-4">
            NIRVANA<br />LUXURY<br />RESIDENCE
          </h2>
          <p className="text-sm mt-6" style={{ color: '#c89587', lineHeight: '1.7' }}>
            Система управления складом<br />и заявками строительного проекта
          </p>
        </div>
        <div className="space-y-3 text-xs" style={{ color: '#a07060' }}>
          <p>👷 Прораб — создаёт заявки на материалы</p>
          <p>🏪 Склад — выдаёт со склада или направляет дальше</p>
          <p>👔 Нач. участка — одобряет или отклоняет</p>
          <p>💰 Финансист — согласует бюджет</p>
          <p>🚚 Снабжение — закупает материалы</p>
        </div>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <img
              src="https://nirvanaresidence.uz/assets/img/logo.svg"
              alt="Nirvana"
              className="w-16 h-16 object-contain mx-auto mb-3"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <h1 className="font-display text-2xl font-semibold" style={{ color: '#59301f' }}>Nirvana Luxury Residence</h1>
          </div>

          <div className="mb-8">
            <h2 className="font-display text-3xl font-medium" style={{ color: '#59301f' }}>Вход</h2>
            <p className="text-sm mt-1" style={{ color: '#a07060' }}>Система управления складом и заявками</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: '#a07060' }}>
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#c89587' }} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border text-sm transition-all outline-none"
                  style={{ borderColor: '#ddb8a6', background: '#fff', color: '#59301f' }}
                  onFocus={e => e.currentTarget.style.borderColor = '#c89587'}
                  onBlur={e => e.currentTarget.style.borderColor = '#ddb8a6'}
                  placeholder="your@email.com"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: '#a07060' }}>
                Пароль
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#c89587' }} />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border text-sm transition-all outline-none"
                  style={{ borderColor: '#ddb8a6', background: '#fff', color: '#59301f' }}
                  onFocus={e => e.currentTarget.style.borderColor = '#c89587'}
                  onBlur={e => e.currentTarget.style.borderColor = '#ddb8a6'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-white transition-all mt-2 disabled:opacity-60"
              style={{ background: '#c89587' }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = '#a67161'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#c89587'; }}
            >
              {loading
                ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : 'Войти в систему'}
            </button>
          </form>

          <p className="text-center text-xs mt-8" style={{ color: '#c8a090' }}>
            © 2026 Nirvana Luxury Residence
          </p>
        </div>
      </div>
    </div>
  );
}
