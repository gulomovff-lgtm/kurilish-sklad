// Сервис уведомлений Telegram
// Используется прямой вызов Bot API из браузера

import { doc, getDoc, setDoc, getDocs, collection } from 'firebase/firestore';
import { db } from '../firebase';
import type { TelegramSettings, TelegramChatConfig, TelegramEvent, SkladRequest } from '../types';
import {
  STATUS_LABELS, REQUEST_TYPE_LABELS, URGENCY_LABELS, CHAIN_LABELS,
  formatDate, SLA_HOURS,
} from '../utils';

const SETTINGS_DOC = 'settings/telegram';

// ===== Работа с настройками =====

export async function loadTelegramSettings(): Promise<TelegramSettings | null> {
  try {
    const snap = await getDoc(doc(db, SETTINGS_DOC));
    if (!snap.exists()) return null;
    return snap.data() as TelegramSettings;
  } catch {
    return null;
  }
}

export async function saveTelegramSettings(settings: TelegramSettings): Promise<void> {
  await setDoc(doc(db, SETTINGS_DOC), settings);
}

// ===== Отправка сообщений =====

interface TgSendParams {
  chat_id: string;
  text: string;
  parse_mode?: 'HTML' | 'MarkdownV2';
  message_thread_id?: number;
  disable_web_page_preview?: boolean;
}

async function sendMessage(botToken: string, params: TgSendParams): Promise<boolean> {
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ disable_notification: false, ...params }),
    });
    const data = await resp.json();
    return data.ok === true;
  } catch {
    return false;
  }
}

// ===== Тихий режим =====

/**
 * Проверяет, находится ли текущее время в «тихом» диапазоне.
 * Часы по UTC+5 (Ташкент). Поддерживает перенос через полночь: from=22, to=7.
 */
function isQuietTime(settings: TelegramSettings): boolean {
  const q = settings.quietHours;
  if (!q?.enabled) return false;
  const hourLocal = (new Date().getUTCHours() + 5) % 24;
  const { from, to } = q;
  if (from <= to) {
    return hourLocal < from || hourLocal >= to;
  } else {
    return hourLocal >= from || hourLocal < to;
  }
}

// Срочные события игнорируют тихий режим
const URGENT_EVENTS: TelegramEvent[] = ['urgent_created', 'otkloneno'];

// ===== Формирование текста сообщений =====

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function urgencyLine(level: string): string {
  if (level === 'critical') return '🔴 КРИТИЧНО';
  if (level === 'high')     return '🟠 Высокая';
  if (level === 'normal')   return '🟡 Обычная';
  return '🟢 Низкая';
}

function chainIcon(chain: string): string {
  if (chain === 'warehouse_only') return '🏪';
  if (chain === 'purchase_only')  return '🛒';
  if (chain === 'full_finance')   return '💰';
  if (chain === 'finance_only')   return '📊';
  return '🔄';
}

interface MessageOptions {
  processedByName?: string;
  comment?: string;
  mentionTag?: string;
  appUrl?: string;
}

function buildRequestMessage(
  req: SkladRequest,
  title: string,
  emoji: string,
  opts: MessageOptions = {}
): string {
  const { processedByName, comment, mentionTag, appUrl } = opts;
  const urg    = URGENCY_LABELS[req.urgencyLevel]    ?? req.urgencyLevel;
  const type   = REQUEST_TYPE_LABELS[req.requestType] ?? req.requestType;
  const chain  = CHAIN_LABELS[req.chain]             ?? req.chain;
  const status = STATUS_LABELS[req.status]           ?? req.status;
  const totalQty = req.items.reduce((s, i) => s + i.quantity, 0);

  let msg = `${emoji} <b>${escapeHtml(title)}</b>`;
  if (mentionTag) msg += ` @${mentionTag}`;
  msg += '\n\n';

  msg += `📋 <b>Заявка №${req.number}</b> — <b>${escapeHtml(req.title)}</b>\n`;
  msg += `🏗 Объект: ${escapeHtml(req.objectName)}\n`;
  msg += `👷 Прораб: ${escapeHtml(req.createdByName)}\n`;
  msg += `📦 Тип: ${escapeHtml(type)}\n`;
  msg += `⚡ Срочность: <b>${urgencyLine(req.urgencyLevel)}</b> (${escapeHtml(urg)})\n`;
  msg += `${chainIcon(req.chain)} Цепочка: ${escapeHtml(chain)}\n`;
  msg += `📊 Статус: <b>${escapeHtml(status)}</b>\n`;

  if (processedByName) {
    msg += `✅ Обработал(а): <b>${escapeHtml(processedByName)}</b>\n`;
  }
  if (comment) {
    msg += `💬 Комментарий: <i>${escapeHtml(comment)}</i>\n`;
  }
  if (req.plannedDate) {
    const dt = new Date(req.plannedDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    msg += `📅 Нужно к: ${dt}\n`;
  }

  // Дополнительные поля
  const extras: string[] = [];
  if (req.zone)              extras.push(`📍 Зона: ${escapeHtml(req.zone)}`);
  if (req.budgetCode)        extras.push(`🏷 Бюджет: ${escapeHtml(req.budgetCode)}`);
  if (req.preferredSupplier) extras.push(`🏪 Поставщик: ${escapeHtml(req.preferredSupplier)}`);
  if (req.responsibleName)   extras.push(`🙋 Получатель: ${escapeHtml(req.responsibleName)}`);
  if (req.subcontractors && req.subcontractors.length > 0) {
    extras.push(`👥 Субподр.: ${req.subcontractors.map(s => escapeHtml(s)).join(', ')}`);
  }
  if (extras.length > 0) msg += '\n' + extras.join('\n') + '\n';

  msg += `\n📝 <b>Состав заявки</b> (${req.items.length} поз., ${totalQty} ед.):\n`;
  req.items.slice(0, 6).forEach((item, i) => {
    const price = item.estimatedPrice ? ` ~${item.estimatedPrice.toLocaleString('ru-RU')} сум` : '';
    msg += `  ${i + 1}. ${escapeHtml(item.name)} — ${item.quantity} ${escapeHtml(item.unit)}${price}\n`;
  });
  if (req.items.length > 6) {
    msg += `  <i>...и ещё ${req.items.length - 6} позиций</i>\n`;
  }

  if (req.estimatedCost) {
    msg += `\n💵 Ориент. сумма: <b>${req.estimatedCost.toLocaleString('ru-RU')} сум</b>\n`;
  }

  msg += `\n🕐 ${formatDate(req.updatedAt)}`;

  if (appUrl) {
    const link = `${appUrl.replace(/\/$/, '')}/requests/${req.id}`;
    msg += `\n🔗 <a href="${link}">Открыть заявку →</a>`;
  }

  return msg;
}

// ===== Фильтр по объекту =====

function matchesObjectFilter(chat: import('../types').TelegramChatConfig, objectId?: string): boolean {
  if (!chat.objectFilter || chat.objectFilter.length === 0) return true;
  if (!objectId) return true;
  return chat.objectFilter.includes(objectId);
}

// ===== Главная функция отправки уведомления =====

export async function sendRequestNotification(
  req: SkladRequest,
  event: TelegramEvent,
  extraComment?: string,
  processedByName?: string
): Promise<void> {
  const settings = await loadTelegramSettings();
  if (!settings || !settings.enabled || !settings.botToken) return;

  // Тихий режим — срочные события всегда доставляются
  if (isQuietTime(settings) && !URGENT_EVENTS.includes(event)) return;

  // Фильтр: активные чаты, подписанные на событие + прошедшие objectFilter
  const targets = settings.chats.filter(
    (c: TelegramChatConfig) =>
      c.isActive &&
      c.events.includes(event) &&
      matchesObjectFilter(c, req.objectId)
  );
  if (targets.length === 0) return;

  let emoji = '📬';
  let title = 'Обновление заявки';

  switch (event) {
    case 'request_created':    emoji = '🆕'; title = 'Новая заявка';                      break;
    case 'urgent_created':     emoji = '🚨'; title = '⚡ СРОЧНАЯ ЗАЯВКА';                  break;
    case 'sklad_needed':       emoji = '🏪'; title = 'Требуется выдача со склада';         break;
    case 'nachalnik_needed':   emoji = '👔'; title = 'Требуется одобрение начальника';     break;
    case 'nachalnik_approved': emoji = '✅'; title = 'Одобрено начальником участка';       break;
    case 'finansist_needed':   emoji = '💰'; title = 'Требуется согласование финансиста';  break;
    case 'finansist_approved': emoji = '💵'; title = 'Одобрено финансистом';               break;
    case 'snab_needed':        emoji = '🚚'; title = 'Передано в снабжение';               break;
    case 'zakupleno':          emoji = '📦'; title = 'Материалы закуплены';                break;
    case 'v_puti':              emoji = '🚚'; title = 'Материалы в пути на объект';      break;
    case 'vydano':              emoji = '🎁'; title = 'Материалы выданы прорабу';        break;
    case 'polucheno':           emoji = '✅'; title = 'Приёмка подтверждена прорабом';   break;
    case 'otkloneno':           emoji = '❌'; title = 'Заявка отклонена';                    break;
    case 'sla_breached':        emoji = '⏰'; title = 'ПРОСРОЧКА SLA — заявка зависла!';   break;
  }

  for (const chat of targets) {
    const text = buildRequestMessage(req, title, emoji, {
      processedByName,
      comment: extraComment,
      mentionTag: chat.mentionTag || undefined,
      appUrl: settings.appUrl || undefined,
    });
    const params: TgSendParams = {
      chat_id: chat.chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    };
    if (chat.threadId) {
      params.message_thread_id = parseInt(chat.threadId, 10);
    }
    await sendMessage(settings.botToken, params);
  }
}

// ===== Уведомление о низком остатке на складе =====

export async function sendLowStockNotification(
  itemName: string,
  current: number,
  minimum: number,
  unit: string
): Promise<void> {
  const settings = await loadTelegramSettings();
  if (!settings || !settings.enabled || !settings.botToken) return;

  // low_stock всегда отправляется — важно, тихий режим не применяется
  const targets = settings.chats.filter(
    (c: TelegramChatConfig) => c.isActive && c.events.includes('low_stock')
  );
  if (targets.length === 0) return;

  const percent = minimum > 0 ? Math.round((current / minimum) * 100) : 0;
  const urgIcon = percent <= 20 ? '🔴' : percent <= 60 ? '🟠' : '🟡';
  const now = new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Tashkent' });

  const text =
    `${urgIcon} <b>Низкий остаток на складе!</b>\n\n` +
    `📦 Материал: <b>${escapeHtml(itemName)}</b>\n` +
    `🔢 Текущий остаток: <b>${current} ${unit}</b>\n` +
    `⚠️ Минимальный остаток: ${minimum} ${unit}\n` +
    `📉 Уровень: ${percent}% от нормы\n\n` +
    `Необходимо пополнить запасы.\n` +
    `🕐 ${now} (UTC+5)`;

  for (const chat of targets) {
    const params: TgSendParams = {
      chat_id: chat.chatId,
      text,
      parse_mode: 'HTML',
    };
    if (chat.threadId) {
      params.message_thread_id = parseInt(chat.threadId, 10);
    }
    await sendMessage(settings.botToken, params);
  }
}

// ===== Тестовое сообщение =====

export async function sendTestMessage(
  botToken: string,
  chatId: string,
  threadId?: string
): Promise<{ ok: boolean; error?: string }> {
  const now = new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Tashkent' });
  const text =
    `✅ <b>Тест — Nirvana Luxury Residence</b>\n\n` +
    `Бот успешно подключён к системе управления складом.\n` +
    `Уведомления будут приходить в этот чат.\n` +
    `🕐 ${now} (UTC+5)`;

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const body: TgSendParams = {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    };
    if (threadId) body.message_thread_id = parseInt(threadId, 10);

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await resp.json();
    if (data.ok) return { ok: true };
    return { ok: false, error: data.description ?? 'Неизвестная ошибка' };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'Ошибка сети' };
  }
}
// ═══════════════════════════════════════════════════════════════════════════════
// SLA ЭСКАЛАЦИЯ — фоновая проверка просрочки (клиентский cron)
// Вызывается каждые 15 минут из App.tsx
// При просрочке ≥100% отправляет форсированное уведомление в Telegram
// ═══════════════════════════════════════════════════════════════════════════════

const SLA_NOTIFIED_KEY = 'sla_breached_notified';
const REPEAT_SILENCE_MS = 4 * 3_600_000; // повторный алерт не чаще 4 часов

function getNotifiedMap(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(SLA_NOTIFIED_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function saveNotifiedMap(map: Record<string, number>): void {
  try { localStorage.setItem(SLA_NOTIFIED_KEY, JSON.stringify(map)); } catch { /* ignore */ }
}

export async function checkAndNotifySlaBreaches(): Promise<void> {
  const settings = await loadTelegramSettings();
  if (!settings || !settings.enabled || !settings.botToken) return;

  const TERMINAL: string[] = ['vydano', 'polucheno', 'otkloneno'];

  let allRequests: SkladRequest[] = [];
  try {
    const snap = await getDocs(collection(db, 'requests'));
    allRequests = snap.docs
      .map(d => ({ id: d.id, ...d.data() } as SkladRequest))
      .filter(r => !TERMINAL.includes(r.status));
  } catch {
    return;
  }

  const now = Date.now();
  const notified = getNotifiedMap();
  let changed = false;

  for (const req of allRequests) {
    const slaHrs = SLA_HOURS[req.status];
    if (!slaHrs) continue;

    const entryMs = new Date(req.slaEnteredAt ?? req.updatedAt).getTime();
    const limitMs = slaHrs * 3_600_000;
    const elapsed = now - entryMs;
    const overByMs = elapsed - limitMs;

    if (overByMs < 0) continue; // ещё в норме

    const cacheKey = `${req.id}:${req.status}`;
    const lastAlert = notified[cacheKey];
    if (lastAlert && now - lastAlert < REPEAT_SILENCE_MS) continue; // уже оповещали

    const overByH = Math.round(overByMs / 3_600_000);
    const statusName = STATUS_LABELS[req.status] ?? req.status;

    // Формируем сообщение-эскалацию
    const targets = settings.chats.filter(
      (c: TelegramChatConfig) =>
        c.isActive &&
        c.events.includes('sla_breached') &&
        matchesObjectFilter(c, req.objectId)
    );
    if (targets.length === 0) continue;

    for (const chat of targets) {
      const mention = chat.mentionTag ? ` @${chat.mentionTag}` : '';
      const appLink = settings.appUrl
        ? `\n\n🔗 <a href="${settings.appUrl.replace(/\/$/, '')}/requests/${req.id}">\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u0437\u0430\u044f\u0432\u043a\u0443 →</a>`
        : '';
      const text =
        `⏰ <b>ПРОСРОЧКА SLA${mention}</b>\n\n` +
        `📋 <b>Заявка №${req.number}</b> — ${escapeHtml(req.title)}\n` +
        `🏗 Объект: ${escapeHtml(req.objectName)}\n` +
        `📊 Этап: <b>${escapeHtml(statusName)}</b>\n` +
        `⚡ Срочность: ${urgencyLine(req.urgencyLevel)}\n` +
        `⏱ Просрочено на: <b>${overByH} ч</b> (лимит ${slaHrs} ч)\n` +
        `👷 Прораб: ${escapeHtml(req.createdByName)}\n` +
        `🕐 ${new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Tashkent' })} (UTC+5)` +
        appLink;

      const params: TgSendParams = {
        chat_id: chat.chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      };
      if (chat.threadId) params.message_thread_id = parseInt(chat.threadId, 10);
      await sendMessage(settings.botToken, params);
    }

    notified[cacheKey] = now;
    changed = true;
  }

  if (changed) saveNotifiedMap(notified);
}