-- Java Interview Tinder Database Schema
-- Execute this in your PostgreSQL database

-- Drop existing tables if needed (uncomment if you want to reset)
-- DROP TABLE IF EXISTS user_progress CASCADE;
-- DROP TABLE IF EXISTS questions CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;
-- DROP TYPE IF EXISTS progress_status;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    telegram_id BIGINT PRIMARY KEY,
    username VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create enum type for progress status
DO $$ BEGIN
    CREATE TYPE progress_status AS ENUM ('known', 'unknown');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create questions table
CREATE TABLE IF NOT EXISTS questions (
    id SERIAL PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    question_text TEXT NOT NULL,
    short_answer TEXT NOT NULL,
    cached_explanation TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_progress table
CREATE TABLE IF NOT EXISTS user_progress (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    status progress_status NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, question_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_question_id ON user_progress(question_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_status ON user_progress(status);
CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category);

-- Insert sample questions
INSERT INTO questions (category, question_text, short_answer) VALUES
-- Java Core
('Java Core', 'В чем разница между == и equals() в Java?', '== сравнивает ссылки на объекты, equals() сравнивает содержимое объектов. Для примитивов == сравнивает значения.'),
('Java Core', 'Что такое контракт equals() и hashCode()?', 'Если два объекта равны по equals(), их hashCode() должны быть одинаковыми. Обратное не обязательно.'),
('Java Core', 'Что такое immutable объекты и зачем они нужны?', 'Неизменяемые объекты, состояние которых нельзя изменить после создания. Безопасны для многопоточности, кэширования.'),
('Java Core', 'В чем разница между String, StringBuilder и StringBuffer?', 'String - immutable. StringBuilder - mutable, не потокобезопасен. StringBuffer - mutable, потокобезопасен (медленнее).'),
('Java Core', 'Что такое autoboxing и unboxing?', 'Автоматическое преобразование между примитивами и обертками: int ↔ Integer. Может влиять на производительность.'),
('Java Core', 'Чем отличается final, finally и finalize?', 'final - модификатор неизменности. finally - блок в try-catch. finalize - устаревший метод перед GC.'),
('Java Core', 'Что такое String Pool в Java?', 'Область памяти для хранения уникальных строковых литералов. Экономит память через переиспользование.'),
('Java Core', 'Какие есть модификаторы доступа в Java?', 'public (всем), protected (пакет + наследники), default/package-private (только пакет), private (только класс).'),

-- Collections
('Collections', 'Как работает HashMap внутри?', 'Массив bucket''ов + связные списки/деревья. Использует hashCode() для определения bucket, equals() для поиска внутри.'),
('Collections', 'В чем разница между ArrayList и LinkedList?', 'ArrayList - массив (быстрый доступ O(1), вставка O(n)). LinkedList - двусвязный список (доступ O(n), вставка O(1)).'),
('Collections', 'Что такое fail-fast и fail-safe итераторы?', 'Fail-fast бросает ConcurrentModificationException при изменении коллекции. Fail-safe работает с копией (например, CopyOnWriteArrayList).'),
('Collections', 'В чем разница между HashMap и ConcurrentHashMap?', 'ConcurrentHashMap потокобезопасен без полной блокировки (сегментная блокировка). HashMap не потокобезопасен.'),
('Collections', 'Для чего нужен TreeMap?', 'Отсортированная Map на основе красно-черного дерева. Ключи хранятся в отсортированном порядке.'),
('Collections', 'В чем разница между Set и List?', 'Set - не содержит дубликатов, порядок не гарантирован (кроме LinkedHashSet/TreeSet). List - допускает дубликаты, сохраняет порядок.'),
('Collections', 'Что такое Comparable и Comparator?', 'Comparable - естественный порядок (compareTo в классе). Comparator - внешний компаратор для кастомной сортировки.'),
('Collections', 'Когда использовать HashSet vs TreeSet?', 'HashSet - O(1) операции, без порядка. TreeSet - O(log n), элементы отсортированы.'),

-- Multithreading
('Multithreading', 'Чем отличается процесс от потока?', 'Процесс - независимая программа с собственной памятью. Поток - легковесная единица выполнения внутри процесса, разделяет память.'),
('Multithreading', 'Что такое синхронизация и зачем она нужна?', 'Механизм предотвращения одновременного доступа к общим ресурсам. Решает проблему race condition.'),
('Multithreading', 'В чем разница между synchronized и Lock?', 'synchronized - встроенный, автоматическое освобождение. Lock - более гибкий API (tryLock, lockInterruptibly), ручное освобождение.'),
('Multithreading', 'Что такое volatile переменная?', 'Гарантирует видимость изменений между потоками. Чтение/запись происходит из основной памяти, не из кэша CPU.'),
('Multithreading', 'Что такое deadlock и как его избежать?', 'Взаимная блокировка потоков. Избежать: упорядоченная блокировка, timeout, избегать вложенных блокировок.'),
('Multithreading', 'Для чего нужен ThreadLocal?', 'Хранит переменные, уникальные для каждого потока. Каждый поток видит только свою копию.'),
('Multithreading', 'Что такое ExecutorService?', 'Фреймворк для управления пулом потоков. Упрощает выполнение асинхронных задач, управление жизненным циклом потоков.'),
('Multithreading', 'В чем разница между wait() и sleep()?', 'wait() освобождает монитор, вызывается на объекте. sleep() не освобождает монитор, вызывается на Thread.'),

-- OOP
('OOP', 'Что такое инкапсуляция?', 'Сокрытие внутренней реализации класса, доступ через публичные методы (геттеры/сеттеры).'),
('OOP', 'Что такое полиморфизм?', 'Способность объекта принимать разные формы. Переопределение методов (runtime) и перегрузка (compile time).'),
('OOP', 'В чем разница между абстрактным классом и интерфейсом?', 'Абстрактный класс может иметь состояние и реализацию. Интерфейс - только контракт (с Java 8+ default методы возможны).'),
('OOP', 'Что такое композиция и агрегация?', 'Композиция - сильная связь (компонент не существует отдельно). Агрегация - слабая связь (компонент может существовать независимо).'),
('OOP', 'Что такое SOLID принципы?', 'S-Single Responsibility, O-Open/Closed, L-Liskov Substitution, I-Interface Segregation, D-Dependency Inversion. Основа чистого кода.'),

-- Spring Framework
('Spring', 'Что такое Dependency Injection?', 'Паттерн передачи зависимостей извне, а не создания внутри класса. Spring контейнер управляет зависимостями.'),
('Spring', 'Какие есть scope у Spring beans?', 'singleton (по умолчанию), prototype, request, session, application (для веб-приложений).'),
('Spring', 'В чем разница между @Component, @Service, @Repository?', '@Component - общий. @Service - бизнес-логика. @Repository - работа с БД + обработка исключений. Семантическая разница.'),
('Spring', 'Что такое @Transactional?', 'Аннотация для управления транзакциями. При исключении откатывает изменения БД. По умолчанию только для RuntimeException.'),
('Spring', 'Что такое Spring Boot Auto-configuration?', 'Автоматическая настройка компонентов на основе classpath. Уменьшает boilerplate конфигурацию.'),
('Spring', 'Как работает @Autowired?', 'Автоматическое внедрение зависимостей. По типу (byType), по имени (@Qualifier), через конструктор/setter/поле.'),
('Spring', 'Что такое ApplicationContext?', 'Центральный интерфейс Spring IoC контейнера. Управляет бинами, их жизненным циклом, зависимостями.'),
('Spring', 'В чем разница между @RequestMapping и @GetMapping?', '@GetMapping - специализация для GET запросов. @RequestMapping - универсальная аннотация для любых HTTP методов.'),

-- JVM & Memory
('JVM', 'Из каких областей памяти состоит JVM?', 'Heap (объекты), Stack (локальные переменные, вызовы методов), Metaspace (метаданные классов), Code Cache.'),
('JVM', 'Что такое Garbage Collection?', 'Автоматическое освобождение памяти от неиспользуемых объектов. Разные алгоритмы: Serial, Parallel, G1, ZGC.'),
('JVM', 'Что такое OutOfMemoryError?', 'Ошибка когда JVM не может выделить память. Heap space, Metaspace, GC overhead limit exceeded.'),
('JVM', 'Что такое ClassLoader?', 'Загружает классы в JVM. Иерархия: Bootstrap, Extension/Platform, Application. Делегирование родителю.'),
('JVM', 'Что такое JIT компиляция?', 'Just-In-Time компиляция байт-кода в нативный код во время выполнения. Оптимизирует горячие участки кода.'),

-- Exception Handling
('Exceptions', 'В чем разница между checked и unchecked exceptions?', 'Checked - обязательная обработка (IOException). Unchecked - наследуют RuntimeException, необязательна обработка (NullPointerException).'),
('Exceptions', 'Когда использовать throw vs throws?', 'throw - бросить исключение (в теле метода). throws - объявить, что метод может бросить исключение (в сигнатуре).'),
('Exceptions', 'Что такое try-with-resources?', 'Автоматическое закрытие ресурсов (AutoCloseable). Ресурс закрывается в конце блока try, даже при исключении.'),
('Exceptions', 'Можно ли поймать Error?', 'Технически можно, но не нужно. Error для критических ошибок JVM (OutOfMemoryError), приложение обычно не может восстановиться.')
ON CONFLICT DO NOTHING;

-- Show statistics
SELECT 
    category,
    COUNT(*) as question_count
FROM questions
GROUP BY category
ORDER BY category;

-- Show total count
SELECT COUNT(*) as total_questions FROM questions;
