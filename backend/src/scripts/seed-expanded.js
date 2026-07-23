import pool from '../config/database.js';

const newQuestions = [
  // ==================== JAVA CORE (30 new) ====================
  {
    category: 'Java Core',
    question: 'Что такое Records в Java 16?',
    short_answer: 'Immutable классы для хранения данных. Автоматически генерируют конструктор, equals(), hashCode(), toString().',
    options: ['Immutable классы для данных', 'Классы для работы с БД', 'Записи логов', 'Устаревший функционал'],
  },
  {
    category: 'Java Core',
    question: 'Что такое密封ные классы (Sealed Classes) в Java 17?',
    short_answer: 'Классы, ограничивающие какие классы могут их наследовать через ключевое слово permits.',
    options: ['Ограничивают наследование', 'Делают класс приватным', 'Создают копии объектов', 'Управляют памятью'],
  },
  {
    category: 'Java Core',
    question: 'Что такое Pattern Matching for instanceof в Java 16?',
    short_answer: 'Позволяет сразу привести тип в условии instanceof без явного каста.',
    options: ['Автоматическое приведение типов', 'Паттерн для SQL', 'Работа с регулярными выражениями', 'Проверка null'],
  },
  {
    category: 'Java Core',
    question: 'Что такое Switch Expressions в Java 14?',
    short_answer: 'Улучшенный switch без break и fall-through, с возвращаемым значением через ->.',
    options: ['Switch с возвращаемым значением', 'Switch для строк', 'Switch с null-проверкой', 'Switch для примитивов'],
  },
  {
    category: 'Java Core',
    question: 'Что такое Text Blocks в Java 15?',
    short_answer: 'Многострочные строковые литералы с использованием тройных кавычек (").',
    options: ['Многострочные строки', 'Блоки текста в UI', 'Текстовые файлы', 'HTML-шаблоны'],
  },
  {
    category: 'Java Core',
    question: 'Как работает HashMap в Java 8+?',
    short_answer: 'Использует массив + linked list. При коллизиях >8 элементов заменяет链表 на дерево (红黑树).',
    options: ['Массив с деревьями при коллизиях', 'Только связный список', 'Без коллизий', 'Дерево без массива'],
  },
  {
    category: 'Java Core',
    question: 'Что такое ConcurrentHashMap?',
    short_answer: 'Потокобезопасная версия HashMap. Разделена на сегменты для конкурентного доступа без блокировки всей таблицы.',
    options: ['Потокобезопасная HashMap', 'HashMap для строк', 'HashMap с сортировкой', 'HashMap с кэшированием'],
  },
  {
    category: 'Java Core',
    question: 'Что такое Stream API в Java 8?',
    short_answer: 'Функциональный интерфейс для обработки коллекций: map, filter, reduce, collect.',
    options: ['Обработка коллекций функционально', 'Потоки данных', 'Потоки ввода-вывода', 'Параллельные вычисления'],
  },
  {
    category: 'Java Core',
    question: 'В чем разница между map() и flatMap()?',
    short_answer: 'map() преобразует элемент, flatMap() разворачивает один элемент в несколько.',
    options: ['map — 1→1, flatMap — 1→много', 'map — сортировка, flatMap — фильтрация', 'Нет разницы', 'map — для чисел, flatMap — для строк'],
  },
  {
    category: 'Java Core',
    question: 'Что такое Optional?',
    short_answer: 'Контейнер для nullable значений. Помогает избежать NullPointerException через функциональные методы.',
    options: ['Контейнер для nullable', 'Обязательный параметр', 'Тип данных', 'Исключение'],
  },
  {
    category: 'Java Core',
    question: 'Что такое CompletableFuture?',
    short_answer: 'Асинхронное вычисление с поддержкой цепочек thenApply, thenCompose, thenCombine.',
    options: ['Асинхронные цепочки', 'Синхронное выполнение', 'Параллельные потоки', 'Очередь задач'],
  },
  {
    category: 'Java Core',
    question: 'Что такое Functional Interface?',
    short_answer: 'Интерфейс с одним абстрактным методом. Можно аннотировать @FunctionalInterface для использования с лямбдами.',
    options: ['Интерфейс с одним методом', 'Интерфейс для функционального программирования', 'Класс с методами', 'Абстрактный класс'],
  },
  {
    category: 'Java Core',
    question: 'Что такое Classloader в Java?',
    short_answer: 'Механизм загрузки классов в JVM. Работает по принципу делегирования — сначала родительский загрузчик.',
    options: ['Загружает классы в JVM', 'Компилирует код', 'Выполняет методы', 'Управляет памятью'],
  },
  {
    category: 'Java Core',
    question: 'Что такое JVM, JRE, JDK?',
    short_answer: 'JVM — виртуальная машина для выполнения байт-кода. JRE = JVM + библиотеки. JDK = JRE + инструменты разработки.',
    options: ['JVM — машина, JRE — среда, JDK — комплект', 'JVM — компилятор, JRE — редактор, JDK — отладчик', 'Все одно и то же', 'JVM — система, JRE — JVM, JDK — JRE'],
  },
  {
    category: 'Java Core',
    question: 'Что такое JIT-компиляция?',
    short_answer: 'Just-In-Time компиляция — компиляция байт-кода в нативный код во время выполнения для ускорения.',
    options: ['Компиляция во время выполнения', 'Компиляция перед запуском', 'Интерпретация кода', 'Оптимизация памяти'],
  },
  {
    category: 'Java Core',
    question: 'Что такое Garbage Collection?',
    short_answer: 'Автоматическое освобождение памяти от неиспользуемых объектов. Основные алгоритмы: G1, ZGC, Shenandoah.',
    options: ['Автоматическое удаление объектов', 'Ручное управление памятью', 'Сбор мусора в файловой системе', 'Очистка кэша'],
  },
  {
    category: 'Java Core',
    question: 'Что такое SoftReference и WeakReference?',
    short_answer: 'SoftReference — сборщик удалит только при нехватке памяти. WeakReference — удалит при следующем GC.',
    options: ['Ссылки с разной силой удержания', 'Типы указателей', 'Способы кэширования', 'Потоковые ссылки'],
  },
  {
    category: 'Java Core',
    question: 'Что такое Double-Checked Locking?',
    short_answer: 'Паттерн для ленивой инициализации с двойной проверкой. Использует volatile для предотвращения проблемы видимости.',
    options: ['Ленивая инициализация с volatile', 'Двойная проверка пароля', 'Блокировка потоков', 'Паттерн Singleton'],
  },
  {
    category: 'Java Core',
    question: 'Что такое Bill Pugh Singleton?',
    short_answer: 'Паттерн Singleton через inner static class. Инициализация происходит при первом обращении к классу.',
    options: ['Singleton через static class', 'Singleton через synchronized', 'Singleton через enum', 'Singleton через double-checked'],
  },
  {
    category: 'Java Core',
    question: 'Что такое var в Java 10?',
    short_answer: 'Локальная переменная с выводом типа. Компилирует тип на этапе компиляции, не изменяет тип.',
    options: ['Вывод типа для локальных переменных', 'Динамический тип', 'Any тип', 'Null тип'],
  },
  {
    category: 'Java Core',
    question: 'Что такое sealed interface?',
    short_answer: 'Интерфейс, который могут реализовать только указанные классы через permits.',
    options: ['Ограничивает реализацию интерфейса', 'Делает интерфейс приватным', 'Интерфейс для безопасности', 'Интерфейс для JSON'],
  },
  {
    category: 'Java Core',
    question: 'Как работает String.intern()?',
    short_answer: 'Добавляет строку в пул и возвращает ссылку. Позволяет переиспользовать строки и экономить память.',
    options: ['Добавляет в пул строк', 'Удаляет строку', 'Копирует строку', 'Сортирует строки'],
  },
  {
    category: 'Java Core',
    question: 'Что такое InvocationHandler?',
    short_answer: 'Интерфейс для динамических прокси. Вызывается при обращении к любому методу прокси-объекта.',
    options: ['Обработчик вызовов прокси', 'Обработчик событий', 'Обработчик исключений', 'Обработчик потоков'],
  },
  {
    category: 'Java Core',
    question: 'Что такое InvocationTargetException?',
    short_answer: 'Обертка для исключений, брошенных методом, вызванным через рефлексию (Method.invoke()).',
    options: ['Исключение рефлексии', 'Исключение потока', 'Исключение класса', 'Исключение JVM'],
  },
  {
    category: 'Java Core',
    question: 'В чем разница между List и Set?',
    short_answer: 'List — упорядоченный, допускает дубликаты. Set — неупорядоченный, уникальные элементы.',
    options: ['List — дубликаты, Set — уникальные', 'List — быстрый, Set — медленный', 'Set — упорядоченный, List — нет', 'Нет разницы'],
  },
  {
    category: 'Java Core',
    question: 'В чем разница между HashSet и TreeSet?',
    short_answer: 'HashSet — O(1) добавление/поиск, не сортирует. TreeSet — O(log n), сортирует элементы.',
    options: ['HashSet — быстрый, TreeSet — сортирует', 'TreeSet — быстрый, HashSet — сортирует', 'Нет разницы', 'HashSet — потокобезопасный'],
  },
  {
    category: 'Java Core',
    question: 'Что такое Iterator и ListIterator?',
    short_answer: 'Iterator — обход коллекции вперёд. ListIterator — обход в обе стороны с модификацией.',
    options: ['Iterator — вперёд, ListIterator — в обе стороны', 'Оба одинаковые', 'Iterator — для List, ListIterator — для Set', 'ListIterator — быстрее'],
  },
  {
    category: 'Java Core',
    question: 'Что такое Iterable и Collection?',
    short_answer: 'Iterable — можно итерировать (for-each). Collection — расширяет Iterable, добавляет add/remove/size.',
    options: ['Iterable — итерация, Collection — операции', 'Collection — итерация, Iterable — операции', 'Одно и то же', 'Collection — для чисел'],
  },
  {
    category: 'Java Core',
    question: 'Что такое Comparable vs Comparator?',
    short_answer: 'Comparable — естественный порядок (compareTo). Comparator — внешний порядок (compare), можно несколько.',
    options: ['Comparable — внутренний, Comparator — внешний', 'Comparator — внутренний, Comparable — внешний', 'Нет разницы', 'Comparable — для чисел'],
  },
  {
    category: 'Java Core',
    question: 'Что такое PriorityQueue?',
    short_answer: 'Очередь с приоритетом на основе кучи. Минимальный элемент извлекается первым.',
    options: ['Очередь с приоритетом', 'Очередь с сортировкой', 'Очередь FIFO', 'Очередь LIFO'],
  },

  // ==================== SPRING (30 new) ====================
  {
    category: 'Spring',
    question: 'Что такое Spring Boot Auto-Configuration?',
    short_answer: 'Автоматическая настройка Spring приложения на основе зависимостей и конфигурации.',
    options: ['Автоматическая настройка', 'Ручная настройка', 'Конфигурация БД', 'Конфигурация сети'],
  },
  {
    category: 'Spring',
    question: 'Что такое @SpringBootApplication?',
    short_answer: 'Комбинация @Configuration, @EnableAutoConfiguration, @ComponentScan — точка входа Spring Boot.',
    options: ['Комбинация аннотаций для входа', 'Аннотация для контроллеров', 'Аннотация для сервисов', 'Аннотация для БД'],
  },
  {
    category: 'Spring',
    question: 'Что такое Spring Cloud Gateway?',
    short_answer: 'API-шлюз на реактивном стеке. Поддерживает фильтры, маршрутизацию, rate limiting.',
    options: ['API-шлюз', 'База данных', 'Сервис конфигурации', 'Регистр сервисов'],
  },
  {
    category: 'Spring',
    question: 'Что такое Circuit Breaker в микросервисах?',
    short_answer: 'Паттерн отказоустойчивости. При ошибках сервиса переключает на запасной ответ (fallback).',
    options: ['Паттерн отказоустойчивости', 'Тип подключения', 'Шифрование', 'Кэширование'],
  },
  {
    category: 'Spring',
    question: 'Что такое @Transactional?',
    short_answer: 'Аннотация для управления транзакциями. Поддерживает propagation, isolation, rollback.',
    options: ['Управление транзакциями', 'Управление транзакциями', 'Управление транзакциями', 'Управление транзакциями'],
  },
  {
    category: 'Spring',
    question: 'Что такое @Primary vs @Qualifier?',
    short_answer: '@Primary — бин по умолчанию. @Qualifier — точный выбор бина по имени.',
    options: ['@Primary — по умолчанию, @Qualifier — по имени', '@Primary — по имени, @Qualifier — по умолчанию', 'Нет разницы', '@Primary — главный, @Qualifier — вторичный'],
  },
  {
    category: 'Spring',
    question: 'Что такое @Lazy vs @DependsOn?',
    short_answer: '@Lazy — ленивая инициализация бина. @DependsOn — порядок инициализации.',
    options: ['@Lazy — ленивый, @DependsOn — порядок', '@Lazy — порядок, @DependsOn — ленивый', 'Нет разницы', '@Lazy — для потоков'],
  },
  {
    category: 'Spring',
    question: 'Что такое @EventListener?',
    short_answer: 'Обработчик событий Spring. Поддерживает async, condition, phases.',
    options: ['Обработчик событий', 'Обработчик запросов', 'Обработчик транзакций', 'Обработчик ошибок'],
  },
  {
    category: 'Spring',
    question: 'Что такое @Async?',
    short_answer: 'Асинхронное выполнение метода в отдельном потоке. Требует @EnableAsync.',
    options: ['Асинхронный метод', 'Синхронный метод', 'Параллельный метод', 'Потоковый метод'],
  },
  {
    category: 'Spring',
    question: 'Что такое @Scheduled?',
    short_answer: 'Планировщик задач. Поддерживает cron, fixedDelay, fixedRate.',
    options: ['Планировщик задач', 'Планировщик потоков', 'Планировщик памяти', 'Планировщик событий'],
  },
  {
    category: 'Spring',
    question: 'Что такое Spring Security OAuth2?',
    short_answer: 'Стандарт авторизации для делегирования доступа. Поддерживает JWT, opaque tokens.',
    options: ['Авторизация через OAuth2', 'Аутентификация через пароль', 'Шифрование', 'Сессии'],
  },
  {
    category: 'Spring',
    question: 'Что такое @PreAuthorize?',
    short_answer: 'Проверка доступа перед выполнением метода через SpEL-выражения.',
    options: ['Проверка доступа до метода', 'Проверка доступа после метода', 'Проверка ролей', 'Проверка прав'],
  },
  {
    category: 'Spring',
    question: 'Что такое CORS в Spring?',
    short_answer: 'Cross-Origin Resource Sharing — настройка доступа к ресурсам с других доменов через @CrossOrigin или WebMvcConfigurer.',
    options: ['Настройка кросс-доменных запросов', 'Шифрование данных', 'Кэширование', 'Сжатие данных'],
  },
  {
    category: 'Spring',
    question: 'Что такое @WebMvcConfigurer?',
    short_answer: 'Интерфейс для кастомизации MVC: CORS, interceptors, message converters.',
    options: ['Кастомизация MVC', 'Настройка БД', 'Настройка безопасности', 'Настройка логирования'],
  },
  {
    category: 'Spring',
    question: 'Что такое RestTemplate vs WebClient?',
    short_answer: 'RestTemplate — синхронный HTTP-клиент (устаревший). WebClient — реактивный, поддерживает背压.',
    options: ['RestTemplate — синхронный, WebClient — реактивный', 'RestTemplate — реактивный, WebClient — синхронный', 'Нет разницы', 'RestTemplate — для JSON, WebClient — для XML'],
  },
  {
    category: 'Spring',
    question: 'Что такое WebFlux?',
    short_answer: 'Реактивный веб-фреймворк на Project Reactor. Поддерживает背压 и неблокирующий ввод-вывод.',
    options: ['Реактивный веб-фреймворк', 'Традиционный MVC', 'ORM-фреймворк', 'Тестовый фреймворк'],
  },
  {
    category: 'Spring',
    question: 'Что такое Mono vs Flux?',
    short_answer: 'Mono — 0 или 1 элемент. Flux — 0 или N элементов. Оба — реактивные потоки.',
    options: ['Mono — 1 элемент, Flux — много', 'Mono — много, Flux — 1 элемент', 'Нет разницы', 'Mono — синхронный, Flux — асинхронный'],
  },
  {
    category: 'Spring',
    question: 'Что такое Spring Data JPA?',
    short_answer: 'Абстракция над JPA-провайдерами. Упрощает работу с репозиториями через интерфейсы.',
    options: ['Абстракция над JPA', 'ORM-фреймворк', 'Драйвер БД', 'Тестовый фреймворк'],
  },
  {
    category: 'Spring',
    question: 'Что такое Query Method в Spring Data?',
    short_answer: 'Автоматическая генерация запросов по имени метода: findByEmail, findByNameContaining.',
    options: ['Генерация запросов по имени', 'Ручной JPQL', 'Нативные запросы', 'Criteria API'],
  },
  {
    category: 'Spring',
    question: 'Что такое @EntityGraph?',
    short_answer: 'Управление загрузкой связей (Eager/Lazy) для конкретного метода репозитория.',
    options: ['Управление загрузкой связей', 'Граф зависимостей', 'Граф объектов', 'Граф потоков'],
  },
  {
    category: 'Spring',
    question: 'Что такое @Lock в JPA?',
    short_answer: 'Управление блокировками: PESSIMISTIC_READ, PESSIMISTIC_WRITE, OPTIMISTIC.',
    options: ['Блокировки транзакций', 'Блокировки потоков', 'Блокировки файлов', 'Блокировки памяти'],
  },
  {
    category: 'Spring',
    question: 'Что такое @Modifying?',
    short_answer: 'Помечает запрос как обновляющий (UPDATE/DELETE) в Spring Data JPA.',
    options: ['Пометка для обновлений', 'Пометка для вставок', 'Пометка для удалений', 'Пометка для selects'],
  },
  {
    category: 'Spring',
    question: 'Что такое @DynamicInsert vs @DynamicUpdate?',
    short_answer: '@DynamicInsert — вставляет только non-null поля. @DynamicUpdate — обновляет только изменённые.',
    options: ['Динамические SQL-запросы', 'Динамические таблицы', 'Динамические схемы', 'Динамические индексы'],
  },
  {
    category: 'Spring',
    question: 'Что такое @Formula в Hibernate?',
    short_answer: 'Вычисляемое поле на стороне БД. SQL-выражение выполняется при каждом SELECT.',
    options: ['Вычисляемое поле', 'Индекс', 'Валидация', 'Кэширование'],
  },
  {
    category: 'Spring',
    question: 'Что такое @Where в Hibernate?',
    short_answer: 'Глобальный фильтр для сущности. Добавляет условие WHERE ко всем запросам.',
    options: ['Глобальный фильтр', 'Локальный фильтр', 'Индекс', 'Кэш'],
  },
  {
    category: 'Spring',
    question: 'Что такое @Filter в Hibernate?',
    short_answer: 'Динамический фильтр, включаемый через Session.enableFilter().',
    options: ['Динамический фильтр', 'Статический фильтр', 'Индекс', 'Кэш'],
  },
  {
    category: 'Spring',
    question: 'Что такое @BatchSize в Hibernate?',
    short_answer: 'Оптимизация загрузки связей пачками (N+1 → batch size запросов).',
    options: ['Пакетная загрузка', 'Размер памяти', 'Размер лога', 'Размер кэша'],
  },
  {
    category: 'Spring',
    question: 'Что такое @Fetch vs @JoinFetch?',
    short_answer: '@Fetch — стратегия загрузки (JOIN, SELECT, SUBSELECT). @JoinFetch — всегда JOIN.',
    options: ['@Fetch — стратегия, @JoinFetch — JOIN', '@Fetch — JOIN, @JoinFetch — стратегия', 'Нет разницы', '@Fetch — для коллекций'],
  },
  {
    category: 'Spring',
    question: 'Что такое @Cache в Hibernate?',
    short_answer: 'Кэширование сущностей: NONE, READ_ONLY, NONSTRICT_READ_WRITE, TRANSACTIONAL.',
    options: ['Кэширование сущностей', 'Кэширование запросов', 'Кэширование сессий', 'Кэширование транзакций'],
  },
  {
    category: 'Spring',
    question: 'Что такое second-level cache?',
    short_answer: 'Кэш на уровне SessionFactory. Разделяется между сессиями. Требует провайдер (Ehcache, Infinispan).',
    options: ['Кэш на уровне SessionFactory', 'Кэш на уровне Session', 'Кэш на уровне запроса', 'Кэш на уровне БД'],
  },

  // ==================== SYSTEM DESIGN (30 new) ====================
  {
    category: 'System Design',
    question: 'Что такое CAP-теорема?',
    short_answer: 'Распределённая система не может одновременно гарантировать Consistency, Availability, Partition tolerance.',
    options: ['Consistency, Availability, Partition tolerance', 'Concurrency, Authentication, Performance', 'Cache, API, Protocol', 'Capacity, Availability, Processing'],
  },
  {
    category: 'System Design',
    question: 'Что такое eventual consistency?',
    short_answer: 'Модель, где все узлы в конечном итоге придут к одному состоянию, но временно могут различаться.',
    options: ['Временные расхождения между узлами', 'Мгновенная синхронизация', 'Отсутствие репликации', 'Локальная консистентность'],
  },
  {
    category: 'System Design',
    question: 'Что такое sharding?',
    short_answer: 'Горизонтальное.partitioning данных по ключу shard на разные серверы.',
    options: ['Разбиение данных по серверам', 'Репликация данных', 'Балансировка нагрузки', 'Кэширование данных'],
  },
  {
    category: 'System Design',
    question: 'Что такое consistent hashing?',
    short_answer: 'Алгоритм распределения данных по узлам через кольцо хешей. Минимизирует перемещение при добавлении узлов.',
    options: ['Кольцо хешей для балансировки', 'Хеширование паролей', 'Хеширование файлов', 'Хеширование запросов'],
  },
  {
    category: 'System Design',
    question: 'Что такое message queue?',
    short_answer: 'Очередь сообщений для асинхронной коммуникации между сервисами (Kafka, RabbitMQ).',
    options: ['Асинхронная коммуникация', 'Синхронный вызов', 'Кэширование', 'Логирование'],
  },
  {
    category: 'System Design',
    question: 'Что такое CQRS?',
    short_answer: 'Command Query Responsibility Segregation — разделение моделей чтения и записи.',
    options: ['Разделение чтения/записи', 'Кэширование', 'Шифрование', 'Мониторинг'],
  },
  {
    category: 'System Design',
    question: 'Что такое event sourcing?',
    short_answer: 'Хранение состояния через последовательность событий вместо текущего состояния.',
    options: ['Хранение событий', 'Хранение состояний', 'Хранение логов', 'Хранение сессий'],
  },
  {
    category: 'System Design',
    question: 'Что такое load balancer?',
    short_answer: 'Распределитель нагрузки между серверами: round-robin, least connections, IP hash.',
    options: ['Распределитель нагрузки', 'Балансир памяти', 'Балансир дисков', 'Балансир потоков'],
  },
  {
    category: 'System Design',
    question: 'Что такое rate limiting?',
    short_answer: 'Ограничение количества запросов в единицу времени. Алгоритмы: token bucket, sliding window.',
    options: ['Ограничение частоты запросов', 'Ограничение размера запроса', 'Ограничение числа пользователей', 'Ограничение памяти'],
  },
  {
    category: 'System Design',
    question: 'Что такое CDN?',
    short_answer: 'Content Delivery Network — распределённая сеть серверов для кэширования контента ближе к пользователям.',
    options: ['Распределённая сеть кэширования', 'Сеть баз данных', 'Сеть вычислений', 'Сеть шифрования'],
  },
  {
    category: 'System Design',
    question: 'Что такое idempotency?',
    short_answer: 'Свойство операции: повторный вызов даёт тот же результат. Важно для API и платежей.',
    options: ['Повторяемость результата', 'Быстродействие', 'Атомарность', 'Изоляция'],
  },
  {
    category: 'System Design',
    question: 'Что такое saga pattern?',
    short_answer: 'Паттерн распределённых транзакций через последовательность локальных транзакций с компенсацией.',
    options: ['Распределённые транзакции', 'Локальные транзакции', 'Кэширование', 'Шифрование'],
  },
  {
    category: 'System Design',
    question: 'Что такое circuit breaker?',
    short_answer: 'Паттерн отказоустойчивости: при ошибках временно блокирует вызовы для восстановления.',
    options: ['Блокировка при ошибках', 'Кэширование', 'Балансировка', 'Логирование'],
  },
  {
    category: 'System Design',
    question: 'Что такое database replication?',
    short_answer: 'Копирование данных между серверами: master-slave (чтение), master-master (запись).',
    options: ['Копирование данных', 'Шифрование данных', 'Сжатие данных', 'Удаление данных'],
  },
  {
    category: 'System Design',
    question: 'Что такое ACID?',
    short_answer: 'Atomicity, Consistency, Isolation, Durability — свойства транзакций БД.',
    options: ['Свойства транзакций', 'Типы индексов', 'Протоколы сети', 'Алгоритмы шифрования'],
  },
  {
    category: 'System Design',
    question: 'Что такое BASE в NoSQL?',
    short_answer: 'Basically Available, Soft state, Eventually consistent — модель для высокой доступности.',
    options: ['Модель доступности NoSQL', 'Свойства ACID', 'Типы индексов', 'Протоколы сети'],
  },
  {
    category: 'System Design',
    question: 'Что такое microservices?',
    short_answer: 'Архитектура из мелких независимых сервисов с各自的数据存储和通信机制.',
    options: ['Мелкие независимые сервисы', 'Монолитное приложение', 'База данных', 'Фронтенд'],
  },
  {
    category: 'System Design',
    question: 'Что такое API gateway?',
    short_answer: 'Единая точка входа для API: маршрутизация, аутентификация, rate limiting, кэширование.',
    options: ['Единая точка входа API', 'База данных', 'Сервис', 'Фронтенд'],
  },
  {
    category: 'System Design',
    question: 'Что такое service mesh?',
    short_answer: 'Инфраструктурный слой для управления сервис-сервис коммуникацией (Istio, Linkerd).',
    options: ['Управление коммуникациями', 'База данных', 'Фронтенд', 'Кэш'],
  },
  {
    category: 'System Design',
    question: 'Что такое sidecar pattern?',
    short_answer: 'Дополнительный контейнер рядом с основным: логирование, мониторинг, безопасность.',
    options: ['Дополнительный контейнер', 'Основной контейнер', 'База данных', 'Фронтенд'],
  },
  {
    category: 'System Design',
    question: 'Что такое backpressure?',
    short_answer: 'Механизм замедления производителя при перегрузке потребителя (Reactive Streams).',
    options: ['Замедление производителя', 'Ускорение потребителя', 'Кэширование', 'Балансировка'],
  },
  {
    category: 'System Design',
    question: 'Что такое blue-green deployment?',
    short_answer: 'Два одинаковых окружения: синее (текущее) и зелёное (новое). Переключение за секунды.',
    options: ['Два окружения для деплоя', 'Одно окружение', 'Контейнеры', 'База данных'],
  },
  {
    category: 'System Design',
    question: 'Что такое canary deployment?',
    short_answer: 'Постепенный деплой: сначала 1% пользователей, потом постепенно 100% при отсутствии ошибок.',
    options: ['Постепенный деплой', 'Мгновенный деплой', 'Откат деплоя', 'Кэширование'],
  },
  {
    category: 'System Design',
    question: 'Что такое feature flag?',
    short_answer: 'Переключатель функции: включение/выключение без деплоя кода.',
    options: ['Переключатель функции', 'Флаг ошибки', 'Флаг производительности', 'Флаг безопасности'],
  },
  {
    category: 'System Design',
    question: 'Что такое circuit breaker states?',
    short_answer: 'Closed (работает), Open (блокирует), Half-Open (тестирует восстановление).',
    options: ['Closed, Open, Half-Open', 'On, Off, Standby', 'Start, Stop, Pause', 'Active, Passive, Idle'],
  },
  {
    category: 'System Design',
    question: 'Что такое graceful degradation?',
    short_answer: 'Снижение функциональности при сбоях: кэшированные данные, упрощённые ответы.',
    options: ['Снижение функциональности', 'Полный отказ', 'Перезапуск', 'Масштабирование'],
  },
  {
    category: 'System Design',
    question: 'Что такое health check?',
    short_answer: 'Проверка состояния сервиса: HTTP эндпоинт /health, проверка зависимостей.',
    options: ['Проверка состояния', 'Проверка производительности', 'Проверка безопасности', 'Проверка логов'],
  },
  {
    category: 'System Design',
    question: 'Что такое SLA vs SLO vs SLI?',
    short_answer: 'SLA — соглашение уровня сервиса. SLO — внутренняя цель. SLI — метрика для измерения.',
    options: ['SLA — соглашение, SLO — цель, SLI — метрика', 'Все одно и то же', 'SLA — метрика, SLO — соглашение, SLI — цель', 'SLA — безопасность, SLO — логирование, SLI — шифрование'],
  },
  {
    category: 'System Design',
    question: 'What is idempotency key?',
    short_answer: 'Unique identifier for API requests to prevent duplicate processing of the same operation.',
    options: ['Unique request identifier', 'Database key', 'API key', 'Session ID'],
  },

  // ==================== ADDITIONAL CATEGORIES ====================
  {
    category: 'Microservices',
    question: 'Что такое decomposition в микросервисах?',
    short_answer: 'Разбиение монолита на сервисы по бизнес-доменам (DDD bounded contexts).',
    options: ['Разбиение по бизнес-доменам', 'Разбиение по файлам', 'Разбиение по функциям', 'Разбиение по модулям'],
  },
  {
    category: 'Microservices',
    question: 'Что такое saga orchestration vs choreography?',
    short_answer: 'Orchestration — центральный оркестратор. Choreography — сервисы реагируют на события.',
    options: ['Orchestration — центральный, Choreography — распределённый', 'Orchestration — распределённый, Choreography — центральный', 'Нет разницы', 'Orchestration — для БД, Choreography — для API'],
  },
  {
    category: 'Microservices',
    question: 'Что такое API versioning?',
    short_answer: 'Управление версиями API: URI (/v1/), header, query param.',
    options: ['Управление версиями', 'Управление безопасностью', 'Управление кэшированием', 'Управление логированием'],
  },
  {
    category: 'Microservices',
    question: 'Что такое distributed tracing?',
    short_answer: 'Отслеживание запросов через несколько сервисов (Jaeger, Zipkin, OpenTelemetry).',
    options: ['Отслеживание запросов', 'Логирование ошибок', 'Мониторинг памяти', 'Балансировка нагрузки'],
  },
  {
    category: 'Microservices',
    question: 'Что такое saga compensation?',
    short_answer: 'Отмена предыдущих шагов саги при ошибке: компенсирующие транзакции.',
    options: ['Компенсация при ошибках', 'Повтор при ошибках', 'Логирование ошибок', 'Кэширование ошибок'],
  },
  {
    category: 'Testing',
    question: 'Что такое integration testing?',
    short_answer: 'Тестирование взаимодействия нескольких компонентов вместе (контроллер + сервис + БД).',
    options: ['Тестирование компонентов вместе', 'Тестирование одного метода', 'Тестирование UI', 'Тестирование производительности'],
  },
  {
    category: 'Testing',
    question: 'Что такое mock vs stub?',
    short_answer: 'Stub — возвращает предопределённые данные. Mock — проверяет вызовы методов.',
    options: ['Stub — данные, Mock — проверки', 'Stub — проверки, Mock — данные', 'Нет разницы', 'Stub — для БД, Mock — для API'],
  },
  {
    category: 'Testing',
    question: 'Что такое test coverage?',
    short_answer: 'Процент кода, покрытого тестами. Метрика для оценки качества тестирования.',
    options: ['Покрытие кода тестами', 'Количество тестов', 'Скорость тестов', 'Размер тестов'],
  },
  {
    category: 'Testing',
    question: 'Что такое TDD?',
    short_answer: 'Test-Driven Development: сначала пишем тест, потом код, потом рефакторим.',
    options: ['Тесты до кода', 'Код до тестов', 'Рефакторинг до тестов', 'Деплой до тестов'],
  },
  {
    category: 'Testing',
    question: 'Что такое BDD?',
    short_answer: 'Behavior-Driven Development: тесты на естественном языке (Given-When-Then).',
    options: ['Тесты на естественном языке', 'Тесты на коде', 'Тесты для UI', 'Тесты для БД'],
  },
  {
    category: 'DevOps',
    question: 'Что такое CI/CD?',
    short_answer: 'Continuous Integration / Continuous Deployment — автоматизация сборки, тестов и деплоя.',
    options: ['Автоматизация сборки и деплоя', 'Ручное тестирование', 'Ручной деплой', 'Мониторинг'],
  },
  {
    category: 'DevOps',
    question: 'Что такое Docker?',
    short_answer: 'Платформа контейнеризации: изолированные, портируемые, воспроизводимые окружения.',
    options: ['Контейнеризация', 'Виртуализация', 'Компиляция', 'Тестирование'],
  },
  {
    category: 'DevOps',
    question: 'Что такое Kubernetes?',
    short_answer: 'Оркестратор контейнеров: автоматическое масштабирование, балансировка, самовосстановление.',
    options: ['Оркестратор контейнеров', 'Контейнер', 'База данных', 'Фронтенд'],
  },
  {
    category: 'DevOps',
    question: 'Что такое Infrastructure as Code?',
    short_answer: 'Управление инфраструктурой через код (Terraform, CloudFormation).',
    options: ['Инфраструктура через код', 'Код через инфраструктуру', 'Контейнеры', 'Скрипты'],
  },
  {
    category: 'DevOps',
    question: 'Что такое observability?',
    short_answer: 'Наблюдаемость системы через три столпа: logs, metrics, traces.',
    options: ['Логи, метрики, трассировка', 'Мониторинг, алерты, дашборды', 'Кэширование, балансировка, шифрование', 'Тестирование, деплой, откат'],
  },
  {
    category: 'Concurrency',
    question: 'Что такое deadlock?',
    short_answer: 'Ситуация, когда два или более потока заблокированы и ждут друг друга бесконечно.',
    options: ['Взаимная блокировка потоков', 'Одновременное выполнение', 'Приоритет потоков', 'Очередь задач'],
  },
  {
    category: 'Concurrency',
    question: 'Что такое livelock?',
    short_answer: 'Потоки меняют состояние, но не продвигаются вперёд (в отличие от deadlock).',
    options: ['Потоки без прогресса', 'Потоки с прогрессом', 'Одиночный поток', 'Приоритет потоков'],
  },
  {
    category: 'Concurrency',
    question: 'Что такое thread starvation?',
    short_answer: 'Поток не получает ресурсы из-за конкуренции за CPU или блокировок.',
    options: ['Недостаток ресурсов для потока', 'Избыток ресурсов', 'Приоритет потока', 'Очередь задач'],
  },
  {
    category: 'Concurrency',
    question: 'Что такое Fork/Join framework?',
    short_answer: 'Разделяй и властвуй: разбиение задач на подзадачи, параллельное выполнение через work-stealing.',
    options: ['Разделение задач', 'Слияние задач', 'Очередь задач', 'Планировщик задач'],
  },
  {
    category: 'Concurrency',
    question: 'Что такое CompletableFuture supplyAsync vs runAsync?',
    short_answer: 'supplyAsync — возвращает значение. runAsync — выполняет Runnable, без результата.',
    options: ['supplyAsync — с результатом, runAsync — без', 'supplyAsync — без, runAsync — с', 'Нет разницы', 'supplyAsync — синхронный, runAsync — асинхронный'],
  },
];

async function seedExpanded() {
  let added = 0;
  for (const q of newQuestions) {
    try {
      const hasOptions = q.options && q.options.length > 0;
      if (hasOptions) {
        await pool.query(
          `INSERT INTO questions (category, difficulty, question_text, short_answer, options, language)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT DO NOTHING`,
          [q.category, 'medium', q.question, q.short_answer, q.options, 'Java']
        );
      } else {
        await pool.query(
          `INSERT INTO questions (category, difficulty, question_text, short_answer, language)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT DO NOTHING`,
          [q.category, 'medium', q.question, q.short_answer, 'Java']
        );
      }
      added++;
    } catch (err) {
      // skip duplicates
    }
  }
  console.log(`Added ${added} new questions`);
  process.exit(0);
}

seedExpanded().catch(err => {
  console.error(err);
  process.exit(1);
});
