// OneTapDay front-end main script
let _trendSeries = null;
let _trendColor = '#47b500';

// Extracted from app.html (v15 helper theme)

/* ==== CONFIG / API ==== */
const API_BASE = '/api';
const SUB_KEY    = 'otd_sub_active';
const SUB_FROM   = 'otd_sub_from';
const SUB_TO     = 'otd_sub_to';
const DEMO_START = 'otd_demo_started_at';
const DEMO_USED  = 'otd_demo_used'; // флаг: демо уже один раз запускали
const USER_KEY = 'otd_user'; // email
let REMOTE_OK = localStorage.getItem('remote_disabled')==='1' ? false : true;

/* ==== I18N ==== */
const M = {
  ru:{ /* ——— RU ——— */
        'ai.profile_who_solo':"Фриланс / частное лицо",
    'ai.profile_who_owner':"Предприниматель без команды",
    'ai.profile_who_team':"Фирма с командой",
    'ai.profile_niche_ph':"Например: барбершоп, маркетинг, IT-услуги",
    'ai.profile_goal_survive':"Выжить и не влететь в долги",
    'ai.profile_goal_stable':"Стабильно держаться на плаву",
    'ai.profile_goal_grow':"Расти и масштабироваться",

    'ai.ask_title':"Задай вопрос AI-бухгалтеру",
    'ai.ask_desc':"Спроси, почему не хватает на аренду, где сэкономить или как не получить штраф.",
    'ai.q_rent':"Почему не хватает на квартиру?",
    'ai.q_spending':"Где я трачу лишнее?",
    'ai.q_withdraw':"Сколько можно безопасно вывести?",
    'ai.q_month':"Хватит ли денег до конца месяца?",
    'ai.ask_btn':"Спросить",
    'ai.chat_intro':"Здесь позже будет живой диалог с AI-бухгалтером. Сейчас это прототип интерфейса.",

        'documents.add_what':"Что добавить?",
    'documents.btn_screenshot':"Скрин / фото",
    'documents.btn_open_statements':"Открыть выписки",
    'documents.btn_open_invoices':"Открыть фактуры",
    'documents.btn_photo_scan':"Фото / скан",
    'documents.btn_open_cash':"Открыть кассу",

     'ai.profile_who_solo':"Собственник / фрилансер",
    'ai.profile_who_partner':"Партнёр в бизнесе",
    'ai.profile_who_team':"Фирма с командой",
    'ai.profile_niche_ph':"Например: барбершоп, маркетинг, IT-услуги",
    'ai.profile_goal_survive':"Выжить и не влететь в долги",
    'ai.profile_goal_stable':"Стабильно держаться на плаву",
    'ai.profile_goal_grow':"Расти и масштабироваться",

    
        'ai.q_rent':"Почему не хватает на квартиру?",
    'ai.q_spending':"Где я трачу лишнее?",
    'ai.q_withdraw':"Сколько можно безопасно вывести?",
    'ai.q_month':"Хватит ли денег до конца месяца?",
    'ai.ask_btn':"Спросить",
    
    'spending.title':"Расходы по категориям",
    'spending.desc':"Видно, куда чаще всего уходят деньги (Żabka, Biedronka, топливо и т.д.).",
    'spending.add_custom':"+ Своя категория",
    'spending.empty':"Пока нет данных для разбора.",
    'spcat.title':"Новая категория расходов",
    'spcat.desc':"Дай категории понятное название и выбери эмодзи.",
    'spcat.name_label':"Название",
    'spcat.name_ph':"Например: Подписки",
    'spcat.emoji_label':"Эмодзи",
    'spcat.save':"Сохранить",
    'spcat.cancel':"Отмена",

    'settings.lang_title':"Язык интерфейса",
    'settings.lang_desc':"Выбери язык, на котором тебе удобнее работать. Можно менять в любой момент.",
    
        'home.tagline':"Premium AI-CFO для владельцев, которые не хотят тонуть в таблицах.",
    'home.trend_title':"Движение за месяц",
    'home.trend_empty':"Мало данных, чтобы показать движение.",

    'home.tile_docs_title':"Документы",
    'home.tile_docs_desc':"Загрузи выписки, фактуры и чеки (CSV, скрин, фото).",

    'home.tile_money_title':"Деньги и платежи",
    'home.tile_money_desc':"Увидеть, куда ушли деньги и что нужно заплатить.",

    'home.tile_ai_title':"AI-бухгалтер",
    'home.tile_ai_desc':"Поможет с экономией, масштабированием и штрафами.",

    'home.tile_cash_title':"Касса",
    'home.tile_cash_desc':"Наличка: голосом или вручную, закрытие дня.",

    'home.tile_accounts_title':"Счета и карты",
    'home.tile_accounts_desc':"Какие счета подключены и что учитывать в расчётах.",

    'home.tile_reports_title':"Отчёты и экспорт",
    'home.tile_reports_desc':"Выгрузка CSV и отчёты для бухгалтера и инвестора.",

        // Документы
    'documents.title':"Документы",
    'documents.desc':"Здесь ты кидаешь всё сырьё: выписки, фактуры и чеки. OneTapDay разложит по полкам.",
    'documents.statements':"Выписки",
    'documents.statements_desc':"Банк: движения по счёту.",
    'documents.invoices':"Фактуры",
    'documents.invoices_desc':"Счета от клиентов и поставщиков.",
    'documents.receipts':"Чеки / расходы",
    'documents.receipts_desc':"Наличка и мелкие траты.",

    // Отчёты и экспорт
    'reports.title':"Отчёты и экспорт",
    'reports.desc':"Скачать CSV и отчёты для бухгалтера или инвестора.",
    'reports.export_statements':"Экспортировать выписки (CSV)",
    'reports.export_invoices':"Экспортировать фактуры (CSV)",
    'reports.export_month':"Книга / отчёт месяца (CSV)",

    // AI-бухгалтер: профиль
    'ai.top_title':"AI-бухгалтер",
    'ai.top_desc':"Сначала расскажи пару вещей о себе и бизнесе, чтобы советы были точнее.",
    'ai.profile_who':"Кто ты?",
    'ai.profile_niche':"Ниша / чем занимаешься?",
    'ai.profile_goal':"Что главное сейчас?",
    'ai.profile_save':"Сохранить профиль",
    'ai.profile_saved':"Профиль сохранён. AI-бухгалтер будет опираться на эти данные.",
    'ai.placeholders.goal_input':"Например: «Почему не хватает на квартиру?» или «Где я трачу лишнее?»",
    tab_dashboard:"Пульт", tab_statement:"Выписка", tab_invoices:"Фактуры", tab_accounts:"Счета", tab_cash:"Касса", tab_settings:"Настройки",
    gate_locked_title:"Доступ заблокирован",
    gate_locked_desc:"Демо истекло или нет активной подписки. Перейдите в Настройки, чтобы запустить демо (24 ч) или оплатить доступ.",
    gate_open_settings:"Открыть Настройки",
    kpi_due_today:"К оплате сегодня", kpi_unmatched:"Несвязанные транзакции", kpi_banks:"Банки в расчёте", kpi_cash:"Касса (нал)", kpi_total:"Доступно всего", kpi_gap_today:"Разрыв кассы сегодня",
    btn_sync:"Синхронизация", btn_ai_match:"ИИ-сверка", btn_accept_safe:"Принять безопасные пары", btn_pdf:"PDF отчёт", sync_ts:"Синхронизация: —",
    minpay_title:"Минимальный платёж (штраф-стоп)", btn_apply_minpay:"Отметить как оплачено",
    forecast_7d:"Прогноз 7 дней", forecast7d_note:"Считает PLN-счета (включённые) + кассу.",
    forecast_30d:"Прогноз 30 дней", forecast30_note:"Автопрогноз по выпискам + кассе на 30 дней.",
    month_summary_title:"Итоги месяца",
    plan_title:"План платежей под кассу", filter_label:"Фильтр:", filter_today:"Сегодня", filter_7d:"7 дней", filter_all:"Все", exclude_blacklist:"Исключать blacklist",
    btn_make_plan:"Сформировать", btn_apply_plan:"Применить",
    plan_th_invoice:"Фактура", plan_th_supplier:"Поставщик", plan_th_due:"Срок", plan_th_amount:"Сумма", plan_th_reason:"Причина",
    upload_statement:"Загрузить выписку (CSV)", upload_statement_image:"Загрузить скрин выписки (галерея)",
    placeholder_csv_url:"URL CSV выписки", save_url:"Сохранить URL",
    statement_columns_note:"Колонки: дата, id транзакции, id счёта/IBAN, контрагент, описание, сумма(±), валюта, статус, saldo?",
    th_date:"Дата", th_account:"Счёт", th_counterparty:"Контрагент", th_desc:"Описание", th_amount:"Сумма", th_currency:"Валюта", th_status:"Статус", th_actions:"Действия",
    upload_invoices:"Загрузить счета (CSV)", upload_invoice_images:"Загрузить фото фактуры", invoices_note:"Распознаются № фактуры, суммы и даты.",
    inv_th_due:"Срок", inv_th_number:"№", inv_th_supplier:"Поставщик", inv_th_amount:"Сумма", inv_th_currency:"Валюта", inv_th_status:"Статус", inv_th_candidate:"Кандидат", inv_th_score:"Score", inv_th_action:"Действие",
    auto_accounts_title:"Счета из выписки (авто)", auto_accounts_desc:"Редактируй валюту, стартовый баланс и включение в план.",
    acc_th_account:"Счёт", acc_th_type:"Тип", acc_th_currency:"Валюта", acc_th_balance_calc:"Баланс (расчёт)", acc_th_start_balance:"Стартовый баланс", acc_th_include:"В расчёт",
    cash_title:"Касса — быстрые операции", cash_note:"Голосовая касса + быстрые кнопки",
    btn_add_in:"+ Приём", btn_add_out:"− Выдача", btn_close_shift:"Закрыть смену",
    speech_lang_label:"Язык распознавания:", cash_photo_note:"Фото чека/выписки — распознать сумму и описание.",
    cash_th_date:"Дата", cash_th_type:"Тип", cash_th_amount:"Сумма", cash_th_source:"Источник", cash_th_comment:"Комментарий",
    parameters:"Параметры", param_cash_label:"Доступная касса сегодня (PLN):", param_penalty_label:"Пеня, %/день:", param_interval_label:"Интервал синха, мин:",
    rateEUR_label:"rateEUR:", rateUSD_label:"rateUSD:", blacklist_label:"Blacklist (через запятую):", auto_mode_label:"Авто: из счетов (включённые) + касса",
    btn_save_settings:"Сохранить", btn_export_settings:"Экспорт настроек", btn_import_settings:"Импорт настроек",
    btn_clear_all:"Очистить историю (локально)",
    sub_title:"Подписка / Демо", btn_start_demo:"Запустить демо (24 ч)", btn_pay_sub:"Оплатить подписку", btn_end_demo:"Закончить демо",
    sub_hint:"Оплата только в Настройках. Если есть ссылka Stripe — положи в localStorage.stripe_link.",
    ph_amount:"Сумма", ph_comment:"Комментарий"
  },
  en:{ /* ——— EN ——— */
        'ai.profile_who_solo':"Freelancer / individual",
    'ai.profile_who_owner':"Entrepreneur without a team",
    'ai.profile_who_team':"Company with a team",
    'ai.profile_niche_ph':"For example: barbershop, marketing, IT services",
    'ai.profile_goal_survive':"Survive and avoid going into debt",
    'ai.profile_goal_stable':"Stay stable and afloat",
    'ai.profile_goal_grow':"Grow and scale",

    'ai.ask_title':"Ask the AI accountant",
    'ai.ask_desc':"Ask why there isn’t enough for rent, where to save, or how to avoid penalties.",
    'ai.q_rent':"Why is there not enough for rent?",
    'ai.q_spending':"Where am I overspending?",
    'ai.q_withdraw':"How much can I safely withdraw?",
    'ai.q_month':"Will the money last until the end of the month?",
    'ai.ask_btn':"Ask",
    'ai.chat_intro':"Later this will be a live dialogue with the AI accountant. For now it’s a prototype.",

    
        'documents.add_what':"What to add?",
    'documents.btn_screenshot':"Screenshot / photo",
    'documents.btn_open_statements':"Open statements",
    'documents.btn_open_invoices':"Open invoices",
    'documents.btn_photo_scan':"Photo / scan",
    'documents.btn_open_cash':"Open cash",

        'ai.profile_who_solo':"Owner / freelancer",
    'ai.profile_who_partner':"Business partner",
    'ai.profile_who_team':"Company with a team",
    'ai.profile_niche_ph':"For example: barbershop, marketing, IT services",
    'ai.profile_goal_survive':"Survive and avoid going into debt",
    'ai.profile_goal_stable':"Stay stable and afloat",
    'ai.profile_goal_grow':"Grow and scale",

  
     'ai.q_rent':"Why is there not enough for rent?",
    'ai.q_spending':"Where am I overspending?",
    'ai.q_withdraw':"How much can I safely withdraw?",
    'ai.q_month':"Will the money last until the end of the month?",
    'ai.ask_btn':"Ask",
    
      'spending.title':"Spending by category",
    'spending.desc':"See where money most often goes (groceries, fuel, etc.).",
    'spending.add_custom':"+ Custom category",
    'spending.empty':"No data to analyse yet.",
    
    'settings.lang_title':"Interface language",
    'settings.lang_desc':"Choose the language you prefer to work in. You can change it anytime.",
        'home.tagline':"Premium AI-CFO for owners who don't want to drown in spreadsheets.",
    'home.trend_title':"Movement this month",
    'home.trend_empty':"Not enough data to show the trend yet.",
     'spcat.title':"New spending category",
    'spcat.desc':"Give the category a clear name and pick an emoji.",
    'spcat.name_label':"Name",
    'spcat.name_ph':"For example: Subscriptions",
    'spcat.emoji_label':"Emoji",
    'spcat.save':"Save",
    'spcat.cancel':"Cancel",

    'home.tile_docs_title':"Documents",
    'home.tile_docs_desc':"Upload statements, invoices and receipts (CSV, screenshot, photo).",

    'home.tile_money_title':"Money & payments",
    'home.tile_money_desc':"See where the money went and what needs to be paid.",

    'home.tile_ai_title':"AI accountant",
    'home.tile_ai_desc':"Helps with saving, scaling and avoiding penalties.",

    'home.tile_cash_title':"Cash",
    'home.tile_cash_desc':"Cash: voice or manual input, close-the-day.",

    'home.tile_accounts_title':"Accounts & cards",
    'home.tile_accounts_desc':"Which accounts are connected and what is included in calculations.",

    'home.tile_reports_title':"Reports & export",
    'home.tile_reports_desc':"CSV exports and reports for your accountant or investor.",

        // Documents
    'documents.title':"Documents",
    'documents.desc':"This is where you drop all the raw data: statements, invoices and receipts. OneTapDay will sort it for you.",
    'documents.statements':"Statements",
    'documents.statements_desc':"Bank: account movements.",
    'documents.invoices':"Invoices",
    'documents.invoices_desc':"Bills from customers and suppliers.",
    'documents.receipts':"Receipts / expenses",
    'documents.receipts_desc':"Cash and small daily spending.",

    // Reports & export
    'reports.title':"Reports & export",
    'reports.desc':"Download CSV files and reports for your accountant or investor.",
    'reports.export_statements':"Export statements (CSV)",
    'reports.export_invoices':"Export invoices (CSV)",
    'reports.export_month':"Monthly book / report (CSV)",

    // AI accountant
    'ai.top_title':"AI accountant",
    'ai.top_desc':"First tell a few things about you and the business so the advice is more accurate.",
    'ai.profile_who':"Who are you?",
    'ai.profile_niche':"Niche / what do you do?",
    'ai.profile_goal':"What is the main goal now?",
    'ai.profile_save':"Save profile",
    'ai.profile_saved':"Profile saved. The AI accountant will use this data.",
    'ai.placeholders.goal_input':"For example: “Why is there not enough for rent?” or “Where am I overspending?”",

    tab_dashboard:"Dashboard", tab_statement:"Statement", tab_invoices:"Invoices", tab_accounts:"Accounts", tab_cash:"Cash", tab_settings:"Settings",
    gate_locked_title:"Access locked",
    gate_locked_desc:"Demo ended or subscription inactive. Go to Settings to start a 24h demo or pay.",
    gate_open_settings:"Open Settings",
    kpi_due_today:"Due today", kpi_unmatched:"Unmatched transactions", kpi_banks:"Bank balances", kpi_cash:"Cash (PLN)", kpi_total:"Available total", kpi_gap_today:"Cash gap today",
    btn_sync:"Sync", btn_ai_match:"AI match", btn_accept_safe:"Accept safe matches", btn_pdf:"PDF report", sync_ts:"Sync: —",
    minpay_title:"Minimum payment (penalty-stop)", btn_apply_minpay:"Mark as paid",
    forecast_7d:"7-day forecast", forecast7d_note:"Calculates included PLN accounts + cash.",
    forecast_30d:"30-day forecast", forecast30_note:"Auto-forecast from statements + cash.",
    month_summary_title:"Month summary",
    plan_title:"Payment plan for cash", filter_label:"Filter:", filter_today:"Today", filter_7d:"7 days", filter_all:"All", exclude_blacklist:"Exclude blacklist",
    btn_make_plan:"Build plan", btn_apply_plan:"Apply plan",
    plan_th_invoice:"Invoice", plan_th_supplier:"Supplier", plan_th_due:"Due", plan_th_amount:"Amount", plan_th_reason:"Reason",
    upload_statement:"Upload statement (CSV)", upload_statement_image:"Upload statement screenshot (gallery)",
    placeholder_csv_url:"CSV statement URL", save_url:"Save URL",
    statement_columns_note:"Columns: booking date, tx id, account id/IBAN, counterparty, title/description, amount(±), currency, status, balance?",
    th_date:"Date", th_account:"Account", th_counterparty:"Counterparty", th_desc:"Description", th_amount:"Amount", th_currency:"Currency", th_status:"Status", th_actions:"Actions",
    upload_invoices:"Upload invoices (CSV)", upload_invoice_images:"Upload invoice photos", invoices_note:"We detect invoice numbers, amounts and dates.",
    inv_th_due:"Due", inv_th_number:"No", inv_th_supplier:"Supplier", inv_th_amount:"Amount", inv_th_currency:"Currency", inv_th_status:"Status", inv_th_candidate:"Candidate", inv_th_score:"Score", inv_th_action:"Action",
    auto_accounts_title:"Accounts from statement (auto)", auto_accounts_desc:"Edit currency, start balance and include-in-plan.",
    acc_th_account:"Account", acc_th_type:"Type", acc_th_currency:"Currency", acc_th_balance_calc:"Balance (calc)", acc_th_start_balance:"Start", acc_th_include:"Include",
    cash_title:"Cash — quick ops", cash_note:"Voice cash + quick buttons",
    btn_add_in:"+ In", btn_add_out:"− Out", btn_close_shift:"Close shift",
    speech_lang_label:"Recognition language:", cash_photo_note:"Receipt/statement photo — detect amount and description.",
    cash_th_date:"Date", cash_th_type:"Type", cash_th_amount:"Amount", cash_th_source:"Source", cash_th_comment:"Comment",
    parameters:"Parameters", param_cash_label:"Manual available cash today (PLN):", param_penalty_label:"Penalty, %/day:", param_interval_label:"Sync interval, min:",
    rateEUR_label:"rateEUR:", rateUSD_label:"rateUSD:", blacklist_label:"Blacklist (comma):", auto_mode_label:"Auto: from included statement accounts + cash",
    btn_save_settings:"Save", btn_export_settings:"Export settings", btn_import_settings:"Import settings",
    btn_clear_all:"Clear history (local)",
    sub_title:"Subscription / Demo", btn_start_demo:"Start demo (24h)", btn_pay_sub:"Pay subscription", btn_end_demo:"End demo",
    sub_hint:"Payment only in Settings. If you have a Stripe link, put it in localStorage.stripe_link.",
    ph_amount:"Amount", ph_comment:"Comment"
  },
  pl:{ /* ——— PL ——— */
        'ai.profile_who_solo':"Freelancer / osoba prywatna",
    'ai.profile_who_owner':"Przedsiębiorca bez zespołu",
    'ai.profile_who_team':"Firma z zespołem",
    'ai.profile_niche_ph':"Np. barbershop, marketing, usługi IT",
    'ai.profile_goal_survive':"Przetrwać i nie wpaść w długi",
    'ai.profile_goal_stable':"Stabilnie utrzymać się na powierzchni",
    'ai.profile_goal_grow':"Rosnąć i skalować",

    'ai.ask_title':"Zadaj pytanie AI-księgowemu",
    'ai.ask_desc':"Zapytaj, czemu nie starcza na czynsz, gdzie oszczędzić albo jak uniknąć kary.",
    'ai.q_rent':"Dlaczego nie starcza na mieszkanie?",
    'ai.q_spending':"Gdzie wydaję za dużo?",
    'ai.q_withdraw':"Ile mogę bezpiecznie wypłacić?",
    'ai.q_month':"Czy wystarczy pieniędzy do końca miesiąca?",
    'ai.ask_btn':"Zapytaj",
    'ai.chat_intro':"Tu później pojawi się żywa rozmowa z AI-księgowym. Teraz to prototyp interfejsu.",

        'documents.add_what':"Co dodać?",
    'documents.btn_screenshot':"Zrzut / zdjęcie",
    'documents.btn_open_statements':"Otwórz wyciągi",
    'documents.btn_open_invoices':"Otwórz faktury",
    'documents.btn_photo_scan':"Zdjęcie / skan",
    'documents.btn_open_cash':"Otwórz kasę",

        'ai.profile_who_solo':"Właściciel / freelancer",
    'ai.profile_who_partner':"Wspólnik w biznesie",
    'ai.profile_who_team':"Firma z zespołem",
    'ai.profile_niche_ph':"Np. barbershop, marketing, usługi IT",
    'ai.profile_goal_survive':"Przetrwać i nie wpaść w długi",
    'ai.profile_goal_stable':"Stabilnie utrzymać się na powierzchni",
    'ai.profile_goal_grow':"Rośnąć i skalować",

     'ai.q_rent':"Dlaczego nie starcza na mieszkanie?",
    'ai.q_spending':"Gdzie wydaję za dużo?",
    'ai.q_withdraw':"Ile mogę bezpiecznie wypłacić?",
    'ai.q_month':"Czy wystarczy pieniędzy do końca miesiąca?",
    'ai.ask_btn':"Zapytaj",
    
     'spending.title':"Wydatki według kategorii",
    'spending.desc':"Widać, gdzie najczęściej uciekają pieniądze (Żabka, Biedronka, paliwo itd.).",
    'spending.add_custom':"+ Własna kategoria",
    'spending.empty':"Na razie brak danych do analizy.",
     'spcat.title':"Nowa kategoria wydatków",
    'spcat.desc':"Nadaj nazwę kategorii i wybierz emoji.",
    'spcat.name_label':"Nazwa",
    'spcat.name_ph':"Np. Subskrypcje",
    'spcat.emoji_label':"Emoji",
    'spcat.save':"Zapisz",
    'spcat.cancel':"Anuluj",
    
        'settings.lang_title':"Język interfejsu",
    'settings.lang_desc':"Wybierz język, w którym najwygodniej Ci pracować. Możesz zmienić go w każdej chwili.",
    
        'home.tagline':"Premium AI-CFO dla właścicieli, którzy nie chcą tonąć w tabelkach.",
    'home.trend_title':"Ruch za miesiąc",
    'home.trend_empty':"Za mało danych, żeby pokazać ruch.",

    'home.tile_docs_title':"Dokumenty",
    'home.tile_docs_desc':"Wgraj wyciągi, faktury i paragony (CSV, screen, zdjęcie).",

    'home.tile_money_title':"Pieniądze i płatności",
    'home.tile_money_desc':"Zobacz, gdzie uciekają pieniądze i co trzeba zapłacić.",

    'home.tile_ai_title':"AI-księgowy",
    'home.tile_ai_desc':"Pomoże z oszczędzaniem, skalowaniem i unikaniem kar.",

    'home.tile_cash_title':"Kasa",
    'home.tile_cash_desc':"Gotówka: głosowo lub ręcznie, zamknięcie dnia.",

    'home.tile_accounts_title':"Konta i karty",
    'home.tile_accounts_desc':"Które konta są podłączone i co liczymy w analizie.",

    'home.tile_reports_title':"Raporty i eksport",
    'home.tile_reports_desc':"Eksport CSV i raporty dla księgowego lub inwestora.",

        // Dokumenty
    'documents.title':"Dokumenty",
    'documents.desc':"Tutaj wrzucasz całe surowe dane: wyciągi, faktury i paragony. OneTapDay poukłada je na półkach.",
    'documents.statements':"Wyciągi",
    'documents.statements_desc':"Ruchy na koncie bankowym.",
    'documents.invoices':"Faktury",
    'documents.invoices_desc':"Dokumenty od klientów i dostawców.",
    'documents.receipts':"Paragony / wydatki",
    'documents.receipts_desc':"Gotówka i drobne koszty.",

    // Raporty i eksport
    'reports.title':"Raporty i eksport",
    'reports.desc':"Pobierz pliki CSV i raporty dla księgowego lub inwestora.",
    'reports.export_statements':"Eksport wyciągów (CSV)",
    'reports.export_invoices':"Eksport faktur (CSV)",
    'reports.export_month':"Księga / raport miesiąca (CSV)",

    // AI-księgowy
    'ai.top_title':"AI-księgowy",
    'ai.top_desc':"Najpierw powiedz kilka rzeczy o sobie i biznesie, żeby wskazówki były dokładniejsze.",
    'ai.profile_who':"Kim jesteś?",
    'ai.profile_niche':"Branża / czym się zajmujesz?",
    'ai.profile_goal':"Co jest teraz najważniejsze?",
    'ai.profile_save':"Zapisz profil",
    'ai.profile_saved':"Profil zapisany. AI-księgowy będzie opierał się na tych danych.",
    'ai.placeholders.goal_input':"Na przykład: „Dlaczego nie starcza na mieszkanie?” albo „Gdzie wydaję za dużo?”",

    tab_dashboard:"Panel", tab_statement:"Wyciąg", tab_invoices:"Faktury", tab_accounts:"Konta", tab_cash:"Kasa", tab_settings:"Ustawienia",
    gate_locked_title:"Dostęp zablokowany",
    gate_locked_desc:"Demo zakończone lub brak subskrypcji. Przejdź do Ustawień, aby uruchomić demo (24h) lub opłacić.",
    gate_open_settings:"Otwórz Ustawienia",
    kpi_due_today:"Do zapłaty dziś", kpi_unmatched:"Niesparowane transakcje", kpi_banks:"Bilans banków", kpi_cash:"Kasa (PLN)", kpi_total:"Dostępnie razem", kpi_gap_today:"Brak środków dziś",
    btn_sync:"Synchronizuj", btn_ai_match:"Dopasowanie AI", btn_accept_safe:"Akceptuj bezpieczne pary", btn_pdf:"Raport PDF", sync_ts:"Synchronizacja: —",
    minpay_title:"Minimalna płatność (kara-stop)", btn_apply_minpay:"Oznacz jako opłacone",
    forecast_7d:"Prognoza 7 dni", forecast7d_note:"Liczy włączone konta PLN + kasa.",
    forecast_30d:"Prognoza 30 dni", forecast30_note:"Autoprognoza z wyciągów + kasa на 30 dni.",
    month_summary_title:"Podsumowanie miesiąca",
    plan_title:"Plan płatności pod kasę", filter_label:"Filtr:", filter_today:"Dziś", filter_7d:"7 dni", filter_all:"Wszystko", exclude_blacklist:"Wyklucz blacklistę",
    btn_make_plan:"Utwórz plan", btn_apply_plan:"Zastosuj plan",
    plan_th_invoice:"Faktura", plan_th_supplier:"Dostawca", plan_th_due:"Termin", plan_th_amount:"Kwota", plan_th_reason:"Powód",
    upload_statement:"Załaduj wyciąg (CSV)", upload_statement_image:"Załaduj zrzut wyciągu (galeria)",
    placeholder_csv_url:"URL CSV wyciągu", save_url:"Zapisz URL",
    statement_columns_note:"Kolumny: Data księgowania, ID transakcji, ID konta/IBAN, Kontrahent, Tytuł/Opis, Kwota(±), Waluta, Status, Saldo?",
    th_date:"Data", th_account:"Konto", th_counterparty:"Kontrahent", th_desc:"Opis", th_amount:"Kwota", th_currency:"Waluta", th_status:"Status", th_actions:"Działania",
    upload_invoices:"Załaduj faktury (CSV)", upload_invoice_images:"Załaduj zdjęcia faktur", invoices_note:"Wykrywamy nr faktury, kwotę i datę.",
    inv_th_due:"Termin", inv_th_number:"Nr", inv_th_supplier:"Dostawca", inv_th_amount:"Kwota", inv_th_currency:"Waluta", inv_th_status:"Status", inv_th_candidate:"Kandydat", inv_th_score:"Score", inv_th_action:"Akcja",
    auto_accounts_title:"Konta z wyciągu (auto)", auto_accounts_desc:"Edycja waluty, salda początkowego i uwzględnienia w planie.",
    acc_th_account:"Konto", acc_th_type:"Typ", acc_th_currency:"Waluta", acc_th_balance_calc:"Saldo (oblicz)", acc_th_start_balance:"Start", acc_th_include:"Uwzględnij",
    cash_title:"Kasa — szybkie operacje", cash_note:"Głosowa kasa + szybkie przyciski",
    btn_add_in:"+ Przyjęcie", btn_add_out:"− Wydanie", btn_close_shift:"Zamknij zmianę",
    speech_lang_label:"Język rozpoznawania:", cash_photo_note:"Zdjęcie paragonu/wyciągu — wykryj kwotę i opis.",
    cash_th_date:"Data", cash_th_type:"Typ", cash_th_amount:"Kwota", cash_th_source:"Źródło", cash_th_comment:"Komentarz",
    parameters:"Parametry", param_cash_label:"Ręczna dostępna kasa dziś (PLN):", param_penalty_label:"Kara, %/dzień:", param_interval_label:"Interwał synchronizacji, min:",
    rateEUR_label:"rateEUR:", rateUSD_label:"rateUSD:", blacklist_label:"Czarna lista (przecinki):", auto_mode_label:"Auto: z kont wyciągu (włączone) + kasa",
    btn_save_settings:"Zapisz", btn_export_settings:"Eksport ustawień", btn_import_settings:"Import ustawień",
    btn_clear_all:"Wyczyść historię (lokalnie)",
    sub_title:"Subskrypcja / Demo", btn_start_demo:"Uruchom demo (24h)", btn_pay_sub:"Opłać subskrypcję", btn_end_demo:"Zakończ demo",
    sub_hint:"Płatność tylko в Ustawieniach. Jeśli masz link Stripe — ustaw w localStorage.stripe_link.",
    ph_amount:"Kwota", ph_comment:"Komentarz"
  },
  uk:{ /* ——— UK ——— */
        'ai.profile_who_solo':"Фрилансер / фізична особа",
    'ai.profile_who_owner':"Підприємець без команди",
    'ai.profile_who_team':"Компанія з командою",
    'ai.profile_niche_ph':"Наприклад: барбершоп, маркетинг, IT-послуги",
    'ai.profile_goal_survive':"Вижити й не залізти в борги",
    'ai.profile_goal_stable':"Стабільно триматися на плаву",
    'ai.profile_goal_grow':"Рости й масштабуватися",

    'ai.ask_title':"Постав запитання AI-бухгалтеру",
    'ai.ask_desc':"Запитай, чому не вистачає на оренду, де зекономити або як уникнути штрафу.",
    'ai.q_rent':"Чому не вистачає на квартиру?",
    'ai.q_spending':"Де я витрачаю зайве?",
    'ai.q_withdraw':"Скільки можна безпечно вивести?",
    'ai.q_month':"Чи вистачить грошей до кінця місяця?",
    'ai.ask_btn':"Запитати",
    'ai.chat_intro':"Тут пізніше буде живий діалог з AI-бухгалтером. Зараз це прототип інтерфейсу.",

        'documents.add_what':"Що додати?",
    'documents.btn_screenshot':"Скрін / фото",
    'documents.btn_open_statements':"Відкрити виписки",
    'documents.btn_open_invoices':"Відкрити рахунки",
    'documents.btn_photo_scan':"Фото / скан",
    'documents.btn_open_cash':"Відкрити касу",

      'ai.profile_who_solo':"Власник / фрилансер",
    'ai.profile_who_partner':"Партнер у бізнесі",
    'ai.profile_who_team':"Компанія з командою",
    'ai.profile_niche_ph':"Наприклад: барбершоп, маркетинг, IT-послуги",
    'ai.profile_goal_survive':"Вижити й не залізти в борги",
    'ai.profile_goal_stable':"Стабільно триматися на плаву",
    'ai.profile_goal_grow':"Рости й масштабуватися",
    
      'ai.q_rent':"Чому не вистачає на квартиру?",
    'ai.q_spending':"Де я витрачаю зайве?",
    'ai.q_withdraw':"Скільки можна безпечно вивести?",
    'ai.q_month':"Чи вистачить грошей до кінця місяця?",
    'ai.ask_btn':"Запитати",
    
       'spending.title':"Витрати за категоріями",
    'spending.desc':"Видно, куди найчастіше йдуть гроші (магазини, пальне тощо).",
    'spending.add_custom':"+ Власна категорія",
    'spending.empty':"Поки що немає даних для аналізу.",
      'spcat.title':"Нова категорія витрат",
    'spcat.desc':"Дай категорії зрозумілу назву та обери емодзі.",
    'spcat.name_label':"Назва",
    'spcat.name_ph':"Наприклад: Підписки",
    'spcat.emoji_label':"Емодзі",
    'spcat.save':"Зберегти",
    'spcat.cancel':"Скасувати",
    
        'settings.lang_title':"Мова інтерфейсу",
    'settings.lang_desc':"Обери мову, якою тобі зручніше працювати. Можна змінити в будь-який момент.",
        'home.tagline':"Premium AI-CFO для власників, які не хочуть тонути в таблицях.",
    'home.trend_title':"Рух за місяць",
    'home.trend_empty':"Замало даних, щоб показати рух.",

    'home.tile_docs_title':"Документи",
    'home.tile_docs_desc':"Завантажуй виписки, рахунки та чеки (CSV, скрін, фото).",

    'home.tile_money_title':"Гроші та платежі",
    'home.tile_money_desc':"Побачити, куди йдуть гроші і що потрібно оплатити.",

    'home.tile_ai_title':"AI-бухгалтер",
    'home.tile_ai_desc':"Допоможе з економією, зростанням і уникненням штрафів.",

    'home.tile_cash_title':"Каса",
    'home.tile_cash_desc':"Готівка: голосом чи вручну, закриття дня.",

    'home.tile_accounts_title':"Рахунки та картки",
    'home.tile_accounts_desc':"Які рахунки підключені і що враховуємо в розрахунках.",

    'home.tile_reports_title':"Звіти та експорт",
    'home.tile_reports_desc':"Вигрузка CSV та звіти для бухгалтера й інвестора.",

        // Документи
    'documents.title':"Документи",
    'documents.desc':"Тут ти скидаєш всі сирі дані: виписки, рахунки і чеки. OneTapDay розкладе все по поличках.",
    'documents.statements':"Виписки",
    'documents.statements_desc':"Банк: рухи по рахунку.",
    'documents.invoices':"Рахунки / інвойси",
    'documents.invoices_desc':"Рахунки від клієнтів та постачальників.",
    'documents.receipts':"Чеки / витрати",
    'documents.receipts_desc':"Готівка та дрібні витрати.",

    // Звіти та експорт
    'reports.title':"Звіти та експорт",
    'reports.desc':"Завантажуй CSV і звіти для бухгалтера або інвестора.",
    'reports.export_statements':"Експортувати виписки (CSV)",
    'reports.export_invoices':"Експортувати рахунки (CSV)",
    'reports.export_month':"Книга / звіт місяця (CSV)",

    // AI-бухгалтер
    'ai.top_title':"AI-бухгалтер",
    'ai.top_desc':"Спочатку розкажи кілька речей про себе та бізнес, щоб поради були точнішими.",
    'ai.profile_who':"Хто ти?",
    'ai.profile_niche':"Ніша / чим займаєшся?",
    'ai.profile_goal':"Що зараз головне?",
    'ai.profile_save':"Зберегти профіль",
    'ai.profile_saved':"Профіль збережено. AI-бухгалтер буде спиратися на ці дані.",
    'ai.placeholders.goal_input':"Наприклад: «Чому не вистачає на квартиру?» або «Де я витрачаю зайве?»",

    tab_dashboard:"Пульт", tab_statement:"Виписка", tab_invoices:"Рахунки", tab_accounts:"Рахунки", tab_cash:"Каса", tab_settings:"Налаштування",
    gate_locked_title:"Доступ заблоковано",
    gate_locked_desc:"Демо завершено або немає підписки. Перейдіть у Налаштування, щоб запустити демо (24 год) або оплатити доступ.",
    gate_open_settings:"Відкрити Налаштування",
    kpi_due_today:"До сплати сьогодні", kpi_unmatched:"Неповʼязані транзакції", kpi_banks:"Баланс банків", kpi_cash:"Каса (PLN)", kpi_total:"Доступно всього", kpi_gap_today:"Розрив каси сьогодні",
    btn_sync:"Синхронізація", btn_ai_match:"AI-звірка", btn_accept_safe:"Прийняти безпечні пари", btn_pdf:"Звіт PDF", sync_ts:"Синхр.: —",
    minpay_title:"Мінімальний платіж (штраф-стоп)", btn_apply_minpay:"Позначити як сплачено",
    forecast_7d:"Прогноз 7 днів", forecast7d_note:"Рахує увімкнені PLN-рахунки + касу.",
    forecast_30d:"Прогноз 30 днів", forecast30_note:"Автопрогноз з виписок + каси.",
    month_summary_title:"Підсумки місяця",
    plan_title:"План платежів під касу", filter_label:"Фільтр:", filter_today:"Сьогодні", filter_7d:"7 днів", filter_all:"Всі", exclude_blacklist:"Виключати blacklist",
    btn_make_plan:"Сформувати", btn_apply_plan:"Застосувати",
    plan_th_invoice:"Рахунок", plan_th_supplier:"Постачальник", plan_th_due:"Термін", plan_th_amount:"Сума", plan_th_reason:"Причина",
    upload_statement:"Завантажити виписку (CSV)", upload_statement_image:"Завантажити скрин виписки (галерея)",
    placeholder_csv_url:"URL CSV виписки", save_url:"Зберегти URL",
    statement_columns_note:"Колонки: дата, id транзакції, id рахунку/IBAN, контрагент, опис, сума(±), валюта, статус, баланс?",
    th_date:"Дата", th_account:"Рахунок", th_counterparty:"Контрагент", th_desc:"Опис", th_amount:"Сума", th_currency:"Валюта", th_status:"Статус", th_actions:"Дії",
    upload_invoices:"Завантажити рахунки (CSV)", upload_invoice_images:"Завантажити фото рахунків", invoices_note:"Виявляємо № рахунку, суму і дату.",
    inv_th_due:"Термін", inv_th_number:"№", inv_th_supplier:"Постачальник", inv_th_amount:"Сума", inv_th_currency:"Валюта", inv_th_status:"Статус", inv_th_candidate:"Кандидат", inv_th_score:"Score", inv_th_action:"Дія",
    auto_accounts_title:"Рахунки з виписки (авто)", auto_accounts_desc:"Редагуйте валюту, початковий баланс і включення до плану.",
    acc_th_account:"Рахунок", acc_th_type:"Тип", acc_th_currency:"Валюта", acc_th_balance_calc:"Баланс (обр.)", acc_th_start_balance:"Старт", acc_th_include:"Включити",
    cash_title:"Каса — швидкі операції", cash_note:"Голосова каса + швидкі кнопки",
    btn_add_in:"+ Прихід", btn_add_out:"− Видаток", btn_close_shift:"Закрити зміну",
    speech_lang_label:"Мова розпізнавання:", cash_photo_note:"Фото чеку/виписки — розпізнати суму та опис.",
    cash_th_date:"Дата", cash_th_type:"Тип", cash_th_amount:"Сума", cash_th_source:"Джерело", cash_th_comment:"Коментар",
    parameters:"Параметри", param_cash_label:"Ручна доступна каса сьогодні (PLN):", param_penalty_label:"Пеня, %/день:", param_interval_label:"Інтервал синхр., хв:",
    rateEUR_label:"rateEUR:", rateUSD_label:"rateUSD:", blacklist_label:"Чорний список (через кому):", auto_mode_label:"Авто: з рахунків (включені) + каса",
    btn_save_settings:"Зберегти", btn_export_settings:"Експорт налаштувань", btn_import_settings:"Імпорт налаштувань",
    btn_clear_all:"Очистити історію (локально)",
    sub_title:"Підписка / Демо", btn_start_demo:"Запустити демо (24 год)", btn_pay_sub:"Оплатити підписку", btn_end_demo:"Завершити демо",
    sub_hint:"Оплата лише в Налаштуваннях. Якщо є посилання Stripe — покладіть у localStorage.stripe_link.",
    ph_amount:"Сума", ph_comment:"Коментар"
  }
};

/* PLACEHOLDER APPLIER */
function applyPlaceholders(lang){
  const dict = M[lang]||M.pl;
  document.querySelectorAll('[data-i-ph]').forEach(el=>{
    const k = el.getAttribute('data-i-ph');
    if (dict[k]) el.setAttribute('placeholder', dict[k]);
  });
}

/* LANGUAGE APPLY */
function applyLang(lang){
  const dict = M[lang]||M.pl;
  document.querySelectorAll('[data-i]').forEach(el=>{
    const k = el.getAttribute('data-i'); if (dict[k]) el.textContent = dict[k];
  });
  document.querySelectorAll('#langBarMain button').forEach(btn=>btn.classList.toggle('on', btn.dataset.lang===lang));
  localStorage.setItem('otd_lang', lang);
  applyPlaceholders(lang);
  if (typeof renderCashExamples==='function') renderCashExamples(lang);
}


/* ==== THEME & HELPER STATE ==== */
const THEME_KEY = 'otd_theme';

function applyTheme(theme){
  const body = document.body;
  if(!body) return;
  body.classList.remove('theme-light');
  if(theme==='light'){
    body.classList.add('theme-light');
  }
  localStorage.setItem(THEME_KEY, theme);
  const sel = $id('themeSelect');
  if(sel){
    sel.value = theme;
  }
}

function initTheme(){
  const saved = localStorage.getItem(THEME_KEY) || 'dark';
  applyTheme(saved);
}

/* ==== INLINE HELP CONTENT ==== */
const HELP_ANSWERS = {
  ritual:{
    pl:{
      q:"Jak używać OneTapDay na co dzień?",
      a:"Każdego dnia robisz 3 rzeczy: 1) Klikasz 'Dodaj dzisiejsze ruchy' i dodajesz wyciąg bankowy, ruchy kasy lub faktury. 2) Klikasz 'Znajdź i potwierdź płatności' – system dopasuje przelewy do faktur i zaktualizuje statusy. 3) Klikasz 'Zamknij dzień' – widzisz wynik dnia, ryzyko, dni bezpieczeństwa i cel na jutro."
    },
    en:{
      q:"How to use OneTapDay every day?",
      a:"Every day you do 3 steps: 1) Click 'Add today movements' and add bank statement, cash movements or invoices. 2) Click 'Find & confirm payments' – the app matches transfers to invoices and updates statuses. 3) Click 'Close day' – you see daily result, risk, safety days and target for tomorrow."
    },
    ru:{
      q:"Как пользоваться OneTapDay каждый день?",
      a:"Каждый день у тебя 3 шага: 1) Нажимаешь 'Добавить движения за сегодня' и добавляешь выписку банка, движения кассы или счета. 2) Нажимаешь 'Найти и подтвердить платежи' – система сама сопоставит платежи со счетами и обновит статусы. 3) Нажимаешь 'Закрыть день' – видишь итог дня, риск, дни безопасности и цель на завтра."
    },
    uk:{
      q:"Як користуватися OneTapDay щодня?",
      a:"Щодня ти робиш 3 кроки: 1) Натискаєш 'Додати рухи за сьогодні' і додаєш виписку банку, касу або рахунки. 2) Натискаєш 'Знайти та підтвердити платежі' – система зіставляє платежі з рахунками. 3) Натискаєш 'Закрити день' – бачиш результат дня, ризик, дні безпеки та ціль на завтра."
    }
  },
  sync:{
    pl:{
      q:"Co to jest „Synchronizacja”?",
      a:"Synchronizacja odświeża dane z chmury: wyciągi, faktury, ustawienia. Używasz jej gdy pracujesz na kilku urządzeniach lub po imporcie danych z innego miejsca. Jeśli pracujesz tylko na jednym telefonie, zwykle wystarczy kliknąć raz na dzień."
    },
    en:{
      q:"What is 'Synchronisation'?",
      a:"Synchronisation refreshes data from the cloud: statements, invoices, settings. Use it when you work on multiple devices or after importing data elsewhere. If you use only one device, pressing it once per day is usually enough."
    },
    ru:{
      q:"Что такое «Синхронизация»?",
      a:"Синхронизация обновляет данные из облака: выписки, счета, настройки. Нажимай, если работаешь с нескольких устройств или только что что-то импортировал. Если ты работаешь с одного телефона, обычно достаточно раз в день."
    },
    uk:{
      q:"Що таке «Синхронізація»?",
      a:"Синхронізація оновлює дані з хмари: виписки, рахунки, налаштування. Натискай, якщо працюєш з кількох пристроїв або щось імпортував. Якщо один телефон – достатньо раз на день."
    }
  },
  match:{
    pl:{
      q:"Co to są „dopasowania płatności”?",
      a:"To połączenia między operacjami z wyciągu a fakturami. OneTapDay szuka przelewów, które pasują do kwoty i kontrahenta faktury, i oznacza faktury jako opłacone. Dzięki temu nie musisz ręcznie śledzić, co już zapłaciłeś."
    },
    en:{
      q:"What are 'payment matches'?",
      a:"These are links between statement operations and invoices. OneTapDay searches for transfers that match invoice amount and counterparty and marks invoices as paid, so you do not track it manually."
    },
    ru:{
      q:"Что такое «допасывания платежей»?",
      a:"Это связи между операциями по выписке и счетами. OneTapDay ищет платежи, которые совпадают по сумме и контрагенту, и помечает счета как оплаченные. Тебе не нужно вручную отслеживать, что уже оплачено."
    },
    uk:{
      q:"Що таке «співставлення платежів»?",
      a:"Це звʼязки між операціями з виписки та рахунками. OneTapDay шукає платежі, які збігаються за сумою та контрагентом, і позначає рахунки як оплачені."
    }
  },
  close_day:{
    pl:{
      q:"Po co przycisk „Zamknij dzień”?",
      a:"Zamknięcie dnia robi podsumowanie: wynik dnia (ile weszło, ile wyszło), 7 i 30 dni płatności do przodu, poziom ryzyka oraz cel na jutro. Jeśli codziennie zamykasz dzień – zawsze wiesz, czy biznes żyje, czy wchodzisz w minus."
    },
    en:{
      q:"Why do I need 'Close day'?",
      a:"Closing the day shows a summary: daily result, payments for the next 7 and 30 days, risk level and target for tomorrow. If you close every day, you always know if the business is alive or going into red."
    },
    ru:{
      q:"Зачем нужна кнопка «Закрыть день»?",
      a:"Закрытие дня делает срез: итог дня (сколько пришло, сколько ушло), платежи на 7 и 30 дней вперёд, уровень риска и цель на завтра. Если закрывать каждый день – ты всегда видишь, жив бизнес или летит в минус."
    },
    uk:{
      q:"Навіщо кнопка «Закрити день»?",
      a:"Закриття дня дає зріз: результат дня, платежі на 7 і 30 днів вперед, рівень ризику і ціль на завтра."
    }
  },
  risk:{
    pl:{
      q:"Co oznacza kolor ryzyka i dni bezpieczeństwa?",
      a:"Zielony – masz pieniądze na wszystkie płatności w 30 dni. Żółty – starczy na 7 dni, ale nie na cały miesiąc. Czerwony – nie ma pieniędzy na najbliższe 7 dni. Liczba dni bezpieczeństwa pokazuje, ile dni biznes przeżyje przy obecnym tempie, zanim zabraknie na zobowiązania."
    },
    en:{
      q:"What do risk colour and safety days mean?",
      a:"Green – you can cover all payments in the next 30 days. Yellow – you cover only about 7 days. Red – you do not have money for the next 7 days. Safety days tell you how many days your business survives with current cash versus upcoming payments."
    },
    ru:{
      q:"Что значит цвет риска и «дни безопасности»?",
      a:"Зелёный – денег хватает на все платежи в ближайшие 30 дней. Жёлтый – хватает примерно на 7 дней, но не на месяц. Красный – не хватает даже на ближайшую неделю. Дни безопасности показывают, сколько дней бизнес проживёт при текущем запасе денег."
    },
    uk:{
      q:"Що означає колір ризику та «дні безпеки»?",
      a:"Зелений – грошей вистачає на всі платежі у 30 днів. Жовтий – вистачає приблизно на тиждень. Червоний – не вистачає навіть на найближчі 7 днів. Дні безпеки показують, скільки днів бізнес проживе з поточним запасом грошей."
    }
  },
  export:{
    pl:{
      q:"Po co eksport CSV / księgi?",
      a:"Eksport księgi robi plik CSV z wszystkimi ruchami: bank, kasa, faktury. Ten plik możesz wysłać księgowej, wczytać do innego systemu lub trzymać jako backup. To twój dziennik finansowy w jednym pliku."
    },
    en:{
      q:"Why export CSV / ledger?",
      a:"Ledger export creates a CSV file with all movements: bank, cash, invoices. You can send it to your accountant, import into other software or keep as a backup."
    },
    ru:{
      q:"Зачем экспорт CSV / книги?",
      a:"Экспорт книги делает CSV-файл со всеми движениями: банк, касса, счета. Его можно отправить бухгалтеру, загрузить в другую систему или хранить как резервную копию."
    },
    uk:{
      q:"Навіщо експорт CSV / книги?",
      a:"Експорт книги створює CSV з усіма рухами: банк, каса, рахунки. Можна передати бухгалтеру або імпортувати в інші системи."
    }
  },
  cash:{
    pl:{
      q:"Jak pracować z kasą (gotówką)?",
      a:"W zakładce Kasa zapisujesz każdy ruch gotówki: przyjęcie (sprzedaż, wpłata do kasy) i wydanie (zakup, wypłata z kasy). Te ruchy liczą się do dostępnych pieniędzy i podsumowań dnia. Jeśli nie zapisujesz kasy – widzisz tylko część obrazu."
    },
    en:{
      q:"How to work with cash?",
      a:"In the Cash tab you record every cash movement: in (sales, deposit) and out (purchases, withdrawals). Cash is added to available money and daily summaries. If you do not record cash, you only see part of the picture."
    },
    ru:{
      q:"Как работать с кассой (наличкой)?",
      a:"Во вкладке Касса ты записываешь каждое движение налички: приход (продажа, внесение) и расход (покупка, выдача). Эти движения входят в доступные деньги и итоги дня. Если не вести кассу – ты видишь только часть картины."
    },
    uk:{
      q:"Як працювати з касою (готівкою)?",
      a:"У вкладці Каса ти фіксуєш кожен рух готівки: прихід і витрату. Ці рухи входять у доступні гроші та підсумки дня."
    }
  }
};

function getCurrentLang(){
  return localStorage.getItem('otd_lang') || 'pl';
}

function getHelpText(topicKey){
  const lang = getCurrentLang();
  const t = (HELP_ANSWERS[topicKey] && (HELP_ANSWERS[topicKey][lang] || HELP_ANSWERS[topicKey].pl)) || null;
  return t;
}

function showHelpTopic(topicKey){
  const box = $id('helperAnswer');
  if(!box){ return; }
  const t = getHelpText(topicKey);
  if(!t){
    box.innerHTML = '<div>Brak odpowiedzi na to pytanie. Jeśli chcesz, napisz do nas: support@onetapday.com.</div>';
    return;
  }
  box.innerHTML = '<div><strong>'+t.q+'</strong></div><div style="margin-top:4px">'+t.a+'</div>';
}

function toggleHelper(open){
  const panel = $id('helperPanel');
  if(!panel) return;
  if(typeof open==='boolean'){
    panel.classList.toggle('show', open);
  }else{
    panel.classList.toggle('show');
  }
}

/* ==== INLINE HELP INIT ==== */
function initHelper(){
  const fab = $id('helperFab');
  const close = $id('helperClose');
  const topics = document.querySelectorAll('#helperTopics .helper-chip');
  const search = $id('helperSearch');
  fab && fab.addEventListener('click', ()=>toggleHelper());
  close && close.addEventListener('click', ()=>toggleHelper(false));
  topics.forEach(chip=>{
    chip.addEventListener('click', ()=>{
      const key = chip.getAttribute('data-topic');
      if(key) showHelpTopic(key);
    });
  });
  if(search){
    search.addEventListener('keydown', e=>{
      if(e.key==='Enter'){
        const q = (search.value||'').toLowerCase();
        if(!q) return;
        // bardzo proste mapowanie słów kluczowych
        if(q.includes('sync')||q.includes('synchron')||q.includes('синх')) showHelpTopic('sync');
        else if(q.includes('dopas')||q.includes('match')||q.includes('сопост')||q.includes('співстав')) showHelpTopic('match');
        else if(q.includes('zamkn')||q.includes('close')||q.includes('закрыть')||q.includes('закрити')) showHelpTopic('close_day');
        else if(q.includes('ryzyk')||q.includes('risk')||q.includes('безоп')||q.includes('ризик')) showHelpTopic('risk');
        else if(q.includes('csv')||q.includes('eksport')||q.includes('export')||q.includes('книга')) showHelpTopic('export');
        else if(q.includes('kasa')||q.includes('cash')||q.includes('налич')) showHelpTopic('cash');
        else if(q.includes('jak')||q.includes('how')||q.includes('как')||q.includes('як')) showHelpTopic('ritual');
        else showHelpTopic('ritual');
      }
    });
  }
}
/* ==== HELPERS ==== */
const $id = id => document.getElementById(id);
const today = () => new Date().toISOString().slice(0,10);
const asNum = v=>{
  if(v==null) return 0; let s=String(v).trim(); if(!s) return 0;
  s=s.replace(/\u00A0/g,' ');
  if(/^(\(|−|-).*\)$/.test(s)) s='-'+s.replace(/^\(|−|-|\)$/g,'');
  if(/^−/.test(s)) s='-'+s.replace(/^−/,'');
  const hasComma=/,/.test(s), hasDot=/\./.test(s);
  s=s.replace(/\b(PLN|zł|zl|zlot|EUR|USD|GBP)\b/ig,'');
  if(hasComma && !hasDot) s=s.replace(/\s/g,'').replace(/,/g,'.'); else s=s.replace(/[\s\u00A0]/g,'').replace(/,/g,'');
  s=s.replace(/[^\d\.\-]/g,'');
  const n=Number(s); return isNaN(n)?0:n;
};
function detectCurrency(s){
  s=(s||'').toUpperCase();
  if(/PLN|ZŁ|ZL/.test(s)) return 'PLN';
  if(/EUR/.test(s)) return 'EUR';
  if(/USD|\$/.test(s)) return 'USD';
  return 'PLN';
}
function toISO(d){
  if(!d) return ""; const s=String(d).trim();
  let m=s.match(/^(\d{4})-(\d{2})-(\d{2})/); if(m) return m[0];
  m=s.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2,4})$/);
  if(m){const dd=m[1].padStart(2,'0'),mm=m[2].padStart(2,'0'),yy=m[3].length===2?('20'+m[3]):m[3]; return yy+'-'+mm+'-'+dd;}
  const months = {
    'stycznia':'01','lutego':'02','marca':'03','kwietnia':'04','maja':'05','czerwca':'06','lipca':'07','sierpnia':'08','września':'09','pazdziernika':'10','października':'10','listopada':'11','grudnia':'12',
    'января':'01','февраля':'02','марта':'03','апреля':'04','мая':'05','июня':'06','июля':'07','августа':'08','сентября':'09','октября':'10','ноября':'11','декабря':'12'
  };
  let md = s.match(/(\d{1,2})\s+([A-Za-zА-Яа-яęóąśłżźćńё]+)\s+(\d{4})/);
  if(md){ const dd=md[1].padStart(2,'0'); const mm=months[(md[2]||'').toLowerCase()]||'01'; return md[3]+'-'+mm+'-'+dd; }
  const p=Date.parse(s); if(!isNaN(p)) return new Date(p).toISOString().slice(0,10);
  return "";
}
function fmtAmountRaw(raw){
  const n=asNum(raw); if(!Number.isFinite(n)) return '<span>—</span>';
  const sign=n<0?'-':'+', cls=n<0?'amt-neg':'amt-pos';
  const abs=Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g," ");
  return `<span class="${cls}">${sign} ${abs}</span>`;
}
function smartSplit(line,del){
  let out=[],cur="",q=false;
  for(let i=0;i<line.length;i++){const ch=line[i]; if(ch==='"'){q=!q;continue} if(ch===del && !q){out.push(cur);cur="";} else cur+=ch;}
  out.push(cur); return out;
}
function parseCSV(text){
  if(!text) return []; text=text.replace(/^\uFEFF/,'').replace(/\r/g,"");
  const lines=text.split("\n").filter(l=>l.trim()); if(!lines.length) return [];
  const sep=(lines[0].split(";").length>lines[0].split(",").length)?";":",";
  const head=smartSplit(lines.shift(),sep).map(h=>h.trim());
  return lines.map(line=>{
    const cells=smartSplit(line,sep); const obj={};
    head.forEach((h,i)=>{let v=(cells[i]||"").trim(); v=v.replace(/\u00A0/g,' ').trim(); obj[h]=v;}); return obj;
  });
}
function getVal(obj,keys){
  if(!obj) return ""; for(const k of keys){ if(k in obj && String(obj[k]).trim()!=="") return obj[k]; }
  const low=Object.keys(obj).reduce((m,x)=>(m[x.toLowerCase()]=obj[x],m),{});
  for(const k of keys){const kk=k.toLowerCase(); if(kk in low && String(low[kk]).trim()!="") return low[kk];}
  return "";
}



// ==== TREND & SPENDING PANELS ====

// Build daily net movement (bank + cash) for last 30 days
function buildTrendSeries(){
  const map = {};
  const txArr = Array.isArray(tx) ? tx : [];
  const kasaArr = Array.isArray(kasa) ? kasa : [];

  txArr.forEach(r=>{
    const d = toISO(getVal(r,["Data księgowania","date","Дата"]));
    if(!d) return;
    const amt = asNum(getVal(r,["Kwota","Kwота","amount","Kwota_raw"])||0);
    if(!amt) return;
    map[d] = (map[d] || 0) + amt;
  });

  kasaArr.forEach(k=>{
    const d = String(k.date||"").slice(0,10);
    if(!d) return;
    const amt = Number(k.amount||0);
    if(!amt) return;
    map[d] = (map[d] || 0) + amt;
  });

  const dates = Object.keys(map).sort();
  if(!dates.length) return [];
  const last = dates.slice(-30);
  return last.map(d=>({date:d, value:map[d]}));
}


function renderTrendChart(){
  const wrap = document.getElementById('trendChart');
  const chip = document.getElementById('trendChange');
  if(!wrap || !chip) return;

  const series = buildTrendSeries();
  _trendSeries = series;
  if(!series || !series.length){
    wrap.innerHTML = '<div class="muted small">Мало данных, чтобы показать движение.</div>';
    chip.textContent = '—';
    chip.className = 'trendChip';
    return;
  }

  const values = series.map(p=>p.value);
  const max = Math.max.apply(null, values);
  const min = Math.min.apply(null, values);
  const range = (max - min) || 1;

  const pts = series.map((p, idx)=>{
    const x = series.length === 1 ? 50 : (idx/(series.length-1))*100;
    const norm = (p.value - min)/range;
    const y = 90 - norm*70;
    return x.toFixed(2)+','+y.toFixed(2);
  }).join(' ');

  const start = series[0].value;
  const end   = series[series.length-1].value;
  const diff  = end - start;
  const pct   = start === 0 ? 0 : (diff/start)*100;

  const up = diff >= 0;
  _trendColor = up ? '#47b500' : '#ff4f4f';
  chip.textContent = (up?'+':'')+diff.toFixed(0)+' PLN ('+pct.toFixed(1)+'%)';
  chip.className = 'trendChip '+(up?'up':'down');

  const color = _trendColor;

  const svg = [
    '<svg viewBox="0 0 100 100" preserveAspectRatio="none">',
      '<defs>',
        '<linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">',
          '<stop offset="0%" stop-color="',color,'" stop-opacity="0.30" />',
          '<stop offset="100%" stop-color="',color,'" stop-opacity="0" />',
        '</linearGradient>',
      '</defs>',
      '<polyline fill="none" stroke="',color,'" stroke-width="1.5" points="',pts,'" />',
      '<polygon fill="url(#trendFill)" points="0,100 ',pts,' 100,100" />',
    '</svg>',
    '<div class="trendCursorLine" id="trendCursorLine" style="display:none"></div>',
    '<div class="trendTooltip" id="trendTooltip" style="display:none"></div>'
  ].join('');
  wrap.innerHTML = svg;
}

function formatTrendLabel(point){
  if(!point) return '';
  const d = point.date || '';
  const short = d ? d.slice(8,10)+'.'+d.slice(5,7) : '';
  const val = (point.value||0).toFixed(0);
  return (short?short+' · ':'')+val+' PLN';
}

function handleTrendHover(clientX){
  if(!_trendSeries || !_trendSeries.length) return;
  const wrap = document.getElementById('trendChart');
  const cursor = document.getElementById('trendCursorLine');
  const tip = document.getElementById('trendTooltip');
  if(!wrap || !cursor || !tip) return;
  const rect = wrap.getBoundingClientRect();
  const xRel = (clientX - rect.left) / rect.width;
  if(xRel < 0 || xRel > 1) return;
  const lastIdx = _trendSeries.length - 1;
  const idx = Math.max(0, Math.min(lastIdx, Math.round(xRel * lastIdx)));
  const pt = _trendSeries[idx];
  const xPerc = lastIdx === 0 ? 50 : (idx/lastIdx)*100;

  cursor.style.left = xPerc + '%';
  cursor.style.display = 'block';

  tip.textContent = formatTrendLabel(pt);
  tip.style.left = xPerc + '%';
  tip.style.display = 'block';
}

function clearTrendHover(){
  const cursor = document.getElementById('trendCursorLine');
  const tip = document.getElementById('trendTooltip');
  if(cursor) cursor.style.display = 'none';
  if(tip) tip.style.display = 'none';
}

function initTrendInteractions(){
  const wrap = document.getElementById('trendChart');
  if(!wrap) return;
  wrap.addEventListener('mousemove', (e)=>handleTrendHover(e.clientX));
  wrap.addEventListener('mouseleave', clearTrendHover);
  wrap.addEventListener('touchmove', (e)=>{
    if(e.touches && e.touches.length){
      handleTrendHover(e.touches[0].clientX);
    }
  }, {passive:true});
  wrap.addEventListener('touchend', clearTrendHover);
}
// ===== Categories & spending breakdown =====

const DEFAULT_SP_CATS = [
  {id:'food',  label:'Продукты', emoji:'🍞'},
  {id:'fuel',  label:'Топливо',   emoji:'⛽'},
  {id:'home',  label:'Дом',       emoji:'🏠'},
  {id:'subs',  label:'Подписки',  emoji:'💳'},
  {id:'other', label:'Другое',    emoji:'📦'}
];

function loadUserSpCats(){
  try{
    const raw = localStorage.getItem('otd_sp_cats');
    if(!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  }catch(e){
    console.warn('spcats load', e);
    return [];
  }
}

function saveUserSpCats(arr){
  try{
    localStorage.setItem('otd_sp_cats', JSON.stringify(arr || []));
  }catch(e){
    console.warn('spcats save', e);
  }
}

function getAllSpCats(){
  const extra = loadUserSpCats();
  const byId = {};
  DEFAULT_SP_CATS.forEach(c=>byId[c.id]=c);
  extra.forEach(c=>byId[c.id]=c);
  return Object.values(byId);
}

const MERCHANT_MAP = {
  'żabka':'food',
  'zabka':'food',
  'biedronka':'food',
  'lidl':'food',
  'carrefour':'food',
  'kaufland':'food',
  'auchan':'food',
  'hebe':'food',
  'rossmann':'home',
  'ikea':'home',
  'castorama':'home',
  'leroy':'home',
  'orlen':'fuel',
  'bp ':'fuel',
  'shell':'fuel',
  'circle k':'fuel',
  'statoil':'fuel'
};

function detectCategoryForMerchant(name){
  if(!name) return 'other';
  const key = String(name).toLowerCase();
  for(const k in MERCHANT_MAP){
    if(key.indexOf(k)!==-1) return MERCHANT_MAP[k];
  }
  return 'other';
}

function getMerchantFromTxRow(r){
  return getVal(r,["Kontrahent","Counterparty","Nazwa właściciela rachunku","Tytuł/Opis","Opis","description"]) || "";
}

function getMerchantFromKasaRow(k){
  return k.source || k.comment || "";
}

function buildSpendingAggregates(catId){
  const agg = {};
  const txArr = Array.isArray(tx) ? tx : [];
  const kasaArr = Array.isArray(kasa) ? kasa : [];

  function addRow(amount, merchant){
    if(!amount || !merchant) return;
    if(amount > 0) return;
    const key = String(merchant||'').trim();
    if(!key) return;
    agg[key] = (agg[key] || 0) + amount;
  }

  txArr.forEach(r=>{
    const m = getMerchantFromTxRow(r);
    const a = asNum(getVal(r,["Kwota","Kwота","amount","Kwota_raw"])||0);
    if(!a) return;
    const cat = detectCategoryForMerchant(m);
    if(catId && cat!==catId) return;
    addRow(a, m);
  });

  kasaArr.forEach(k=>{
    const d = String(k.date||'').slice(0,10);
    if(!d) return;
    const a = Number(k.amount||0);
    if(!a) return;
    const m = getMerchantFromKasaRow(k);
    const cat = detectCategoryForMerchant(m);
    if(catId && cat!==catId) return;
    addRow(a, m);
  });

  const list = Object.entries(agg).map(([merchant,sum])=>({merchant,sum}));
  list.sort((a,b)=>a.sum - b.sum);
  return list;
}

function renderSpendingFilters(activeId){
  const wrap = document.getElementById('spendingFilters');
  if(!wrap) return;
  const cats = getAllSpCats();
  let html = '<button type="button" class="spFilterBtn'+(!activeId?' active':'')+'" data-cat="">Все</button>';
  cats.forEach(c=>{
    html += '<button type="button" class="spFilterBtn'+(activeId===c.id?' active':'')+'" data-cat="'+c.id+'">'+
      '<span class="emoji">'+(c.emoji||'📦')+'</span><span>'+c.label+'</span></button>';
  });
  wrap.innerHTML = html;
  wrap.querySelectorAll('.spFilterBtn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.getAttribute('data-cat') || '';
      renderSpendingFilters(id || '');
      renderSpendingStats(id || null);
    });
  });
}

function renderSpendingStats(catId){
  const box = document.getElementById('spendingStats');
  if(!box) return;
  const data = buildSpendingAggregates(catId);
  if(!data.length){
    box.innerHTML = '<div>Пока нет расходов по этой выборке.</div>';
    return;
  }
  const rows = data.slice(0,10).map(r=>{
    const val = Math.round(r.sum);
    return '<div><b>'+r.merchant+'</b>&nbsp; '+val+' PLN</div>';
  }).join('');
  box.innerHTML = rows;
}

function renderSpendingPanel(){
  renderSpendingFilters('');
  renderSpendingStats(null);
}

function initSpendingUI(){
  const addBtn = document.getElementById('addSpCatBtn');
  const modal  = document.getElementById('addSpCatModal');
  const save   = document.getElementById('spCatSave');
  const cancel = document.getElementById('spCatCancel');
  const nameIn = document.getElementById('spCatName');
  const emojiWrap = document.getElementById('spCatEmojiList');
  if(!addBtn || !modal || !save || !cancel || !nameIn || !emojiWrap) return;

  let chosenEmoji = '📦';

  emojiWrap.querySelectorAll('button').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      emojiWrap.querySelectorAll('button').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      chosenEmoji = btn.textContent.trim() || '📦';
    });
  });

  function closeModal(){
    modal.classList.remove('show');
  }

  addBtn.addEventListener('click', ()=>{
    nameIn.value = '';
    chosenEmoji = '📦';
    emojiWrap.querySelectorAll('button').forEach(b=>b.classList.remove('active'));
    modal.classList.add('show');
  });

  cancel.addEventListener('click', closeModal);

  save.addEventListener('click', ()=>{
    const label = (nameIn.value||'').trim();
    if(!label) return;
    const id = ('user_'+label.toLowerCase().replace(/\s+/g,'_')).slice(0,20);
    const extras = loadUserSpCats();
    const idx = extras.findIndex(c=>c.id===id);
    const cat = {id, label, emoji:chosenEmoji};
    if(idx>=0) extras[idx]=cat; else extras.push(cat);
    saveUserSpCats(extras);
    closeModal();
    renderSpendingFilters(id);
    renderSpendingStats(id);
  });
}

/* ==== STATE ==== */
let tx    = [];
let bills = [];
let kasa  = [];
let accMeta = {};

const stateKeys = [
  'tx_manual_import',
  'bills_manual_import',
  'kasa',
  'accMeta',
  'cashPLN',
  'penaltyPct',
  'intervalMin',
  'rateEUR',
  'rateUSD',
  'blacklist',
  'autoCash',
  SUB_KEY,
  SUB_FROM,
  SUB_TO,
  DEMO_START,
  DEMO_USED,
  'txUrl',
  'billUrl',
  'otd_lang',
  'speechLang'
];

function ensureTxIds(){
  if(!Array.isArray(tx)) tx = [];
  tx.forEach((r, idx) => {
    if(!r || r.id) return;

    // пытаемся взять уже существующий ID
    let id = getVal(r, ["ID transakcji","ID","id"]);
    if(!id){
      // генерим стабильный id, если его не было
      const baseDate = r["Data księgowania"] || today();
      id = `tx-${baseDate}-${idx}-${Math.random().toString(36).slice(2,8)}`;
    }

    r.id = String(id);

    // чтобы всё было консистентно по полям
    if(!r["ID transakcji"]) {
      r["ID transakcji"] = r.id;
    }
  });
}

  
/* ==== CLOUD SYNC (Firebase, общий стейт для всех устройств) ==== */
function getCloudEmail(){
  return localStorage.getItem(USER_KEY) || '';
}

function buildCloudState(){
  const settings = stateKeys.reduce((m,k)=>{
    m[k] = localStorage.getItem(k);
    return m;
  }, {});
  return {
    tx,
    bills,
    kasa,
    accMeta,
    settings
  };
}

async function pushCloudState(){
  if (!window.FirebaseSync) return;           // /sync-cloud.js ещё не загрузился
  const email = getCloudEmail();
  if (!email) return;                         // нет email → не знаем куда писать

  try{
    await window.FirebaseSync.saveUserState(email, buildCloudState());
    console.log('[cloud] saved to Firebase');
  }catch(e){
    console.warn('[cloud] save error', e);
  }
}

function applyCloudState(remote){
  if (!remote || typeof remote !== 'object') return;

  try{
    if (Array.isArray(remote.tx)){
      tx = remote.tx;
      localStorage.setItem('tx_manual_import', JSON.stringify(tx));
    }
    if (Array.isArray(remote.bills)){
      bills = remote.bills;
      localStorage.setItem('bills_manual_import', JSON.stringify(bills));
    }
    if (Array.isArray(remote.kasa)){
      kasa = remote.kasa;
      localStorage.setItem('kasa', JSON.stringify(kasa));
    }
    if (remote.accMeta && typeof remote.accMeta === 'object'){
      accMeta = remote.accMeta;
      localStorage.setItem('accMeta', JSON.stringify(accMeta));
    }
    if (remote.settings && typeof remote.settings === 'object'){
      Object.entries(remote.settings).forEach(([k,v])=>{
        if (typeof v === 'string') localStorage.setItem(k, v);
      });
    }

    // пересчитать и перерисовать UI
    inferAccounts();
    render();
  }catch(e){
    console.warn('[cloud] apply error', e);
  }
}

function startCloudSync(){
  const email = getCloudEmail();
  if (!email){
    console.warn('[cloud] no email in localStorage.' + USER_KEY);
    return;
  }

  function tryInit(){
    if (!window.FirebaseSync){
      console.log('[cloud] wait FirebaseSync…');
      setTimeout(tryInit, 500);  // ждём, пока загрузится /sync-cloud.js
      return;
    }

    console.log('[cloud] start for', email);
    try {
      window.FirebaseSync.subscribeUserState(email, applyCloudState);
      // сразу же заливаем локальный стейт в облако
      pushCloudState();
    } catch (e) {
      console.warn('[cloud] subscribe error', e);
    }
  }

  tryInit();
}


/* ==== REMOTE SYNC (optional) ==== */
async function pullState(){
  if (!REMOTE_OK) return null;
  try {
    const res = await fetch('/app-state', {
      credentials: 'include'
    });
    if (!res.ok) return null;
    const json = await res.json();
    const st = json && json.state ? json.state : {};

    // ВАЖНО:
    // 1) НЕ затираем локальные выписки пустым state с сервера
    // 2) Обновляем только если реально есть данные

    // Выписки (tx)
    if (Array.isArray(st.transactions) && st.transactions.length) {
      localStorage.setItem('tx_manual_import', JSON.stringify(st.transactions));
    }

    // Фактуры
    if (Array.isArray(st.bills) && st.bills.length) {
      localStorage.setItem('bills_manual_import', JSON.stringify(st.bills));
    }

    // Касса
    if (Array.isArray(st.cash) && st.cash.length) {
      localStorage.setItem('kasa', JSON.stringify(st.cash));
    }

    // Метаданные аккаунтов
    if (st.meta && typeof st.meta === 'object') {
      localStorage.setItem('accMeta', JSON.stringify(st.meta));
    }

    loadLocal();
    inferAccounts();
    render();
    return st;
  } catch (e) {
    console.warn('pullState error', e);
    return null;
  }
}



const pushState = (function(){
  let timer = null;
  let inflight = false;
  return function(){
    if(!REMOTE_OK) return;
    clearTimeout(timer);
    timer = setTimeout(async () => {
      if(inflight) return;
      inflight = true;
      try{
        // гарантируем id перед пушем
        ensureTxIds();

        const state = {
          transactions: tx,
          bills,
          cash: kasa,
          meta: accMeta
        };

        await fetch('/app-state/merge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ state })
        });
      } catch (e) {
        console.warn('pushState error', e);
      } finally {
        inflight = false;
      }
    }, 600);
  };
})();



/* ==== MONEY / RATES ==== */
function rate(cur){
  cur=String(cur||"PLN").toUpperCase();
  if(cur==='PLN') return 1;
  if(cur==='EUR') return asNum(localStorage.getItem('rateEUR')||4.3);
  if(cur==='USD') return asNum(localStorage.getItem('rateUSD')||3.95);
  return 1;
}
function computeAccountBalance(accId){
  const rows=tx.filter(r=> (getVal(r,["ID konta","IBAN","account","ID"])||"UNKNOWN")===accId);
  const withSaldo = rows.filter(r=> getVal(r,["Saldo po operacji","Saldo","saldo"]));
  if(withSaldo.length){ const last=withSaldo[withSaldo.length-1]; return asNum(getVal(last,["Saldo po operacji","Saldo","saldo"])); }
  const start=Number((accMeta[accId]||{}).start||0);
  const sum=rows.reduce((s,r)=> s+asNum(getVal(r,["Kwota","Kwота","amount","Kwota_raw"])) ,0);
  return start+sum;
}
function bankAvailablePLN(){
  let sum=0;
  Object.values(accMeta).filter(a=>a.include).forEach(a=>{
    sum+=computeAccountBalance(a.id)*rate(a.currency);
  });
  return sum;
}
function kasaBalance(){
  let bal=0;
  kasa.forEach(k=>{
    if(k.type==='przyjęcie') bal+=k.amount;
    if(k.type==='wydanie') bal-=k.amount;
    if(k.type==='zamknięcie') bal = k.amount;
  });
  return bal;
}
function availableTotal(){
  const auto = localStorage.getItem('autoCash')==='1';
  const manual = asNum(localStorage.getItem('cashPLN')||0);
  const kas = kasaBalance();
  return auto ? (bankAvailablePLN()+kas) : (manual+kas);
}

/* ==== AI MATCH (unchanged core scoring) ==== */
function normName(s){s=(s||"").toString().toLowerCase().replace(/[.,]/g," ").replace(/\s+/g," ").trim();["sp z oo","sp. z o.o.","spolka","spółka","sa","s.a","ooo"].forEach(t=>s=s.replace(t,""));return s}
function nameSimilar(a,b){a=normName(a);b=normName(b);if(!a||!b) return 0;if(a===b) return 1;if(a.includes(b)||b.includes(a)) return 0.8;return 0}
function scoreMatch(bill,tr){
  let score=0;
  const bAmt=asNum(getVal(bill,["Kwota do zapłaty","Kwота do заплаты","Kwota","amount"]));
  const tAmt=Math.abs(asNum(getVal(tr,["Kwota","Kwота","amount","Kwota_raw"])));
  const bCur=(getVal(bill,["Waluta","currency"])||"").toUpperCase();
  const tCur=(getVal(tr,["Waluta","currency"])||"").toUpperCase();
  if(bAmt>0 && tAmt>0 && Math.abs(bAmt-tAmt)<0.01 && (bCur===tCur || !bCur || !tCur)) score+=60;
  const inv=String(getVal(bill,["Numer faktury","Numer фактуры","Invoice number"])||"").toLowerCase();
  const desc=String(getVal(tr,["Tytuł/Opis","Opis","Title","description"])||"").toLowerCase();
  if(inv && desc.includes(inv)) score+=25;
  if(nameSimilar(getVal(bill,["Dostawca","Supplier"]), getVal(tr,["Kontrahent","Counterparty"]))>=0.8) score+=10;
  if(asNum(getVal(tr,["Kwota","amount"]))<0) score+=5;
  return {score:Math.min(100,score)};
}
function runAI(){
  bills.forEach(b=>{
    const status=String(getVal(b,["Status faktury","Status фактуры","Status"])||"").toLowerCase();
    if(status.includes("opłacone")||status.includes("paid")||status.includes("оплачено")) return;
    let best=null;
    tx.forEach(t=>{
      if(String(getVal(t,["Status transakcji","status"])||"").toLowerCase()==="sparowane") return;
      if(asNum(getVal(t,["Kwota","amount"]))>=0) return;
      const s=scoreMatch(b,t);
      if(!best || s.score>best.s) best={t,s:s.score};
    });
    if(best && best.s>=85){
      best.t["Status transakcji"]="Sparowane";
      best.t["Powiązana faktura (ID)"]=getVal(b,["Numer faktury","Numer фактуры"]);
      b["Status faktury"]="Opłacone"; b["Data płatności"]=today();
    }else if(best && best.s>=55){
      b["Kandydat (AI)"]=getVal(best.t,["ID transakcji"]);
      b["AI score"]=best.s;
    }else{ b["Kandydat (AI)"]=""; b["AI score"]=""; }
  });
  render(); saveLocal(); pushState();
}
function acceptSafe(){
  bills.filter(b=> Number(getVal(b,["AI score"])||0)>=85).forEach(b=>{
    const t=tx.find(t=> getVal(t,["ID transakcji"])===getVal(b,["Kandydat (AI)"]));
    if(!t) return;
    t["Status transakcji"]="Sparowane";
    t["Powiązana faktura (ID)"]=getVal(b,["Numer faktury","Numer фактуры"]);
    b["Status faktury"]="Opłacone"; b["Data płatności"]=today(); b["Kandydat (AI)"]=b["AI score"]="";
  });
  render(); saveLocal(); pushState();
}

/* ==== OCR IMPORT (images) ==== */
async function recognizeImage(file){
  const { data:{ text } } = await Tesseract.recognize(file, 'pol+eng+rus', { logger:()=>{} });
  return text.replace(/\u00A0/g,' ').replace(/\r/g,'').replace(/\t/g,' ').replace(/ +/g,' ').trim();
}
async function ocrBankFiles(files){
  for(const f of files){
    try{
      thumb($id('txLastThumb'), f);
      const text = await recognizeImage(f);
      const rows = parseBankOCR(text);
      if(rows.length){
        tx = tx.concat(rows);
      }
    }catch(e){ console.warn('OCR bank error', e); }
  }
  ensureTxIds();
  inferAccounts();
  render();
  saveLocal();
  pushState();
}

function parseBankOCR(text){
  const lines = text.split(/\n+/).map(s=>s.trim()).filter(Boolean);
  const out = [];
  let curDate = today();
  for(let i=0;i<lines.length;i++){
    const L = lines[i];
    // Dates like "19 октября 2025", "19 października 2025", "2025-10-19"
    const d1=L.match(/(\d{1,2}\s+[A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻżА-Яа-яё]+\s+\d{4})/);
    const d2=L.match(/(\d{4}-\d{2}-\d{2})/);
    if(d1||d2){ curDate = toISO((d1?d1[1]:d2[1])); continue; }

    // Amount + sign rules
    const amtM = L.match(/([()−\-+]*\s*\d{1,3}(?:[\s ]\d{3})*(?:[.,]\d{2})?)/);
    if(amtM){
      const raw = amtM[1];
      const cur = detectCurrency(L);
      const n = asNum(raw);
      if(n!==0){
        const negHints = /(−|-|\(|obciąż|debet|wypłat|withdraw|charge)/i.test(L);
        const posHints = /(\+|uznanie|wpływ|przych|credit)/i.test(L);
        let sign = 0;
        if(negHints && !posHints) sign = -1;
        else if(posHints && !negHints) sign = +1;
        else if(/[()]/.test(raw) || /−|-/.test(raw)) sign = -1;
        else if(/\+/.test(raw)) sign = +1;
        else sign = +1; // если нет минуса — считаем как приход
        const amt = sign * Math.abs(n);
        const counterparty = (lines[i-1] && !/(PLN|EUR|USD|zł|zl)/i.test(lines[i-1]) ? lines[i-1] : L.replace(raw,'')).toString().trim();
        out.push({
          "Data księgowania": curDate || today(),
          "ID transakcji": 'ocr-'+Date.now()+'-'+out.length,
          "ID konta": 'UNKNOWN',
          "Kontrahent": counterparty.replace(/[•·]/g,'').slice(0,120),
          "Tytuł/Opis": L.slice(0,220),
          "Kwota": amt.toFixed(2),
          "Waluta": cur,
          "Status transakcji":""
        });
      }
    }
  }
  return out;
}
function parseInvoiceOCR(text){
  const norm = text.replace(/\n+/g,'\n');
  const get = (re)=>{ const m=norm.match(re); return m?m[1].trim():''; };
  // invoice number: классика + общий шаблон вида 147/CS-FR/2025
  const invClassic = get(/\bFaktura(?:\s*VAT)?\s*(?:numer|nr)?[:\s]*([A-Za-z0-9\-\/\.]+)/i) || get(/\bInvoice\s*(?:No|Number)[:\s]*([A-Za-z0-9\-\/\.]+)/i);
  const invPattern = (norm.match(/(\d{1,6}\/[A-Z0-9][A-Z0-9\-]*\/\d{4})/)||[])[1] || '';
  const inv = (invClassic || invPattern || '').replace(/[^\w\/\-\.]/g,'');
  // supplier (продавец/виставивший)
  let supplier = get(/Sprzedawca[:\s\n]+([^\n]+)(?:\n|$)/i) || get(/Dostawca[:\s\n]+([^\n]+)(?:\n|$)/i) || get(/Issuer|Seller[:\s\n]+([^\n]+)(?:\n|$)/i);
  if(!supplier){
    supplier = norm.split('\n').find(x=>/[A-ZĄĆĘŁŃÓŚŹŻ]{3,}/.test(x))||'';
  }
  // due / issue dates
  const due = toISO(get(/Termin\s*(?:płatności|zapłaty)[:\s]+([^\n]+)/i)) || toISO(get(/Payment\s*(?:due|date)[:\s]+([^\n]+)/i));
  const issue = toISO(get(/Data\s*wystawienia[:\s]+([^\n]+)/i)) || toISO(get(/Issue\s*date[:\s]+([^\n]+)/i));
  // total
  let totalTxt = get(/Do\s*zapłaty[:\s]+([^\n]+)/i) || get(/Razem\s*do\s*zapłaty[:\s]+([^\n]+)/i);
  if(!totalTxt){
    const bruttoLine = norm.match(/(?:Wartość|Razem)\s*brutto[^\n]*?(\d{1,3}(?:[\s ]\d{3})*(?:[.,]\d{2}))/i);
    if(bruttoLine) totalTxt = bruttoLine[1];
  }
  const currency = detectCurrency(totalTxt||norm);
  const total = Math.abs(asNum(totalTxt));
  return [{
    "Termin płatności": (due || issue || today()),
    "Numer faktury": (inv || ('INV-'+Date.now())),
    "Dostawca": supplier.slice(0,120),
    "Kwota do zapłaty": total ? total.toFixed(2) : '0.00',
    "Waluta": currency,
    "Status faktury": "do zapłaty"
  }];
}

/* ==== PERSIST LOCAL ==== */
function loadLocal(){
  try{ kasa = JSON.parse(localStorage.getItem('kasa')||'[]'); }catch(e){kasa=[]}
  try{ tx = JSON.parse(localStorage.getItem('tx_manual_import')||'[]'); }catch(e){tx=[]}
  try{ bills = JSON.parse(localStorage.getItem('bills_manual_import')||'[]'); }catch(e){bills=[]}
  try{ accMeta = JSON.parse(localStorage.getItem('accMeta')||'{}'); }catch(e){accMeta={}}
  ensureTxIds();
}

function saveLocal(){
  try{ localStorage.setItem('kasa', JSON.stringify(kasa)); }catch(e){}
  try{ localStorage.setItem('tx_manual_import', JSON.stringify(tx)); }catch(e){}
  try{ localStorage.setItem('bills_manual_import', JSON.stringify(bills)); }catch(e){}
  try{ localStorage.setItem('accMeta', JSON.stringify(accMeta)); }catch(e){}

  // NEW: обновляем облако
  pushCloudState();
}


/* ==== ACCOUNTS ==== */
function inferAccounts(){
  const map={};
  tx.forEach(r=>{
    const id=getVal(r,["ID konta","IBAN","account","ID"])||"UNKNOWN";
    const cur=(getVal(r,["Waluta","currency"])||"PLN").toUpperCase();
    if(!map[id]) map[id]={id,name:String(id).slice(0,12),currency:cur,include:true,type:"Biznes",start:0};
  });
  try{ const saved=JSON.parse(localStorage.getItem('accMeta')||'{}'); Object.keys(map).forEach(id=>{ if(saved[id]) map[id]=Object.assign(map[id], saved[id]); }); }catch(e){}
  accMeta=map; renderAccounts();
}

/* ==== GATE: DEMO / SUB ==== */
function isSubActive(){
  const a = localStorage.getItem(SUB_KEY) === '1';
  if (!a) return false;
  const to = localStorage.getItem(SUB_TO) || '';
  if (!to) return a;
  return new Date(to) >= new Date();
}

function demoLeftMs(){
  const t = localStorage.getItem(DEMO_START);
  if (!t) return 0;
  const start = new Date(t).getTime();
  const left  = (start + 24*3600*1000) - Date.now();
  return left;
}

function isDemoActive(){ 
  return demoLeftMs() > 0; 
}

function gateAccess(){
  const ok   = isSubActive() || isDemoActive();
  const gate = $id('gate');
  const tabs = document.querySelectorAll('.tabs .tab');
  if (!gate) return;

  gate.classList.toggle('hidden', ok);
  tabs.forEach(t=>{
    if (t.dataset.sec === 'ustawienia') t.classList.remove('disabled');
    else t.classList.toggle('disabled', !ok);
  });

  if (!ok){
    document.querySelector('[data-sec=ustawienia]')?.click();
  }
}

function updateSubUI(){
  const el = $id('subStatus');
  if (!el) return;

  const demoUsed = localStorage.getItem(DEMO_USED) === '1';
  let s = '—';

  if (isSubActive()){
    s = `✅ Sub aktywna: ${localStorage.getItem(SUB_FROM)||'—'} → ${localStorage.getItem(SUB_TO)||'—'}`;
  } else if (isDemoActive()){
    const left = demoLeftMs();
    const h = Math.floor(left/3600000);
    const m = Math.floor((left%3600000)/60000);
    s = `🧪 Demo aktywne: ~${h}h ${m}m`;
  } else if (demoUsed) {
    // демо уже было, больше не даём
    s = '⛔ Demo zakończone. Dostęp tylko z subskrypcją.';
  } else {
    s = '⛔ Brak dostępu: włącz demo (24h) lub opłać.';
  }

  el.textContent = s;
}

/* ==== AUTOSYNC ==== */
let syncTimer=null, syncing=false;
async function fetchSources(){
  if(syncing) return; syncing=true;
  try{
    const u1=localStorage.getItem('txUrl')||$id('txUrl')?.value||"";
    const u2=localStorage.getItem('billUrl')||$id('billUrl')?.value||"";
  if(u1){const r = await fetch(u1,{cache:'no-store'});tx = parseCSV(await r.text());
  ensureTxIds();
}

    if(u2){ const r2=await fetch(u2,{cache:'no-store'}); bills = parseCSV(await r2.text()); }
    inferAccounts(); render();
    const last=$id('lastSync'); if(last) last.textContent = (M[localStorage.getItem('otd_lang')||'pl'].sync_ts||"Synchronizacja: —").replace('—', new Date().toLocaleString());
    saveLocal(); pushState();
  }catch(e){
    const last=$id('lastSync'); if(last) last.textContent = 'Error: '+(e?.message||e);
  }finally{ syncing=false; }
}
function scheduleAutosync(){
  clearInterval(syncTimer); const m = parseInt(localStorage.getItem('intervalMin')||'0',10);
  if(m>0 && (localStorage.getItem('txUrl')||localStorage.getItem('billUrl'))){
    syncTimer = setInterval(fetchSources, Math.max(1,m)*60*1000);
  }
}

/* ==== CASH QUICK EXAMPLES ==== */
const cashQuickExamples={pl:["Przyjąć 250 na produkty","Wypłacić 50 na dostawę","Przyjąć 1000 depozyt","Przyjąć 50 na napoje"],
ru:["Принять 250 на продукты","Выдать 50 на доставку","Принять 1000 депозит","Принять 50 на напитки"],
en:["Accept 250 for groceries","Pay out 50 for delivery","Accept 1000 deposit","Accept 50 for drinks"],
uk:["Прийняти 250 на продукти","Видати 50 на доставку","Прийняти 1000 депозит","Прийняти 50 на напої"]};
function renderCashExamples(lang){
  const holder=$id('kasaQuickHolder'); if(!holder) return; holder.innerHTML='';
  const arr=cashQuickExamples[lang]||cashQuickExamples.pl;
  arr.forEach(txt=>{
    const btn=document.createElement('button'); btn.type='button'; btn.textContent=txt;
    btn.addEventListener('click',()=>{
      const numMatch=txt.match(/(-?\d+[.,]?\d*)/); const num=numMatch?asNum(numMatch[1]):0;
      const outRe=/(wyda|wypłac|pay out|видат|выда)/i; const isOut=outRe.test(txt);
      const note=txt.replace(/(-?\d+[.,]?\d*\s*(zł|pln|PLN|USD|EUR)?)/i,"").trim();
      addKasa(isOut?'wydanie':'przyjęcie', num, note||txt, 'quick');
    });
    holder.appendChild(btn);
  });
}

/* ==== UNIFIED BOOK ==== */
function bookRows(){
  const rows=[];
  (tx||[]).forEach(r=>{
    rows.push({
      date: toISO(getVal(r,["Data księgowania","date","Дата"]))||today(),
      source: 'bank',
      account: getVal(r,["ID konta","IBAN","account"])||'UNKNOWN',
      counterparty: getVal(r,["Kontrahent","Counterparty"])||'',
      desc: getVal(r,["Tytuł/Opis","Opis","title"])||'',
      amount: asNum(getVal(r,["Kwota","Kwота","amount","Kwota_raw"]))||0,
      currency: (getVal(r,["Waluta","currency"])||'PLN').toUpperCase(),
      type:'', no:'', doc_date:'', due:'', status: getVal(r,["Status transakcji","status"])||''
    });
  });
  (bills||[]).forEach(b=>{
    const amt = -Math.abs(asNum(getVal(b,["Kwota do zapłaty","Kwota","Kwота"]))||0);
    rows.push({
      date: toISO(getVal(b,["Data wystawienia","IssueDate"]))||toISO(getVal(b,["Termin płatności","Termin"]))||today(),
      source:'invoice',
      account:'',
      counterparty: getVal(b,["Dostawca","Supplier"])||'',
      desc: 'INVOICE',
      amount: amt,
      currency: (getVal(b,["Waluta","currency"])||'PLN').toUpperCase(),
      type:'INVOICE', no:getVal(b,["Numer faktury","Invoice number"])||'',
      doc_date: toISO(getVal(b,["Data wystawienia","IssueDate"]))||'',
      due: toISO(getVal(b,["Termin płatności","Termin"]))||'',
      status: getVal(b,["Status faktury","Status"])||''
    });
  });
  (kasa||[]).forEach(k=>{
    rows.push({
      date: k.date||today(), source:'cash', account:'KASA', counterparty:'', desc:k.comment||k.source||'',
      amount: (k.type==='wydanie'?-1:1)*Math.abs(k.amount||0), currency:'PLN', type:'CASH', no:'', doc_date:'', due:'', status:''
    });
  });
  return rows.sort((a,b)=> (a.date<b.date?-1: a.date>b.date?1:0));
}
function renderBook(){
  const tb=document.querySelector('#bookTable tbody'); if(!tb) return; // таблицы нет — тихий выход
  const rows=bookRows();
  rows.forEach(r=>{
    const tr=document.createElement('tr');
    tr.innerHTML = `<td>${r.date}</td><td>${r.source}</td><td>${r.account||'—'}</td><td>${r.counterparty||''}</td><td>${r.desc||''}</td><td>${fmtAmountRaw(r.amount)}</td><td>${r.currency}</td><td>${r.type||''}</td><td>${r.no||''}</td><td>${r.doc_date||''}</td><td>${r.due||''}</td><td>${r.status||''}</td>`;
    tb.appendChild(tr);
  });
}
function exportBookCSV(){
  const rows=bookRows();
  const head=['date','source','account','counterparty','description','amount','currency','doc_type','doc_no','doc_date','due_date','status'];
  const csv=[head.join(',')].concat(rows.map(r=>[
    r.date,r.source,r.account,(r.counterparty||'').replace(/,/g,' '),(r.desc||'').replace(/,/g,' '),
    (r.amount||0).toFixed(2),r.currency,r.type||'',r.no||'',r.doc_date||'',r.due||'',(r.status||'').replace(/,/g,' ')
  ].join(','))).join('\n');
  const blob=new Blob([csv],{type:'text/csv'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='otd_book.csv'; a.click();
}


function exportTxCSV(){
  const head=['date','account','counterparty','description','amount','currency','status'];
  const rows = (tx||[]).map(r=>({
    date: toISO(getVal(r,["Data księgowania","date","Дата"]))||today(),
    account: getVal(r,["ID konta","IBAN","account"])||'UNKNOWN',
    counterparty: getVal(r,["Kontrahent","Counterparty"])||'',
    desc: getVal(r,["Tytuł/Opis","Opis","title"])||'',
    amount: asNum(getVal(r,["Kwota","Kwota","amount","Kwota_raw"]))||0,
    currency: (getVal(r,["Waluta","currency"])||'PLN').toUpperCase(),
    status: getVal(r,["Status transakcji","status"])||''
  }));
  const csv=[head.join(',')].concat(rows.map(r=>[
    r.date,
    r.account,
    (r.counterparty||'').replace(/,/g,' '),
    (r.desc||'').replace(/,/g,' '),
    (r.amount||0).toFixed(2),
    r.currency,
    (r.status||'').replace(/,/g,' ')
  ].join(','))).join('\n');
  const blob=new Blob([csv],{type:'text/csv'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='otd_statement.csv'; a.click();
}

function exportBillsCSV(){
  const head=['due_date','invoice_no','supplier','amount','currency','status'];
  const rows = (bills||[]).map(b=>({
    due: toISO(getVal(b,["Termin płatności","Termin"]))||'',
    no: getVal(b,["Numer faktury","Invoice number"])||'',
    supplier: getVal(b,["Dostawca","Supplier"])||'',
    amount: asNum(getVal(b,["Kwota do zapłaty","Kwota","Kwота"]))||0,
    currency: (getVal(b,["Waluta","currency"])||'PLN').toUpperCase(),
    status: getVal(b,["Status faktury","Status"])||''
  }));
  const csv=[head.join(',')].concat(rows.map(r=>[
    r.due,
    r.no,
    (r.supplier||'').replace(/,/g,' '),
    (r.amount||0).toFixed(2),
    r.currency,
    (r.status||'').replace(/,/g,' ')
  ].join(','))).join('\n');
  const blob=new Blob([csv],{type:'text/csv'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='otd_invoices.csv'; a.click();
}

function exportCashCSV(){
  const head=['date','type','amount','source','comment'];
  const rows = (kasa||[]).map(k=>({
    date: k.date||today(),
    type: k.type||'',
    amount: (k.type==='wydanie'?-1:1)*Math.abs(k.amount||0),
    source: k.source||'manual',
    comment: k.comment||''
  }));
  const csv=[head.join(',')].concat(rows.map(r=>[
    r.date,
    r.type,
    (r.amount||0).toFixed(2),
    (r.source||'').replace(/,/g,' '),
    (r.comment||'').replace(/,/g,' ')
  ].join(','))).join('\n');
  const blob=new Blob([csv],{type:'text/csv'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='otd_cash.csv'; a.click();
}


/* ==== RENDER ==== */
function renderKasa(){
  const tb=document.querySelector('#kasaTable tbody'); if(!tb) return; tb.innerHTML='';
  const listKasa=(kasa||[]).slice().reverse();
  listKasa.forEach((k,i)=>{
    const tr=document.createElement('tr');
    tr.innerHTML = `<td>${listKasa.length - i}</td><td>${k.date}</td><td>${k.type}</td><td>${k.amount.toFixed(2)}</td><td>${k.source||""}</td><td>${k.comment||""}</td>
                    <td class="actions">
                      <button data-act="edit" data-kind="kasa" data-id="${k.id}">✎</button>
                      <button data-act="del" data-kind="kasa" data-id="${k.id}">🗑</button>
                    </td>`;
    tb.appendChild(tr);
  });
}
function renderAccounts(){
  const tb=document.querySelector('#autoAcc tbody'); if(!tb) return; tb.innerHTML='';
  Object.values(accMeta).forEach(a=>{
    const bal=computeAccountBalance(a.id);
    const tr=document.createElement('tr');
    tr.innerHTML = `<td>${a.id}</td>
      <td><select data-id="${a.id}" class="acc-type">
            <option ${a.type==="Biznes"?"selected":""}>Biznes</option>
            <option ${a.type==="Osobisty"?"selected":""}>Osobisty</option>
          </select></td>
      <td><select data-id="${a.id}" class="acc-cur">
            <option ${a.currency==="PLN"?"selected":""}>PLN</option>
            <option ${a.currency==="EUR"?"selected":""}>EUR</option>
            <option ${a.currency==="USD"?"selected":""}>USD</option>
          </select></td>
      <td>${bal.toFixed(2)}</td>
      <td><input type="number" step="0.01" value="${a.start||0}" class="acc-start" data-id="${a.id}"/></td>
      <td><input type="checkbox" class="acc-include" data-id="${a.id}" ${a.include?"checked":""}/></td>`;
    tb.appendChild(tr);
  });
  tb.querySelectorAll(".acc-type").forEach(el=>el.addEventListener("change",e=>{accMeta[e.target.dataset.id].type=e.target.value;saveLocal();render();pushState();}));
  tb.querySelectorAll(".acc-cur").forEach(el=>el.addEventListener("change",e=>{accMeta[e.target.dataset.id].currency=e.target.value;saveLocal();render();pushState();}));
  tb.querySelectorAll(".acc-start").forEach(el=>el.addEventListener("change",e=>{accMeta[e.target.dataset.id].start=asNum(e.target.value);saveLocal();render();pushState();}));
  tb.querySelectorAll(".acc-include").forEach(el=>el.addEventListener("change",e=>{accMeta[e.target.dataset.id].include=e.target.checked;saveLocal();render();pushState();}));
}

function openCloseDayModal(){
  try{
    const t = today();
    const tt = new Date(t);
    // Today summary (recalculated)
    let inSum = 0, outSum = 0;
    (tx||[]).forEach(r=>{
      const d = toISO(getVal(r,["Data księgowania","date","Дата"]));
      if(!d || d!==t) return;
      const amt = asNum(getVal(r,["Kwota","Kwота","amount","Kwota_raw"])||0);
      if(amt>0) inSum+=amt; else outSum+=amt;
    });
    (kasa||[]).forEach(k=>{
      const d = String(k.date||"").slice(0,10);
      if(!d || d!==t) return;
      const amt = Number(k.amount||0);
      if(amt>0) inSum+=amt; else outSum+=amt;
    });
    const net = inSum+outSum;

    // Obligations 7 / 30
    let sum7 = 0, sum30 = 0;
    (bills||[]).forEach(r=>{
      const s = String(getVal(r,["Status faktury","Status фактуры","Status"])||"").toLowerCase();
      if(!["do zapłaty","przeterminowane","к оплате","просрочено","to pay"].includes(s)) return;
      const cur = String(getVal(r,["Waluta","Waluta "])||"").toUpperCase();
      if(cur!=="PLN") return;
      const di = toISO(getVal(r,["Termin płatności","Termin","Termin платності"]));
      if(!di) return;
      const dd = new Date(di);
      const diff = (dd-tt)/86400000;
      if(diff<0) return;
      const amt = asNum(getVal(r,["Kwota do zapłaty","Kwota","Kwота"])||0);
      if(diff<=7) sum7 += amt;
      if(diff<=30) sum30 += amt;
    });

    const availVal = availableTotal();

    const elToday = $id('cd_today');
    if(elToday){
      if(!inSum && !outSum){
        elToday.textContent = 'Dziś: brak ruchów (bank + kasa).';
      }else{
        elToday.textContent = `Dziś: przychód ${inSum.toFixed(2)} PLN, wydatki ${Math.abs(outSum).toFixed(2)} PLN, wynik ${(net>=0?'+':'-')+Math.abs(net).toFixed(2)} PLN.`;
      }
    }

    const elObl = $id('cd_oblig');
    if(elObl){
      elObl.textContent = `Płatności: w 7 dni ${sum7.toFixed(2)} PLN, w 30 dni ${sum30.toFixed(2)} PLN.`;
    }

    const elRisk = $id('cd_risk');
    if(elRisk){
      if(sum7===0 && sum30===0){
        elRisk.textContent = 'Status: 🟢 Brak zobowiązań w 30 dni.';
      }else if(availVal >= sum30){
        elRisk.textContent = 'Status: 🟢 Bezpiecznie (pokryte 30 dni).';
      }else if(availVal >= sum7){
        elRisk.textContent = 'Status: 🟡 Uwaga (pokryte 7 dni, brak 30 dni).';
      }else{
        elRisk.textContent = 'Status: 🔴 Ryzyko (brak środków na 7 dni).';
      }
    }

    const elTarget = $id('cd_target');
    if(elTarget){
      if(sum30>0){
        const avgNeed = sum30/30;
        elTarget.textContent = `Cel na jutro: przynajmniej ${avgNeed.toFixed(2)} PLN dziennego wyniku, aby pokryć zobowiązania 30 dni.`;
      }else{
        elTarget.textContent = 'Cel na jutro: utrzymaj dodatni wynik dnia.';
      }
    }

    const modal = $id('closeDayModal');
    if(modal){
      modal.classList.add('show');
    }
  }catch(e){
    console.warn('close day error', e);
  }
}

function closeCloseDayModal(){
  const modal = $id('closeDayModal');
  if(modal){
    modal.classList.remove('show');
  }
}


function runAIAll(){
  try{
    if(typeof runAI==='function') runAI();
    if(typeof acceptSafe==='function') acceptSafe();
  }catch(e){
    console.warn('runAIAll error', e);
  }
}

function openAddTodayModal(){
  const modal = $id('addTodayModal');
  if(modal){
    modal.classList.add('show');
  }
}

function closeAddTodayModal(){
  const modal = $id('addTodayModal');
  if(modal){
    modal.classList.remove('show');
  }
}

function goAddBank(){
  const tab = document.querySelector('.tabs .tab[data-sec="wyciag"]');
  if(tab) tab.click();
  closeAddTodayModal();
}

function goAddCash(){
  const tab = document.querySelector('.tabs .tab[data-sec="kasa"]');
  if(tab) tab.click();
  closeAddTodayModal();
}

function goAddBills(){
  const tab = document.querySelector('.tabs .tab[data-sec="faktury"]');
  if(tab) tab.click();
  closeAddTodayModal();
}

function render(){
  // KPIs
  const dueToday=(bills||[]).filter(r=>{
    const s=String(getVal(r,["Status faktury","Status фактуры","Status"])||"").toLowerCase();
    return ["do zapłaty","przeterminowane","к оплате","просрочено","to pay"].includes(s) &&
           toISO(getVal(r,["Termin płatności","Termin","Termin платності"]))===today();
  }).length;
  const unmatch=(tx||[]).filter(r=> String(getVal(r,["Status transakcji","status"])||"").toLowerCase()!=="sparowane").length;
  $id('kpiDue')&&( $id('kpiDue').textContent = dueToday );
  $id('kpiUnmatch')&&( $id('kpiUnmatch').textContent = unmatch );
  const bankPLN=bankAvailablePLN(); $id('kpiBank')&&( $id('kpiBank').textContent = bankPLN.toFixed(2) );
  const kas=kasaBalance(); $id('kpiCash')&&( $id('kpiCash').textContent = kas.toFixed(2) );
  const avail=availableTotal(); $id('kpiAvail')&&( $id('kpiAvail').textContent = avail.toFixed(2) );
  const sumDue=(bills||[]).filter(r=>
    String((getVal(r,["Waluta","Waluta "])||"").toUpperCase())==="PLN" &&
    toISO(getVal(r,["Termin płatności","Termin","Termin платності"]))<=today() &&
    ["do zapłaty","przeterminowane","к оплате","просрочено"].includes(String(getVal(r,["Status faktury","Status"])||"").toLowerCase())
  ).reduce((s,r)=> s+asNum(getVal(r,["Kwota do zapłaty","Kwota","Kwота"])||0),0);
  $id('kpiGap')&&( $id('kpiGap').textContent = Math.max(0,sumDue-avail).toFixed(2) );

  

  // Today summary (bank + cash)
  try{
    const t = today();
    let inSum = 0, outSum = 0;
    (tx||[]).forEach(r=>{
      const d = toISO(getVal(r,["Data księgowania","date","Дата"]));
      if(!d || d!==t) return;
      const amt = asNum(getVal(r,["Kwota","Kwота","amount","Kwota_raw"])||0);
      if(amt>0) inSum+=amt; else outSum+=amt;
    });
    (kasa||[]).forEach(k=>{
      const d = String(k.date||"").slice(0,10);
      if(!d || d!==t) return;
      const amt = Number(k.amount||0);
      if(amt>0) inSum+=amt; else outSum+=amt;
    });
    const net = inSum+outSum;
    if($id('todayIn'))  $id('todayIn').textContent  = inSum ? inSum.toFixed(2)+' PLN' : '—';
    if($id('todayOut')) $id('todayOut').textContent = outSum ? Math.abs(outSum).toFixed(2)+' PLN' : '—';
    if($id('todayNet')) $id('todayNet').textContent = net ? ((net>=0?'+':'-')+Math.abs(net).toFixed(2)+' PLN') : '—';
  }catch(e){ console.warn('today summary error', e); }

  // Obligations 7 / 30 days (PLN, only unpaid)
  try{
    const t = today();
    const tt = new Date(t);
    let sum7 = 0, sum30 = 0;
    const upcoming = [];
    (bills||[]).forEach(r=>{
      const s = String(getVal(r,["Status faktury","Status фактуры","Status"])||"").toLowerCase();
      if(!["do zapłaty","przeterminowane","к оплате","просрочено","to pay"].includes(s)) return;
      const cur = String(getVal(r,["Waluta","Waluta "])||"").toUpperCase();
      if(cur!=="PLN") return;
      const di = toISO(getVal(r,["Termin płatności","Termin","Termin платності"]));
      if(!di) return;
      const dd = new Date(di);
      const diff = (dd-tt)/86400000;
      if(diff<0) return;
      const amt = asNum(getVal(r,["Kwota do zapłaty","Kwota","Kwота"])||0);
      const who = String(getVal(r,["Dostawca","Kontrahent","Supplier"])||"");
      if(diff<=7) sum7 += amt;
      if(diff<=30) sum30 += amt;
      if(diff<=30) upcoming.push({di, amt, who});
    });
    if($id('oblig7'))  $id('oblig7').textContent  = sum7 ? sum7.toFixed(2)+' PLN' : '0 PLN';
    if($id('oblig30')) $id('oblig30').textContent = sum30 ? sum30.toFixed(2)+' PLN' : '0 PLN';

    const availVal = typeof avail==='number' ? avail : availableTotal();

    // Risk light
    const riskEl = $id('riskLight');
    if(riskEl){
      if(sum7===0 && sum30===0){
        riskEl.textContent = '🟢 Brak zobowiązań w 30 dni';
      }else{
        if(availVal >= sum30){
          riskEl.textContent = '🟢 Bezpiecznie (pokryte 30 dni)';
        }else if(availVal >= sum7){
          riskEl.textContent = '🟡 Uwaga (pokryte 7 dni, brak 30 dni)';
        }else{
          riskEl.textContent = '🔴 Ryzyko (brak środków na 7 dni)';
        }
      }
    }

    // Days of safety
    const daysEl = $id('daysSafe');
    if(daysEl){
      if(sum30>0){
        const dailyNeed = sum30/30;
        const days = dailyNeed>0 ? Math.floor(availVal/dailyNeed) : 0;
        if(days>=30) daysEl.textContent = 'Dni bezpieczeństwa: ≥30';
        else if(days>=7) daysEl.textContent = 'Dni bezpieczeństwa: '+days;
        else daysEl.textContent = 'Dni bezpieczeństwa: <7';
      }else if(sum7>0){
        const dailyNeed = sum7/7;
        const days = dailyNeed>0 ? Math.floor(availVal/dailyNeed) : 0;
        if(days>=7) daysEl.textContent = 'Dni bezpieczeństwa: ≥7';
        else daysEl.textContent = 'Dni bezpieczeństwa: <7';
      }else{
        daysEl.textContent = 'Dni bezpieczeństwa: brak zobowiązań';
      }
    }

    // Next payments (3 nearest within 30 days)
    const nextEl = $id('nextPayments');
    if(nextEl){
      if(!upcoming.length){
        nextEl.textContent = 'Brak nadchodzących płatności w 30 dni.';
      }else{
        upcoming.sort((a,b)=>a.di.localeCompare(b.di));
        const top3 = upcoming.slice(0,3);
        nextEl.innerHTML = top3.map(x=>{
          const d = x.di;
          const a = (x.amt||0).toFixed(2)+' PLN';
          const w = x.who ? (' – '+x.who.replace(/</g,'&lt;').replace(/>/g,'&gt;')) : '';
          return d+' | '+a+w;
        }).join('<br>');
      }
    }
  }catch(e){ console.warn('obligations summary error', e); }

  // Last 7 days insight
  try{
    const t = today();
    const tt = new Date(t);
    const from = new Date(tt.getTime()-6*86400000);
    let in7 = 0, out7 = 0;
    const inRange = (dstr)=>{
      if(!dstr) return false;
      const d = new Date(dstr);
      return d>=from && d<=tt;
    };
    (tx||[]).forEach(r=>{
      const d = toISO(getVal(r,["Data księgowania","date","Дата"]));
      if(!inRange(d)) return;
      const amt = asNum(getVal(r,["Kwota","Kwота","amount","Kwota_raw"])||0);
      if(amt>0) in7+=amt; else out7+=amt;
    });
    (kasa||[]).forEach(k=>{
      const d = String(k.date||"").slice(0,10);
      if(!inRange(d)) return;
      const amt = Number(k.amount||0);
      if(amt>0) in7+=amt; else out7+=amt;
    });
    const net7 = in7+out7;
    const el = $id('last7Text');
    if(el){
      if(!in7 && !out7){
        el.textContent = 'Brak danych za ostatnie 7 dni.';
      }else{
        el.textContent = `Ostatnie 7 dni: przychód ${in7.toFixed(2)} PLN, wydatki ${Math.abs(out7).toFixed(2)} PLN, wynik ${(net7>=0?'+':'-')+Math.abs(net7).toFixed(2)} PLN.`;
      }
    }
  }catch(e){ console.warn('last7 summary error', e); }

// TX table
  const txBody=document.querySelector('#txTable tbody'); if(txBody){
    txBody.innerHTML='';
    const listTx=(tx||[]).slice().reverse();
    listTx.forEach(r=>{
      const id=getVal(r,["ID transakcji","ID","id"])||("noid-"+Math.random());
      const curStr = getVal(r,["Waluta","currency"])||''; const cur = detectCurrency(curStr);
      const tr=document.createElement('tr');
      tr.innerHTML = `<td>${toISO(getVal(r,["Data księgowania","date","Дата"]))}</td>
        <td>${getVal(r,["ID konta","IBAN","account"])||"—"}</td>
        <td>${getVal(r,["Kontrahent","Counterparty"])||""}</td>
        <td>${getVal(r,["Tytuł/Opis","Opis","title"])||""}</td>
        <td>${fmtAmountRaw(getVal(r,["Kwota","Kwота","amount","Kwota_raw"]))}</td>
        <td>${cur}</td>
        <td>${getVal(r,["Status transakcji","status"])||""}</td>
        <td class="actions">
          <button data-act="edit" data-kind="tx" data-id="${id}">✎</button>
          <button data-act="del" data-kind="tx" data-id="${id}">🗑</button>
        </td>`;
      txBody.appendChild(tr);
    });
  }

  // Bills
  const billBody=document.querySelector('#billTable tbody'); if(billBody){
    billBody.innerHTML='';
    const listBills=(bills||[]).slice().reverse();
    listBills.forEach(r=>{
      const s=String(getVal(r,["Status faktury","Status фактуры","Status"])||"").toLowerCase();
      const cls=(s.includes('przetermin')||s.includes('проср'))?'overdue':'due';
      const cand=getVal(r,["Kandydat (AI)"])||"";
      const score=getVal(r,["AI score"])||"";
      const id=getVal(r,["Numer faktury","Numer фактуры","Invoice number"])||("noinv-"+Math.random());
      const cur = detectCurrency(getVal(r,["Waluta","currency"])||'');
      const tr=document.createElement('tr');
      tr.innerHTML = `<td>${toISO(getVal(r,["Termin płatności","Termin","Termin платності"])||"")}</td>
        <td>${getVal(r,["Numer faktury","Numer фактуры","Invoice number"])||""}</td>
        <td>${getVal(r,["Dostawca","Supplier"])||""}</td>
        <td>${getVal(r,["Kwota do zapłaty","Kwota","Kwota"])||""}</td>
        <td>${cur}</td>
        <td><span class="badge ${cls}">${getVal(r,["Status faktury","Status фактуры","Status"])||""}</span></td>
        <td>${cand?('<span class="badge cand">'+cand+'</span>'):'—'}</td>
        <td>${score?('<span class="badge ai">'+score+'</span>'):'—'}</td>
        <td class="actions">
          ${cand?('<button class="btn secondary btn-accept" data-invid="'+id+'">OK</button>'):''}
          <button data-act="edit" data-kind="bill" data-id="${id}">✎</button>
          <button data-act="del" data-kind="bill" data-id="${id}">🗑</button>
        </td>`;
      billBody.appendChild(tr);
    });
    document.querySelectorAll(".btn-accept").forEach(b=> b.addEventListener('click',()=>acceptOne(b.getAttribute('data-invid'))));
  }

  try{ renderTrendChart(); }catch(e){ console.warn('trend', e); }
  try{ renderSpendingPanel(); }catch(e){ console.warn('spend', e); }
  renderMinPay(); renderForecast(); renderAccounts(); renderKasa(); renderBook(); updateSubUI(); gateAccess();
}

/* ==== PLAN / FORECAST / MINPAY (kept) ==== */
function toDueList(mode){
  const t=today(); const excl=$id('excludeBlacklist')?.checked||false;
  return bills.filter(r=>{
    const s=String(getVal(r,["Status faktury","Status фактуры","Status"])||"").toLowerCase();
    if(!["do zapłaty","przeterminowane","к оплате","просрочено","to pay"].includes(s)) return false;
    const d=toISO(getVal(r,["Termin płatności","Termin","Termin платності"])); if(!d) return false;
    if(mode==='today') return d===t;
    if(mode==='7d'){ const dd=new Date(d), tt=new Date(t); return (dd-tt)/86400000 <= 7; }
    return true;
  }).filter(r=>{
    if(String((getVal(r,["Waluta"])||"").toUpperCase())!=="PLN") return false;
    if(excl){
      const bl=(localStorage.getItem('blacklist')||"").toLowerCase();
      const nm=(getVal(r,["Dostawca","Supplier"])||"").toLowerCase();
      if(bl && bl.split(",").some(x=> nm.includes(x.trim()))) return false;
    }
    return true;
  });
}
function buildPlan(){
  const mode=$id('planFilter')?.value||'7d';
  const cand=toDueList(mode).sort((a,b)=>{
    const da=new Date(toISO(getVal(a,["Termin płatności","Termin","Termin платності"])||today()));
    const db=new Date(toISO(getVal(b,["Termin płatności","Termin","Termin платності"])||today()));
    const lateA=da<new Date(today()), lateB=db<new Date(today());
    if(lateA!==lateB) return lateB-lateA;
    return asNum(getVal(b,["Kwota do zapłaty","Kwota"])) - asNum(getVal(a,["Kwota do zapłaty","Kwota"]));
  });
  let left=availableTotal(); const plan=[];
  for(const r of cand){
    const amt=asNum(getVal(r,["Kwota do zapłaty","Kwota"])||0);
    if(amt<=left){ plan.push({r,amt,reason:(toISO(getVal(r,["Termin płatności","Termin"])||today())<today()?"просрочка":"срок")}); left-=amt; }
  }
  return {plan,left,avail:availableTotal()};
}
function renderPlan(){
  const p=buildPlan(); const tb=document.querySelector('#planTable tbody'); if(!tb) return; tb.innerHTML='';
  p.plan.forEach((x,i)=>{
    const tr=document.createElement('tr');
    tr.innerHTML = `<td>${i+1}</td><td>${getVal(x.r,["Numer faktury","Numer фактуры"])||""}</td><td>${getVal(x.r,["Dostawca","Supplier"])||""}</td><td>${toISO(getVal(x.r,["Termin płatności","Termin"])||"")}</td><td>${x.amt.toFixed(2)}</td><td>${x.reason}</td>`;
    tb.appendChild(tr);
  });
  const pm=$id('planMeta'); if(pm) pm.textContent = p.plan.length?`Wydamy ${(p.avail-p.left).toFixed(2)} z ${p.avail.toFixed(2)} PLN. Zostanie ${p.left.toFixed(2)} PLN.`:"Plan pusty lub brak środków.";
}
function computeMinPay(){
  const t=today(); const pct=asNum(localStorage.getItem('penaltyPct')||0.05)/100.0;
  const cand=bills.filter(r=>
    String((getVal(r,["Waluta"])||"").toUpperCase())==="PLN" &&
    toISO(getVal(r,["Termin płatności","Termin"])||"")<=t &&
    ["do zapłaty","przeterminowane","к оплате","просрочено"].includes(String(getVal(r,["Status faktury","Status"])||"").toLowerCase())
  ).map(r=>({r,amt:asNum(getVal(r,["Kwota do zapłaty","Kwota"])||0),risk:asNum(getVal(r,["Kwota do zapłaty","Kwota"])||0)*pct}))
   .sort((a,b)=> b.risk-a.risk || b.amt-a.amt);
  return cand[0]||null;
}
function renderMinPay(){
  const m=computeMinPay(); const el=$id('minPayBox'); if(!el) return;
  if(!m){ el.textContent='—'; return; }
  el.textContent = `Оплатить ${getVal(m.r,["Numer faktury","Numer фактуры"])} (${getVal(m.r,["Dostawca","Supplier"])} ) на ${m.amt.toFixed(2)} PLN. Штраф/день ~ ${m.risk.toFixed(2)} PLN.`;
}
function renderForecast(){
  const t=new Date(today());
  const list=toDueList("7d").map(r=>({date:new Date(toISO(getVal(r,["Termin płatności","Termin"]))), amt:asNum(getVal(r,["Kwota do zapłaty","Kwota"])||0)}));
  const days=[...Array(7)].map((_,i)=> new Date(t.getTime()+i*86400000));
  let left=availableTotal(); const out=days.map(d=>({d,due:0,after:0}));
  list.forEach(x=>{ const idx=Math.min(6, Math.max(0, Math.floor((x.date - t)/86400000))); out[idx].due += x.amt; });
  out.forEach(o=>{ left-=o.due; o.after=left; });
  const wrap=$id('forecastBars'); if(!wrap) return; wrap.innerHTML='';
  out.forEach(o=>{
    const div=document.createElement('div'); div.className='bar'+(o.after<0?' neg':'');
    const h=document.createElement('div'); h.className='h'; h.style.height=(Math.min(120,Math.abs(o.after)/100)*0.8+18)+'px';
    div.innerHTML=`<small>${o.d.toISOString().slice(5,10)}</small>`; div.appendChild(h);
    const v=document.createElement('div'); v.textContent = (o.after<0?'-':'')+Math.abs(o.after).toFixed(0)+' PLN'; div.appendChild(v);
    wrap.appendChild(div);
  });
  const firstNeg=out.find(x=>x.after<0); const meta=$id('forecastMeta');
  if(meta) meta.textContent = firstNeg?`Гэп через ${out.indexOf(firstNeg)+1} дн.: не хватает ${Math.abs(firstNeg.after).toFixed(2)} PLN.`:"На 7 дней хватает кассы.";
}

/* ==== ACCEPT ONE ==== */
function acceptOne(id){
  const b=(bills||[]).find(x=> (getVal(x,["Numer faktury","Numer фактуры","Invoice number"])||"")===id);
  if(!b) return;
  const t=(tx||[]).find(x=> (getVal(x,["ID transakcji","ID","id"])||"")=== (getVal(b,["Kandydat (AI)"])||""));
  if(!t) return;
  t["Status transakcji"]="Sparowane"; t["Powiązana faktura (ID)"]=getVal(b,["Numer faktury","Numer фактуры"]);
  b["Status faktury"]="Opłacone"; b["Data płatności"]=today(); b["Kandydat (AI)"]=b["AI score"]="";
  render(); saveLocal(); pushState();
}

/* ==== KASA CRUD ==== */
function loadKasa(){ try{kasa=JSON.parse(localStorage.getItem('kasa')||'[]');}catch(e){kasa=[]} }
function addKasa(type,amount,comment,source){
  if(amount==null||isNaN(amount)) return alert("Сумма некорректна");
  kasa.push({id:Date.now(),date:today(),type,amount:Number(amount),comment:comment||"",source:source||"ручной"});
  saveLocal(); render(); pushState();
}
function editRow(kind,id){
  if(kind==='kasa'){
    const idx=kasa.findIndex(x=> String(x.id)===String(id)); if(idx<0) return;
    const k=kasa[idx];
    const n=prompt("Сумма:", k.amount); if(n===null) return;
    const c=prompt("Комментарий:", k.comment||""); if(c===null) return;
    kasa[idx].amount=asNum(n); kasa[idx].comment=c; saveLocal(); render(); pushState(); return;
  }
  if(kind==='tx'){
    const idx=tx.findIndex(x=> (getVal(x,["ID transakcji","ID","id"])||"")===String(id)); if(idx<0) return;
    const r=tx[idx];
    const d=prompt("Дата (YYYY-MM-DD):", toISO(getVal(r,["Data księgowania"])||today())); if(d===null) return;
    const a=prompt("Сумма:", getVal(r,["Kwota","Kwota_raw","amount"])||""); if(a===null) return;
    r["Data księgowania"]=toISO(d)||today(); r["Kwota"]=asNum(a).toFixed(2); r["Waluta"]= detectCurrency(getVal(r,["Waluta"])||''); saveLocal(); render(); pushState(); return;
  }
  if(kind==='bill'){
    const idx=bills.findIndex(x=> (getVal(x,["Numer faktury","Numer фактуры","Invoice number"])||"")===String(id)); if(idx<0) return;
    const r=bills[idx];
    const due=prompt("Срок (YYYY-MM-DD):", toISO(getVal(r,["Termin płatności","Termin"])||today())); if(due===null) return;
    const amt=prompt("Сумма к оплате:", getVal(r,["Kwota do zapłaty","Kwota"])||""); if(amt===null) return;
    r["Termin płatności"]=toISO(due)||today(); r["Kwota do zapłaty"]=asNum(amt).toFixed(2); r["Waluta"]= detectCurrency(getVal(r,["Waluta"])||''); saveLocal(); render(); pushState(); return;
  }
}
function delRow(kind,id){
  if(kind==='kasa'){ kasa = kasa.filter(x=> String(x.id)!==String(id)); saveLocal(); render(); pushState(); return; }
  if(kind==='tx'){ tx = tx.filter(x=> (getVal(x,["ID transakcji","ID","id"])||"")!==String(id)); saveLocal(); render(); pushState(); return; }
  if(kind==='bill'){ bills = bills.filter(x=> (getVal(x,["Numer faktury","Numer фактуры","Invoice number"])||"")!==String(id)); saveLocal(); render(); pushState(); return; }
}

/* ==== EVENTS ==== */
document.addEventListener('click',(e)=>{
  const btn=e.target.closest('button'); if(!btn) return;
  const act=btn.getAttribute('data-act'); if(!act) return;
  const kind=btn.getAttribute('data-kind'), id=btn.getAttribute('data-id');
  if(act==='edit') editRow(kind,id);
  if(act==='del') delRow(kind,id);
});

function thumb(el,file){ const img=el; if(!img) return; img.src=URL.createObjectURL(file); img.style.display='inline-block'; }

async function ocrBankFiles(files){
  for(const f of files){
    try{
      thumb($id('txLastThumb'), f);
      const text = await recognizeImage(f);
      const rows = parseBankOCR(text);
      if(rows.length){ tx = tx.concat(rows); }
    }catch(e){ console.warn('OCR bank error', e); }
  }
  inferAccounts(); render(); saveLocal(); pushState();
}
async function ocrInvoiceFiles(files){
  for(const f of files){
    try{
      const text = await recognizeImage(f);
      const rows = parseInvoiceOCR(text);
      if(rows.length){ bills = bills.concat(rows); }
    }catch(e){ console.warn('OCR invoice error', e); }
  }
  render(); saveLocal(); pushState();
}

/* ==== DOM READY ==== */
window.appGoSection = function(secId){
  const homeEl = document.getElementById('homeScreen');
  const topBar = document.querySelector('.top');
  const tabsWrap = document.querySelector('.tabs');

  try{
    const sec = document.getElementById(secId);

    if(!sec){
      console.warn('appGoSection: section not found:', secId);
      if(homeEl) homeEl.style.display = 'block';
      if(topBar) topBar.classList.add('hidden');
      if(tabsWrap) tabsWrap.style.display = 'none';
      return;
    }

    if(homeEl) homeEl.style.display = 'none';
    if(topBar) topBar.classList.remove('hidden');
    if(tabsWrap) tabsWrap.style.display = 'flex';   // ← показываем вкладки при входе в любую секцию

    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    sec.classList.add('active');

    const tab = document.querySelector('.tabs .tab[data-sec="'+secId+'"]');
    if(tab){
      document.querySelectorAll('.tabs .tab').forEach(x => x.classList.remove('active'));
      tab.classList.add('active');
    }

    try{
      render();
    }catch(e){
      console.warn('render() error:', e);
    }

  }catch(e){
    console.warn('appGoSection fatal error:', e);
    if(homeEl) homeEl.style.display = 'block';
    if(topBar) topBar.classList.add('hidden');
    if(tabsWrap) tabsWrap.style.display = 'none';
  }
};


window.appGoSection = function(secId){
  const homeEl = document.getElementById('homeScreen');
  const topBar = document.querySelector('.top');

  try{
    const sec = document.getElementById(secId);

    // Если секции нет — не прячем дом и не ломаем всё к чертям
    if(!sec){
      console.warn('appGoSection: section not found:', secId);
      if(homeEl) homeEl.style.display = 'block';
      if(topBar) topBar.classList.add('hidden');
      return;
    }

    // Прячем домашний и показываем верхнюю панель
    if(homeEl) homeEl.style.display = 'none';
    if(topBar) topBar.classList.remove('hidden');

    // Снимаем active со всех секций и ставим на нужную
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    sec.classList.add('active');

    // Подсветка вкладки
    const tab = document.querySelector('.tabs .tab[data-sec="'+secId+'"]');
    if(tab){
      document.querySelectorAll('.tabs .tab').forEach(x => x.classList.remove('active'));
      tab.classList.add('active');
    }

    try{
      // На всякий пожарный, если render что-то ломает — не убиваем видимость
      render();
    }catch(e){
      console.warn('render() error:', e);
    }

  }catch(e){
    console.warn('appGoSection fatal error:', e);
    // Fallback: возвращаемся на домашний экран, чтобы не оставаться с пустым фоном
    if(homeEl) homeEl.style.display = 'block';
    if(topBar) topBar.classList.add('hidden');
  }
};


document.addEventListener('DOMContentLoaded', async ()=>{
  // Lang bar
  document.querySelectorAll('#langBarMain button').forEach(b=>{
    b.addEventListener('click',()=> applyLang(b.dataset.lang));
  });
  applyLang(localStorage.getItem('otd_lang')||'pl');
  initTheme();
  initHelper();
  initSpendingUI();
  initTrendInteractions();
    // --- Фикс поломанной вёрстки: выносим секции из homeScreen ---
  try {
    const home = document.getElementById('homeScreen');
    const host = document.querySelector('.wrap') || document.body;

    if (home && host) {
      // верхняя панель
      const topBar = document.querySelector('.top');
      if (topBar && home.contains(topBar)) {
        host.appendChild(topBar);
      }

      // основные секции
      const moveIds = [
        'gate',
        'pulpit',
        'docs',
        'wyciag',
        'faktury',
        'konta',
        'kasa',
        'ustawienia',
        'aiAssist',
        'reports'
      ];

      moveIds.forEach(id => {
        const el = document.getElementById(id);
        if (el && home.contains(el)) {
          host.appendChild(el);
        }
      });

      // helper-виджеты
      ['helperFab', 'helperPanel'].forEach(id => {
        const el = document.getElementById(id);
        if (el && home.contains(el)) {
          host.appendChild(el);
        }
      });
    }
  } catch (e) {
    console.warn('layout fix failed', e);
  }



  // Home screen and premium tiles
  try{
    // навешиваем fallback на случай, если inline-обработчик не сработал
    document.querySelectorAll('.homeTile').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const t = btn.dataset.target;
        if(!t) return;
        const map = {docs:'docs',money:'pulpit',ai:'aiAssist',kasa:'kasa',accounts:'konta',reports:'reports'};
        const secId = map[t] || t;
        if(window.appGoSection) window.appGoSection(secId);
      });
    });
    // Docs buttons -> underlying file inputs
    const byId = (id)=>document.getElementById(id);
    byId('docTxCsvBtn')?.addEventListener('click', ()=> byId('txFile')?.click());
    byId('docTxImgBtn')?.addEventListener('click', ()=> byId('txImage')?.click());
    byId('docBillCsvBtn')?.addEventListener('click', ()=> byId('billFile')?.click());
    byId('docBillImgBtn')?.addEventListener('click', ()=> byId('billImage')?.click());
    byId('docCashImgBtn')?.addEventListener('click', ()=> byId('cashImage')?.click());

    // Reports buttons reuse existing export actions (если они есть)
    byId('reportsTx')?.addEventListener('click', ()=> byId('exportTxCSV')?.click());
    byId('reportsBills')?.addEventListener('click', ()=> byId('exportBillsCSV')?.click());
    byId('reportsBook')?.addEventListener('click', ()=> byId('exportBook')?.click());

    // AI profile load/save (локально)
    try{
      const savedProfileRaw = localStorage.getItem('otd_ai_profile');
      if(savedProfileRaw){
        const pr = JSON.parse(savedProfileRaw);
        if(byId('aiProfileType') && pr.type) byId('aiProfileType').value = pr.type;
        if(byId('aiProfileNiche') && pr.niche) byId('aiProfileNiche').value = pr.niche;
        if(byId('aiProfileGoal') && pr.goal) byId('aiProfileGoal').value = pr.goal;
        if(byId('aiProfileSaved')) byId('aiProfileSaved').style.display='block';
      }
    }catch(e){}

    byId('aiProfileSave')?.addEventListener('click', ()=>{
      const profile = {
        type: byId('aiProfileType')?.value || 'solo',
        niche: byId('aiProfileNiche')?.value || '',
        goal: byId('aiProfileGoal')?.value || 'survive'
      };
      try{
        localStorage.setItem('otd_ai_profile', JSON.stringify(profile));
      }catch(e){}
      if(byId('aiProfileSaved')) byId('aiProfileSaved').style.display='block';
    });
    // Быстрые вопросы для AI-бухгалтера
   const quickPairs = [
  ['aiQRent','ai.q_rent'],
  ['aiQSpending','ai.q_spending'],
  ['aiQWithdraw','ai.q_withdraw'],
  ['aiQMonth','ai.q_month']
];

quickPairs.forEach(([id,key])=>{
  const btn = document.getElementById(id);
  if(!btn) return;
  btn.addEventListener('click', ()=>{
    const inp = document.getElementById('aiChatInput');
    if(!inp) return;
    const lang = localStorage.getItem('otd_lang') || 'pl';
    const dict = M[lang] || M.pl;
    inp.value = dict[key] || '';
    const send = document.getElementById('aiChatSend');
    if(send) send.click();
  });
});



    byId('aiChatSend')?.addEventListener('click', ()=>{
      const inp = byId('aiChatInput');
      const log = byId('aiChatLog');
      if(!inp || !log) return;
      const q = (inp.value||'').trim();
      if(!q) return;
      let profileNote = '';
      try{
        const profileRaw = localStorage.getItem('otd_ai_profile');
        if(profileRaw){
          const p = JSON.parse(profileRaw);
          profileNote = '\n\n(Профиль: тип='+ (p.type||'-') +', ниша='+(p.niche||'-')+', цель='+(p.goal||'-')+')';
        }
      }catch(e){}
      const userHtml = '<div style="margin-bottom:6px"><b>Ты:</b> '+q+'</div>';
      const botHtml = '<div style="margin-bottom:10px"><b>AI-бухгалтер:</b> это прототип интерфейса. На боевой версии здесь будут персональные советы по твоим данным'+profileNote+'.</div>';
      log.innerHTML = userHtml + botHtml + log.innerHTML;
      inp.value = '';
    });
  }catch(e){
    console.warn('home/ai wiring error', e);
  }
  // Tabs (with gate)
  document.querySelectorAll('.tabs .tab').forEach(t=>{
    t.addEventListener('click', ()=>{
      if(t.classList.contains('disabled')) { document.querySelector('[data-sec=ustawienia]')?.click(); return; }
      document.querySelectorAll('.tabs .tab').forEach(x=>x.classList.remove('active'));
      document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
      t.classList.add('active'); const sec=t.dataset.sec; if(sec) $id(sec)?.classList.add('active');
      render();
    });
  });

  // Buttons
  $id('backHomeBtn')?.addEventListener('click', ()=> window.appShowHome && appShowHome());
  $id('settingsBtn')?.addEventListener('click', ()=> window.appGoSection && appGoSection('ustawienia'));
  $id('runAIAll')?.addEventListener('click', runAIAll);
  $id('makePlan')?.addEventListener('click', renderPlan);
  $id('applyPlan')?.addEventListener('click', renderPlan);
   $id('applyMinPay')?.addEventListener('click', () => {
    try {
      // Заглушка: просто пересчитать план и сохранить
      render();
      saveLocal();
      pushState();
    } catch (e) {
      console.warn('applyMinPay error', e);
    }
  });

  $id('syncNow')?.addEventListener('click', fetchSources);
  $id('closeDay')?.addEventListener('click', openCloseDayModal);
  $id('closeDayCancel')?.addEventListener('click', closeCloseDayModal);

  $id('addToday')?.addEventListener('click', openAddTodayModal);
  $id('addTodayCancel')?.addEventListener('click', closeAddTodayModal);
  $id('addBankBtn')?.addEventListener('click', goAddBank);
  $id('addCashBtn')?.addEventListener('click', goAddCash);
  $id('addBillsBtn')?.addEventListener('click', goAddBills);

  $id('exportBook')?.addEventListener('click', exportBookCSV);
  $id('exportTxCSV')?.addEventListener('click', exportTxCSV);
  $id('exportBillsCSV')?.addEventListener('click', exportBillsCSV);
  $id('exportCashCSV')?.addEventListener('click', exportCashCSV);


  $id('runDayAI')?.addEventListener('click', ()=>{ try{ fetchSources(); }catch(e){ console.warn('runDayAI error', e); } });
  $id('openAIQuestions')?.addEventListener('click', ()=>{
    const tab = document.querySelector('.tabs .tab[data-sec="faktury"]');
    if(tab) tab.click();
  });

  // File/url
 $id('txFile')?.addEventListener('change', async e=>{const f=e.target.files[0]; if(!f) return;
  tx = parseCSV(await f.text());
  ensureTxIds();
  inferAccounts();
  render();
  saveLocal();
  pushState();
});

  $id('txImage')?.addEventListener('change', async e=>{ const files=[...e.target.files]; if(!files.length) return; await ocrBankFiles(files); });
  $id('billFile')?.addEventListener('change', async e=>{ const f=e.target.files[0]; if(!f) return; bills=parseCSV(await f.text()); render(); saveLocal(); pushState(); });
  $id('billImage')?.addEventListener('change', async e=>{ const files=[...e.target.files]; if(!files.length) return; await ocrInvoiceFiles(files); });

  // Cash quick & ops
  $id('addIn')?.addEventListener('click',()=> addKasa('przyjęcie', asNum($id('quickAmt')?.value||0), $id('quickNote')?.value, 'manual'));
  $id('addOut')?.addEventListener('click',()=> addKasa('wydanie', asNum($id('quickAmt')?.value||0), $id('quickNote')?.value, 'manual'));
  $id('cashClose')?.addEventListener('click',()=>{ const a=prompt('Итог в кассе (PLN):', kasaBalance().toFixed(2)); if(a===null) return; addKasa('zamknięcie', asNum(a), 'close', 'manual'); });
  $id('q50')?.addEventListener('click',()=>{ const el=$id('quickAmt'); if(el) el.value=(Number(el.value||0)+50).toFixed(2); });
  $id('q100')?.addEventListener('click',()=>{ const el=$id('quickAmt'); if(el) el.value=(Number(el.value||0)+100).toFixed(2); });
  $id('q200')?.addEventListener('click',()=>{ const el=$id('quickAmt'); if(el) el.value=(Number(el.value||0)+200).toFixed(2); });

  // Speech
  const micBtn = $id('micBtn');
  if (micBtn && (window.SpeechRecognition || window.webkitSpeechRecognition)) {
    const SR  = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();

    rec.continuous     = false;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.lang = localStorage.getItem('speechLang') || 'pl-PL';

    // Слова для ПРИХОДА (IN)
    const CMD_IN = [
      // PL
      'przyjęcie','przyjecie','wpłata','wplata','depozyt','depozit',
      // EN
      'plus','income','cash in','received','receive','deposit',
      // RU / UKR
      'плюс','принять','пополнить','пополнил','приход','зачислить'
    ];

    // Слова для РАСХОДА (OUT)
    const CMD_OUT = [
      // PL
      'wyda','wydat','wypłat','wyplata','koszt',
      // EN
      'minus','pay out','payout','expense','cash out','payment',
      // RU / UKR
      'выда','выдать','выдал','расход','списать','минус','выточка'
    ];

    function detectType(text) {
      const t = text.toLowerCase();

      // 1) Явный знак перед числом: "+200", "-150", "−300"
      const signMatch = t.match(/([+\-−])\s*\d+[.,]?\d*/);
      if (signMatch) {
        const sign = signMatch[1];
        if (sign === '-' || sign === '−') return 'wydanie';   // расход
        if (sign === '+')               return 'przyjęcie';   // приход
      }

      // 2) Ключевые слова
      if (CMD_OUT.some(w => t.includes(w))) return 'wydanie';
      if (CMD_IN.some(w  => t.includes(w))) return 'przyjęcie';

      // 3) По умолчанию считаем приход
      return 'przyjęcie';
    }

    rec.onstart = () => {
      micBtn.classList.add('on');
      if ($id('micStatus')) {
        $id('micStatus').textContent = `🎙️ ... (${rec.lang})`;
      }
    };

    rec.onend = () => {
      micBtn.classList.remove('on');
    };

    rec.onresult = (e) => {
      const text = (e.results[0][0].transcript || "").toLowerCase();
      if ($id('micStatus')) {
        $id('micStatus').textContent = '🎙️ ' + text;
      }

      // Число: "200", "200,50", "200.50" и т.п.
      const numMatch = text.match(/(\d+[.,]?\d*)\s*(zł|pln|eur|usd)?/i);
      const num = numMatch ? numMatch[1] : null;

      // Определяем тип: приход / расход
      const type = detectType(text);

      // Комментарий = текст без числа и валюты
      const note = text.replace(/(\d+[.,]?\d*\s*(zł|pln|eur|usd)?)/i, "").trim();

      if (!num) {
        if ($id('micStatus')) {
          $id('micStatus').textContent = '🎙️ сумма не найдена';
        }
        return;
      }

      addKasa(type, asNum(num), note || 'voice', 'voice');
    };

    $id('speechLang')?.addEventListener('change', (e) => {
      rec.lang = e.target.value;
      localStorage.setItem('speechLang', rec.lang);
    });

    micBtn.addEventListener('click', () => {
      try {
        rec.start();
      } catch (e) {
        if ($id('micStatus')) {
          $id('micStatus').textContent = '🎙️ не смог запустить: ' + e.message;
        }
      }
    });
  }


  // Settings
  $id('applySettings')?.addEventListener('click',()=>{
    localStorage.setItem('cashPLN',$id('cashPLN')?.value||"0");
    localStorage.setItem('penaltyPct',$id('penaltyPct')?.value||"0.05");
    localStorage.setItem('intervalMin',$id('intervalMin')?.value||"10");
    localStorage.setItem('rateEUR',$id('rateEUR')?.value||"4.30");
    localStorage.setItem('rateUSD',$id('rateUSD')?.value||"3.95");
    localStorage.setItem('blacklist',$id('blacklist')?.value||"");
    localStorage.setItem('autoCash', ($id('autoCash')?.checked?"1":"0"));
    $id('modeCash')&&( $id('modeCash').textContent = (localStorage.getItem('otd_lang')||'pl')==='ru' ? ("Режим: "+($id('autoCash')?.checked?"авто":"ручной")) : ("Mode: "+($id('autoCash')?.checked?"auto":"manual")) );
    render(); saveLocal(); scheduleAutosync(); pushState();
  })
  const themeSelect = $id('themeSelect');
  if(themeSelect){
    themeSelect.addEventListener('change', e=> applyTheme(e.target.value||'dark'));
  }
;
  $id('exportCfg')?.addEventListener('click',()=>{
    const cfg=stateKeys.reduce((m,k)=> (m[k]=localStorage.getItem(k),m),{});
    const blob=new Blob([JSON.stringify(cfg,null,2)],{type:"application/json"});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='onetapday_settings.json'; a.click();
  });
  $id('importCfg')?.addEventListener('change',async e=>{
    const f=e.target.files[0]; if(!f) return; const cfg=JSON.parse(await f.text());
    Object.entries(cfg).forEach(([k,v])=> localStorage.setItem(k, v));
    location.reload();
  });
  $id('clearAll')?.addEventListener('click',()=>{
    if(!confirm('Очистить локальную историю и настройки?')) return;
    ['kasa','tx_manual_import','bills_manual_import','accMeta'].forEach(k=> localStorage.removeItem(k));
    loadLocal(); inferAccounts(); render(); pushState();
  });

  // Demo/Sub controls
  $id('startDemo')?.addEventListener('click', ()=>{
    if (localStorage.getItem(DEMO_USED) === '1') {
      alert('Demo уже было использовано. Доступ только по подписке.');
      return;
    }
    localStorage.setItem(DEMO_START, new Date().toISOString());
    localStorage.setItem(DEMO_USED, '1');
    updateSubUI();
    gateAccess();
    // saveLocal триггерит sync в Firebase через saveLocal/pushState
  });

  $id('endDemo')?.addEventListener('click', ()=>{
    localStorage.removeItem(DEMO_START);
    // DEMO_USED не трогаем: демо уже использовано
    updateSubUI();
    gateAccess();
  });

  $id('payNow')?.addEventListener('click', async ()=>{
    try{
      const r = await fetch('/create-checkout-session', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        credentials:'include',
        body:JSON.stringify({ demo:true })
      });
      const j = await r.json();
      if(j?.url) { location.href=j.url; return; }
      alert('No Stripe URL from backend');
    }catch(e){ 
      alert('Stripe error: '+(e?.message||e)); 
    }
  });



  // INIT
  loadLocal(); loadKasa();
  $id('txUrl')&&( $id('txUrl').value = localStorage.getItem('txUrl')||"" );
  ['cashPLN','penaltyPct','intervalMin','rateEUR','rateUSD','blacklist'].forEach(k=>{ if($id(k)) $id(k).value = localStorage.getItem(k)|| $id(k).value || ""; });
  if($id('autoCash')) $id('autoCash').checked = localStorage.getItem('autoCash')==='1';
  if($id('speechLang') && localStorage.getItem('speechLang')) $id('speechLang').value = localStorage.getItem('speechLang');

  inferAccounts();
  applyLang(localStorage.getItem('otd_lang')||'pl');
  render();
  scheduleAutosync();

    // Remote pull once, then push snapshot
  (async () => {
    try {
      await pullState();
      loadLocal();
      inferAccounts();
      render();
      pushState();
      startCloudSync();
    } catch (e) {
      console.warn('remote pull error', e);
      loadLocal();
      inferAccounts();
      render();
      startCloudSync();
    }
  })();

  // Save on unload (sendBeacon fallback)
  window.addEventListener('beforeunload', ()=>{
    if(!REMOTE_OK) return;
    try{
      const email=localStorage.getItem(USER_KEY)||"";
      if(!email) return;
      const body={
        email,
        tx: JSON.parse(localStorage.getItem('tx_manual_import')||'[]'),
        bills: JSON.parse(localStorage.getItem('bills_manual_import')||'[]'),
        kasa: JSON.parse(localStorage.getItem('kasa')||'[]'),
        accMeta: JSON.parse(localStorage.getItem('accMeta')||'{}'),
        settings: stateKeys.reduce((m,k)=> (m[k]=localStorage.getItem(k), m), {})
      };
      const blob=new Blob([JSON.stringify(body)],{type:'application/json'});
      navigator.sendBeacon && navigator.sendBeacon(`${API_BASE}/state/save`, blob);
    }catch(e){}
  });
});
