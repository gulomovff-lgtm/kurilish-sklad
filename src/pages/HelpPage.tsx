import { useState } from 'react';
import {
  Rocket, Users, GitBranch, Activity, Film, BookOpen,
  CheckCircle2, Circle, AlertCircle, XCircle, Clock,
  Package, Wrench, HardHat, Briefcase, Box,
  ArrowRight, ChevronRight, Info, Zap, Shield,
  MessageSquare, Bell, Star, TrendingUp,
} from 'lucide-react';

// ─── Типы вкладок ────────────────────────────────────────────────────────────
type TabId = 'quickstart' | 'roles' | 'chains' | 'statuses' | 'scenarios' | 'glossary';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const TABS: Tab[] = [
  { id: 'quickstart', label: 'Быстрый старт',       icon: Rocket,     color: 'text-orange-500' },
  { id: 'roles',      label: 'Роли и доступ',        icon: Users,      color: 'text-violet-500' },
  { id: 'chains',     label: 'Цепочки',              icon: GitBranch,  color: 'text-blue-500'   },
  { id: 'statuses',   label: 'Статусы',              icon: Activity,   color: 'text-teal-500'   },
  { id: 'scenarios',  label: 'Сценарии',             icon: Film,       color: 'text-pink-500'   },
  { id: 'glossary',   label: 'Сокращения',           icon: BookOpen,   color: 'text-gray-500'   },
];

// ─── Переиспользуемые компоненты ─────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-semibold text-gray-900 mb-4">{children}</h2>;
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 ${className}`}>
      {children}
    </div>
  );
}

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {children}
    </span>
  );
}

function StepRow({ n, label, desc, who }: { n: number; label: string; desc: string; who?: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-full bg-[#a67161] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
        {n}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-gray-900">{label}</span>
          {who && (
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{who}</span>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

// ─── Вкладка 1: Быстрый старт ────────────────────────────────────────────────
function QuickStartTab() {
  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-[#f7ede7] to-[#fdf5f1] border border-[#e8c9bc] p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#a67161] flex items-center justify-center shrink-0">
            <HardHat className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nirvana Luxury Residence</h1>
            <p className="text-gray-600 mt-1">Система управления снабжением строительного объекта</p>
            <p className="text-sm text-gray-500 mt-2">
              Позволяет прорабам создавать заявки на материалы/услуги, а всем участникам
              цепочки — обрабатывать их в своей зоне ответственности с полной прозрачностью.
            </p>
          </div>
        </div>
      </div>

      {/* Как это работает — 3 шага */}
      <Card>
        <SectionTitle>Как работает система</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              icon: '📝', step: '1',
              title: 'Прораб создаёт заявку',
              desc: 'Выбирает тип, заполняет спецификацию — список нужных материалов/услуг с количеством.',
              color: 'bg-blue-50 border-blue-100',
            },
            {
              icon: '🔄', step: '2',
              title: 'Цепочка согласования',
              desc: 'Заявка автоматически проходит нужные этапы: Склад → Начальник → Финансист → Снабжение.',
              color: 'bg-violet-50 border-violet-100',
            },
            {
              icon: '✅', step: '3',
              title: 'Прораб подтверждает',
              desc: 'После доставки прораб нажимает «Получено» — заявка закрывается, история сохраняется.',
              color: 'bg-green-50 border-green-100',
            },
          ].map(item => (
            <div key={item.step} className={`rounded-xl border p-4 ${item.color}`}>
              <div className="text-2xl mb-2">{item.icon}</div>
              <div className="font-semibold text-gray-900 mb-1">{item.title}</div>
              <p className="text-sm text-gray-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Основные разделы */}
      <Card>
        <SectionTitle>Разделы приложения</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { icon: '📊', path: 'Дашборд',     who: 'Все',          desc: 'Сводная статистика: заявки в работе, просроченные, бюджеты по объектам, последние движения.' },
            { icon: '📋', path: 'Заявки',      who: 'Все',          desc: 'Канбан-доска или список всех заявок. Поиск, фильтры, быстрые действия по статусу.' },
            { icon: '🏪', path: 'Склад',       who: 'Склад, Снаб, Нач.', desc: 'Остатки товаров по позициям. История движений. Поступления и выдачи.' },
            { icon: '🛒', path: 'Закупки',     who: 'Снаб, Нач.',   desc: 'Заказы поставщикам (Purchase Orders). Объединение нескольких заявок в один заказ.' },
            { icon: '📈', path: 'Аналитика',   who: 'Нач., Фин.',   desc: 'Графики расходов по времени, объектам, категориям. Выполнение бюджетов.' },
            { icon: '🏗️', path: 'Объекты',     who: 'Нач., Адм.',   desc: 'Строительные объекты: зоны, бюджеты, прикреплённые прорабы.' },
            { icon: '👥', path: 'Пользователи', who: 'Только Адм.', desc: 'Создание и редактирование аккаунтов, назначение ролей, привязка Telegram.' },
            { icon: '🤖', path: 'Telegram-бот', who: 'Только Адм.', desc: 'Настройка бота для уведомлений. Возможность одобрять заявки прямо в мессенджере.' },
          ].map(item => (
            <div key={item.path} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
              <span className="text-xl shrink-0 mt-0.5">{item.icon}</span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900">{item.path}</span>
                  <span className="text-xs text-gray-400 bg-white border border-gray-200 px-2 py-0.5 rounded-full">{item.who}</span>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Типы заявок */}
      <Card>
        <SectionTitle>Типы заявок — выбираешь один из пяти</SectionTitle>
        <div className="space-y-2">
          {[
            { icon: '🧱', type: 'Стройматериалы', chain: 'Склад → Нач. → Снаб.', examples: 'Цемент, арматура, кирпич, плитка, металлопрокат' },
            { icon: '🔧', type: 'Инструменты',    chain: 'Только Склад',            examples: 'Дрель, уровень, шуруповёрт, кайло, молоток' },
            { icon: '🏗️', type: 'Спецтехника',   chain: 'Склад → Нач. → Фин. → Снаб.', examples: 'Экскаватор, кран, автовышка, погрузчик' },
            { icon: '👷', type: 'Услуги/Работы',  chain: 'Нач. → Фин. → Снаб.',    examples: 'Бетонирование, монтаж, электромонтаж, сварка' },
            { icon: '📦', type: 'Прочее',         chain: 'Склад → Нач. → Снаб.',   examples: 'Расходники, СИЗ, хозтовары, канцелярия' },
          ].map(item => (
            <div key={item.type} className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
              <span className="text-2xl shrink-0">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-900">{item.type}</span>
                  <ArrowRight className="w-3 h-3 text-gray-300 shrink-0" />
                  <span className="text-xs font-medium text-[#a67161] bg-[#f7ede7] px-2 py-0.5 rounded-full">{item.chain}</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">Примеры: {item.examples}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-2">
          <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700">
            Цепочка определяется автоматически по типу. При необходимости её можно изменить вручную
            через кнопку «Изменить вручную» на форме создания заявки.
          </p>
        </div>
      </Card>
    </div>
  );
}

// ─── Вкладка 2: Роли и доступ ────────────────────────────────────────────────
function RolesTab() {
  const roles = [
    {
      icon: '👷', role: 'Прораб', code: 'prоrab', color: 'bg-yellow-50 border-yellow-200',
      badge: 'bg-yellow-100 text-yellow-800',
      can: [
        'Создавать заявки от своего имени',
        'Видеть только свои заявки',
        'Подтверждать получение материалов («Получено»)',
        'Отменять свою же заявку пока она на этапе «Новая»',
      ],
      cannot: [
        'Видеть чужие заявки',
        'Просматривать финансовые суммы и бюджеты',
        'Заходить в раздел «Склад»',
        'Менять статусы кроме «Получено»',
      ],
      note: 'Прораб — инициатор. Он создаёт потребность и закрывает процесс подтверждением получения.',
    },
    {
      icon: '🏪', role: 'Склад', code: 'sklad', color: 'bg-orange-50 border-orange-200',
      badge: 'bg-orange-100 text-orange-800',
      can: [
        'Видеть все заявки',
        'Проверять наличие и выдавать материалы',
        'Ставить «Частично выдано» если нет всего',
        'Отправлять заявку дальше по цепочке',
        'Принимать доставки (статус «В пути» → «Выдано»)',
        'Управлять остатками склада',
        'Дробить заявку на складскую и закупочную части',
      ],
      cannot: [
        'Видеть финансовые суммы',
        'Вносить изменения в спецификацию',
        'Управлять пользователями',
      ],
      note: 'Склад — первое звено. При наличии товара сразу выдаёт; при отсутствии — передаёт начальнику.',
    },
    {
      icon: '👔', role: 'Нач. участка', code: 'nachalnik', color: 'bg-indigo-50 border-indigo-200',
      badge: 'bg-indigo-100 text-indigo-800',
      can: [
        'Видеть все заявки + аналитику',
        'Видеть финансовые суммы и бюджеты объектов',
        'Одобрять или отклонять заявки',
        'Редактировать спецификацию (количество/позиции)',
        'Устанавливать коды бюджета',
        'Видеть раздел «Объекты» с бюджетами',
      ],
      cannot: [
        'Редактировать стоимость (это право Финансиста)',
        'Управлять пользователями',
        'Настраивать систему',
      ],
      note: 'Начальник участка — управленческое звено. Решает, нужна ли закупка и целесообразна ли она.',
    },
    {
      icon: '💰', role: 'Финансист', code: 'finansist', color: 'bg-violet-50 border-violet-200',
      badge: 'bg-violet-100 text-violet-800',
      can: [
        'Видеть все заявки + аналитику + бюджеты',
        'Видеть и редактировать финансовые поля',
        'Прикреплять счета и инвойсы',
        'Скачивать прикреплённые счета',
        'Согласовывать бюджет или отклонять',
      ],
      cannot: [
        'Редактировать спецификацию',
        'Управлять пользователями',
        'Работать со складом',
      ],
      note: 'Финансист участвует только при дорогостоящих закупках (Спецтехника, Услуги). Контролирует бюджет.',
    },
    {
      icon: '🚚', role: 'Снабжение', code: 'snab', color: 'bg-sky-50 border-sky-200',
      badge: 'bg-sky-100 text-sky-800',
      can: [
        'Видеть все заявки',
        'Читать остатки склада',
        'Создавать заказы поставщикам (Purchase Orders)',
        'Объединять несколько заявок в один заказ',
        'Переводить статус: Снаб. → Закуплено → В пути',
        'Прикреплять счета и накладные',
      ],
      cannot: [
        'Видеть финансовые суммы',
        'Редактировать остатки склада',
        'Управлять пользователями',
      ],
      note: 'Снабжение — исполнительное звено. Оно размещает заказы у поставщиков и организует доставку.',
    },
    {
      icon: '🛡️', role: 'Администратор', code: 'admin', color: 'bg-red-50 border-red-200',
      badge: 'bg-red-100 text-red-800',
      can: [
        'Полный доступ ко всему без исключений',
        'Создавать, редактировать, удалять пользователей',
        'Назначать роли и привязывать Telegram',
        'Удалять ошибочные заявки',
        'Переводить заявку в любой статус',
        'Настраивать Telegram-бота',
      ],
      cannot: [],
      note: 'Администратор — полный контроль. Используется для технической поддержки и экстренных исправлений.',
    },
  ];

  const [expanded, setExpanded] = useState<string | null>('prоrab');

  return (
    <div className="space-y-6">
      {/* Матрица прав */}
      <Card>
        <SectionTitle>Матрица прав доступа</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 pr-4 font-medium text-gray-500 w-52">Возможность</th>
                {['👷', '🏪', '👔', '💰', '🚚', '🛡️'].map((icon, i) => (
                  <th key={i} className="text-center py-2 px-2 font-medium text-gray-500 w-16">{icon}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[
                { label: 'Создать заявку',     vals: [true, false, false, false, false, true] },
                { label: 'Видеть чужие заявки', vals: [false, true, true, true, true, true] },
                { label: 'Финансовые поля',    vals: [false, false, true, true, false, true] },
                { label: 'Раздел «Склад»',     vals: [false, true, false, false, '👁', true] },
                { label: 'Аналитика',          vals: [false, false, true, true, false, true] },
                { label: 'Бюджеты объектов',   vals: [false, false, true, true, false, true] },
                { label: 'Дробить заявку',     vals: [false, true, false, false, false, true] },
                { label: 'Создать заказ (PO)', vals: [false, false, false, false, true, true] },
                { label: 'Скачать счета',      vals: [false, false, false, true, false, true] },
                { label: 'Прикрепить файлы',   vals: [false, false, false, true, true, true] },
                { label: 'Управление польз.',  vals: [false, false, false, false, false, true] },
                { label: 'Удалить заявку',     vals: [false, false, false, false, false, true] },
              ].map(row => (
                <tr key={row.label} className="hover:bg-gray-50">
                  <td className="py-2 pr-4 text-gray-700">{row.label}</td>
                  {row.vals.map((v, i) => (
                    <td key={i} className="text-center py-2 px-2">
                      {v === true  ? <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" /> :
                       v === false ? <span className="text-gray-200 text-lg leading-none">—</span> :
                       <span className="text-sm">{v}</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-100">
                <td className="py-2 text-xs text-gray-400" colSpan={7}>
                  👁 — только чтение, без изменений
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Аккордеон по ролям */}
      <div className="space-y-3">
        {roles.map(r => (
          <div key={r.code} className={`rounded-2xl border ${r.color} overflow-hidden transition-all`}>
            <button
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/40 transition-colors"
              onClick={() => setExpanded(expanded === r.code ? null : r.code)}
            >
              <span className="text-2xl">{r.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-900">{r.role}</span>
                  <Badge color={r.badge}>{r.code}</Badge>
                </div>
                <p className="text-sm text-gray-500 mt-0.5 truncate">{r.note}</p>
              </div>
              <ChevronRight className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${expanded === r.code ? 'rotate-90' : ''}`} />
            </button>
            {expanded === r.code && (
              <div className="px-4 pb-4 pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2">✅ Может</p>
                    <ul className="space-y-1">
                      {r.can.map((c, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {r.cannot.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2">❌ Не может</p>
                      <ul className="space-y-1">
                        {r.cannot.map((c, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <XCircle className="w-3.5 h-3.5 text-red-300 shrink-0 mt-0.5" />
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Вкладка 3: Цепочки согласования ────────────────────────────────────────
function ChainsTab() {
  const chains = [
    {
      id: 'warehouse_only',
      label: 'warehouse_only',
      title: 'Только склад',
      emoji: '🏪',
      color: 'bg-emerald-50 border-emerald-200',
      badgeColor: 'bg-emerald-100 text-emerald-700',
      useFor: 'Инструменты и мелкий инвентарь — то, что точно есть на складе.',
      steps: [
        { label: 'Создана',   who: 'Прораб',  note: 'Заявка создана, ожидает склад' },
        { label: 'Склад',     who: 'Склад',   note: 'Кладовщик проверяет наличие и выдаёт' },
        { label: 'Выдано',    who: 'Прораб',  note: 'Материал передан прорабу на объекте' },
        { label: 'Получено',  who: '✅ Финал', note: 'Прораб подтверждает физическое получение' },
      ],
      timing: '~2–8 часов',
    },
    {
      id: 'full',
      label: 'full',
      title: 'Склад → Нач. → Снаб.',
      emoji: '🔀',
      color: 'bg-blue-50 border-blue-200',
      badgeColor: 'bg-blue-100 text-blue-700',
      useFor: 'Стройматериалы по умолчанию — сначала проверяет склад, если нет — идёт на закупку.',
      steps: [
        { label: 'Создана',     who: 'Прораб',   note: 'Прораб отправил заявку' },
        { label: 'У склада',    who: 'Склад',     note: 'Склад проверяет наличие' },
        { label: 'Нач. участка',who: 'Нач.',      note: 'Начальник одобряет закупку' },
        { label: 'Снабжение',   who: 'Снаб.',     note: 'Снабжение ищет поставщика' },
        { label: 'Закуплено',   who: 'Снаб.',     note: 'Заказ размещён у поставщика' },
        { label: 'В пути',      who: 'Снаб.',     note: 'Товар отгружен, едет на объект' },
        { label: 'Выдано',      who: 'Склад',     note: 'Склад принял и выдал материал' },
        { label: 'Получено',    who: '✅ Финал',  note: 'Прораб подтвердил получение' },
      ],
      timing: '2–5 дней',
    },
    {
      id: 'purchase_only',
      label: 'purchase_only',
      title: 'Нач. → Снаб.',
      emoji: '🛒',
      color: 'bg-purple-50 border-purple-200',
      badgeColor: 'bg-purple-100 text-purple-700',
      useFor: 'Материалы, которых заведомо нет на складе — пропускаем этап проверки склада.',
      steps: [
        { label: 'Создана',     who: 'Прораб',  note: 'Заявка на закупку создана' },
        { label: 'Нач. участка',who: 'Нач.',    note: 'Начальник одобряет или отклоняет' },
        { label: 'Одобрено',    who: 'Нач.',    note: 'Решение принято, передаётся снабжению' },
        { label: 'Снабжение',   who: 'Снаб.',   note: 'Снабжение оформляет заказ' },
        { label: 'Закуплено',   who: 'Снаб.',   note: 'Заказ размещён' },
        { label: 'В пути',      who: 'Снаб.',   note: 'Едет на объект' },
        { label: 'Выдано',      who: 'Склад',   note: 'Выдано прорабу' },
        { label: 'Получено',    who: '✅ Финал', note: 'Прораб подтвердил' },
      ],
      timing: '2–4 дня',
    },
    {
      id: 'full_finance',
      label: 'full_finance',
      title: 'Склад → Нач. → Фин. → Снаб.',
      emoji: '💰',
      color: 'bg-violet-50 border-violet-200',
      badgeColor: 'bg-violet-100 text-violet-700',
      useFor: 'Спецтехника и дорогостоящие позиции — требуется финансовое согласование сметы.',
      steps: [
        { label: 'Создана',     who: 'Прораб',    note: 'Заявка создана' },
        { label: 'У склада',    who: 'Склад',     note: 'Склад проверяет наличие' },
        { label: 'Нач. участка',who: 'Нач.',      note: 'Начальник одобряет техзадание' },
        { label: 'Финансист',   who: 'Финансист', note: 'Финансист согласует бюджет и смету' },
        { label: 'Снабжение',   who: 'Снаб.',     note: 'Снабжение оформляет заказ' },
        { label: 'Закуплено',   who: 'Снаб.',     note: 'Заказ размещён' },
        { label: 'В пути',      who: 'Снаб.',     note: 'Едет на объект' },
        { label: 'Выдано',      who: 'Склад',     note: 'Принято и выдано' },
        { label: 'Получено',    who: '✅ Финал',  note: 'Прораб закрыл заявку' },
      ],
      timing: '3–7 дней',
    },
    {
      id: 'finance_only',
      label: 'finance_only',
      title: 'Нач. → Фин. → Снаб.',
      emoji: '📑',
      color: 'bg-pink-50 border-pink-200',
      badgeColor: 'bg-pink-100 text-pink-700',
      useFor: 'Услуги и работы — не проходят через склад, но требуют согласования бюджета.',
      steps: [
        { label: 'Создана',     who: 'Прораб',    note: 'Заявка на услугу создана' },
        { label: 'Нач. участка',who: 'Нач.',      note: 'Одобряет техническую часть' },
        { label: 'Финансист',   who: 'Финансист', note: 'Согласует стоимость работ' },
        { label: 'Снабжение',   who: 'Снаб.',     note: 'Заключает договор с подрядчиком' },
        { label: 'Закуплено',   who: 'Снаб.',     note: 'Договор подписан / аванс оплачен' },
        { label: 'В пути',      who: 'Снаб.',     note: 'Работы выполняются' },
        { label: 'Выдано',      who: 'Склад',     note: 'Работы приняты' },
        { label: 'Получено',    who: '✅ Финал',  note: 'Прораб подтвердил выполнение' },
      ],
      timing: '3–10 дней',
    },
  ];

  const [activeChain, setActiveChain] = useState('full');
  const chain = chains.find(c => c.id === activeChain)!;

  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle>Выбери тип цепочки</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {chains.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveChain(c.id)}
              className={`text-left p-3 rounded-xl border-2 transition-all ${
                activeChain === c.id
                  ? c.color + ' shadow-sm'
                  : 'border-gray-100 bg-white hover:border-gray-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{c.emoji}</span>
                <span className={`text-xs font-mono font-medium px-2 py-0.5 rounded-full ${c.badgeColor}`}>{c.label}</span>
              </div>
              <p className="font-semibold text-gray-900 text-sm">{c.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">⏱ {c.timing}</p>
            </button>
          ))}
        </div>

        {/* Детальный вид выбранной цепочки */}
        <div className={`rounded-2xl border p-5 ${chain.color}`}>
          <div className="flex items-start gap-3 mb-5">
            <span className="text-3xl">{chain.emoji}</span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-gray-900 text-lg">{chain.title}</h3>
                <Badge color={chain.badgeColor}>{chain.label}</Badge>
                <Badge color="bg-gray-100 text-gray-600">⏱ {chain.timing}</Badge>
              </div>
              <p className="text-sm text-gray-600 mt-1">{chain.useFor}</p>
            </div>
          </div>

          {/* Визуальный таймлайн */}
          <div className="space-y-0">
            {chain.steps.map((step, idx) => (
              <div key={idx} className="flex gap-3">
                {/* Линия + точка */}
                <div className="flex flex-col items-center shrink-0">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                    step.who === '✅ Финал'
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'bg-white border-gray-300 text-gray-600'
                  }`}>
                    {step.who === '✅ Финал' ? '✓' : idx + 1}
                  </div>
                  {idx < chain.steps.length - 1 && (
                    <div className="w-0.5 h-8 bg-gray-200 mt-0.5" />
                  )}
                </div>
                {/* Контент */}
                <div className="pb-6 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">{step.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      step.who === '✅ Финал' ? 'bg-green-100 text-green-700' : 'bg-white/70 text-gray-500 border border-gray-200'
                    }`}>{step.who}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{step.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* SLA таблица */}
      <Card>
        <SectionTitle>Нормативы SLA по этапам</SectionTitle>
        <p className="text-sm text-gray-500 mb-4">
          SLA (Service Level Agreement) — максимальное время обработки этапа. При превышении карточка подсвечивается красным и уходит уведомление в Telegram.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="pb-2 pr-4 font-medium text-gray-500">Этап</th>
                <th className="pb-2 pr-4 font-medium text-gray-500">Ответственный</th>
                <th className="pb-2 font-medium text-gray-500">Норматив</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[
                { stage: 'У склада (sklad_review)',          who: 'Склад',     sla: '8 часов',  urgency: 'text-green-600' },
                { stage: 'На согласовании (нач.)',           who: 'Нач. участка', sla: '24 часа', urgency: 'text-yellow-600' },
                { stage: 'На согласовании (фин.)',           who: 'Финансист', sla: '48 часов', urgency: 'text-yellow-600' },
                { stage: 'В работе снабжения (snab_process)',who: 'Снабжение', sla: '72 часа',  urgency: 'text-orange-600' },
                { stage: 'Закуплено (zakupleno)',             who: 'Снабжение', sla: '24 часа',  urgency: 'text-yellow-600' },
                { stage: 'В пути (v_puti)',                  who: 'Склад',     sla: '48 часов', urgency: 'text-yellow-600' },
              ].map(row => (
                <tr key={row.stage} className="hover:bg-gray-50">
                  <td className="py-2 pr-4 text-gray-700 font-medium">{row.stage}</td>
                  <td className="py-2 pr-4 text-gray-500">{row.who}</td>
                  <td className={`py-2 font-semibold ${row.urgency}`}>{row.sla}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          Если SLA нарушено — в Telegram уходит уведомление ответственному и администратору. Карточка заявки подсвечивается красным.
        </div>
      </Card>
    </div>
  );
}

// ─── Вкладка 4: Статусы ──────────────────────────────────────────────────────
function StatusesTab() {
  const statuses = [
    { code: 'novaya',             label: 'Новая',                  color: 'bg-blue-100 text-blue-800',    dot: 'bg-blue-400',    who: 'Склад / Нач.',  desc: 'Заявка только что создана прорабом. Ждёт первичной обработки.' },
    { code: 'sklad_review',       label: 'У склада',               color: 'bg-orange-100 text-orange-800',dot: 'bg-orange-400',  who: 'Склад',         desc: 'Кладовщик проверяет наличие товара. Может выдать или передать дальше.' },
    { code: 'sklad_partial',      label: 'Частично выдано',        color: 'bg-amber-100 text-amber-800',  dot: 'bg-amber-400',   who: 'Нач. участка',  desc: 'Склад выдал часть позиций. Остаток пошёл на согласование к начальнику.' },
    { code: 'nachalnik_review',   label: 'На согласовании (нач.)', color: 'bg-purple-100 text-purple-800',dot: 'bg-purple-400',  who: 'Нач. участка',  desc: 'Начальник принимает решение: одобрить закупку или отклонить заявку.' },
    { code: 'nachalnik_approved', label: 'Одобрено нач-ком',       color: 'bg-indigo-100 text-indigo-800',dot: 'bg-indigo-400',  who: 'Снаб. / Склад', desc: 'Начальник одобрил. Переходит к финансисту (если full_finance) или снабжению.' },
    { code: 'finansist_review',   label: 'На согласовании (фин.)', color: 'bg-pink-100 text-pink-800',    dot: 'bg-pink-400',    who: 'Финансист',     desc: 'Финансист проверяет бюджет и сметную стоимость. SLA: 48 часов.' },
    { code: 'finansist_approved', label: 'Одобрено финансистом',   color: 'bg-violet-100 text-violet-800',dot: 'bg-violet-400',  who: 'Снабжение',     desc: 'Финансист согласовал. Снабжение начинает закупку.' },
    { code: 'snab_process',       label: 'В работе (снаб)',        color: 'bg-cyan-100 text-cyan-800',    dot: 'bg-cyan-400',    who: 'Снабжение',     desc: 'Снабжение ищет и согласует поставщика. SLA: 72 часа.' },
    { code: 'zakupleno',          label: 'Закуплено',              color: 'bg-teal-100 text-teal-800',    dot: 'bg-teal-400',    who: 'Снабжение',     desc: 'Заказ размещён у поставщика. Снабжение переводит в «В пути» после отгрузки.' },
    { code: 'v_puti',             label: 'В пути',                 color: 'bg-sky-100 text-sky-800',      dot: 'bg-sky-400',     who: 'Склад',         desc: 'Товар отгружен поставщиком. Едет на объект. Склад принимает и выдаёт.' },
    { code: 'vydano',             label: 'Выдано',                 color: 'bg-lime-100 text-lime-800',    dot: 'bg-lime-400',    who: 'Прораб',        desc: 'Склад передал материал прорабу. Ждёт подтверждения получения.' },
    { code: 'polucheno',          label: 'Получено ✅',            color: 'bg-green-100 text-green-800',  dot: 'bg-green-500',   who: '— финал —',     desc: 'Прораб подтвердил получение. Заявка успешно закрыта. Склад списан.' },
    { code: 'otkloneno',          label: 'Отклонено ❌',           color: 'bg-red-100 text-red-800',      dot: 'bg-red-400',     who: '— финал —',     desc: 'Заявка отклонена. Причина фиксируется в комментарии и истории.' },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle>Все статусы заявки</SectionTitle>
        <div className="space-y-2">
          {statuses.map(s => (
            <div key={s.code} className={`flex items-start gap-3 p-3 rounded-xl ${
              s.code === 'polucheno' ? 'bg-green-50 border border-green-100' :
              s.code === 'otkloneno' ? 'bg-red-50 border border-red-100' :
              'bg-gray-50'
            }`}>
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 ${s.dot}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
                  <span className="text-xs text-gray-400 font-mono">{s.code}</span>
                  <span className="text-xs text-gray-400">→ действует: <strong className="text-gray-600">{s.who}</strong></span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Прогресс */}
      <Card>
        <SectionTitle>Прогресс выполнения заявки</SectionTitle>
        <p className="text-sm text-gray-500 mb-4">Прогресс-бар на карточке заявки рассчитывается автоматически:</p>
        <div className="space-y-2">
          {[
            { label: 'Новая',              val: 7  },
            { label: 'У склада',           val: 18 },
            { label: 'Частично выдано',    val: 28 },
            { label: 'На согл. нач.',      val: 38 },
            { label: 'Одобрено нач.',      val: 50 },
            { label: 'На согл. фин.',      val: 60 },
            { label: 'Одобрено фин.',      val: 70 },
            { label: 'В работе снаб.',     val: 78 },
            { label: 'Закуплено',          val: 86 },
            { label: 'В пути',             val: 92 },
            { label: 'Выдано',             val: 96 },
            { label: 'Получено',           val: 100},
          ].map(row => (
            <div key={row.label} className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-36 shrink-0">{row.label}</span>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${row.val}%`, background: row.val === 100 ? '#22c55e' : '#a67161' }}
                />
              </div>
              <span className="text-xs font-mono text-gray-500 w-8 text-right">{row.val}%</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── Вкладка 5: Сценарии ─────────────────────────────────────────────────────
function ScenariosTab() {
  const [active, setActive] = useState(0);

  const scenarios = [
    {
      icon: '👷',
      title: 'Прораб создаёт заявку',
      badge: 'bg-yellow-100 text-yellow-800',
      desc: 'Стандартный запрос на материалы. Пример: нужен цемент М400 — 50 мешков для блока B.',
      steps: [
        { n: 1, label: 'Открыть «Заявки»', desc: 'Нажать кнопку «Новая заявка» в правом верхнем углу', who: 'Прораб' },
        { n: 2, label: 'Выбрать объект',   desc: 'Выбрать строительный объект и зону (например, Блок B, зона 2)', who: 'Прораб' },
        { n: 3, label: 'Тип заявки',       desc: 'Выбрать «Стройматериалы» → цепочка автоматически станет «Склад → Нач. → Снаб.»', who: 'Прораб' },
        { n: 4, label: 'Спецификация',     desc: 'Добавить позиции: «Цемент М400, шт./мешок, 50 шт.» Можно добавить несколько строк', who: 'Прораб' },
        { n: 5, label: 'Срочность и дата', desc: 'Указать срочность (Обычная / Срочно / Критично!) и желаемую дату поставки', who: 'Прораб' },
        { n: 6, label: 'Создать',          desc: 'Нажать «Создать заявку». Кладовщик получит уведомление в Telegram', who: 'Прораб' },
      ],
      result: 'Заявка создана со статусом «Новая». Уходит уведомление кладовщику.',
    },
    {
      icon: '🏪',
      title: 'Склад обрабатывает заявку',
      badge: 'bg-orange-100 text-orange-800',
      desc: 'Кладовщик проверяет наличие на складе и принимает решение: выдать, передать или разделить.',
      steps: [
        { n: 1, label: 'Найти заявку',      desc: 'В разделе «Заявки» найти карточки с бейджем 🔔 «Требует действия»', who: 'Склад' },
        { n: 2, label: 'Открыть заявку',    desc: 'Просмотреть спецификацию — что нужно и в каком количестве', who: 'Склад' },
        { n: 3, label: 'Проверить остатки', desc: 'Сравнить с остатками в разделе «Склад» → проверить достаточно ли позиций', who: 'Склад' },
        { n: 4, label: 'Принять решение',   desc: '• Всё есть → нажать «Выдано» (автоматически спишется со склада)\n• Нет вообще → «На согласование» начальнику\n• Часть есть → «Частично выдано», заполнить что выдаёшь', who: 'Склад' },
        { n: 5, label: 'Комментарий',       desc: '(Опционально) Оставить комментарий для прораба или начальника', who: 'Склад' },
      ],
      result: 'Если выдано — склад списан, прораб получает уведомление. Если передано начальнику — он получает запрос.',
    },
    {
      icon: '👔',
      title: 'Начальник согласует закупку',
      badge: 'bg-indigo-100 text-indigo-800',
      desc: 'Начальник участка принимает решение о целесообразности закупки.',
      steps: [
        { n: 1, label: 'Получить уведомление', desc: 'Telegram-уведомление или бейдж 🔔 в приложении', who: 'Нач.' },
        { n: 2, label: 'Открыть заявку',       desc: 'Просмотреть позиции, количество, желаемую дату, объект и зону', who: 'Нач.' },
        { n: 3, label: 'Проверить бюджет',     desc: 'При наличии сметной стоимости — сравнить с бюджетом объекта', who: 'Нач.' },
        { n: 4, label: 'Принять решение',      desc: '• «Одобрено» → заявка уходит к снабжению (или финансисту для full_finance)\n• «Отклонено» → написать причину в комментарии, прораб получит уведомление', who: 'Нач.' },
      ],
      result: 'При одобрении снабжение (или финансист) получает уведомление и приступает к своим действиям.',
    },
    {
      icon: '💰',
      title: 'Финансист согласует бюджет',
      badge: 'bg-violet-100 text-violet-800',
      desc: 'Используется только в цепочках full_finance и finance_only (Спецтехника, Услуги).',
      steps: [
        { n: 1, label: 'Открыть заявку',         desc: 'Найти заявки со статусом «На согласовании (фин.)»', who: 'Финансист' },
        { n: 2, label: 'Проверить смету',         desc: 'Просмотреть сметную стоимость, код бюджета, историю согласования', who: 'Финансист' },
        { n: 3, label: 'Проверить бюджет объекта',desc: 'В разделе «Объекты» посмотреть исполнение бюджета объекта', who: 'Финансист' },
        { n: 4, label: 'Прикрепить документ',     desc: '(Опционально) Прикрепить предварительный счёт или смету PDF', who: 'Финансист' },
        { n: 5, label: 'Принять решение',         desc: '• «Одобрено» → снабжение получает задачу\n• «Отклонено» → написать финансовую причину', who: 'Финансист' },
      ],
      result: 'После одобрения снабжение приступает к поиску поставщика и оформлению заказа.',
    },
    {
      icon: '🚚',
      title: 'Снабжение оформляет закупку',
      badge: 'bg-sky-100 text-sky-800',
      desc: 'Снабжение находит поставщика, оформляет заказ и организует доставку.',
      steps: [
        { n: 1, label: 'Просмотреть заявки',    desc: 'В разделе «Заявки» найти заявки со статусом «В работе (снаб)»', who: 'Снаб.' },
        { n: 2, label: 'Объединить в заказ',    desc: '(Опционально) Выделить несколько заявок → «Сформировать заказ поставщику» (PO) для оптовой закупки', who: 'Снаб.' },
        { n: 3, label: 'Разместить заказ',      desc: 'Связаться с поставщиком, согласовать цену и сроки', who: 'Снаб.' },
        { n: 4, label: 'Статус «Закуплено»',    desc: 'Нажать «Закуплено» в заявке — ввести фактическую цену и счёт', who: 'Снаб.' },
        { n: 5, label: 'Статус «В пути»',      desc: 'После отгрузки поставщиком нажать «В пути» — склад получит уведомление', who: 'Снаб.' },
        { n: 6, label: 'Склад выдаёт',          desc: 'Склад принимает товар и переводит статус в «Выдано»', who: 'Склад' },
      ],
      result: '«В пути» → Склад принимает → Прораб получает уведомление → подтверждает «Получено».',
    },
    {
      icon: '✅',
      title: 'Прораб подтверждает получение',
      badge: 'bg-green-100 text-green-700',
      desc: 'Финальный шаг — прораб физически получает материалы и закрывает заявку.',
      steps: [
        { n: 1, label: 'Получить уведомление', desc: 'Telegram: «Ваша заявка #123 выдана со склада»', who: 'Прораб' },
        { n: 2, label: 'Проверить комплектность', desc: 'Сверить фактически полученное с позициями в заявке', who: 'Прораб' },
        { n: 3, label: 'Открыть заявку',       desc: 'Перейти в приложение → открыть заявку со статусом «Выдано»', who: 'Прораб' },
        { n: 4, label: 'Нажать «Получено»',    desc: 'Нажать кнопку «Получено» — заявка переходит в финальный статус ✅', who: 'Прораб' },
      ],
      result: 'Заявка закрыта. Вся история сохранена. Списание склада уже произошло на этапе «Выдано».',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Навигация сценариев */}
      <div className="flex gap-2 flex-wrap">
        {scenarios.map((s, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
              active === i
                ? `${s.badge} border-transparent shadow-sm`
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            <span>{s.icon}</span>
            {s.title}
          </button>
        ))}
      </div>

      {/* Активный сценарий */}
      {scenarios.map((s, i) => (
        active === i && (
          <Card key={i}>
            <div className="flex items-start gap-3 mb-5">
              <span className="text-3xl">{s.icon}</span>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">{s.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{s.desc}</p>
              </div>
            </div>

            <div className="space-y-4">
              {s.steps.map(step => (
                <StepRow key={step.n} n={step.n} label={step.label} desc={step.desc} who={step.who} />
              ))}
            </div>

            <div className="mt-5 p-3 bg-green-50 border border-green-100 rounded-xl flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
              <p className="text-sm text-green-700"><strong>Результат:</strong> {s.result}</p>
            </div>
          </Card>
        )
      ))}
    </div>
  );
}

// ─── Вкладка 6: Сокращения ───────────────────────────────────────────────────
function GlossaryTab() {
  const groups = [
    {
      title: 'Роли',
      color: 'bg-violet-50',
      icon: '👥',
      items: [
        { term: 'Прораб',         full: 'Производитель работ',  desc: 'Руководитель строительного участка. Создаёт заявки и принимает материалы.' },
        { term: 'Нач. / Нач. уч.', full: 'Начальник участка',  desc: 'Управленческая роль. Одобряет или отклоняет закупки.' },
        { term: 'Снаб.',          full: 'Снабженец / Снабжение',desc: 'Роль, занимающаяся закупками у поставщиков.' },
        { term: 'Фин.',           full: 'Финансист',            desc: 'Согласует бюджет при дорогостоящих закупках.' },
        { term: 'Адм.',           full: 'Администратор',        desc: 'Полный доступ к системе. Управление пользователями и настройками.' },
      ],
    },
    {
      title: 'Цепочки согласования',
      color: 'bg-blue-50',
      icon: '🔀',
      items: [
        { term: 'full',           full: 'Полная цепочка',       desc: 'Склад → Нач. участка → Снабжение. По умолчанию для стройматериалов.' },
        { term: 'warehouse_only', full: 'Только склад',         desc: 'Склад → Выдано. Для инструментов и того, что точно есть на складе.' },
        { term: 'purchase_only',  full: 'Только закупка',       desc: 'Нач. → Снабжение. Без проверки склада, когда точно нет в наличии.' },
        { term: 'full_finance',   full: 'Полная + Финансист',   desc: 'Склад → Нач. → Финансист → Снабжение. Для спецтехники.' },
        { term: 'finance_only',   full: 'Нач. + Финансист',     desc: 'Нач. → Финансист → Снабжение. Для услуг и работ.' },
      ],
    },
    {
      title: 'Статусы (коды)',
      color: 'bg-teal-50',
      icon: '📋',
      items: [
        { term: 'novaya',             full: 'Новая',                desc: 'Заявка создана, ещё не обработана.' },
        { term: 'sklad_review',       full: 'У склада',             desc: 'Кладовщик проверяет наличие. SLA: 8 ч.' },
        { term: 'sklad_partial',      full: 'Частично выдано',      desc: 'Часть позиций выдана, остаток идёт на закупку.' },
        { term: 'nachalnik_review',   full: 'Согл. нач.',           desc: 'Начальник принимает решение. SLA: 24 ч.' },
        { term: 'nachalnik_approved', full: 'Одобрено нач.',        desc: 'Начальник одобрил — переходит дальше.' },
        { term: 'finansist_review',   full: 'Согл. фин.',           desc: 'Финансист согласовывает бюджет. SLA: 48 ч.' },
        { term: 'finansist_approved', full: 'Одобрено фин.',        desc: 'Финансист одобрил — идёт в снабжение.' },
        { term: 'snab_process',       full: 'В работе снаб.',       desc: 'Снабжение ищет поставщика. SLA: 72 ч.' },
        { term: 'zakupleno',          full: 'Закуплено',            desc: 'Заказ размещён у поставщика.' },
        { term: 'v_puti',             full: 'В пути',               desc: 'Товар отгружен, едет на объект. SLA: 48 ч.' },
        { term: 'vydano',             full: 'Выдано',               desc: 'Склад передал материал прорабу.' },
        { term: 'polucheno',          full: 'Получено ✅',           desc: 'Прораб подтвердил — финальный статус.' },
        { term: 'otkloneno',          full: 'Отклонено ❌',          desc: 'Заявка отклонена — причина в комментарии.' },
      ],
    },
    {
      title: 'Термины и аббревиатуры',
      color: 'bg-gray-50',
      icon: '📚',
      items: [
        { term: 'SLA',      full: 'Service Level Agreement',     desc: 'Нормативное время обработки этапа. При превышении — красная подсветка и Telegram-алерт.' },
        { term: 'PO',       full: 'Purchase Order',              desc: 'Заказ поставщику — объединение нескольких заявок в один закупочный документ.' },
        { term: 'RBAC',     full: 'Role-Based Access Control',   desc: 'Система прав доступа — каждая роль видит и может делать только своё.' },
        { term: 'chain',    full: 'Цепочка согласования',        desc: 'Маршрут, по которому проходит заявка (набор этапов и их порядок).' },
        { term: 'К',        full: 'Тысяч (в суммах)',           desc: 'Например «150К» = 150 000 сум. Используется для компактного отображения.' },
        { term: 'ФГ / ИО', full: 'Фамилия + инициалы',          desc: 'Сокращённое отображение имени пользователя в карточках и истории.' },
        { term: 'СИЗ',     full: 'Средства индивидуальной защиты', desc: 'Каски, перчатки, ботинки, очки и прочий защитный инвентарь.' },
        { term: 'Дедлайн', full: 'Желаемая дата поставки',      desc: 'Дата, к которой прораб хочет получить материалы. Влияет на приоритет.' },
      ],
    },
  ];

  return (
    <div className="space-y-5">
      {groups.map(g => (
        <Card key={g.title}>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">{g.icon}</span>
            <SectionTitle>{g.title}</SectionTitle>
          </div>
          <div className="space-y-2">
            {g.items.map(item => (
              <div key={item.term} className={`flex items-start gap-3 p-3 rounded-xl ${g.color}`}>
                <code className="text-xs font-bold font-mono bg-white border border-gray-200 px-2 py-1 rounded-lg shrink-0 min-w-[110px] text-center">
                  {item.term}
                </code>
                <div>
                  <p className="font-medium text-gray-900 text-sm">{item.full}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}

      {/* Советы */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-5 h-5 text-amber-400" />
          <SectionTitle>Полезные советы</SectionTitle>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { icon: '🔔', tip: 'Telegram-уведомления', desc: 'Попросите администратора привязать ваш Telegram к аккаунту — получайте мгновенные уведомления о действиях с вашими заявками.' },
            { icon: '⚡', tip: 'Компактный режим',     desc: 'Нажмите иконку сетки в верхнем углу — переключайтесь между компактным и подробным видом канбан-карточек.' },
            { icon: '🔍', tip: 'Быстрый поиск',       desc: 'Поиск работает по названию, номеру заявки, объекту и имени создателя. Используйте #123 для поиска по номеру.' },
            { icon: '📊', tip: 'Группировка',         desc: 'В «Параметрах вида» включите «Группировать по объекту» — заявки сгруппируются по строительным блокам.' },
            { icon: '🚀', tip: 'Срочность «Критично»', desc: 'Заявки с уровнем «Критично!» выделяются красной рамкой и попадают в фильтр «Срочные» — их обрабатывают в первую очередь.' },
            { icon: '📋', tip: 'История изменений',   desc: 'В карточке заявки виден полный таймлайн: кто, когда и куда перевёл статус — с временнЫми метками и комментариями.' },
          ].map(item => (
            <div key={item.tip} className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
              <span className="text-xl shrink-0">{item.icon}</span>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{item.tip}</p>
                <p className="text-xs text-gray-600 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── Главный компонент ───────────────────────────────────────────────────────
export default function HelpPage() {
  const [activeTab, setActiveTab] = useState<TabId>('quickstart');

  const renderTab = () => {
    switch (activeTab) {
      case 'quickstart': return <QuickStartTab />;
      case 'roles':      return <RolesTab />;
      case 'chains':     return <ChainsTab />;
      case 'statuses':   return <StatusesTab />;
      case 'scenarios':  return <ScenariosTab />;
      case 'glossary':   return <GlossaryTab />;
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Заголовок */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[#a67161] flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Инструкция</h1>
          <p className="text-sm text-gray-500">Руководство по работе с системой снабжения</p>
        </div>
      </div>

      {/* Вкладки */}
      <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 mb-6 overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? tab.color : 'text-gray-400'}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Контент */}
      {renderTab()}
    </div>
  );
}
