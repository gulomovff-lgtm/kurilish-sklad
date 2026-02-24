import type { RequestStatus, UserRole, RequestChain, RequestType, UrgencyLevel, TelegramEvent, MaterialCatalogItem } from './types';

export const ROLE_LABELS: Record<UserRole, string> = {
  prоrab: 'Прораб',
  sklad: 'Склад',
  nachalnik: 'Нач. участка',
  finansist: 'Финансист',
  snab: 'Снабжение',
  admin: 'Администратор',
};

export const ROLE_ICONS: Record<UserRole, string> = {
  prоrab: '👷',
  sklad: '🏪',
  nachalnik: '👔',
  finansist: '💰',
  snab: '🚚',
  admin: '🛡️',
};

export const STATUS_LABELS: Record<RequestStatus, string> = {
  novaya: 'Новая',
  sklad_review: 'У склада',
  sklad_partial: 'Частично выдано',
  nachalnik_review: 'У начальника',
  nachalnik_approved: 'Одобрено нач.',
  finansist_review: 'У финансиста',
  finansist_approved: 'Одобрено фин.',
  snab_process: 'В снабжении',
  zakupleno: 'Закуплено',
  vydano: 'Выдано ✓',
  otkloneno: 'Отклонено ✗',
};

export const STATUS_COLORS: Record<RequestStatus, string> = {
  novaya: 'bg-blue-100 text-blue-800',
  sklad_review: 'bg-yellow-100 text-yellow-800',
  sklad_partial: 'bg-orange-100 text-orange-800',
  nachalnik_review: 'bg-purple-100 text-purple-800',
  nachalnik_approved: 'bg-indigo-100 text-indigo-800',
  finansist_review: 'bg-pink-100 text-pink-800',
  finansist_approved: 'bg-violet-100 text-violet-800',
  snab_process: 'bg-cyan-100 text-cyan-800',
  zakupleno: 'bg-teal-100 text-teal-800',
  vydano: 'bg-green-100 text-green-800',
  otkloneno: 'bg-red-100 text-red-800',
};

export const CHAIN_LABELS: Record<RequestChain, string> = {
  full: 'Склад → Нач. → Снаб.',
  warehouse_only: 'Только склад',
  purchase_only: 'Нач. → Снаб.',
  full_finance: 'Склад → Нач. → Фин. → Снаб.',
  finance_only: 'Нач. → Фин. → Снаб.',
};

export const CHAIN_DESCRIPTIONS: Record<RequestChain, string> = {
  full: 'Склад выдаёт → если нет — Начальник одобряет → Снабжение закупает',
  warehouse_only: 'Материалы есть на складе — просто выдать',
  purchase_only: 'Нет на складе — Начальник одобряет → Снабжение закупает',
  full_finance: 'Склад → Начальник → Финансист согласует бюджет → Снабжение',
  finance_only: 'Начальник одобряет → Финансист согласует → Снабжение закупает',
};

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  materials: 'Стройматериалы',
  tools: 'Инструменты',
  equipment: 'Спецтехника',
  services: 'Услуги / Работы',
  other: 'Прочее',
};

export const REQUEST_TYPE_ICONS: Record<RequestType, string> = {
  materials: '🧱',
  tools: '🔧',
  equipment: '🏗️',
  services: '👷‍♀️',
  other: '📦',
};

export const DEFAULT_CHAIN: Record<RequestType, RequestChain> = {
  materials: 'full',
  tools: 'warehouse_only',
  equipment: 'full_finance',
  services: 'finance_only',
  other: 'full',
};

export const URGENCY_LABELS: Record<UrgencyLevel, string> = {
  low: 'Не срочно',
  normal: 'Обычная',
  high: 'Срочно',
  critical: 'Критично!',
};

export const URGENCY_COLORS: Record<UrgencyLevel, string> = {
  low: 'bg-gray-100 text-gray-600',
  normal: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-800',
};

export const URGENCY_BADGE: Record<UrgencyLevel, string> = {
  low: '⬇️ Не срочно',
  normal: '➡️ Обычная',
  high: '⬆️ Срочно',
  critical: '🔴 КРИТИЧНО',
};

export const TG_EVENT_LABELS: Record<TelegramEvent, string> = {
  request_created: 'Новая заявка создана',
  sklad_needed: 'Требуется обработка склада',
  nachalnik_needed: 'Требуется одобрение начальника',
  nachalnik_approved: 'Начальник одобрил',
  finansist_needed: 'Требуется одобрение финансиста',
  finansist_approved: 'Финансист одобрил',
  snab_needed: 'Требуется обработка снабжения',
  zakupleno: 'Материалы закуплены',
  vydano: 'Заявка выполнена (выдано)',
  otkloneno: 'Заявка отклонена',
  urgent_created: 'Срочная / критичная заявка',
  low_stock: 'Низкий остаток на складе',
};

export const UNITS = ['шт', 'кг', 'т', 'м', 'м²', 'м³', 'л', 'уп', 'рул', 'лист', 'мешок', 'компл', 'пара', 'пог.м', 'бухт'];

export const CATEGORIES = [
  'Цемент и смеси',
  'Кирпич и блоки',
  'Металлопрокат',
  'Арматура',
  'Дерево и пиломатериалы',
  'Кровля',
  'Гидро- и теплоизоляция',
  'Отделочные материалы',
  'Электрика',
  'Сантехника',
  'Инструменты',
  'Расходный инструмент',
  'Крепёж и фурнитура',
  'Спецтехника',
  'СИЗ',
  'Прочее',
];

// ====================== КАТАЛОГ МАТЕРИАЛОВ ======================
export const MATERIALS_CATALOG: MaterialCatalogItem[] = [
  // Цемент и смеси
  { name: 'Цемент М400', unit: 'мешок', category: 'Цемент и смеси', defaultPrice: 45000 },
  { name: 'Цемент М500', unit: 'мешок', category: 'Цемент и смеси', defaultPrice: 55000 },
  { name: 'Клей плиточный', unit: 'мешок', category: 'Цемент и смеси', defaultPrice: 50000 },
  { name: 'Шпаклёвка финишная', unit: 'мешок', category: 'Цемент и смеси', defaultPrice: 65000 },
  { name: 'Шпаклёвка базовая', unit: 'мешок', category: 'Цемент и смеси', defaultPrice: 45000 },
  { name: 'Штукатурка цементная', unit: 'мешок', category: 'Цемент и смеси', defaultPrice: 40000 },
  { name: 'Штукатурка гипсовая', unit: 'мешок', category: 'Цемент и смеси', defaultPrice: 55000 },
  { name: 'Самовыравнивающаяся смесь', unit: 'мешок', category: 'Цемент и смеси', defaultPrice: 75000 },
  { name: 'Затирка для плитки', unit: 'кг', category: 'Цемент и смеси', defaultPrice: 15000 },
  { name: 'Монтажная пена', unit: 'шт', category: 'Цемент и смеси', defaultPrice: 35000 },
  { name: 'Герметик силиконовый', unit: 'шт', category: 'Цемент и смеси', defaultPrice: 25000 },
  // Кирпич и блоки
  { name: 'Кирпич красный полнотелый', unit: 'шт', category: 'Кирпич и блоки', defaultPrice: 1200 },
  { name: 'Кирпич силикатный', unit: 'шт', category: 'Кирпич и блоки', defaultPrice: 900 },
  { name: 'Кирпич облицовочный', unit: 'шт', category: 'Кирпич и блоки', defaultPrice: 2500 },
  { name: 'Блок газобетонный 600x300x200', unit: 'шт', category: 'Кирпич и блоки', defaultPrice: 8500 },
  { name: 'Блок пенобетонный', unit: 'шт', category: 'Кирпич и блоки', defaultPrice: 7500 },
  { name: 'Блок керамзитобетонный', unit: 'шт', category: 'Кирпич и блоки', defaultPrice: 6500 },
  // Металлопрокат / Арматура
  { name: 'Арматура А12 (12мм)', unit: 'т', category: 'Арматура', defaultPrice: 12500000 },
  { name: 'Арматура А14 (14мм)', unit: 'т', category: 'Арматура', defaultPrice: 12500000 },
  { name: 'Арматура А16 (16мм)', unit: 'т', category: 'Арматура', defaultPrice: 12800000 },
  { name: 'Арматура А20 (20мм)', unit: 'т', category: 'Арматура', defaultPrice: 13000000 },
  { name: 'Сетка сварная 100x100 d5', unit: 'м²', category: 'Металлопрокат', defaultPrice: 35000 },
  { name: 'Сетка сварная 150x150 d6', unit: 'м²', category: 'Металлопрокат', defaultPrice: 45000 },
  { name: 'Швеллер 80', unit: 'пог.м', category: 'Металлопрокат', defaultPrice: 85000 },
  { name: 'Уголок 50x50', unit: 'пог.м', category: 'Металлопрокат', defaultPrice: 45000 },
  { name: 'Труба профильная 60x60', unit: 'пог.м', category: 'Металлопрокат', defaultPrice: 75000 },
  { name: 'Труба профильная 40x40', unit: 'пог.м', category: 'Металлопрокат', defaultPrice: 55000 },
  // Дерево и пиломатериалы
  { name: 'Доска обрезная 50x150', unit: 'пог.м', category: 'Дерево и пиломатериалы', defaultPrice: 18000 },
  { name: 'Доска обрезная 50x200', unit: 'пог.м', category: 'Дерево и пиломатериалы', defaultPrice: 24000 },
  { name: 'Брус 100x100', unit: 'пог.м', category: 'Дерево и пиломатериалы', defaultPrice: 35000 },
  { name: 'Брус 150x150', unit: 'пог.м', category: 'Дерево и пиломатериалы', defaultPrice: 65000 },
  { name: 'Фанера 12мм', unit: 'лист', category: 'Дерево и пиломатериалы', defaultPrice: 185000 },
  { name: 'Фанера 18мм', unit: 'лист', category: 'Дерево и пиломатериалы', defaultPrice: 250000 },
  { name: 'OSB 9мм', unit: 'лист', category: 'Дерево и пиломатериалы', defaultPrice: 165000 },
  { name: 'OSB 12мм', unit: 'лист', category: 'Дерево и пиломатериалы', defaultPrice: 200000 },
  { name: 'ДСП 16мм', unit: 'лист', category: 'Дерево и пиломатериалы', defaultPrice: 145000 },
  // Кровля
  { name: 'Металлочерепица', unit: 'м²', category: 'Кровля', defaultPrice: 145000 },
  { name: 'Профнастил С20', unit: 'м²', category: 'Кровля', defaultPrice: 85000 },
  { name: 'Профнастил НС35', unit: 'м²', category: 'Кровля', defaultPrice: 115000 },
  { name: 'Битумная черепица', unit: 'м²', category: 'Кровля', defaultPrice: 185000 },
  { name: 'Рубероид', unit: 'рул', category: 'Кровля', defaultPrice: 85000 },
  { name: 'Гидроизоляционная мембрана', unit: 'м²', category: 'Кровля', defaultPrice: 75000 },
  // Гидро- и теплоизоляция
  { name: 'Пенополистирол 50мм', unit: 'м²', category: 'Гидро- и теплоизоляция', defaultPrice: 45000 },
  { name: 'Пенополистирол 100мм', unit: 'м²', category: 'Гидро- и теплоизоляция', defaultPrice: 85000 },
  { name: 'Минвата 50мм', unit: 'м²', category: 'Гидро- и теплоизоляция', defaultPrice: 55000 },
  { name: 'Минвата 100мм', unit: 'м²', category: 'Гидро- и теплоизоляция', defaultPrice: 105000 },
  { name: 'Пенофол 3мм', unit: 'м²', category: 'Гидро- и теплоизоляция', defaultPrice: 25000 },
  { name: 'Проникающая гидроизоляция', unit: 'кг', category: 'Гидро- и теплоизоляция', defaultPrice: 45000 },
  // Отделочные материалы
  { name: 'Плитка керамическая 300x600', unit: 'м²', category: 'Отделочные материалы', defaultPrice: 185000 },
  { name: 'Плитка керамическая 600x600', unit: 'м²', category: 'Отделочные материалы', defaultPrice: 250000 },
  { name: 'Керамогранит 600x600', unit: 'м²', category: 'Отделочные материалы', defaultPrice: 350000 },
  { name: 'Керамогранит 1200x600', unit: 'м²', category: 'Отделочные материалы', defaultPrice: 480000 },
  { name: 'Ламинат 8мм', unit: 'м²', category: 'Отделочные материалы', defaultPrice: 145000 },
  { name: 'Ламинат 12мм', unit: 'м²', category: 'Отделочные материалы', defaultPrice: 185000 },
  { name: 'Паркетная доска', unit: 'м²', category: 'Отделочные материалы', defaultPrice: 385000 },
  { name: 'Краска интерьерная', unit: 'л', category: 'Отделочные материалы', defaultPrice: 35000 },
  { name: 'Краска фасадная', unit: 'л', category: 'Отделочные материалы', defaultPrice: 45000 },
  { name: 'Грунтовка', unit: 'л', category: 'Отделочные материалы', defaultPrice: 25000 },
  { name: 'Обои виниловые', unit: 'рул', category: 'Отделочные материалы', defaultPrice: 85000 },
  { name: 'Натяжной потолок (монтаж)', unit: 'м²', category: 'Отделочные материалы', defaultPrice: 95000 },
  // Электрика
  { name: 'Кабель ВВГ 2x1.5', unit: 'пог.м', category: 'Электрика', defaultPrice: 7500 },
  { name: 'Кабель ВВГ 3x1.5', unit: 'пог.м', category: 'Электрика', defaultPrice: 9500 },
  { name: 'Кабель ВВГ 3x2.5', unit: 'пог.м', category: 'Электрика', defaultPrice: 14500 },
  { name: 'Кабель ВВГ 3x4', unit: 'пог.м', category: 'Электрика', defaultPrice: 22000 },
  { name: 'Кабель ВВГ 3x6', unit: 'пог.м', category: 'Электрика', defaultPrice: 32000 },
  { name: 'Труба гофрированная d20', unit: 'пог.м', category: 'Электрика', defaultPrice: 3500 },
  { name: 'Труба гофрированная d25', unit: 'пог.м', category: 'Электрика', defaultPrice: 4500 },
  { name: 'Розетка двойная', unit: 'шт', category: 'Электрика', defaultPrice: 35000 },
  { name: 'Выключатель одинарный', unit: 'шт', category: 'Электрика', defaultPrice: 25000 },
  { name: 'Щиток распределительный', unit: 'шт', category: 'Электрика', defaultPrice: 185000 },
  { name: 'Автомат 16А', unit: 'шт', category: 'Электрика', defaultPrice: 40000 },
  { name: 'Автомат 25А', unit: 'шт', category: 'Электрика', defaultPrice: 45000 },
  { name: 'УЗО 40А 30мА', unit: 'шт', category: 'Электрика', defaultPrice: 125000 },
  // Сантехника
  { name: 'Труба ПП 20мм', unit: 'пог.м', category: 'Сантехника', defaultPrice: 8500 },
  { name: 'Труба ПП 25мм', unit: 'пог.м', category: 'Сантехника', defaultPrice: 11000 },
  { name: 'Труба ПП 32мм', unit: 'пог.м', category: 'Сантехника', defaultPrice: 14500 },
  { name: 'Труба ПВХ канализация 50мм', unit: 'пог.м', category: 'Сантехника', defaultPrice: 12500 },
  { name: 'Труба ПВХ канализация 110мм', unit: 'пог.м', category: 'Сантехника', defaultPrice: 28500 },
  { name: 'Смеситель для мойки', unit: 'шт', category: 'Сантехника', defaultPrice: 185000 },
  { name: 'Смеситель для душа', unit: 'шт', category: 'Сантехника', defaultPrice: 285000 },
  { name: 'Унитаз напольный', unit: 'шт', category: 'Сантехника', defaultPrice: 550000 },
  { name: 'Раковина 60см', unit: 'шт', category: 'Сантехника', defaultPrice: 185000 },
  { name: 'Ванна акриловая 170x70', unit: 'шт', category: 'Сантехника', defaultPrice: 850000 },
  { name: 'Душевая кабина', unit: 'шт', category: 'Сантехника', defaultPrice: 1850000 },
  { name: 'Радиатор биметаллический 8 секц.', unit: 'шт', category: 'Сантехника', defaultPrice: 450000 },
  { name: 'Полотенцесушитель', unit: 'шт', category: 'Сантехника', defaultPrice: 285000 },
  // Крепёж и фурнитура
  { name: 'Дюбель-гвоздь 6x60', unit: 'уп', category: 'Крепёж и фурнитура', defaultPrice: 15000 },
  { name: 'Саморез 3.5x35 (1кг)', unit: 'уп', category: 'Крепёж и фурнитура', defaultPrice: 18000 },
  { name: 'Анкер-болт М10x100', unit: 'шт', category: 'Крепёж и фурнитура', defaultPrice: 3500 },
  { name: 'Гвозди строительные (2.5кг)', unit: 'уп', category: 'Крепёж и фурнитура', defaultPrice: 22000 },
  { name: 'Перфолента монтажная', unit: 'рул', category: 'Крепёж и фурнитура', defaultPrice: 25000 },
  // Расходный инструмент
  { name: 'Диск отрезной по металлу 230мм', unit: 'шт', category: 'Расходный инструмент', defaultPrice: 15000 },
  { name: 'Диск шлифовальный 230мм', unit: 'шт', category: 'Расходный инструмент', defaultPrice: 8000 },
  { name: 'Сверло по бетону 10мм', unit: 'шт', category: 'Расходный инструмент', defaultPrice: 18000 },
  { name: 'Бур для перфоратора 12мм', unit: 'шт', category: 'Расходный инструмент', defaultPrice: 22000 },
  { name: 'Диск пильный по дереву 190мм', unit: 'шт', category: 'Расходный инструмент', defaultPrice: 55000 },
  { name: 'Биты отверточные набор', unit: 'компл', category: 'Расходный инструмент', defaultPrice: 35000 },
  { name: 'Лента малярная 50мм', unit: 'рул', category: 'Расходный инструмент', defaultPrice: 12000 },
  { name: 'Плёнка защитная', unit: 'рул', category: 'Расходный инструмент', defaultPrice: 35000 },
  // СИЗ
  { name: 'Каска строительная', unit: 'шт', category: 'СИЗ', defaultPrice: 45000 },
  { name: 'Жилет сигнальный', unit: 'шт', category: 'СИЗ', defaultPrice: 25000 },
  { name: 'Перчатки рабочие', unit: 'пара', category: 'СИЗ', defaultPrice: 8000 },
  { name: 'Очки защитные', unit: 'шт', category: 'СИЗ', defaultPrice: 15000 },
  { name: 'Маска респиратор', unit: 'шт', category: 'СИЗ', defaultPrice: 12000 },
  { name: 'Ботинки рабочие', unit: 'пара', category: 'СИЗ', defaultPrice: 185000 },
];

export function formatDate(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

export function formatDateShort(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

export function formatMoney(amount: number): string {
  return amount.toLocaleString('ru-RU', { minimumFractionDigits: 0 }) + ' сум';
}

// ====================== ЦЕПОЧКИ СОГЛАСОВАНИЯ ======================

export function getNextStatuses(
  status: RequestStatus,
  role: UserRole,
  chain: RequestChain = 'full'
): RequestStatus[] {
  // Admin — любой статус
  if (role === 'admin') {
    const all: RequestStatus[] = [
      'novaya', 'sklad_review', 'sklad_partial', 'nachalnik_review',
      'nachalnik_approved', 'finansist_review', 'finansist_approved',
      'snab_process', 'zakupleno', 'vydano', 'otkloneno',
    ];
    return all.filter(s => s !== status);
  }

  if (role === 'sklad') {
    if (status === 'novaya') {
      if (chain === 'warehouse_only') return ['vydano', 'sklad_partial'];
      if (chain === 'full' || chain === 'full_finance') return ['vydano', 'sklad_partial', 'nachalnik_review'];
    }
    if (status === 'nachalnik_approved' && (chain === 'full' || chain === 'warehouse_only')) return ['vydano', 'sklad_partial'];
    if (status === 'finansist_approved') return ['vydano', 'sklad_partial'];
    if (status === 'zakupleno') return ['vydano'];
    if (status === 'sklad_partial') return ['vydano', 'nachalnik_review'];
  }

  if (role === 'nachalnik') {
    if (status === 'nachalnik_review' || status === 'sklad_partial') {
      if (chain === 'full_finance' || chain === 'finance_only') return ['finansist_review', 'otkloneno'];
      return ['nachalnik_approved', 'otkloneno'];
    }
    if (status === 'novaya' && (chain === 'purchase_only' || chain === 'finance_only')) {
      if (chain === 'finance_only') return ['finansist_review', 'otkloneno'];
      return ['nachalnik_approved', 'otkloneno'];
    }
  }

  if (role === 'finansist') {
    if (status === 'finansist_review') return ['finansist_approved', 'otkloneno'];
  }

  if (role === 'snab') {
    if (status === 'nachalnik_approved') return ['snab_process', 'otkloneno'];
    if (status === 'finansist_approved') return ['snab_process', 'otkloneno'];
    if (status === 'snab_process') return ['zakupleno'];
  }

  if (role === 'prоrab') {
    if (status === 'novaya') return ['otkloneno'];
  }
  return [];
}

export function getResponsibleRole(status: RequestStatus, chain: RequestChain = 'full'): UserRole | null {
  if (status === 'novaya') {
    if (chain === 'purchase_only') return 'nachalnik';
    if (chain === 'finance_only') return 'nachalnik';
    return 'sklad';
  }
  if (status === 'sklad_review') return 'sklad';
  if (status === 'sklad_partial') return 'nachalnik';
  if (status === 'nachalnik_review') return 'nachalnik';
  if (status === 'nachalnik_approved') {
    if (chain === 'warehouse_only') return 'sklad';
    if (chain === 'full_finance') return 'sklad';
    return 'snab';
  }
  if (status === 'finansist_review') return 'finansist';
  if (status === 'finansist_approved') return 'snab';
  if (status === 'snab_process') return 'snab';
  if (status === 'zakupleno') return 'sklad';
  return null;
}

export function needsMyAction(status: RequestStatus, role: UserRole, chain: RequestChain = 'full'): boolean {
  const resp = getResponsibleRole(status, chain);
  return resp === role;
}

export function getStatusProgress(status: RequestStatus): number {
  const map: Record<RequestStatus, number> = {
    novaya: 8,
    sklad_review: 20,
    sklad_partial: 32,
    nachalnik_review: 42,
    nachalnik_approved: 55,
    finansist_review: 65,
    finansist_approved: 75,
    snab_process: 85,
    zakupleno: 93,
    vydano: 100,
    otkloneno: 100,
  };
  return map[status] ?? 0;
}

export function getChainSteps(chain: RequestChain): { label: string; status: RequestStatus }[] {
  if (chain === 'warehouse_only') {
    return [
      { label: 'Создана', status: 'novaya' },
      { label: 'Склад', status: 'sklad_review' },
      { label: 'Выдано', status: 'vydano' },
    ];
  }
  if (chain === 'purchase_only') {
    return [
      { label: 'Создана', status: 'novaya' },
      { label: 'Нач. участка', status: 'nachalnik_review' },
      { label: 'Одобрено', status: 'nachalnik_approved' },
      { label: 'Снабжение', status: 'snab_process' },
      { label: 'Закуплено', status: 'zakupleno' },
      { label: 'Выдано', status: 'vydano' },
    ];
  }
  if (chain === 'full_finance') {
    return [
      { label: 'Создана', status: 'novaya' },
      { label: 'Склад', status: 'sklad_review' },
      { label: 'Нач. участка', status: 'nachalnik_review' },
      { label: 'Финансист', status: 'finansist_review' },
      { label: 'Снабжение', status: 'snab_process' },
      { label: 'Закуплено', status: 'zakupleno' },
      { label: 'Выдано', status: 'vydano' },
    ];
  }
  if (chain === 'finance_only') {
    return [
      { label: 'Создана', status: 'novaya' },
      { label: 'Нач. участка', status: 'nachalnik_review' },
      { label: 'Финансист', status: 'finansist_review' },
      { label: 'Снабжение', status: 'snab_process' },
      { label: 'Закуплено', status: 'zakupleno' },
      { label: 'Выдано', status: 'vydano' },
    ];
  }
  // full
  return [
    { label: 'Создана', status: 'novaya' },
    { label: 'Склад', status: 'sklad_review' },
    { label: 'Нач. участка', status: 'nachalnik_review' },
    { label: 'Снабжение', status: 'snab_process' },
    { label: 'Закуплено', status: 'zakupleno' },
    { label: 'Выдано', status: 'vydano' },
  ];
}
