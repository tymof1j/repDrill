export type Language = 'en' | 'uk';

export const LANGUAGE_STORAGE_KEY = 'repdrill-language';

export function normalizeLanguage(value: string | null | undefined): Language {
  return value === 'uk' ? 'uk' : 'en';
}

export const ukTranslations: Record<string, string> = {
  'RepDrill — Chess Opening Memory': 'RepDrill — памʼять шахових дебютів',
  'A self-hosted chess opening repertoire trainer for annotated lines, FSRS recall, and game review.':
    'Самохостинговий тренажер шахового дебютного репертуару для нотаток, FSRS-повторення та аналізу партій.',
  'Use cases': 'Сценарії',
  Workflow: 'Процес',
  Benefits: 'Переваги',
  Ownership: 'Контроль',
  'Close menu': 'Закрити меню',
  'Open menu': 'Відкрити меню',
  'Open library': 'Відкрити бібліотеку',
  'Start studying': 'Почати навчання',
  'See the workflow': 'Показати процес',
  'For opening prep that actually gets reviewed': 'Для дебютної підготовки, яку справді повторюють',
  'Turn every game into opening memory.': 'Перетворюй кожну партію на дебютну памʼять.',
  'RepDrill is a self-hosted chess trainer for players who keep repertoire files, forget move orders, and need a daily plan for what to repair next.':
    'RepDrill — самохостинговий шаховий тренажер для гравців, які ведуть файли репертуару, забувають порядок ходів і хочуть щоденний план, що саме лагодити далі.',
  'Import your theory': 'Імпортуй теорію',
  'Review due positions': 'Повторюй позиції на сьогодні',
  'Patch lines from real games': 'Латай лінії з реальних партій',
  Build: 'Збірка',
  Connect: 'Звʼязки',
  Review: 'Повторення',
  Repair: 'Ремонт',
  'Turn PGNs into study courses': 'Перетворюй PGN на навчальні курси',
  'Import opening files, split them into chapters, and keep the move order readable enough to maintain over time.':
    'Імпортуй дебютні файли, розділяй їх на розділи й зберігай порядок ходів достатньо читабельним для підтримки з часом.',
  'Merge transpositions automatically': 'Обʼєднуй транспозиції автоматично',
  'If two openings reach the same position, your note and review history belong to that position instead of one fragile line.':
    'Якщо два дебюти приходять в одну позицію, нотатка й історія повторень належать саме позиції, а не крихкій послідовності ходів.',
  'Train only what is due': 'Тренуй лише те, що вже час',
  'FSRS scheduling turns every answer into a next review date, so daily work stays compact and measurable.':
    'Планування FSRS перетворює кожну відповідь на дату наступного повторення, тому щоденна робота лишається компактною й вимірюваною.',
  'Analyze where games left the book': 'Аналізуй, де партії вийшли з книги',
  'Bring in recent online games and RepDrill marks the first move where your preparation stopped matching your repertoire.':
    'Імпортуй нещодавні онлайн-партії, а RepDrill позначить перший хід, де підготовка перестала збігатися з репертуаром.',
  'Planned use': 'Запланований сценарій',
  'One loop for building, remembering, and repairing prep.':
    'Один цикл для побудови, запамʼятовування й ремонту підготовки.',
  'Study starts from the game you just played.': 'Навчання починається з партії, яку ти щойно зіграв.',
  'The intended routine is simple: keep your opening files in RepDrill, train the lines that are due, then use online games to discover exactly which positions need attention.':
    'Рутина проста: тримай дебютні файли в RepDrill, тренуй лінії на сьогодні, а потім використовуй онлайн-партії, щоб точно знайти позиції, які потребують уваги.',
  'Why it matters': 'Чому це важливо',
  'The advantage is not more lines. It is knowing which line matters today.':
    'Перевага не в більшій кількості ліній. Перевага в тому, що ти знаєш, яка лінія важлива сьогодні.',
  'Keep the repertoire on your machine.': 'Тримай репертуар на своїй машині.',
  'RepDrill is open source and stores the library in SQLite. It is built for players who want a private training system, not another cloud account holding their prep.':
    'RepDrill має відкритий код і зберігає бібліотеку в SQLite. Він зроблений для гравців, яким потрібна приватна тренувальна система, а не ще один хмарний акаунт із підготовкою.',
  Import: 'Імпорт',
  'PGNs and chapters': 'PGN і розділи',
  '43 positions due': '43 позиції на сьогодні',
  'Move 12 left book': 'Хід 12 вийшов з книги',
  'Photo by Kaboompics.com on Pexels. The point is the real context: chess study beside a digital workspace.':
    'Фото Kaboompics.com на Pexels. Тут важливий реальний контекст: шахове навчання поруч із цифровим робочим простором.',
  'A player studying chess beside a laptop and wooden chess board':
    'Гравець вивчає шахи поруч із ноутбуком і деревʼяною шахівницею',
  'Import theory': 'Імпортуй теорію',
  'Bring in PGN chapters or add your own lines.': 'Додай розділи PGN або власні лінії.',
  'Attach notes to positions': 'Привʼязуй нотатки до позицій',
  'Plans and reminders stay with the board, even after transpositions.':
    'Плани й нагадування лишаються з дошкою навіть після транспозицій.',
  'Review what is due': 'Повторюй те, що настав час',
  'FSRS turns every answer into a next review date.': 'FSRS перетворює кожну відповідь на дату наступного повторення.',
  'Repair from real games': 'Латай з реальних партій',
  'Find the first move where your game left the repertoire.':
    'Знайди перший хід, де твоя партія вийшла з репертуару.',
  'Position-first memory': 'Памʼять від позиції',
  'Notes survive move-order changes and transpositions.': 'Нотатки переживають зміни порядку ходів і транспозиції.',
  'Smaller daily queue': 'Менша щоденна черга',
  'Review time is spent on weak lines, not everything you own.':
    'Час повторення йде на слабкі лінії, а не на все, що є в бібліотеці.',
  'Clear post-game repair': 'Чіткий ремонт після партії',
  'Every surprise in a real game becomes a concrete study task.':
    'Кожен сюрприз у реальній партії стає конкретним навчальним завданням.',
  'Self-hosted library': 'Самохостингова бібліотека',
  'Your repertoire lives with you: SQLite, exportable, open source.':
    'Твій репертуар живе з тобою: SQLite, експорт, відкритий код.',
  'Step 01': 'Крок 01',
  'Step 02': 'Крок 02',
  'Step 03': 'Крок 03',
  'Step 04': 'Крок 04',
  'PGN import': 'Імпорт PGN',
  'Queen pawn repertoire': 'Репертуар ферзевого пішака',
  '18 chapters': '18 розділів',
  '1,247 positions': '1 247 позицій',
  'Position note': 'Нотатка до позиції',
  'After ...g6, remember the pressure on d5. Same note appears in both Grunfeld move orders.':
    'Після ...g6 памʼятай про тиск на d5. Та сама нотатка зʼявляється в обох порядках ходів Ґрюнфельда.',
  "Today's queue": 'Черга на сьогодні',
  'Grunfeld sideline': 'Побічна лінія Ґрюнфельда',
  'Najdorf main line': 'Головна лінія Найдорфа',
  'Italian move order': 'Італійський порядок ходів',
  'due today': 'на сьогодні',
  'hard in 2d': 'важко через 2 дні',
  new: 'нове',
  'Game check': 'Перевірка партії',
  'Move 12': 'Хід 12',
  'First deviation found. Add this position to review.':
    'Знайдено перше відхилення. Додай цю позицію до повторення.',

  Courses: 'Курси',
  Repertoires: 'Репертуари',
  Train: 'Тренування',
  Analyze: 'Аналіз',
  Theory: 'Теорія',
  'Merged prep': 'Обʼєднана підготовка',
  'FSRS recall': 'FSRS-повторення',
  'Game review': 'Аналіз партій',
  Workspace: 'Робочий простір',
  'Opening memory': 'Памʼять дебютів',
  Settings: 'Settings',
  Morning: 'День',
  Evening: 'Ніч',
  Theme: 'Тема',
  'Switch to day': 'Перемкнути на день',
  'Switch to night': 'Перемкнути на ніч',
  'Switch to English': 'Перемкнути англійською',
  'Перемкнути українською': 'Перемкнути українською',
  'Skip to content': 'Перейти до вмісту',
  'Self-hosted repertoire trainer': 'Самохостинговий тренажер репертуару',
  Language: 'Мова',
  Saving: 'Збереження',
  Saved: 'Збережено',
  'Data & export': 'Дані та експорт',
  'Sign out': 'Вийти',
  'Sign in': 'Увійти',
  'Continue with Google': 'Продовжити з Google',
  'Self-hosted · Open source · AGPL-3': 'Самохостинг · Відкритий код · AGPL-3',
  'RepDrill ties your library to your account. Nothing leaves the host you run it on.':
    'RepDrill привʼязує бібліотеку до твого акаунта. Нічого не покидає хост, на якому ти це запускаєш.',
  'Your repertoire, ready to review.': 'Твій репертуар готовий до повторення.',
  'Open your courses, train due lines, and check recent games from one focused workspace.':
    'Відкривай курси, тренуй лінії на сьогодні й перевіряй нещодавні партії в одному робочому просторі.',
  Recall: 'Пригадування',
  Storage: 'Сховище',
  License: 'Ліцензія',
  Authentication: 'Автентифікація',
  'Configuration required': 'Потрібна конфігурація',
  'Set': 'Вкажи',
  'and': 'і',
  'in': 'у',
  'then restart the dev server.': 'потім перезапусти dev-сервер.',

  FAQ: 'FAQ',
  'Back to app': 'Назад у застосунок',
  Start: 'Старт',
  Topics: 'Теми',
  'Move notation': 'Нотація ходів',
  'Spaced repetition': 'Інтервальні повторення',
  'FSRS scheduler': 'Планувальник FSRS',
  'On this page': 'На цій сторінці',
  'Keyboard shortcuts': 'Гарячі клавіші',
  'FAQ topics': 'Теми FAQ',
  Keyboard: 'Клавіатура',
  Shortcuts: 'Гарячі клавіші',
  'Tree views': 'Дерева ходів',
  'Back and forward through the current line': 'Назад і вперед поточною лінією',
  'Cycle sibling branches': 'Перемикати сусідні гілки',
  'Jump to a numbered branch': 'Перейти до пронумерованої гілки',
  'Jump to the root or deepest known move': 'Перейти до кореня або найглибшого відомого ходу',
  'Show or hide branch arrows': 'Показати або сховати стрілки гілок',
  'Search annotations': 'Шукати нотатки',
  Training: 'Тренування',
  'Switch between board input and notation input when a prompt is waiting':
    'Перемкнути ввід дошкою та нотацією, коли очікується відповідь',
  'Submit the notation input': 'Надіслати ввід нотацією',
  'Read next': 'Читати далі',
  Input: 'Ввід',
  Method: 'Метод',
  Scheduler: 'Планувальник',
  'How RepDrill works': 'Як працює RepDrill',
  'The practical bits first: keyboard shortcuts, then short explainers on notation, spaced repetition, and the scheduler behind training.':
    'Спочатку практичне: гарячі клавіші, потім короткі пояснення нотації, інтервальних повторень і планувальника тренувань.',
  'The two notation styles the keyboard input accepts (SAN and Short), with the disambiguation rules and English-letter requirement.':
    'Два стилі нотації, які приймає клавіатурний ввід: SAN і Short, разом із правилами уточнення та вимогою англійських літер.',
  'How recall-with-spacing beats re-reading and bulk drilling for long-term retention of opening lines.':
    'Чому пригадування з інтервалами краще за перечитування й масове зазубрювання для довгого запамʼятовування дебютних ліній.',
  'What the Free Spaced Repetition Scheduler does differently from SM-2 (Anki), and why RepDrill uses it for line scheduling.':
    'Чим Free Spaced Repetition Scheduler відрізняється від SM-2 (Anki) і чому RepDrill використовує його для планування ліній.',
  'Why FSRS': 'Чому FSRS',
  'The job of a scheduler': 'Робота планувальника',
  'What SM-2 does': 'Що робить SM-2',
  'What FSRS does differently': 'Що FSRS робить інакше',
  'Why it fits opening prep': 'Чому це підходить для дебютної підготовки',
  'What RepDrill uses': 'Що використовує RepDrill',
  'Further reading': 'Додаткове читання',
  'If you want to read further': 'Якщо хочеш почитати далі',
  'Why spaced repetition': 'Чому інтервальні повторення',
  'The two effects': 'Два ефекти',
  'Why this matters for openings': 'Чому це важливо для дебютів',
  'What RepDrill does': 'Що робить RepDrill',
  'The two effects, briefly': 'Коротко про два ефекти',
  'What RepDrill does with this': 'Як RepDrill це використовує',
  'Standard Algebraic (SAN)': 'Стандартна алгебраїчна нотація (SAN)',
  'Standard Algebraic Notation (SAN)': 'Стандартна алгебраїчна нотація (SAN)',
  'Short Notation': 'Short Notation',
  'Conversion rule': 'Правило перетворення',
  'Invalid mixed forms': 'Некоректні змішані форми',
  'Valid forms': 'Коректні форми',
  Disambiguation: 'Уточнення',
  'English piece letters': 'Англійські літери фігур',
  Summary: 'Підсумок',
  'The keyboard input accepts two notation styles. Anything else — including mixed forms or non-English piece letters — will be rejected as an invalid move.':
    'Клавіатурний ввід приймає два стилі нотації. Усе інше, включно зі змішаними формами або неанглійськими літерами фігур, буде відхилено як некоректний хід.',
  'When you use the Notation input mode in training, your move must match exactly one of the two forms below. The validator does not guess intent — partial omissions are treated as invalid.':
    'Коли в тренуванні використовується режим нотації, хід має точно відповідати одній із двох форм нижче. Валідатор не вгадує намір: часткові пропуски вважаються помилкою.',
  'When you use the': 'Коли використовується режим',
  'input mode in training, your move must match exactly one of the two forms below. The validator does':
    'в тренуванні, хід має точно відповідати одній із двох форм нижче. Валідатор',
  not: 'не',
  'guess intent — partial omissions are treated as invalid.':
    'вгадує намір: часткові пропуски вважаються помилкою.',
  'The conventional notation used in books, databases, and tournament records.':
    'Звична нотація з книжок, баз даних і турнірних записів.',
  Examples: 'Приклади',
  Features: 'Ознаки',
  'x indicates a capture.': 'x позначає взяття.',
  'indicates a capture.': 'позначає взяття.',
  '+ indicates check.': '+ позначає шах.',
  'indicates check.': 'позначає шах.',
  '# indicates checkmate.': '# позначає мат.',
  'indicates checkmate.': 'позначає мат.',
  'The full destination square is always included.': 'Повне поле призначення завжди вказується.',
  'Standard SAN disambiguation rules apply when two or more identical pieces can move to the same square.':
    'Стандартні правила уточнення SAN застосовуються, коли дві або більше однакових фігур можуть піти на те саме поле.',
  'Disambiguation examples': 'Приклади уточнення',
  'A compact notation designed to reduce the number of characters.':
    'Компактна нотація, створена для зменшення кількості символів.',
  Rules: 'Правила',
  'x is omitted.': 'x пропускається.',
  'is omitted.': 'пропускається.',
  '+ and # are omitted.': '+ і # пропускаються.',
  'are omitted.': 'пропускаються.',
  'For pawn captures, only the origin and destination files are written.':
    'Для взяття пішаком записуються лише вертикалі початку й призначення.',
  'For all other moves, use the piece letter followed by the destination square.':
    'Для всіх інших ходів використовується літера фігури та поле призначення.',
  'SAN disambiguation rules are preserved exactly as in Standard Algebraic Notation.':
    'Правила уточнення SAN зберігаються точно як у стандартній алгебраїчній нотації.',
  'Standard SAN': 'Стандартна SAN',
  'Each move must be written in exactly one of two formats:':
    'Кожен хід має бути записаний рівно в одному з двох форматів:',
  'Standard Algebraic Notation (SAN) — includes all notation symbols.':
    'Стандартна алгебраїчна нотація (SAN) — містить усі символи нотації.',
  'Short Notation — omits x, +, and # together.':
    'Short Notation — одночасно пропускає x, + і #.',
  'Partial omission is not allowed.': 'Часткові пропуски не дозволені.',
  'Important note on disambiguation': 'Важлива примітка про уточнення',
  'This specification does not override standard SAN disambiguation rules. If two or more identical pieces can legally move to the same square, the move must include the required file, rank, or both. This requirement applies in both Standard Algebraic Notation and Short Notation.':
    'Ця специфікація не скасовує стандартні правила уточнення SAN. Якщо дві або більше однакових фігур легально можуть піти на те саме поле, хід має містити потрібну вертикаль, горизонталь або обидва уточнення. Це правило діє і для стандартної алгебраїчної нотації, і для Short Notation.',
  '— the knight from the b-file moves to d2.': '— кінь із вертикалі b ходить на d2.',
  '— the rook from rank 1 moves to e1.': '— тура з першої горизонталі ходить на e1.',
  '— when full disambiguation is required.': '— коли потрібне повне уточнення.',

  'FSRS — the Free Spaced Repetition Scheduler — is the algorithm that decides when to show each line again. RepDrill uses it instead of older schedulers like SM-2.':
    'FSRS — Free Spaced Repetition Scheduler — це алгоритм, який вирішує, коли знову показати кожну лінію. RepDrill використовує його замість старіших планувальників на кшталт SM-2.',
  'A spaced-repetition scheduler answers one question per card: given everything I know about how you\'ve recalled this card so far, when should I ask you again? Pick intervals too short and you waste your time on already-known cards. Pick them too long and you forget before the next review.':
    'Планувальник інтервальних повторень відповідає на одне питання для кожної картки: знаючи все про те, як ти пригадував її раніше, коли запитати знову? Надто короткі інтервали марнують час на вже відомі картки. Надто довгі — дають забути до наступного повторення.',
  'SM-2 (the algorithm at the heart of Anki by default) keeps an "ease factor" per card and multiplies the previous interval by it: get it right, the next interval scales up by the ease; get it wrong, the card resets and the ease drops. It\'s simple, fast, and good enough — but it doesn\'t actually model memory. It encodes a few rules of thumb.':
    'SM-2 (алгоритм, який за замовчуванням лежить в основі Anki) зберігає для кожної картки «ease factor» і множить на нього попередній інтервал: відповів правильно — інтервал росте; помилився — картка скидається, а ease падає. Це просто, швидко й непогано, але насправді не моделює памʼять. Це набір практичних правил.',
  'The result is famous: Anki users hit "ease hell," where stubborn cards keep coming back too often, and easy cards stretch out faster than retention can support.':
    'Результат відомий: користувачі Anki потрапляють в «ease hell», де вперті картки повертаються надто часто, а легкі розтягуються швидше, ніж це підтримує запамʼятовування.',
  'It fits a memory model.': 'Він підганяє модель памʼяті.',
  'It targets a retention rate, not an ease multiplier.': 'Він цілиться в рівень утримання, а не в множник ease.',
  'It learns from your data.': 'Він навчається на твоїх даних.',
  'Same interface, better intervals.': 'Той самий інтерфейс, кращі інтервали.',
  'Opening lines have very uneven difficulty: a forced 8-move tactic and a long quiet equalizing line look the same to SM-2 once they\'re both in "mature" status. FSRS\'s per-card stability handles that better — long lines settle into longer intervals when you actually remember them, and shorter ones don\'t get stretched past what you can recall under tournament pressure.':
    'Дебютні лінії дуже нерівні за складністю: форсована 8-ходова тактика й довга тиха лінія на зрівняння виглядають для SM-2 однаково, щойно обидві стають «зрілими». Стабільність кожної картки у FSRS справляється з цим краще: довгі лінії отримують довші інтервали, коли ти справді їх памʼятаєш, а коротші не розтягуються далі, ніж ти можеш пригадати під турнірним тиском.',
  'RepDrill schedules every line as a card via the ts-fsrs implementation, with default parameters tuned for typical study patterns. As your review history grows, we\'ll add a way to retrain the parameters against your data for sharper intervals.':
    'RepDrill планує кожну лінію як картку через реалізацію ts-fsrs із типовими параметрами для звичних патернів навчання. Коли історія повторень виросте, ми додамо перенавчання параметрів на твоїх даних для точніших інтервалів.',

  'The two cheapest things you can do to remember an opening line are testing yourself on it and spacing the tests out. Spaced repetition is just both, automated.':
    'Дві найдешевші речі для запамʼятовування дебютної лінії — перевіряти себе й розносити ці перевірки в часі. Інтервальні повторення — це просто обидві речі, автоматизовані.',
  'Two findings dominate the cognitive-science literature on durable learning:':
    'У літературі когнітивної науки про довге навчання домінують два висновки:',
  'Testing effect.': 'Ефект тестування.',
  'Spacing effect.': 'Ефект інтервалів.',
  'Together they imply a counter-intuitive rule: study a line just before you would have forgotten it. A correct recall at the edge of forgetting is worth multiple easy repetitions in a single sitting.':
    'Разом вони дають контрінтуїтивне правило: вивчай лінію саме перед тим, як мав би її забути. Правильне пригадування на межі забування варте кількох легких повторень за один підхід.',
  'Opening prep has the worst possible memory profile: long branches, low natural exposure, high cost of forgetting on move 12. Re-reading PGNs feels productive — you recognize the moves — but recognition isn\'t recall. The first time you\'re on the clock against a real opponent, you discover the difference.':
    'Дебютна підготовка має майже найгірший профіль для памʼяті: довгі гілки, мало природних повторів, висока ціна забування на 12-му ході. Перечитувати PGN здається продуктивним, бо ти впізнаєш ходи, але впізнавання — не пригадування. Різницю відчуваєш уперше, коли сидиш на годиннику проти реального суперника.',
  'Spaced repetition replaces "I\'ll go over my Najdorf this weekend" with a queue that surfaces exactly the lines that are about to fade. You spend the same hour and learn three times as much line.':
    'Інтервальні повторення замінюють «на вихідних перегляну Найдорфа» чергою, яка піднімає саме ті лінії, що скоро згаснуть. Ти витрачаєш ту саму годину, але вчиш утричі більше корисного.',
  'Every drilled line is a card. Each correct/incorrect attempt updates that card\'s next-review date.':
    'Кожна натренована лінія — це картка. Кожна правильна або неправильна спроба оновлює дату наступного повторення.',
  'Lines you nail get pushed further out; lines you stumble on come back sooner. You don\'t pick what to study — the queue does.':
    'Лінії, які ти знаєш добре, відсуваються далі; лінії, на яких спотикаєшся, повертаються швидше. Ти не вибираєш, що вчити, це робить черга.',
  'The scheduler is FSRS, which adapts the interval per card based on your actual recall pattern, not a fixed multiplier.':
    'Планувальник — FSRS, який адаптує інтервал кожної картки за твоїм реальним патерном пригадування, а не за фіксованим множником.',

  Library: 'Бібліотека',
  'The library.': 'Бібліотека.',
  'Bound volumes.': 'Звʼязані томи.',
  'The post-mortem.': 'Розбір після партії.',
  'The queue is quiet.': 'Черга тиха.',
  'Part I — Courses': 'Частина I — Курси',
  'Part II — Repertoires': 'Частина II — Репертуари',
  'Part III — Training': 'Частина III — Тренування',
  'Part IV — Analysis': 'Частина IV — Аналіз',
  'One course is one body of opening theory for one color — a self-contained chapter of preparation, like \'My Grünfeld\' or \'Sicilian as Black\'.':
    'Один курс — це один корпус дебютної теорії за один колір: самодостатній розділ підготовки, наприклад «Мій Ґрюнфельд» або «Сициліанка чорними».',
  'Training queue · today': 'Тренувальна черга · сьогодні',
  'Train now': 'Тренувати зараз',
  'Due lines': 'Лінії на сьогодні',
  'New lines': 'Нові лінії',
  'Total lines': 'Усього ліній',
  'awaiting recall': 'очікують пригадування',
  'none scheduled': 'нічого не заплановано',
  'never seen': 'ще не бачені',
  'across all courses': 'по всіх курсах',
  'Title, color, or note…': 'Назва, колір або нотатка…',
  'BLACK': 'ЧОРНІ',
  Black: 'Чорні',
  White: 'Білі',
  'Combine courses across colors into a single preparation map. When two courses overlap on the same position, choose which line wins.':
    'Обʼєднуй курси за різні кольори в одну карту підготовки. Коли два курси перетинаються в одній позиції, вибери, яка лінія головна.',
  'No repertoires bound yet. Create one and add courses to combine your prep into a single, conflict-resolved map.':
    'Репертуарів ще немає. Створи один і додай курси, щоб обʼєднати підготовку в одну карту без конфліктів.',
  'Find the move where preparation became improvisation. Pull recent online games and let RepDrill mark each departure from the book.':
    'Знайди хід, де підготовка стала імпровізацією. Завантаж нещодавні онлайн-партії, і RepDrill позначить кожен вихід із книги.',
  'Connect a Lichess or Chess.com account first.': 'Спочатку підʼєднай акаунт Lichess або Chess.com.',
  'Add a username →': 'Додати імʼя користувача →',
  'Nothing is due right now. The scheduler will surface lines when memory has had time to fade.':
    'Зараз нічого не заплановано. Планувальник покаже лінії, коли памʼять встигне трохи згаснути.',
  'Back to library': 'Назад до бібліотеки',
  Due: 'На сьогодні',
  New: 'Нові',
  'Import a PGN into a course to begin generating review lines. RepDrill will then schedule each one against the curve of forgetting.':
    'Імпортуй PGN у курс, щоб почати створювати лінії для повторення. RepDrill запланує кожну за кривою забування.',
  'Come back when the schedule asks for recall — or import more theory now.':
    'Повернись, коли розклад попросить пригадування, або імпортуй більше теорії зараз.',
  'New course': 'Новий курс',
  'Course library': 'Бібліотека курсів',
  'Create course': 'Створити курс',
  'New repertoire': 'Новий репертуар',
  'Create repertoire': 'Створити репертуар',
  'Import PGN': 'Імпортувати PGN',
  Save: 'Зберегти',
  Cancel: 'Скасувати',
  Edit: 'Редагувати',
  Delete: 'Видалити',
  Search: 'Пошук',
  'No courses yet': 'Курсів ще немає',
  'No repertoires yet': 'Репертуарів ще немає',
  'Start training': 'Почати тренування',
  Again: 'Знову',
  Hard: 'Важко',
  Good: 'Добре',
  Easy: 'Легко',
  'No cards due': 'Немає карток на сьогодні',
  'Lichess username': 'Імʼя користувача Lichess',
  'Chess.com username': 'Імʼя користувача Chess.com',
  'Interface language': 'Мова інтерфейсу',
  Accounts: 'Акаунти',
  Preferences: 'Налаштування',
  'Export': 'Експорт',
};
