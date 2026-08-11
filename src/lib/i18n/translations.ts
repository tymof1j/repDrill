export type Language = 'en' | 'uk';

// i18n rule for contributors:
// Whenever a new English UI string is added to the product, add its Ukrainian
// translation to `ukTranslations` in the same change.

export const LANGUAGE_STORAGE_KEY = 'repdrill-language';

export function normalizeLanguage(value: string | null | undefined): Language {
  return value === 'uk' ? 'uk' : 'en';
}

export const ukTranslations: Record<string, string> = {
  'How it helps': 'Як це допомагає',
  'Books to puzzles': 'Книги у задачі',
  'Your routine': 'Твій ритм',
  'Chess study that comes back when you need it': 'Шахи, до яких повертаєшся',
  'Stop collecting.': 'Не накопичуй.',
  'Start remembering.': 'Памʼятай.',
  'RepDrill turns the positions you care about into focused practice — so your books, openings, and game lessons show up over the board.':
    'RepDrill перетворює важливі позиції на тренування — з книг, дебютів і партій.',
  'Build my training library': 'Створити бібліотеку',
  'See how it fits your study': 'Як це працює в навчанні',
  'Begin with one course. No new study system to learn.': 'Почни з одного курсу. Без нової системи.',
  'Today’s position': 'Позиція на сьогодні',
  'Find White’s strongest move': 'Знайди найсильніший хід білих',
  'from your book': 'з твоєї книги',
  Source: 'Джерело',
  Context: 'Контекст',
  'Made for the way players actually study': 'Створено під те, як шахісти справді навчаються',
  'Your chess material should become moves you can find.': 'Твої шахові матеріали мають стати ходами, які ти знаходиш.',
  'Turn good material into practice': 'Перетвори хороші матеріали на практику',
  'Keep the positions worth remembering from books, courses, and coach files — then solve them instead of letting them disappear into a folder.':
    'Зберігай варті запамʼятовування позиції з книг, курсів і файлів тренера — і розвʼязуй їх, замість ховати в папці.',
  'Remember your openings in real games': 'Памʼятай дебюти в реальних партіях',
  'Train the exact decisions you need to make. RepDrill brings weak positions back before your memory drops them.':
    'Тренуй саме ті рішення, які доведеться приймати. RepDrill повертає слабкі позиції до того, як ти їх забудеш.',
  'Learn from every surprise': 'Навчайся з кожного сюрпризу',
  'After a game, find where you left familiar territory and turn that moment into tomorrow’s training.':
    'Після партії знайди момент виходу зі знайомої позиції й перетвори його на завтрашнє тренування.',
  'New · Book puzzle courses': 'Нове · Курси задач із книг',
  'A great chess book is only useful if you do the work.': 'Сильна шахова книга працює лише тоді, коли працюєш ти.',
  'RepDrill keeps each diagram together with the players, event, year, and author’s explanation. You see the position first. The answer stays hidden until you commit to a move.':
    'RepDrill зберігає кожну діаграму разом із гравцями, подією, роком і поясненням автора. Спершу ти бачиш позицію. Відповідь залишається прихованою, доки ти не зробиш хід.',
  'Build a puzzle course from your book': 'Створи курс задач зі своєї книги',
  'Your favourite tactics book': 'Твоя улюблена книга задач',
  'Add your own positions · solve them online · review them when due':
    'Додай власні позиції · розвʼязуй їх онлайн · повертайся до них у потрібний час',
  'your material': 'твої матеріали',
  'A study routine you can keep': 'Навчальний ритм, якого легко дотримуватися',
  'Less deciding what to study. More finding the move.': 'Менше вибору, що вчити. Більше пошуку ходу.',
  'Bring one useful source': 'Додай одне корисне джерело',
  'A puzzle book, an opening file, or a game you just played.': 'Книгу задач, дебютний файл або щойно зіграну партію.',
  'Solve, don’t reread': 'Розвʼязуй, а не перечитуй',
  'Make the move on the board before you see the answer.': 'Зроби хід на дошці до того, як побачиш відповідь.',
  'Return at the right time': 'Повертайся вчасно',
  'Short reviews keep important positions available when a real game asks for them.':
    'Короткі повторення тримають важливі позиції напоготові до реальної партії.',
  'Make your next study session count.': 'Нехай наступне тренування має значення.',
  'Start with the chess material you already trust.': 'Почни з матеріалів, яким уже довіряєш.',
  'Your training library': 'Твоя бібліотека тренувань',
  'Choose what to train.': 'Обери, що тренувати.',
  'Open a puzzle course to solve positions, or a theory course to learn and remember your opening lines.':
    'Відкрий курс задач, щоб розвʼязувати позиції, або курс теорії, щоб вивчати й памʼятати дебютні лінії.',
  'Puzzle course · Complete book': 'Курс задач · Повна книга',
  'Start solving': 'Почати розвʼязувати',
  'book positions': 'позицій із книги',
  'interactive solutions': 'інтерактивних рішень',
  'games represented': 'роки представлених партій',
  'Every position keeps its players, event, year, book page, and original explanation.':
    'Кожна позиція зберігає гравців, подію, рік, сторінку книги й оригінальне пояснення.',
  'Build speed and pattern recognition with compact combinations.':
    'Розвивай швидкість і розпізнавання патернів на компактних комбінаціях.',
  'Calculate deeper positions where the first move is less obvious.':
    'Розраховуй глибші позиції, де перший хід менш очевидний.',
  'Longer, demanding combinations selected for serious calculation work.':
    'Довші й складніші комбінації для серйозної роботи над розрахунком.',
  'Open set': 'Відкрити набір',
  'Course overview': 'Огляд курсу',
  'Puzzle mode': 'Режим задач',
  solved: 'розвʼязано',
  'White to move': 'Хід білих',
  'Black to move': 'Хід чорних',
  Random: 'Випадкова',
  'From the game': 'З партії',
  'That move misses the idea. The position is reset — calculate once more.':
    'Цей хід не знаходить ідею. Позицію відновлено — порахуй ще раз.',
  'Incorrect move · Added to missed · Retry, analyse, or check source.':
    'Хибний хід · Додано до пропущених · Повтори, проаналізуй або відкрий джерело.',
  'The book explanation is available, but this line could not be converted into a fully legal interactive sequence.':
    'Пояснення з книги доступне, але цю лінію не вдалося перетворити на повністю легальну інтерактивну послідовність.',
  Solved: 'Розвʼязано',
  'Solution revealed': 'Рішення відкрито',
  'Next position': 'Наступна позиція',
  'Find the strongest move and play it on the board. RepDrill will answer with the book line.':
    'Знайди найсильніший хід і зроби його на дошці. RepDrill відповість лінією з книги.',
  'Show solution': 'Показати рішення',
  '← Previous': '← Попередня',
  'Next →': 'Наступна →',
  'RepDrill — Chess Opening Memory': 'RepDrill — памʼять шахових дебютів',
  'A self-hosted chess opening repertoire trainer for annotated lines, FSRS recall, and game review.':
    'Самохостинговий тренажер шахового дебютного репертуару для нотаток, FSRS-повторення та аналізу партій.',
  'Use cases': 'Сценарії',
  Platform: 'Платформа',
  Workflow: 'Процес',
  Benefits: 'Переваги',
  Compare: 'Порівняння',
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
  'RepDrill is a Convex-backed chess trainer for players who keep repertoire files, forget move orders, and need a daily plan for what to repair next.':
    'RepDrill — шаховий тренажер на Convex для гравців, які ведуть файли репертуару, забувають порядок ходів і хочуть щоденний план, що саме лагодити далі.',
  'Import your theory': 'Імпортуй теорію',
  'Review due positions': 'Повторюй позиції на сьогодні',
  'Patch lines from real games': 'Латай лінії з реальних партій',
  'Chess flashcards': 'Шахові флешкартки',
  'How to start': 'Як почати',
  'How to start?': 'Як почати?',
  'From resource to chess flashcards.': 'Від ресурсу до шахових флешкарток.',
  'Select a good resource': 'Обери хороший ресурс',
  'Book, course, coach file, or line.': 'Книга, курс, файл тренера або лінія.',
  'Pick a book, course, coach file, or opening line you actually want to remember.':
    'Обери книгу, курс, файл тренера або дебютну лінію, яку справді хочеш запамʼятати.',
  'Create or download PGN': 'Створи або завантаж PGN',
  'Keep chapters and model lines clean.': 'Чисті розділи й модельні лінії.',
  'Turn the resource into a clean PGN with chapters, comments, or model lines.':
    'Перетвори ресурс на чистий PGN із розділами, коментарями або модельними лініями.',
  'Log in to RepDrill': 'Увійди в RepDrill',
  'Open your synced web workspace.': 'Відкрий синхронізований простір.',
  'Open the web platform and keep your opening workspace synced.':
    'Відкрий вебплатформу й тримай дебютний робочий простір синхронізованим.',
  'Check the tree and position notes.': 'Перевір дерево й нотатки.',
  'Upload the file, review the move tree, and keep notes attached to positions.':
    'Завантаж файл, переглянь дерево ходів і залишай нотатки привʼязаними до позицій.',
  'Train chess flashcards': 'Тренуй шахові флешкартки',
  'Review today’s due positions.': 'Повторюй позиції на сьогодні.',
  'Let RepDrill serve the positions due today until the line sticks.':
    'Дозволь RepDrill показувати позиції на сьогодні, доки лінія не закріпиться.',
  'Short review': 'Відгук',
  'Review note': 'Відгук',
  'Like Anki flashcards, but for chess.': 'Як флешкартки Anki, але для шахів.',
  '“Like Anki flashcards, but for chess.”': '«Як флешкартки Anki, але для шахів.»',
  'You answer with moves instead of text. RepDrill schedules the next review, so opening knowledge comes back before it fades.':
    'Ти відповідаєш ходами, а не текстом. RepDrill планує наступне повторення, тому дебютні знання повертаються до того, як зникнуть.',
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
    'Побудова, памʼять і ремонт дебютів.',
  'Web platform': 'Вебплатформа',
  'Everything around the board stays connected.': 'Усе навколо дошки працює як одна система.',
  'RepDrill is not a static course reader. It is a workspace for building theory, merging transpositions, scheduling recall, checking online games, and sharing the exact positions that matter.':
    'RepDrill — не статична читалка курсів. Це робочий простір для побудови теорії, обʼєднання транспозицій, планування повторень, перевірки онлайн-партій і поширення саме тих позицій, які мають значення.',
  'Keep opening files maintainable': 'Тримай дебютні файли придатними до підтримки',
  'Build named courses from PGN chapters or manual lines. Each chapter remains a navigable move tree with inline annotations, branch controls, and readable line paths.':
    'Створюй іменовані курси з PGN-розділів або власних ліній. Кожен розділ лишається навігаційним деревом ходів із нотатками, керуванням гілками й читабельними шляхами.',
  'Chapter trees': 'Дерева розділів',
  'Inline notes': 'Нотатки в лінії',
  'Merge courses into one book': 'Обʼєднуй курси в одну книгу',
  'Combine several courses into a single repertoire view. When move orders overlap, RepDrill works from the board position, so transpositions do not split your memory.':
    'Поєднуй кілька курсів в один вигляд репертуару. Коли порядки ходів перетинаються, RepDrill працює від позиції на дошці, тож транспозиції не розбивають памʼять.',
  'Merged tree': 'Обʼєднане дерево',
  'Side filter': 'Фільтр сторони',
  'Preferred choices': 'Обрані варіанти',
  'Drill due positions instead of whole files': 'Тренуй позиції на сьогодні, а не цілі файли',
  'The FSRS scheduler tracks stability and difficulty for review cards, then serves the positions that need recall today. Opponent moves play automatically.':
    'Планувальник FSRS відстежує стабільність і складність карток, а потім дає позиції, які треба пригадати сьогодні. Ходи суперника програються автоматично.',
  'FSRS queue': 'Черга FSRS',
  'Board input': 'Ввід дошкою',
  'SAN input': 'Ввід SAN',
  'Repair prep from real games': 'Лагодь підготовку з реальних партій',
  'Connect Lichess or Chess.com, pull recent games, and jump to the first move where the game left your repertoire. Save annotations per ply and convert gaps into study work.':
    'Підключай Lichess або Chess.com, завантажуй останні партії й переходь до першого ходу, де партія вийшла з репертуару. Зберігай нотатки до кожного напівходу й перетворюй прогалини на навчання.',
  'Deviation finder': 'Пошук відхилень',
  'PGN navigation': 'Навігація PGN',
  'Game notes': 'Нотатки партії',
  Sharing: 'Поширення',
  'Send useful prep, not screenshots': 'Надсилай корисну підготовку, а не скріншоти',
  'Share a full course, one chapter, a single line, a merged repertoire, or an analyzed game with read-only or copy access through a public link or email invite.':
    'Поширюй повний курс, один розділ, окрему лінію, обʼєднаний репертуар або проаналізовану партію з правами перегляду чи копіювання через публічне посилання або email-запрошення.',
  'Share links': 'Посилання',
  'Copy access': 'Доступ до копіювання',
  'Read-only analysis': 'Аналіз лише для читання',
  'Sync without trapping the library': 'Синхронізуй без пастки для бібліотеки',
  'Convex keeps the workspace reactive while PGN and JSON exports keep your repertoire portable. Notes, review history, and shared resources stay organized around positions.':
    'Convex робить робочий простір реактивним, а експорт PGN і JSON зберігає репертуар переносимим. Нотатки, історія повторень і спільні матеріали організовані навколо позицій.',
  'Real-time sync': 'Синхронізація',
  'JSON archive': 'JSON-архів',
  'PGN import behavior': 'Поведінка імпорту PGN',
  'PGN naming & info-only mode': 'Іменування PGN і режим info-only',
  'How chapter names are chosen, how info-only lines are auto-detected, and how manual info-only overrides affect Learn vs FSRS.':
    'Як обираються назви розділів, як авто-визначаються info-only лінії, і як ручні перемикачі info-only впливають на Learn та FSRS.',
  'How chapter names are chosen, how info-only lines are auto-detected, and how Learn/review selects and orders lines (including post-import chapter reorder behavior).':
    'Як обираються назви розділів, як авто-визначаються info-only лінії, і як Learn/review відбирає та впорядковує лінії (включно з поведінкою після перестановки розділів після імпорту).',
  'Order of lines in Learn mode': 'Порядок ліній у режимі Learn',
  'Exactly how Learn/review selects lines, sorts due vs new work, and when chapter reorder is used as a tie-breaker.':
    'Точно як Learn/review відбирає лінії, сортує роботу due проти new і коли перестановка розділів використовується як тай-брейк.',
  'PGN naming and info-only mode': 'Іменування PGN і режим info-only',
  'Learn line order': 'Порядок ліній Learn',
  'Learn order': 'Порядок Learn',
  'What is the order of lines in Learn mode?': 'Який порядок ліній у режимі Learn?',
  'How lines are selected': 'Як відбираються лінії',
  'How lines are ordered': 'Як впорядковуються лінії',
  'Post-import chapter reorder rule': 'Правило перестановки розділів після імпорту',
  'Practical notes': 'Практичні нотатки',
  'Learn/review is urgency-first. RepDrill picks actionable lines first, then sorts them by recall priority.':
    'У Learn/review пріоритет надається терміновості. RepDrill спочатку бере лінії, з якими треба працювати зараз, а потім сортує їх за пріоритетом повторення.',
  'Hide already-viewed info-only lines on future Learn sessions for that user.':
    'Вже переглянуті info-only лінії ховаються в наступних сесіях Learn для цього користувача.',
  'If you reorder chapters within 10 minutes after importing a course, Learn/review uses that chapter order as a tie-breaker when urgency is equal. This is most noticeable when many lines are still new.':
    'Якщо переставити розділи протягом 10 хвилин після імпорту курсу, Learn/review використовує цей порядок розділів як тай-брейк, коли терміновість однакова. Це найпомітніше, коли багато ліній ще нові.',
  'Learn order is not a pure table-of-contents order by default.':
    'Порядок Learn за замовчуванням не є чистим порядком змісту.',
  'FSRS urgency still dominates chapter order whenever due/new priority differs.':
    'Терміновість FSRS все одно має вищий пріоритет за порядок розділів, коли відрізняється пріоритет due/new.',
  'The import-behavior FAQ also documents this rule from the import perspective.':
    'FAQ про поведінку імпорту також описує це правило з боку імпорту.',
  'How chapter names are chosen during PGN import, detects info-only content, and handles info-only lines in Learn.':
    'Як під час імпорту PGN обираються назви розділів, як визначається info-only контент і як обробляються info-only лінії в Learn.',
  'Chapter naming': 'Іменування розділів',
  'Info-only detection': 'Визначення info-only',
  'How info-only differs': 'Чим відрізняється info-only',
  'Learn/review line order': 'Порядок ліній у Learn/review',
  'Manual override': 'Ручне перевизначення',
  'This page explains exactly how chapter names are chosen during PGN import and how info-only chapters/lines behave in viewer and Learn flows.':
    'Ця сторінка точно пояснює, як обираються назви розділів під час імпорту PGN і як info-only розділи/лінії поводяться у viewer та Learn.',
  'Use ChapterName PGN header if present and not ?.': 'Використати заголовок PGN ChapterName, якщо він є і не дорівнює ?.',
  'Otherwise use Event PGN header if present and not ?.': 'Інакше використати заголовок PGN Event, якщо він є і не дорівнює ?.',
  'Otherwise use White PGN header if present and not ?.': 'Інакше використати заголовок PGN White, якщо він є і не дорівнює ?.',
  'Otherwise, for single-file upload, use uploaded filename without extension (for example All Lines in One File.pgn → All Lines in One File).':
    'Інакше, для завантаження одного файлу, використати назву файлу без розширення (наприклад All Lines in One File.pgn → All Lines in One File).',
  'If none of the above are available, fallback to Chapter N.':
    'Якщо нічого з цього немає, запасний варіант — Chapter N.',
  'RepDrill auto-marks imported content as info-only if it sees any of these keywords:':
    'RepDrill автоматично позначає імпортований контент як info-only, якщо бачить будь-яке з ключових слів:',
  'Detection checks: uploaded filename, PGN headers, and PGN comments.':
    'Перевірка виконується за: назвою завантаженого файлу, заголовками PGN та коментарями PGN.',
  'Visible in course viewer and repertoire viewer like normal lines.':
    'Видимі у перегляді курсу та репертуару як звичайні лінії.',
  'Included in Learn as a one-time view item.':
    'Показуються в Learn як одноразовий елемент для перегляду.',
  'Not scheduled with FSRS (no memorization queue behavior).':
    'Не плануються через FSRS (без поведінки черги запамʼятовування).',
  'After Learn shows it once, it is marked viewed for that user and hidden next time.':
    'Після одного показу в Learn позначаються як переглянуті для цього користувача і наступного разу ховаються.',
  'In course detail you can manually toggle both chapter and individual lines between training and info-only. Use this when auto-detection is not what you want.':
    'У деталях курсу можна вручну перемикати і розділ, і окремі лінії між training та info-only. Використовуйте це, коли авто-визначення не підходить.',
  'In Learn mode, RepDrill first selects lines that are actionable now, then orders them.':
    'У режимі Learn RepDrill спочатку відбирає лінії, з якими потрібно працювати зараз, а потім впорядковує їх.',
  'Include training lines that are due now or contain at least one new card.':
    'Включаються training-лінії, які вже на часі, або містять принаймні одну нову картку.',
  'Include info-only lines as one-time view items (until viewed once).':
    'Включаються info-only лінії як одноразові елементи перегляду (до першого перегляду).',
  'Sort non-new lines before new lines.':
    'Спочатку сортуються не-нові лінії, потім нові.',
  'Inside each group, sort by due-count descending (more overdue cards first).':
    'Усередині кожної групи сортування йде за спаданням due-count (більш прострочені картки першими).',
  'Special import rule: if you reorder chapters within 10 minutes after importing a course, tie-cases in Learn/review respect that chapter order (instead of fallback traversal order). This is most noticeable when many lines are still new.':
    'Спеціальне правило імпорту: якщо ти переставиш розділи протягом 10 хвилин після імпорту курсу, у випадках нічиєї в Learn/review буде враховано цей порядок розділів (замість запасного порядку обходу). Найпомітніше це, коли багато ліній ще нові.',
  'Study starts from the game you just played.': 'Навчання починається з партії, яку ти щойно зіграв.',
  'The intended routine is simple: keep your opening files in RepDrill, train the lines that are due, then use online games to discover exactly which positions need attention.':
    'Рутина проста: тримай дебютні файли в RepDrill, тренуй лінії на сьогодні, а потім використовуй онлайн-партії, щоб точно знайти позиції, які потребують уваги.',
  'Why it matters': 'Чому це важливо',
  'The advantage is not more lines. It is knowing which line matters today.':
    'Перевага не в більшій кількості ліній. Перевага в тому, що ти знаєш, яка лінія важлива сьогодні.',
  'Portable by design': 'Портативність у задумі',
  'Your prep is stored in Convex and can leave anytime as PGN or a full JSON archive.':
    'Підготовка зберігається в Convex і може будь-коли вийти як PGN або повний JSON-архів.',
  'Own the repertoire, even when it syncs.': 'Контролюй репертуар, навіть коли він синхронізується.',
  'RepDrill stores your library in Convex for sync and deployment, while keeping exits wide open: export single courses as PGN or download the full archive as JSON.':
    'RepDrill зберігає бібліотеку в Convex для синхронізації й деплою, але залишає виходи відкритими: експортуй окремі курси як PGN або завантажуй повний архів JSON.',
  'Feature comparison': 'Порівняння можливостей',
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
  Step: 'Крок',
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
  'Platform choice': 'Вибір платформи',
  'RepDrill is compared with Chessable courses and Lichess Study across the opening-prep work people repeat every week.':
    'RepDrill порівнюється з курсами Chessable і Lichess Study за тими задачами дебютної підготовки, які гравці повторюють щотижня.',
  'Comparison features': 'Можливості',
  Focused: 'Фокус',
  'Chessable courses': 'Курси Chessable',
  'Lichess Study': 'Lichess Study',
  'Core study': 'Базове навчання',
  'Build private opening courses': 'Створення приватних дебютних курсів',
  'Create and maintain your own private opening library, not only consume published material.':
    'Створюй і підтримуй власну приватну дебютну бібліотеку, а не лише споживай опубліковані матеріали.',
  Yes: 'Так',
  'Mostly consume published courses': 'Переважно готові опубліковані курси',
  'Import and maintain PGN chapters': 'Імпорт і підтримка PGN-розділів',
  'Bring PGN files into named chapters and keep them editable over time.':
    'Імпортуй PGN-файли в іменовані розділи й залишай їх редагованими з часом.',
  'Limited by course format': 'Обмежено форматом курсу',
  'Inline position notes': 'Нотатки до позицій',
  'Attach reminders and plans directly to positions in the move tree.':
    'Привʼязуй нагадування й плани безпосередньо до позицій у дереві ходів.',
  'Position notes': 'Нотатки',
  'Yes, attached to positions': 'Так, привʼязані до позицій',
  'Course-dependent': 'Залежить від курсу',
  'Manual move-tree study': 'Ручне навчання з дерева ходів',
  'Browse branches, variations, and move paths without entering drill mode.':
    'Переглядай гілки, варіанти й шляхи ходів без переходу в режим тренування.',
  'Keyboard-first workflow': 'Робота з клавіатури',
  'Use shortcuts for navigation and review without relying on mouse-heavy flows.':
    'Використовуй гарячі клавіші для навігації й повторення без залежності від миші.',
  Limited: 'Обмежено',
  'Memory and scheduling': 'Памʼять і планування',
  'Automatically schedules reviews so lines return when memory is likely to fade.':
    'Автоматично планує повторення так, щоб лінії повертались тоді, коли памʼять починає слабшати.',
  FSRS: 'FSRS',
  MoveTrainer: 'MoveTrainer',
  'MoveTrainer style reviews': 'Повторення у стилі MoveTrainer',
  'No built-in SRS': 'Немає вбудованого SRS',
  'Daily due queue': 'Щоденна черга',
  'Shows the study work due today instead of asking you to choose manually.':
    'Показує навчальну роботу на сьогодні замість ручного вибору.',
  'Yes, position cards': 'Так, картки позицій',
  'Yes, course reviews': 'Так, повторення курсів',
  No: 'Ні',
  'Adaptive difficulty': 'Адаптивна складність',
  'Updates future intervals from how well you answered each review.':
    'Оновлює майбутні інтервали залежно від якості відповіді на кожному повторенні.',
  'Per-card': 'По картках',
  'Stability and difficulty per card': 'Стабільність і складність для кожної картки',
  Proprietary: 'Закритий алгоритм',
  'Review only weak positions': 'Повторення лише слабких позицій',
  'Keeps daily work focused on positions that need recall.':
    'Тримає щоденну роботу сфокусованою на позиціях, які потрібно пригадати.',
  Partly: 'Частково',
  'Avoid replaying whole files': 'Без перегравання цілих файлів',
  'Lets you study weak points without replaying every variation in a course.':
    'Дає вчити слабкі місця без перегравання кожного варіанту в курсі.',
  'Depends on course settings': 'Залежить від налаштувань курсу',
  'Manual only': 'Лише вручну',
  'Repertoire structure': 'Структура репертуару',
  'Transposition handling': 'Обробка транспозицій',
  'Recognizes when different move orders reach the same board position.':
    'Розпізнає, коли різні порядки ходів приводять до тієї самої позиції на дошці.',
  'Position-first': 'Від позиції',
  'Position-first model': 'Модель від позиції',
  Manual: 'Вручну',
  'Merge multiple courses': 'Обʼєднання кількох курсів',
  'Combines separate courses into one coherent repertoire tree.':
    'Обʼєднує окремі курси в одне цілісне дерево репертуару.',
  'Repertoire view': 'Репертуар',
  'Yes, repertoire view': 'Так, вигляд репертуару',
  'No personal merged tree': 'Немає власного обʼєднаного дерева',
  'Manual chapters': 'Ручні розділи',
  'White and Black side filtering': 'Фільтр білої та чорної сторони',
  'Keeps both-color preparation readable when one repertoire contains mixed material.':
    'Зберігає підготовку за обидва кольори читабельною, коли репертуар містить змішані матеріали.',
  'Course-level': 'Рівень курсу',
  'Course-level only': 'Лише на рівні курсу',
  'Preferred branch choices': 'Обрані варіанти',
  'Marks your preferred move when overlapping lines offer more than one branch.':
    'Позначає твій пріоритетний хід, коли лінії з перетинами дають кілька гілок.',
  'Notes shared across transpositions': 'Нотатки спільні між транспозиціями',
  'Reuses notes when the same position appears through another move order.':
    'Повторно використовує нотатки, коли та сама позиція виникає через інший порядок ходів.',
  'No automatic merge': 'Без автоматичного обʼєднання',
  'Game repair': 'Ремонт партій',
  'Pull recent Lichess games': 'Завантаження останніх партій Lichess',
  'Imports recent online games for post-game opening checks.':
    'Імпортує останні онлайн-партії для післяпартійної перевірки дебюту.',
  separate: 'окремо',
  'Native games exist separately': 'Партії існують окремо',
  'Pull recent Chess.com games': 'Завантаження останніх партій Chess.com',
  'Supports Chess.com game import alongside Lichess.':
    'Підтримує імпорт партій Chess.com разом із Lichess.',
  'Find first out-of-book move': 'Пошук першого виходу з книги',
  'Highlights the first move where your game left known preparation.':
    'Підсвічує перший хід, де твоя партія вийшла з відомої підготовки.',
  'Annotate analyzed games per ply': 'Нотатки до проаналізованих партій по напівходах',
  'Lets you write notes on exact moments in an analyzed game.':
    'Дає писати нотатки до точних моментів у проаналізованій партії.',
  'Study comments': 'Коментарі study',
  'Study comments only': 'Лише коментарі в study',
  'Turn deviation into study work': 'Перетворення відхилення на навчання',
  'Converts a real-game surprise into a concrete position to repair.':
    'Перетворює сюрприз із реальної партії на конкретну позицію для ремонту.',
  'Sharing and ownership': 'Поширення й контроль',
  'Share course, chapter, or line': 'Поширення курсу, розділу або лінії',
  'Sends the exact study scope instead of a screenshot or pasted PGN.':
    'Надсилає точний навчальний фрагмент замість скріншота або вставленого PGN.',
  'Course access': 'Доступ курсу',
  'Course access model': 'Модель доступу до курсу',
  'Study link': 'Посилання на study',
  'Share analyzed game': 'Поширення проаналізованої партії',
  'Shares a reviewed game with deviation context and annotations.':
    'Поширює розібрану партію з контекстом відхилення й нотатками.',
  'Game link, not repertoire-aware': 'Посилання на партію без звʼязку з репертуаром',
  'Copy shared material into own library': 'Копіювання спільного матеріалу у власну бібліотеку',
  'Lets recipients keep useful shared prep in their own workspace.':
    'Дає отримувачам зберегти корисну спільну підготовку у власному робочому просторі.',
  'Yes, with copy access': 'Так, з доступом до копіювання',
  'Buy/enroll': 'Купівля',
  'Buy/enroll model': 'Модель купівлі або запису',
  'Manual clone': 'Клон вручну',
  'Clone study manually': 'Клонування study вручну',
  'PGN export': 'Експорт PGN',
  'Exports opening material back to a standard chess format.':
    'Експортує дебютний матеріал назад у стандартний шаховий формат.',
  'Full JSON archive': 'Повний JSON-архів',
  'Downloads a broader structured archive for ownership and portability.':
    'Завантажує ширший структурований архів для контролю й переносимості.',
  Included: 'Включено',

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
