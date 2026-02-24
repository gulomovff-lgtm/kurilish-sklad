// Типы данных для системы Nirvana Luxury Residence

export type UserRole = 'prоrab' | 'sklad' | 'nachalnik' | 'finansist' | 'snab' | 'admin';

// Тип заявки — определяет цепочку согласования
export type RequestType =
  | 'materials'   // Стройматериалы
  | 'tools'       // Инструменты
  | 'equipment'   // Спецтехника
  | 'services'    // Услуги / Работы
  | 'other';      // Прочее

// Цепочка согласования
export type RequestChain =
  | 'full'            // Склад → Нач. → Снаб.
  | 'warehouse_only'  // Только склад
  | 'purchase_only'   // Нач. → Снаб.
  | 'full_finance'    // Склад → Нач. → Финансист → Снаб.
  | 'finance_only';   // Нач. → Финансист → Снаб.

// Уровень срочности
export type UrgencyLevel = 'low' | 'normal' | 'high' | 'critical';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
  isActive?: boolean;
  createdBy?: string;
  phone?: string;        // Телефон для связи
  objectIds?: string[];  // К каким объектам прикреплён
}

// История изменений заявки
export interface RequestHistoryEntry {
  at: string;
  by: string;
  byName: string;
  action: string;
  fromStatus?: RequestStatus;
  toStatus?: RequestStatus;
  comment?: string;
}

// Статусы заявки
export type RequestStatus =
  | 'novaya'               // Новая
  | 'sklad_review'         // На рассмотрении склада
  | 'sklad_partial'        // Частично выдано
  | 'nachalnik_review'     // На одобрении начальника
  | 'nachalnik_approved'   // Одобрено начальником
  | 'finansist_review'     // На согласовании финансиста
  | 'finansist_approved'   // Одобрено финансистом
  | 'snab_process'         // В работе снабжения
  | 'zakupleno'            // Закуплено
  | 'vydano'               // Выдано
  | 'otkloneno';           // Отклонено

export interface RequestItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  issuedQty?: number;
  purchasedQty?: number;
  estimatedPrice?: number;  // Ориентировочная цена за ед.
  actualPrice?: number;     // Фактическая цена
  category?: string;        // Категория материала
}

export interface SkladRequest {
  id: string;
  number: number;
  title: string;
  objectName: string;
  objectId?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  status: RequestStatus;
  chain: RequestChain;          // Цепочка согласования
  requestType: RequestType;     // Тип заявки
  urgencyLevel: UrgencyLevel;   // Срочность
  items: RequestItem[];
  plannedDate?: string;         // Желаемая дата получения
  deliveryAddress?: string;     // Адрес доставки
  estimatedCost?: number;       // Ориентировочная стоимость
  actualCost?: number;          // Фактическая стоимость

  // Комментарии по этапам
  commentProrab?: string;
  commentSklad?: string;
  commentNachalnik?: string;
  commentFinansist?: string;
  commentSnab?: string;

  // Кто обработал
  skladProcessedBy?: string;
  skladProcessedByName?: string;
  nachalnikProcessedBy?: string;
  nachalnikProcessedByName?: string;
  finansistProcessedBy?: string;
  finansistProcessedByName?: string;
  snabProcessedBy?: string;
  snabProcessedByName?: string;

  priority: 'normal' | 'urgent';
  history: RequestHistoryEntry[];
  tgNotified?: boolean;

  // Дополнительные поля (новая версия заявки)
  zone?: string;                  // Зона/участок на объекте
  subcontractors?: string[];      // Субподрядчики
  responsibleUid?: string;        // UID получателя
  responsibleName?: string;       // Имя получателя
  budgetCode?: string;            // Код бюджетной статьи
  preferredSupplier?: string;     // Предпочтительный поставщик
  attachments?: string[];         // URL вложений (Firebase Storage)
}

export interface StockItem {
  id: string;
  name: string;
  unit: string;
  category: string;
  quantity: number;
  minQuantity: number;
  price?: number;
  location?: string;      // Место хранения на складе (стеллаж, зона)
  updatedAt: string;
  updatedBy: string;
  updatedByName: string;
}

export interface StockMovement {
  id: string;
  itemId: string;
  itemName: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reason: string;
  requestId?: string;
  requestNumber?: number;
  createdAt: string;
  createdBy: string;
  createdByName: string;
}

// Объект строительства
export interface ConstructionObject {
  id: string;
  name: string;
  code: string;
  address?: string;
  managerUid?: string;
  managerName?: string;
  isActive: boolean;
  createdAt: string;
  budget?: number;
  spent?: number;
  description?: string;
  telegramChatId?: string;
}

// Позиция из каталога материалов
export interface MaterialCatalogItem {
  name: string;
  unit: string;
  category: string;
  defaultPrice?: number;
  code?: string;
}

// ===== TELEGRAM =====

export type TelegramEvent =
  | 'request_created'
  | 'sklad_needed'
  | 'nachalnik_needed'
  | 'nachalnik_approved'
  | 'finansist_needed'
  | 'finansist_approved'
  | 'snab_needed'
  | 'zakupleno'
  | 'vydano'
  | 'otkloneno'
  | 'urgent_created'
  | 'low_stock';

export interface TelegramChatConfig {
  id: string;
  name: string;           // Описание, напр. "Склад — уведомления"
  chatId: string;         // ID чата/группы Telegram
  threadId?: string;      // ID топика (Forum Topic), если есть
  events: TelegramEvent[]; // Какие события слать сюда
  isActive: boolean;
  objectFilter?: string[]; // [] или undefined = все объекты; [...objectIds] = только эти
  mentionTag?: string;     // Telegram @username для упоминания в сообщениях (без @)
}

export interface TelegramSettings {
  botToken: string;
  chats: TelegramChatConfig[];
  enabled: boolean;
  appUrl?: string;         // URL приложения для ссылки в сообщениях
  quietHours?: {           // Тихий режим — не слать в эти часы (по UTC+5 Ташкент)
    enabled: boolean;
    from: number;          // 0-23
    to: number;            // 0-23
  };
}
