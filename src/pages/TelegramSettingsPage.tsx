import { useState, useEffect } from 'react';
import { Bot, Plus, Trash2, TestTube2, Save, ChevronDown, ChevronUp, Hash, CheckCircle2, XCircle, Moon, Link, AtSign } from 'lucide-react';
import toast from 'react-hot-toast';
import { loadTelegramSettings, saveTelegramSettings, sendTestMessage } from '../services/telegram';
import type { TelegramSettings, TelegramChatConfig, TelegramEvent } from '../types';
import { TG_EVENT_LABELS } from '../utils';
import { useAuth } from '../contexts/AuthContext';

const ALL_EVENTS: TelegramEvent[] = [
  'request_created', 'urgent_created',
  'sklad_needed', 'nachalnik_needed', 'nachalnik_approved',
  'finansist_needed', 'finansist_approved',
  'snab_needed', 'zakupleno', 'vydano', 'otkloneno',
  'low_stock',
];

const EVENT_GROUPS: { label: string; events: TelegramEvent[] }[] = [
  { label: 'Создание заявок', events: ['request_created', 'urgent_created'] },
  { label: 'Согласование', events: ['sklad_needed', 'nachalnik_needed', 'nachalnik_approved', 'finansist_needed', 'finansist_approved', 'snab_needed'] },
  { label: 'Завершение', events: ['zakupleno', 'vydano', 'otkloneno'] },
  { label: 'Склад', events: ['low_stock'] },
];

const defaultSettings: TelegramSettings = {
  botToken: '',
  chats: [],
  enabled: false,
  appUrl: '',
  quietHours: { enabled: false, from: 22, to: 7 },
};

function newChat(): TelegramChatConfig {
  return {
    id: Date.now().toString(),
    name: '',
    chatId: '',
    threadId: '',
    events: ['request_created', 'urgent_created'],
    isActive: true,
  };
}

export default function TelegramSettingsPage() {
  const { currentUser } = useAuth();
  const [settings, setSettings] = useState<TelegramSettings>(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [expandedChat, setExpandedChat] = useState<string | null>(null);
  const [testingChat, setTestingChat] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadTelegramSettings().then(s => {
      if (s) setSettings(s);
    });
  }, []);

  if (currentUser?.role !== 'admin') {
    return (
      <div className="p-6 text-center text-gray-500">
        <Bot className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>Только администратор может настраивать интеграцию с Telegram</p>
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveTelegramSettings(settings);
      toast.success('Настройки Telegram сохранены');
    } catch {
      toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (chat: TelegramChatConfig) => {
    if (!settings.botToken) return toast.error('Сначала введите токен бота');
    if (!chat.chatId) return toast.error('Введите Chat ID');
    setTestingChat(chat.id);
    const res = await sendTestMessage(settings.botToken, chat.chatId, chat.threadId || undefined);
    setTestResults(prev => ({ ...prev, [chat.id]: res.ok }));
    if (res.ok) toast.success('Тест отправлен! Проверьте чат.');
    else toast.error(`Ошибка: ${res.error}`);
    setTestingChat(null);
  };

  const addChat = () => {
    const c = newChat();
    setSettings(s => ({ ...s, chats: [...s.chats, c] }));
    setExpandedChat(c.id);
  };

  const removeChat = (id: string) => {
    setSettings(s => ({ ...s, chats: s.chats.filter(c => c.id !== id) }));
  };

  const updateChat = (id: string, patch: Partial<TelegramChatConfig>) => {
    setSettings(s => ({
      ...s,
      chats: s.chats.map(c => c.id === id ? { ...c, ...patch } : c),
    }));
  };

  const toggleEvent = (chatId: string, event: TelegramEvent) => {
    const chat = settings.chats.find(c => c.id === chatId);
    if (!chat) return;
    const has = chat.events.includes(event);
    updateChat(chatId, {
      events: has ? chat.events.filter(e => e !== event) : [...chat.events, event],
    });
  };

  const toggleGroupEvents = (chatId: string, events: TelegramEvent[]) => {
    const chat = settings.chats.find(c => c.id === chatId);
    if (!chat) return;
    const allSelected = events.every(e => chat.events.includes(e));
    if (allSelected) {
      updateChat(chatId, { events: chat.events.filter(e => !events.includes(e)) });
    } else {
      const merged = [...new Set([...chat.events, ...events])];
      updateChat(chatId, { events: merged });
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
      {/* Заголовок */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Telegram уведомления</h1>
          <p className="text-sm text-gray-500">Рассылка по разным группам и топикам</p>
        </div>
      </div>

      {/* Инструкция */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-semibold mb-2">📌 Как настроить:</p>
        <ol className="space-y-1 list-decimal list-inside">
          <li>Создайте бота через <b>@BotFather</b> в Telegram → получите токен</li>
          <li>Добавьте бота в нужные группы/каналы как <b>администратора</b></li>
          <li>Узнайте Chat ID группы (напишите боту <b>@getmyid_bot</b> или форвард-сообщение)</li>
          <li>Для группы с топиками (Forum) — укажите Thread ID нужного топика</li>
        </ol>
      </div>

      {/* Токен и включение */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Настройки бота</h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-sm text-gray-600">Включить</span>
            <div
              onClick={() => setSettings(s => ({ ...s, enabled: !s.enabled }))}
              className={`w-11 h-6 rounded-full transition-colors cursor-pointer ${settings.enabled ? 'bg-green-500' : 'bg-gray-300'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow mt-0.5 transition-transform ${settings.enabled ? 'translate-x-5.5 ml-5' : 'ml-0.5'}`} />
            </div>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Токен бота <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            value={settings.botToken}
            onChange={e => setSettings(s => ({ ...s, botToken: e.target.value }))}
            placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">Получить у @BotFather командой /newbot</p>
        </div>

        {/* URL приложения */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
            <Link className="w-4 h-4 text-gray-400" />
            URL приложения <span className="font-normal text-gray-400 text-xs">(для ссылок в сообщениях)</span>
          </label>
          <input
            type="text"
            value={settings.appUrl ?? ''}
            onChange={e => setSettings(s => ({ ...s, appUrl: e.target.value }))}
            placeholder="https://nirvana-sklad.web.app"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">Если заполнено — в каждое сообщение добавляется кнопка «Открыть заявку →»</p>
        </div>

        {/* Тихие часы */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-gray-700">Тихий режим (не беспокоить ночью)</span>
            </div>
            <div
              onClick={() => setSettings(s => ({
                ...s,
                quietHours: { ...s.quietHours, enabled: !s.quietHours?.enabled, from: s.quietHours?.from ?? 22, to: s.quietHours?.to ?? 7 },
              }))}
              className={`w-11 h-6 rounded-full transition-colors cursor-pointer ${
                settings.quietHours?.enabled ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow mt-0.5 transition-transform ${
                settings.quietHours?.enabled ? 'ml-5' : 'ml-0.5'
              }`} />
            </div>
          </div>
          {settings.quietHours?.enabled && (
            <div className="flex items-center gap-3 pl-6">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">С</span>
                <input
                  type="number" min={0} max={23}
                  value={settings.quietHours.from}
                  onChange={e => setSettings(s => ({
                    ...s,
                    quietHours: { ...s.quietHours!, from: parseInt(e.target.value) || 0 }
                  }))}
                  className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-400">::00</span>
              </div>
              <span className="text-xs text-gray-400">—</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">До</span>
                <input
                  type="number" min={0} max={23}
                  value={settings.quietHours.to}
                  onChange={e => setSettings(s => ({
                    ...s,
                    quietHours: { ...s.quietHours!, to: parseInt(e.target.value) || 0 }
                  }))}
                  className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-400">::00</span>
              </div>
              <span className="text-xs text-gray-500">(UTC+5)</span>
            </div>
          )}
          <p className="text-xs text-gray-400 pl-6">
            Срочные («СРОЧНАЯ» и «Отклонена») всегда доставляются, даже ночью
          </p>
        </div>
      </div>

      {/* Список получателей */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">
            Получатели ({settings.chats.length})
          </h2>
          <button
            onClick={addChat}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Добавить группу
          </button>
        </div>

        {settings.chats.length === 0 && (
          <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 p-8 text-center text-gray-400">
            <Hash className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">Нет настроенных получателей</p>
            <p className="text-xs mt-1">Нажмите «Добавить группу» чтобы начать</p>
          </div>
        )}

        {settings.chats.map(chat => (
          <div key={chat.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {/* Заголовок чата */}
            <div
              className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50"
              onClick={() => setExpandedChat(expandedChat === chat.id ? null : chat.id)}
            >
              <div className={`w-2 h-2 rounded-full ${chat.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 truncate">
                  {chat.name || 'Без названия'}
                </p>
                <p className="text-xs text-gray-400">
                  Chat ID: {chat.chatId || '—'}
                  {chat.threadId ? ` · Топик: ${chat.threadId}` : ''}
                  {' · '}
                  {chat.events.length} событий
                </p>
              </div>
              <div className="flex items-center gap-2">
                {testResults[chat.id] !== undefined && (
                  testResults[chat.id]
                    ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                    : <XCircle className="w-4 h-4 text-red-500" />
                )}
                {expandedChat === chat.id
                  ? <ChevronUp className="w-4 h-4 text-gray-400" />
                  : <ChevronDown className="w-4 h-4 text-gray-400" />
                }
              </div>
            </div>

            {/* Настройки чата */}
            {expandedChat === chat.id && (
              <div className="border-t border-gray-100 p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Название (для себя)</label>
                    <input
                      type="text"
                      value={chat.name}
                      onChange={e => updateChat(chat.id, { name: e.target.value })}
                      placeholder="Склад — основной"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Chat ID *</label>
                    <input
                      type="text"
                      value={chat.chatId}
                      onChange={e => updateChat(chat.id, { chatId: e.target.value })}
                      placeholder="-1001234567890"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Thread ID <span className="text-gray-400">(топик форума, необяз.)</span>
                    </label>
                    <input
                      type="text"
                      value={chat.threadId || ''}
                      onChange={e => updateChat(chat.id, { threadId: e.target.value })}
                      placeholder="12345"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                      <AtSign className="w-3 h-3" /> @username для упоминания
                    </label>
                    <input
                      type="text"
                      value={chat.mentionTag || ''}
                      onChange={e => updateChat(chat.id, { mentionTag: e.target.value.replace('@', '') })}
                      placeholder="ivanov_sk (без @)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={chat.isActive}
                        onChange={e => updateChat(chat.id, { isActive: e.target.checked })}
                        className="w-4 h-4 rounded accent-blue-600"
                      />
                      <span className="text-sm text-gray-700">Активен</span>
                    </label>
                  </div>
                </div>

                {/* События */}
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">
                    Какие события слать сюда:
                  </p>
                  {EVENT_GROUPS.map(group => {
                    const allSelected = group.events.every(e => chat.events.includes(e));
                    return (
                      <div key={group.label} className="mb-3">
                        <div className="flex items-center gap-2 mb-1.5">
                          <button
                            onClick={() => toggleGroupEvents(chat.id, group.events)}
                            className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${
                              allSelected
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {group.label}
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pl-2">
                          {group.events.map(event => (
                            <button
                              key={event}
                              onClick={() => toggleEvent(chat.id, event)}
                              className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                                chat.events.includes(event)
                                  ? 'bg-blue-50 border-blue-300 text-blue-800'
                                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                              }`}
                            >
                              {TG_EVENT_LABELS[event]}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Действия */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => handleTest(chat)}
                    disabled={testingChat === chat.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    <TestTube2 className="w-4 h-4" />
                    {testingChat === chat.id ? 'Отправка...' : 'Тест'}
                  </button>
                  <button
                    onClick={() => removeChat(chat.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 text-sm rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Удалить
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Кнопка сохранить */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Сохранение...' : 'Сохранить настройки'}
        </button>
      </div>

      {/* Справка по получению Chat ID */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 text-xs text-gray-600 space-y-2">
        <p className="font-semibold text-gray-800">💡 Как узнать Chat ID группы</p>
        <p>1. Добавьте бота в группу как администратора</p>
        <p>2. Напишите любое сообщение в группу</p>
        <p>3. Откройте: <code className="bg-gray-200 px-1 rounded">https://api.telegram.org/bot&#123;ВАШ_ТОКЕН&#125;/getUpdates</code></p>
        <p>4. Найдите <code className="bg-gray-200 px-1 rounded">"chat":&#123;"id":-100...</code> — это ваш Chat ID</p>
        <p className="pt-1 font-semibold text-gray-800">💡 Как узнать Thread ID топика</p>
        <p>Правой кнопкой на топик → «Копировать ссылку» → последнее число в ссылке</p>
      </div>
    </div>
  );
}
