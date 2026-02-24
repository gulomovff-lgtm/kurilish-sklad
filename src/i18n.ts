// ─── Словарь переводов / Tarjima lug'ati ─────────────────────────────────────
// Поддерживаемые языки / Qo'llab-quvvatlanadigan tillar
export type Lang = 'ru' | 'uz';

// Полный набор ключей интерфейса
export interface Translations {
  // ── Навигация ──────────────────────────────────────────────────────────────
  nav_dashboard:     string;
  nav_requests:      string;
  nav_warehouse:     string;
  nav_purchases:     string;
  nav_analytics:     string;
  nav_objects:       string;
  nav_users:         string;
  nav_telegram:      string;
  nav_help:          string;
  nav_group_workspace: string;
  nav_group_refs:    string;
  nav_group_admin:   string;

  // ── Профиль / сайдбар ─────────────────────────────────────────────────────
  profile_settings:  string;
  logout:            string;
  language:          string;

  // ── Общие действия ────────────────────────────────────────────────────────
  create:            string;
  save:              string;
  cancel:            string;
  delete:            string;
  edit:              string;
  search:            string;
  filter:            string;
  export:            string;
  close:             string;
  confirm:           string;
  back:              string;
  loading:           string;
  no_data:           string;
  yes:               string;
  no:                string;

  // ── Заявки ────────────────────────────────────────────────────────────────
  new_request:       string;
  request:           string;
  requests:          string;
  request_title:     string;
  request_type:      string;
  request_number:    string;
  urgency:           string;
  planned_date:      string;
  created_at:        string;
  created_by:        string;
  object:            string;
  zone:              string;
  recipient:         string;
  specification:     string;
  comment:           string;
  deadline:          string;
  chain:             string;
  progress:          string;

  // ── Типы заявок ───────────────────────────────────────────────────────────
  type_materials:    string;
  type_tools:        string;
  type_equipment:    string;
  type_services:     string;
  type_other:        string;

  // ── Срочность ─────────────────────────────────────────────────────────────
  urgency_low:       string;
  urgency_normal:    string;
  urgency_high:      string;
  urgency_critical:  string;

  // ── Статусы ───────────────────────────────────────────────────────────────
  status_novaya:             string;
  status_sklad_review:       string;
  status_sklad_partial:      string;
  status_nachalnik_review:   string;
  status_nachalnik_approved: string;
  status_finansist_review:   string;
  status_finansist_approved: string;
  status_snab_process:       string;
  status_zakupleno:          string;
  status_v_puti:             string;
  status_vydano:             string;
  status_polucheno:          string;
  status_otkloneno:          string;

  // ── Роли ──────────────────────────────────────────────────────────────────
  role_prorab:       string;
  role_sklad:        string;
  role_nachalnik:    string;
  role_finansist:    string;
  role_snab:         string;
  role_admin:        string;

  // ── Цепочки согласования ──────────────────────────────────────────────────
  chain_full:            string;
  chain_warehouse_only:  string;
  chain_purchase_only:   string;
  chain_full_finance:    string;
  chain_finance_only:    string;

  // ── Склад ─────────────────────────────────────────────────────────────────
  warehouse:         string;
  stock_item:        string;
  quantity:          string;
  unit:              string;
  min_stock:         string;
  movements:         string;
  incoming:          string;
  outgoing:          string;
  balance:           string;

  // ── Финансы ───────────────────────────────────────────────────────────────
  estimated_cost:    string;
  actual_cost:       string;
  budget_code:       string;
  total:             string;
  sum_currency:      string;
  price_per_unit:    string;

  // ── Фильтры / сортировка ──────────────────────────────────────────────────
  filter_all:        string;
  filter_my_action:  string;
  filter_my:         string;
  filter_urgent:     string;
  filter_overdue:    string;
  sort_by:           string;
  sort_date:         string;
  sort_urgency:      string;
  sort_status:       string;
  sort_object:       string;
  group_by_object:   string;
  show_done:         string;
  compact_view:      string;
  view_params:       string;
  filters:           string;
  view_kanban:       string;
  view_list:         string;

  // ── Статистика ────────────────────────────────────────────────────────────
  total_requests:    string;
  active_requests:   string;
  done_requests:     string;
  overdue:           string;
  my_actions:        string;
  in_work:           string;
  completed:         string;
  rejected:          string;
  requires_action:   string;

  // ── Детальная страница заявки ─────────────────────────────────────────────
  request_detail:    string;
  chain_timeline:    string;
  history:           string;
  approve:           string;
  reject:            string;
  mark_issued:       string;
  mark_received:     string;
  mark_purchased:    string;
  mark_in_transit:   string;
  split_request:     string;
  create_po:         string;
  add_comment:       string;
  attach_file:       string;

  // ── Дашборд ───────────────────────────────────────────────────────────────
  greeting_morning:  string;
  greeting_day:      string;
  greeting_evening:  string;
  greeting_night:    string;
  active_count:      string;
  overdue_count:     string;
  done_today:        string;
  recent_requests:   string;

  // ── Пользователи ──────────────────────────────────────────────────────────
  users:             string;
  add_user:          string;
  user_email:        string;
  user_name:         string;
  user_role:         string;
  user_telegram:     string;
  active:            string;
  inactive:          string;
  block_user:        string;
  unblock_user:      string;

  // ── Объекты ───────────────────────────────────────────────────────────────
  objects:           string;
  add_object:        string;
  object_name:       string;
  object_code:       string;
  object_address:    string;
  object_manager:    string;
  budget:            string;
  spent:             string;
  budget_used:       string;

  // ── Закупки / PO ──────────────────────────────────────────────────────────
  purchase_orders:   string;
  po_number:         string;
  supplier:          string;
  po_date:           string;
  po_status:         string;
  po_items:          string;
  po_total:          string;
  create_order:      string;

  // ── SLA ───────────────────────────────────────────────────────────────────
  sla_overdue:       string;
  sla_hours:         string;
  sla_days:          string;
  sla_minutes:       string;
  deadline_overdue:  string;
  in_work_time:      string;

  // ── Telegram ──────────────────────────────────────────────────────────────
  telegram_bot:      string;
  bot_token:         string;
  chat_id:           string;
  test_message:      string;
  notifications:     string;

  // ── Помощь ────────────────────────────────────────────────────────────────
  help:              string;
  quickstart:        string;
  roles_access:      string;
  chains_title:      string;
  statuses_title:    string;
  scenarios:         string;
  glossary:          string;

  // ── Ошибки / успех ────────────────────────────────────────────────────────
  error_required:    string;
  error_not_found:   string;
  error_permission:  string;
  success_saved:     string;
  success_created:   string;
  success_deleted:   string;
  success_status:    string;

  // ── Поля спецификации ─────────────────────────────────────────────────────
  spec_name:         string;
  spec_qty:          string;
  spec_unit:         string;
  spec_price:        string;
  spec_total:        string;
  spec_note:         string;
  add_row:           string;

  // ── Канбан-колонки ───────────────────────────────────────────────────
  col_new:           string;
  col_sklad:         string;
  col_approval:      string;
  col_finance:       string;
  col_supply:        string;
  col_issued:        string;
  col_closed:        string;

  // ── Доп. сортировка / вид ────────────────────────────────────────
  sort_cost:         string;
  sort_updated:      string;
  display_options:   string;
  search_placeholder: string;
  filter_open:       string;
  filter_issued:     string;
  pipeline:          string;
  actions_required:  string;
  per_cent_done:     string;
  sum_label:         string;
  no_requests_yet:   string;
  by_type:           string;
  issued_this_month: string;
  total_issued:      string;
  urgent_requests:   string;
  active_cost_label: string;
  overdue_short:     string;
  create_first:      string;
  all_requests:      string;
}

// ─── РУССКИЙ ─────────────────────────────────────────────────────────────────
export const ru: Translations = {
  nav_dashboard:     'Дашборд',
  nav_requests:      'Заявки',
  nav_warehouse:     'Склад',
  nav_purchases:     'Закупки',
  nav_analytics:     'Аналитика',
  nav_objects:       'Объекты',
  nav_users:         'Пользователи',
  nav_telegram:      'Telegram-бот',
  nav_help:          'Инструкция',
  nav_group_workspace: 'Рабочее пространство',
  nav_group_refs:    'Справочники',
  nav_group_admin:   'Администрирование',

  profile_settings:  'Настройки профиля',
  logout:            'Выйти',
  language:          'Язык',

  create:            'Создать',
  save:              'Сохранить',
  cancel:            'Отмена',
  delete:            'Удалить',
  edit:              'Редактировать',
  search:            'Поиск',
  filter:            'Фильтры',
  export:            'Экспорт',
  close:             'Закрыть',
  confirm:           'Подтвердить',
  back:              'Назад',
  loading:           'Загрузка...',
  no_data:           'Нет данных',
  yes:               'Да',
  no:                'Нет',

  new_request:       'Новая заявка',
  request:           'Заявка',
  requests:          'Заявки',
  request_title:     'Название заявки',
  request_type:      'Тип заявки',
  request_number:    'Номер',
  urgency:           'Срочность',
  planned_date:      'Желаемая дата',
  created_at:        'Создана',
  created_by:        'Создал',
  object:            'Объект',
  zone:              'Зона',
  recipient:         'Получатель',
  specification:     'Спецификация',
  comment:           'Комментарий',
  deadline:          'Дедлайн',
  chain:             'Цепочка',
  progress:          'Прогресс',

  type_materials:    'Стройматериалы',
  type_tools:        'Инструменты',
  type_equipment:    'Спецтехника',
  type_services:     'Услуги / Работы',
  type_other:        'Прочее',

  urgency_low:       'Не срочно',
  urgency_normal:    'Обычная',
  urgency_high:      'Срочно',
  urgency_critical:  'Критично!',

  status_novaya:             'Новая',
  status_sklad_review:       'У склада',
  status_sklad_partial:      'Частично выдано',
  status_nachalnik_review:   'На согласовании',
  status_nachalnik_approved: 'Одобрено нач.',
  status_finansist_review:   'У финансиста',
  status_finansist_approved: 'Одобрено фин.',
  status_snab_process:       'В снабжении',
  status_zakupleno:          'Закуплено',
  status_v_puti:             'В пути',
  status_vydano:             'Выдано',
  status_polucheno:          'Получено',
  status_otkloneno:          'Отклонено',

  role_prorab:       'Прораб',
  role_sklad:        'Склад',
  role_nachalnik:    'Нач. участка',
  role_finansist:    'Финансист',
  role_snab:         'Снабжение',
  role_admin:        'Администратор',

  chain_full:            'Склад → Нач. → Снаб.',
  chain_warehouse_only:  'Только склад',
  chain_purchase_only:   'Нач. → Снаб.',
  chain_full_finance:    'Склад → Нач. → Фин. → Снаб.',
  chain_finance_only:    'Нач. → Фин. → Снаб.',

  warehouse:         'Склад',
  stock_item:        'Позиция',
  quantity:          'Количество',
  unit:              'Ед. изм.',
  min_stock:         'Мин. остаток',
  movements:         'Движения',
  incoming:          'Приход',
  outgoing:          'Расход',
  balance:           'Остаток',

  estimated_cost:    'Смета',
  actual_cost:       'Факт. стоимость',
  budget_code:       'Код бюджета',
  total:             'Итого',
  sum_currency:      'сум',
  price_per_unit:    'Цена/ед.',

  filter_all:        'Все',
  filter_my_action:  'Мои действия',
  filter_my:         'Мои заявки',
  filter_urgent:     'Срочные',
  filter_overdue:    'Просроченные',
  sort_by:           'Сортировка',
  sort_date:         'По дате',
  sort_urgency:      'По срочности',
  sort_status:       'По статусу',
  sort_object:       'По объекту',
  group_by_object:   'Группировать по объекту',
  show_done:         'Показать завершённые',
  compact_view:      'Компактный вид',
  view_params:       'Параметры вида',
  filters:           'Фильтры',
  view_kanban:       'Канбан',
  view_list:         'Список',

  total_requests:    'Всего заявок',
  active_requests:   'Активных',
  done_requests:     'Завершённых',
  overdue:           'Просрочено',
  my_actions:        'Мои действия',
  in_work:           'В работе',
  completed:         'Завершено',
  rejected:          'Отклонено',
  requires_action:   'Требует действия',

  request_detail:    'Детали заявки',
  chain_timeline:    'Цепочка согласования',
  history:           'История',
  approve:           'Одобрить',
  reject:            'Отклонить',
  mark_issued:       'Выдано',
  mark_received:     'Получено',
  mark_purchased:    'Закуплено',
  mark_in_transit:   'В пути',
  split_request:     'Разделить заявку',
  create_po:         'Создать заказ поставщику',
  add_comment:       'Добавить комментарий',
  attach_file:       'Прикрепить файл',

  greeting_morning:  'Доброе утро',
  greeting_day:      'Добрый день',
  greeting_evening:  'Добрый вечер',
  greeting_night:    'Доброй ночи',
  active_count:      'активных',
  overdue_count:     'просроченных',
  done_today:        'выдано сегодня',
  recent_requests:   'Последние заявки',

  users:             'Пользователи',
  add_user:          'Добавить пользователя',
  user_email:        'Email',
  user_name:         'Имя',
  user_role:         'Роль',
  user_telegram:     'Telegram ID',
  active:            'Активен',
  inactive:          'Заблокирован',
  block_user:        'Заблокировать',
  unblock_user:      'Разблокировать',

  objects:           'Объекты',
  add_object:        'Добавить объект',
  object_name:       'Название',
  object_code:       'Код',
  object_address:    'Адрес',
  object_manager:    'Менеджер',
  budget:            'Бюджет',
  spent:             'Потрачено',
  budget_used:       'Использовано бюджета',

  purchase_orders:   'Заказы поставщикам',
  po_number:         'Номер заказа',
  supplier:          'Поставщик',
  po_date:           'Дата заказа',
  po_status:         'Статус',
  po_items:          'Позиции',
  po_total:          'Сумма',
  create_order:      'Сформировать заказ',

  sla_overdue:       'SLA нарушен',
  sla_hours:         'ч',
  sla_days:          'дн',
  sla_minutes:       'мин',
  deadline_overdue:  'Дедлайн просрочен',
  in_work_time:      'В работе',

  telegram_bot:      'Telegram-бот',
  bot_token:         'Токен бота',
  chat_id:           'Chat ID',
  test_message:      'Тест уведомления',
  notifications:     'Уведомления',

  help:              'Инструкция',
  quickstart:        'Быстрый старт',
  roles_access:      'Роли и доступ',
  chains_title:      'Цепочки',
  statuses_title:    'Статусы',
  scenarios:         'Сценарии',
  glossary:          'Сокращения',

  error_required:    'Заполните обязательное поле',
  error_not_found:   'Не найдено',
  error_permission:  'Нет доступа',
  success_saved:     'Сохранено',
  success_created:   'Создано',
  success_deleted:   'Удалено',
  success_status:    'Статус обновлён',

  spec_name:         'Наименование',
  spec_qty:          'Кол-во',
  spec_unit:         'Ед.',
  spec_price:        'Цена',
  spec_total:        'Сумма',
  spec_note:         'Примечание',
  add_row:           'Добавить строку',

  col_new:           'Новые',
  col_sklad:         'У склада',
  col_approval:      'Согласование',
  col_finance:       'Финансы',
  col_supply:        'Закупка',
  col_issued:        'У прораба',
  col_closed:        'Закрыто',

  sort_cost:         'По сумме',
  sort_updated:      'По обновлению',
  display_options:   'Отображение',
  search_placeholder: 'Поиск: номер, название, объект...',
  filter_open:       'В работе',
  filter_issued:     'Выданные',
  pipeline:          'Воронка',
  actions_required:  'Требуют вашего действия',
  per_cent_done:     '% завершено',
  sum_label:         'сум',
  no_requests_yet:   'Заявок ещё нет',
  by_type:           'По типам',
  issued_this_month: 'Выдано в этом месяце',
  total_issued:      'Всего выдано',
  urgent_requests:   'Срочных заявок',
  active_cost_label: 'Сумма активных',
  overdue_short:     'просроч.',
  create_first:      'Создать первую',
  all_requests:      'Все заявки',
};

// ─── УЗБЕКСКИЙ ───────────────────────────────────────────────────────────────
export const uz: Translations = {
  nav_dashboard:     'Bosh sahifa',
  nav_requests:      'Arizalar',
  nav_warehouse:     'Ombor',
  nav_purchases:     'Xaridlar',
  nav_analytics:     'Tahlil',
  nav_objects:       'Ob\'yektlar',
  nav_users:         'Foydalanuvchilar',
  nav_telegram:      'Telegram-bot',
  nav_help:          'Yordam',
  nav_group_workspace: 'Ish maydoni',
  nav_group_refs:    'Ma\'lumotlar',
  nav_group_admin:   'Boshqaruv',

  profile_settings:  'Profil sozlamalari',
  logout:            'Chiqish',
  language:          'Til',

  create:            'Yaratish',
  save:              'Saqlash',
  cancel:            'Bekor qilish',
  delete:            'O\'chirish',
  edit:              'Tahrirlash',
  search:            'Qidiruv',
  filter:            'Filtrlar',
  export:            'Eksport',
  close:             'Yopish',
  confirm:           'Tasdiqlash',
  back:              'Orqaga',
  loading:           'Yuklanmoqda...',
  no_data:           'Ma\'lumot yo\'q',
  yes:               'Ha',
  no:                'Yo\'q',

  new_request:       'Yangi ariza',
  request:           'Ariza',
  requests:          'Arizalar',
  request_title:     'Ariza nomi',
  request_type:      'Ariza turi',
  request_number:    'Raqam',
  urgency:           'Shoshilishlilik',
  planned_date:      'Kerakli sana',
  created_at:        'Yaratilgan',
  created_by:        'Kim yaratdi',
  object:            'Ob\'yekt',
  zone:              'Zona',
  recipient:         'Qabul qiluvchi',
  specification:     'Spetsifikatsiya',
  comment:           'Izoh',
  deadline:          'Muddat',
  chain:             'Zanjir',
  progress:          'Jarayon',

  type_materials:    'Qurilish materiallari',
  type_tools:        'Asbob-uskunalar',
  type_equipment:    'Maxsus texnika',
  type_services:     'Xizmatlar / Ishlar',
  type_other:        'Boshqa',

  urgency_low:       'Shoshilmaydi',
  urgency_normal:    'Oddiy',
  urgency_high:      'Shoshilinch',
  urgency_critical:  'Juda shoshilinch!',

  status_novaya:             'Yangi',
  status_sklad_review:       'Omborxonada',
  status_sklad_partial:      'Qisman berildi',
  status_nachalnik_review:   'Kelishuvda',
  status_nachalnik_approved: 'Ruxsat berildi',
  status_finansist_review:   'Moliyachida',
  status_finansist_approved: 'Mol. tasdiqladi',
  status_snab_process:       'Ta\'minotda',
  status_zakupleno:          'Sotib olindi',
  status_v_puti:             'Yo\'lda',
  status_vydano:             'Berildi',
  status_polucheno:          'Qabul qilindi',
  status_otkloneno:          'Rad etildi',

  role_prorab:       'Prоrab',
  role_sklad:        'Ombor',
  role_nachalnik:    'Qurilish boshlig\'i',
  role_finansist:    'Moliyachi',
  role_snab:         'Ta\'minot',
  role_admin:        'Administrator',

  chain_full:            'Ombor → Boshliq → Ta\'minot',
  chain_warehouse_only:  'Faqat ombor',
  chain_purchase_only:   'Boshliq → Ta\'minot',
  chain_full_finance:    'Ombor → Boshliq → Mol. → Ta\'minot',
  chain_finance_only:    'Boshliq → Mol. → Ta\'minot',

  warehouse:         'Ombor',
  stock_item:        'Tovar',
  quantity:          'Miqdor',
  unit:              'O\'lchov',
  min_stock:         'Min. qoldiq',
  movements:         'Harakatlar',
  incoming:          'Kirim',
  outgoing:          'Chiqim',
  balance:           'Qoldiq',

  estimated_cost:    'Smeta',
  actual_cost:       'Haqiqiy narx',
  budget_code:       'Byudjet kodi',
  total:             'Jami',
  sum_currency:      'so\'m',
  price_per_unit:    'Birlik narxi',

  filter_all:        'Barchasi',
  filter_my_action:  'Mening vazifam',
  filter_my:         'Mening arizalarim',
  filter_urgent:     'Shoshilinch',
  filter_overdue:    'Muddati o\'tgan',
  sort_by:           'Saralash',
  sort_date:         'Sanasi bo\'yicha',
  sort_urgency:      'Shoshilishlik bo\'yicha',
  sort_status:       'Status bo\'yicha',
  sort_object:       'Ob\'yekt bo\'yicha',
  group_by_object:   'Ob\'yekt bo\'yicha guruhlash',
  show_done:         'Yakunlanganlarni ko\'rsatish',
  compact_view:      'Ixcham ko\'rinish',
  view_params:       'Ko\'rinish parametrlari',
  filters:           'Filtrlar',
  view_kanban:       'Kanban',
  view_list:         'Ro\'yxat',

  total_requests:    'Jami arizalar',
  active_requests:   'Faol',
  done_requests:     'Yakunlangan',
  overdue:           'Muddati o\'tgan',
  my_actions:        'Mening vazifam',
  in_work:           'Jarayonda',
  completed:         'Yakunlangan',
  rejected:          'Rad etilgan',
  requires_action:   'Harakatni talab qiladi',

  request_detail:    'Ariza tafsilotlari',
  chain_timeline:    'Kelishuv jarayoni',
  history:           'Tarix',
  approve:           'Tasdiqlash',
  reject:            'Rad etish',
  mark_issued:       'Berildi',
  mark_received:     'Qabul qilindi',
  mark_purchased:    'Sotib olindi',
  mark_in_transit:   'Yo\'lda',
  split_request:     'Arizani ajratish',
  create_po:         'Yetkazib beruvchiga buyurtma',
  add_comment:       'Izoh qo\'shish',
  attach_file:       'Fayl biriktirish',

  greeting_morning:  'Xayrli tong',
  greeting_day:      'Xayrli kun',
  greeting_evening:  'Xayrli kech',
  greeting_night:    'Xayrli tun',
  active_count:      'faol',
  overdue_count:     'muddati o\'tgan',
  done_today:        'bugun berildi',
  recent_requests:   'Oxirgi arizalar',

  users:             'Foydalanuvchilar',
  add_user:          'Foydalanuvchi qo\'shish',
  user_email:        'Email',
  user_name:         'Ism',
  user_role:         'Rol',
  user_telegram:     'Telegram ID',
  active:            'Faol',
  inactive:          'Bloklangan',
  block_user:        'Bloklash',
  unblock_user:      'Blokdan chiqarish',

  objects:           'Ob\'yektlar',
  add_object:        'Ob\'yekt qo\'shish',
  object_name:       'Nomi',
  object_code:       'Kodi',
  object_address:    'Manzil',
  object_manager:    'Menejer',
  budget:            'Byudjet',
  spent:             'Sarflangan',
  budget_used:       'Byudjet foydalanildi',

  purchase_orders:   'Yetkazib beruvchi buyurtmalari',
  po_number:         'Buyurtma raqami',
  supplier:          'Yetkazib beruvchi',
  po_date:           'Buyurtma sanasi',
  po_status:         'Status',
  po_items:          'Tovarlar',
  po_total:          'Summa',
  create_order:      'Buyurtma yaratish',

  sla_overdue:       'SLA buzildi',
  sla_hours:         'soat',
  sla_days:          'kun',
  sla_minutes:       'daqiqa',
  deadline_overdue:  'Muddat o\'tgan',
  in_work_time:      'Jarayonda',

  telegram_bot:      'Telegram-bot',
  bot_token:         'Bot tokeni',
  chat_id:           'Chat ID',
  test_message:      'Test xabar',
  notifications:     'Bildirishnomalar',

  help:              'Yordam',
  quickstart:        'Tez boshlash',
  roles_access:      'Rollar va kirish',
  chains_title:      'Zanjirlar',
  statuses_title:    'Statuslar',
  scenarios:         'Stsenariylar',
  glossary:          'Qisqartmalar',

  error_required:    'Majburiy maydonni to\'ldiring',
  error_not_found:   'Topilmadi',
  error_permission:  'Ruxsat yo\'q',
  success_saved:     'Saqlandi',
  success_created:   'Yaratildi',
  success_deleted:   'O\'chirildi',
  success_status:    'Status yangilandi',

  spec_name:         'Nomi',
  spec_qty:          'Miqdor',
  spec_unit:         'O\'lchov',
  spec_price:        'Narx',
  spec_total:        'Jami',
  spec_note:         'Izoh',
  add_row:           'Qator qo\'shish',

  col_new:           'Yangilar',
  col_sklad:         'Omborxona',
  col_approval:      'Kelishuv',
  col_finance:       'Moliya',
  col_supply:        'Xarid',
  col_issued:        'Prorabda',
  col_closed:        'Yopildi',

  sort_cost:         'Summa bo\'yicha',
  sort_updated:      'Yangilanish bo\'yicha',
  display_options:   'Ko\'rinish',
  search_placeholder: 'Qidiruv: raqam, nom, ob\'yekt...',
  filter_open:       'Jarayonda',
  filter_issued:     'Berilganlar',
  pipeline:          'Quvur',
  actions_required:  'Sizning vazifangiz',
  per_cent_done:     '% yakunlangan',
  sum_label:         'so\'m',
  no_requests_yet:   'Arizalar yo\'q hali',
  by_type:           'Turlar bo\'yicha',
  issued_this_month: 'Bu oy berildi',
  total_issued:      'Jami berildi',
  urgent_requests:   'Shoshilinch arizalar',
  active_cost_label: 'Faol arizalar summasi',
  overdue_short:     'muddati o\'tgan',
  create_first:      'Birinchisini yaratish',
  all_requests:      'Barcha arizalar',
};

export const TRANSLATIONS: Record<Lang, Translations> = { ru, uz };
