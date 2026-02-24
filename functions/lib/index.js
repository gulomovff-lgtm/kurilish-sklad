"use strict";
/**
 * Firebase Cloud Functions — Telegram Bot
 * Nirvana Luxury Residence · Склад и Снабжение
 *
 * Функции:
 * 1. onRequestStatusChange — Firestore trigger: при смене статуса на nachalnik_review
 *    или finansist_review отправляет сообщение с кнопками в Telegram
 * 2. telegramWebhook — HTTP endpoint для получения callback_query от Telegram
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTelegramWebhook = exports.telegramWebhook = exports.onRequestStatusChange = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const node_fetch_1 = __importDefault(require("node-fetch"));
admin.initializeApp();
const db = admin.firestore();
// ── Telegram API helper ──────────────────────────────────────────────────────
async function callTelegramAPI(botToken, method, body) {
    const res = await (0, node_fetch_1.default)(`https://api.telegram.org/bot${botToken}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const data = await res.json();
    return data;
}
// ── Получить настройки Telegram ──────────────────────────────────────────────
async function getTelegramSettings() {
    const snap = await db.doc('settings/telegram').get();
    if (!snap.exists)
        return null;
    const data = snap.data();
    if (!data.enabled || !data.botToken)
        return null;
    return data;
}
// ── Загрузить список пользователей по ролям ──────────────────────────────────
async function getUsersByRole(role) {
    const snap = await db.collection('users').where('role', '==', role).get();
    return snap.docs.map(d => (Object.assign({ uid: d.id }, d.data())));
}
// ── Формат суммы ─────────────────────────────────────────────────────────────
function formatCost(n) {
    if (n >= 1000000)
        return `${(n / 1000000).toFixed(1)} млн`;
    if (n >= 1000)
        return `${Math.round(n / 1000)} тыс`;
    return String(n);
}
// ── Escape Markdown v2 ────────────────────────────────────────────────────────
function esc(text) {
    return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}
// ══════════════════════════════════════════════════════════════════════════════
// TRIGGER 1: Firestore onWrite — new status nachalnik_review / finansist_review
// ══════════════════════════════════════════════════════════════════════════════
exports.onRequestStatusChange = functions
    .region('europe-west1')
    .firestore
    .document('requests/{requestId}')
    .onWrite(async (change, context) => {
    var _a, _b, _c;
    const before = change.before.data();
    const after = change.after.data();
    if (!after)
        return;
    const prevStatus = before === null || before === void 0 ? void 0 : before.status;
    const newStatus = after.status;
    // Только для переходов в nachalnik_review или finansist_review
    if (newStatus !== 'nachalnik_review' && newStatus !== 'finansist_review')
        return;
    if (prevStatus === newStatus)
        return; // нет изменений
    const settings = await getTelegramSettings();
    if (!settings)
        return;
    const reqId = context.params.requestId;
    const req = Object.assign(Object.assign({}, after), { id: reqId });
    const isFinance = newStatus === 'finansist_review';
    const roleNeeded = isFinance ? 'finansist' : 'nachalnik';
    // Формируем сообщение
    const urgEmoji = req.urgencyLevel === 'critical' ? '🔥 [КРИТИЧНО] ' :
        req.urgencyLevel === 'high' ? '⚠️ [СРОЧНО] ' : '';
    const hotTag = ((_a = req.tags) === null || _a === void 0 ? void 0 : _a.includes('hot')) ? ' 🔥' : '';
    const topItems = ((_b = req.items) !== null && _b !== void 0 ? _b : []).slice(0, 5);
    const itemsText = topItems.map(it => `  • ${esc(it.name)} (${it.quantity} ${esc(it.unit)})`).join('\n');
    const moreItems = req.items.length > 5 ? `\n  _\\.\\.\\. ещё ${req.items.length - 5} позиций_` : '';
    const costLine = (req.estimatedCost && isFinance)
        ? `\n💰 *Предв\\. смета:* ${esc(formatCost(req.estimatedCost))} сум`
        : '';
    const stageLabel = isFinance ? 'Согласование финансиста' : 'Согласование начальника';
    const text = `${urgEmoji}*Заявка \\#${req.number}${hotTag}*\n` +
        `🏗 *Объект:* ${esc(req.objectName)}${req.zone ? ` · ${esc(req.zone)}` : ''}\n` +
        `👤 *Инициатор:* ${esc(req.createdByName)}\n` +
        `📋 *Этап:* ${esc(stageLabel)}\n` +
        costLine + '\n\n' +
        `📦 *Позиции:*\n${itemsText}${moreItems}`;
    // Callback data: encoded as "approve:reqId" / "reject:reqId"
    const inlineKeyboard = {
        inline_keyboard: [[
                { text: '✅ Одобрить', callback_data: `approve:${reqId}` },
                { text: '❌ Отклонить', callback_data: `reject:${reqId}` },
            ]],
    };
    // Получаем чаты для этой роли (ищем чаты с активными пользователями)
    const users = await getUsersByRole(roleNeeded);
    const recipientChatIds = new Set();
    // Добавляем личные чаты пользователей с telegramId
    for (const user of users) {
        if (user.telegramId)
            recipientChatIds.add(user.telegramId);
    }
    // Также отправляем в настроенные групп-чаты (из settings.chats)
    ((_c = settings.chats) !== null && _c !== void 0 ? _c : []).forEach(chat => {
        if (chat.isActive)
            recipientChatIds.add(chat.chatId);
    });
    for (const chatId of recipientChatIds) {
        await callTelegramAPI(settings.botToken, 'sendMessage', {
            chat_id: chatId,
            text,
            parse_mode: 'MarkdownV2',
            reply_markup: inlineKeyboard,
        });
    }
    // Сохраняем флаг что уведомление отправлено
    await change.after.ref.update({ tgNotified: true });
});
// ══════════════════════════════════════════════════════════════════════════════
// WEBHOOK: Telegram callback_query handler
// ══════════════════════════════════════════════════════════════════════════════
exports.telegramWebhook = functions
    .region('europe-west1')
    .https
    .onRequest(async (req, res) => {
    var _a;
    if (req.method !== 'POST') {
        res.status(405).send('Method not allowed');
        return;
    }
    const body = req.body;
    const cb = body.callback_query;
    if (!cb || !cb.data) {
        res.json({ ok: true });
        return;
    }
    const settings = await getTelegramSettings();
    if (!settings) {
        res.json({ ok: true });
        return;
    }
    const telegramUserId = String(cb.from.id);
    const [action, requestId] = cb.data.split(':');
    // ── Авторизация: найти пользователя по telegramId ──────────────────────
    const usersSnap = await db.collection('users')
        .where('telegramId', '==', telegramUserId)
        .get();
    if (usersSnap.empty) {
        await callTelegramAPI(settings.botToken, 'answerCallbackQuery', {
            callback_query_id: cb.id,
            text: '❌ У вас нет прав. Привяжите Telegram к вашему аккаунту в системе.',
            show_alert: true,
        });
        res.json({ ok: true });
        return;
    }
    const appUser = Object.assign({ uid: usersSnap.docs[0].id }, usersSnap.docs[0].data());
    const userRole = appUser.role;
    // ── Загрузить заявку ───────────────────────────────────────────────────
    const reqDoc = await db.doc(`requests/${requestId}`).get();
    if (!reqDoc.exists) {
        await callTelegramAPI(settings.botToken, 'answerCallbackQuery', {
            callback_query_id: cb.id,
            text: 'Заявка не найдена',
            show_alert: true,
        });
        res.json({ ok: true });
        return;
    }
    const reqData = reqDoc.data();
    // ── Проверка роли ──────────────────────────────────────────────────────
    const canApprove = (reqData.status === 'nachalnik_review' && userRole === 'nachalnik') ||
        (reqData.status === 'finansist_review' && userRole === 'finansist') ||
        userRole === 'admin';
    if (!canApprove) {
        await callTelegramAPI(settings.botToken, 'answerCallbackQuery', {
            callback_query_id: cb.id,
            text: '❌ У вас нет прав для согласования этой заявки.',
            show_alert: true,
        });
        res.json({ ok: true });
        return;
    }
    // ── Проверяем что уже не обработано ───────────────────────────────────
    const alreadyDone = ['nachalnik_approved', 'finansist_approved', 'otkloneno'].includes(reqData.status);
    if (alreadyDone) {
        await callTelegramAPI(settings.botToken, 'answerCallbackQuery', {
            callback_query_id: cb.id,
            text: 'Эта заявка уже была обработана.',
            show_alert: true,
        });
        res.json({ ok: true });
        return;
    }
    // ── Определяем новый статус и метку ───────────────────────────────────
    const now = new Date().toISOString();
    const userName = appUser.displayName || cb.from.first_name || 'Пользователь';
    let newStatus;
    let actionLabel;
    let resultEmoji;
    if (action === 'approve') {
        newStatus = reqData.status === 'nachalnik_review'
            ? 'nachalnik_approved'
            : 'finansist_approved';
        actionLabel = 'Одобрено';
        resultEmoji = '✅';
    }
    else {
        newStatus = 'otkloneno';
        actionLabel = 'Отклонено';
        resultEmoji = '❌';
    }
    // ── Записать в Firestore ───────────────────────────────────────────────
    const historyEntry = {
        at: now,
        by: appUser.uid,
        byName: userName,
        action: `${actionLabel} через Telegram`,
        fromStatus: reqData.status,
        toStatus: newStatus,
        comment: 'Через Telegram',
    };
    const updates = {
        status: newStatus,
        updatedAt: now,
        slaEnteredAt: now,
        history: admin.firestore.FieldValue.arrayUnion(historyEntry),
    };
    if (userRole === 'nachalnik') {
        updates.nachalnikProcessedBy = appUser.uid;
        updates.nachalnikProcessedByName = userName;
    }
    else if (userRole === 'finansist') {
        updates.finansistProcessedBy = appUser.uid;
        updates.finansistProcessedByName = userName;
    }
    await db.doc(`requests/${requestId}`).update(updates);
    // ── Подтвердить callback (убирает «часики» на кнопке в TG) ────────────
    await callTelegramAPI(settings.botToken, 'answerCallbackQuery', {
        callback_query_id: cb.id,
        text: `${resultEmoji} ${actionLabel}!`,
    });
    // ── Редактировать оригинальное сообщение (удалить кнопки) ─────────────
    if (cb.message) {
        const originalText = cb.message;
        const newText = ((_a = originalText.text) !== null && _a !== void 0 ? _a : '') +
            `\n\n${resultEmoji} *${esc(actionLabel)}:* ${esc(userName)}`;
        await callTelegramAPI(settings.botToken, 'editMessageText', {
            chat_id: cb.message.chat.id,
            message_id: cb.message.message_id,
            text: newText,
            parse_mode: 'MarkdownV2',
            // reply_markup пустой → кнопки убираются
            reply_markup: { inline_keyboard: [] },
        });
    }
    res.json({ ok: true });
});
// ══════════════════════════════════════════════════════════════════════════════
// Вспомогательная функция: получить URL для регистрации вебхука
// POST https://<region>-<project>.cloudfunctions.net/registerTelegramWebhook
// ══════════════════════════════════════════════════════════════════════════════
exports.registerTelegramWebhook = functions
    .region('europe-west1')
    .https
    .onRequest(async (req, res) => {
    const settings = await getTelegramSettings();
    if (!settings) {
        res.status(503).json({ error: 'Telegram not configured' });
        return;
    }
    const webhookUrl = `https://europe-west1-sklad-25dbd.cloudfunctions.net/telegramWebhook`;
    const result = await callTelegramAPI(settings.botToken, 'setWebhook', {
        url: webhookUrl,
        allowed_updates: ['callback_query', 'message'],
    });
    res.json({ webhookUrl, result });
});
//# sourceMappingURL=index.js.map