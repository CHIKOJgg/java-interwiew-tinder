import pool from '../config/database.js';

const questions = [
  // Java Core
  {
    category: 'Java Core',
    question: 'В чем разница между == и equals() в Java?',
    short_answer: '== сравнивает ссылки на объекты, equals() сравнивает содержимое объектов. Для примитивов == сравнивает значения.'
  },
  {
    category: 'Java Core',
    question: 'Что такое контракт equals() и hashCode()?',
    short_answer: 'Если два объекта равны по equals(), их hashCode() должны быть одинаковыми. Обратное не обязательно.'
  },
  {
    category: 'Java Core',
    question: 'Что такое immutable объекты и зачем они нужны?',
    short_answer: 'Неизменяемые объекты, состояние которых нельзя изменить после создания. Безопасны для многопоточности, кэширования.'
  },
  {
    category: 'Java Core',
    question: 'В чем разница между String, StringBuilder и StringBuffer?',
    short_answer: 'String - immutable. StringBuilder - mutable, не потокобезопасен. StringBuffer - mutable, потокобезопасен (медленнее).'
  },
  {
    category: 'Java Core',
    question: 'Что такое autoboxing и unboxing?',
    short_answer: 'Автоматическое преобразование между примитивами и обертками: int ↔ Integer. Может влиять на производительность.'
  },
  {
    category: 'Java Core',
    question: 'Чем отличается final, finally и finalize?',
    short_answer: 'final - модификатор неизменности. finally - блок в try-catch. finalize - устаревший метод перед GC.'
  },
  {
    category: 'Java Core',
    question: 'Что такое String Pool в Java?',
    short_answer: 'Область памяти для хранения уникальных строковых литералов. Экономит память через переиспользование.'
  },
  {
    category: 'Java Core',
    question: 'Какие есть модификаторы доступа в Java?',
    short_answer: 'public (всем), protected (пакет + наследники), default/package-private (только пакет), private (только класс).'
  },

  // Collections
  {
    category: 'Collections',
    question: 'Как работает HashMap внутри?',
    short_answer: 'Массив bucket\'ов + связные списки/деревья. Использует hashCode() для определения bucket, equals() для поиска внутри.'
  },
  {
    category: 'Collections',
    question: 'В чем разница между ArrayList и LinkedList?',
    short_answer: 'ArrayList - массив (быстрый доступ O(1), вставка O(n)). LinkedList - двусвязный список (доступ O(n), вставка O(1)).'
  },
  {
    category: 'Collections',
    question: 'Что такое fail-fast и fail-safe итераторы?',
    short_answer: 'Fail-fast бросает ConcurrentModificationException при изменении коллекции. Fail-safe работает с копией (например, CopyOnWriteArrayList).'
  },
  {
    category: 'Collections',
    question: 'В чем разница между HashMap и ConcurrentHashMap?',
    short_answer: 'ConcurrentHashMap потокобезопасен без полной блокировки (сегментная блокировка). HashMap не потокобезопасен.'
  },
  {
    category: 'Collections',
    question: 'Для чего нужен TreeMap?',
    short_answer: 'Отсортированная Map на основе красно-черного дерева. Ключи хранятся в отсортированном порядке.'
  },
  {
    category: 'Collections',
    question: 'В чем разница между Set и List?',
    short_answer: 'Set - не содержит дубликатов, порядок не гарантирован (кроме LinkedHashSet/TreeSet). List - допускает дубликаты, сохраняет порядок.'
  },
  {
    category: 'Collections',
    question: 'Что такое Comparable и Comparator?',
    short_answer: 'Comparable - естественный порядок (compareTo в классе). Comparator - внешний компаратор для кастомной сортировки.'
  },
  {
    category: 'Collections',
    question: 'Когда использовать HashSet vs TreeSet?',
    short_answer: 'HashSet - O(1) операции, без порядка. TreeSet - O(log n), элементы отсортированы.'
  },

  // Multithreading
  {
    category: 'Multithreading',
    question: 'Чем отличается процесс от потока?',
    short_answer: 'Процесс - независимая программа с собственной памятью. Поток - легковесная единица выполнения внутри процесса, разделяет память.'
  },
  {
    category: 'Multithreading',
    question: 'Что такое синхронизация и зачем она нужна?',
    short_answer: 'Механизм предотвращения одновременного доступа к общим ресурсам. Решает проблему race condition.'
  },
  {
    category: 'Multithreading',
    question: 'В чем разница между synchronized и Lock?',
    short_answer: 'synchronized - встроенный, автоматическое освобождение. Lock - более гибкий API (tryLock, lockInterruptibly), ручное освобождение.'
  },
  {
    category: 'Multithreading',
    question: 'Что такое volatile переменная?',
    short_answer: 'Гарантирует видимость изменений между потоками. Чтение/запись происходит из основной памяти, не из кэша CPU.'
  },
  {
    category: 'Multithreading',
    question: 'Что такое deadlock и как его избежать?',
    short_answer: 'Взаимная блокировка потоков. Избежать: упорядоченная блокировка, timeout, избегать вложенных блокировок.'
  },
  {
    category: 'Multithreading',
    question: 'Для чего нужен ThreadLocal?',
    short_answer: 'Хранит переменные, уникальные для каждого потока. Каждый поток видит только свою копию.'
  },
  {
    category: 'Multithreading',
    question: 'Что такое ExecutorService?',
    short_answer: 'Фреймворк для управления пулом потоков. Упрощает выполнение асинхронных задач, управление жизненным циклом потоков.'
  },
  {
    category: 'Multithreading',
    question: 'В чем разница между wait() и sleep()?',
    short_answer: 'wait() освобождает монитор, вызывается на объекте. sleep() не освобождает монитор, вызывается на Thread.'
  },

  // OOP
  {
    category: 'OOP',
    question: 'Что такое инкапсуляция?',
    short_answer: 'Сокрытие внутренней реализации класса, доступ через публичные методы (геттеры/сеттеры).'
  },
  {
    category: 'OOP',
    question: 'Что такое полиморфизм?',
    short_answer: 'Способность объекта принимать разные формы. Переопределение методов (runtime) и перегрузка (compile time).'
  },
  {
    category: 'OOP',
    question: 'В чем разница между абстрактным классом и интерфейсом?',
    short_answer: 'Абстрактный класс может иметь состояние и реализацию. Интерфейс - только контракт (с Java 8+ default методы возможны).'
  },
  {
    category: 'OOP',
    question: 'Что такое композиция и агрегация?',
    short_answer: 'Композиция - сильная связь (компонент не существует отдельно). Агрегация - слабая связь (компонент может существовать независимо).'
  },
  {
    category: 'OOP',
    question: 'Что такое SOLID принципы?',
    short_answer: 'S-Single Responsibility, O-Open/Closed, L-Liskov Substitution, I-Interface Segregation, D-Dependency Inversion. Основа чистого кода.'
  },

  // Spring Framework
  {
    category: 'Spring',
    question: 'Что такое Dependency Injection?',
    short_answer: 'Паттерн передачи зависимостей извне, а не создания внутри класса. Spring контейнер управляет зависимостями.'
  },
  {
    category: 'Spring',
    question: 'Какие есть scope у Spring beans?',
    short_answer: 'singleton (по умолчанию), prototype, request, session, application (для веб-приложений).'
  },
  {
    category: 'Spring',
    question: 'В чем разница между @Component, @Service, @Repository?',
    short_answer: '@Component - общий. @Service - бизнес-логика. @Repository - работа с БД + обработка исключений. Семантическая разница.'
  },
  {
    category: 'Spring',
    question: 'Что такое @Transactional?',
    short_answer: 'Аннотация для управления транзакциями. При исключении откатывает изменения БД. По умолчанию только для RuntimeException.'
  },
  {
    category: 'Spring',
    question: 'Что такое Spring Boot Auto-configuration?',
    short_answer: 'Автоматическая настройка компонентов на основе classpath. Уменьшает boilerplate конфигурацию.'
  },
  {
    category: 'Spring',
    question: 'Как работает @Autowired?',
    short_answer: 'Автоматическое внедрение зависимостей. По типу (byType), по имени (@Qualifier), через конструктор/setter/поле.'
  },
  {
    category: 'Spring',
    question: 'Что такое ApplicationContext?',
    short_answer: 'Центральный интерфейс Spring IoC контейнера. Управляет бинами, их жизненным циклом, зависимостями.'
  },
  {
    category: 'Spring',
    question: 'В чем разница между @RequestMapping и @GetMapping?',
    short_answer: '@GetMapping - специализация для GET запросов. @RequestMapping - универсальная аннотация для любых HTTP методов.'
  },

  // JVM & Memory
  {
    category: 'JVM',
    question: 'Из каких областей памяти состоит JVM?',
    short_answer: 'Heap (объекты), Stack (локальные переменные, вызовы методов), Metaspace (метаданные классов), Code Cache.'
  },
  {
    category: 'JVM',
    question: 'Что такое Garbage Collection?',
    short_answer: 'Автоматическое освобождение памяти от неиспользуемых объектов. Разные алгоритмы: Serial, Parallel, G1, ZGC.'
  },
  {
    category: 'JVM',
    question: 'Что такое OutOfMemoryError?',
    short_answer: 'Ошибка когда JVM не может выделить память. Heap space, Metaspace, GC overhead limit exceeded.'
  },
  {
    category: 'JVM',
    question: 'Что такое ClassLoader?',
    short_answer: 'Загружает классы в JVM. Иерархия: Bootstrap, Extension/Platform, Application. Делегирование родителю.'
  },
  {
    category: 'JVM',
    question: 'Что такое JIT компиляция?',
    short_answer: 'Just-In-Time компиляция байт-кода в нативный код во время выполнения. Оптимизирует горячие участки кода.'
  },

  // Exception Handling
  {
    category: 'Exceptions',
    question: 'В чем разница между checked и unchecked exceptions?',
    short_answer: 'Checked - обязательная обработка (IOException). Unchecked - наследуют RuntimeException, необязательна обработка (NullPointerException).'
  },
  {
    category: 'Exceptions',
    question: 'Когда использовать throw vs throws?',
    short_answer: 'throw - бросить исключение (в теле метода). throws - объявить, что метод может бросить исключение (в сигнатуре).'
  },
  {
    category: 'Exceptions',
    question: 'Что такое try-with-resources?',
    short_answer: 'Автоматическое закрытие ресурсов (AutoCloseable). Ресурс закрывается в конце блока try, даже при исключении.'
  },
  {
    category: 'Exceptions',
    question: 'Можно ли поймать Error?',
    short_answer: 'Технически можно, но не нужно. Error для критических ошибок JVM (OutOfMemoryError), приложение обычно не может восстановиться.'
  }
];

const seedDatabase = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🌱 Starting database seeding...');

    // Clear existing questions
    await client.query('DELETE FROM user_progress');
    await client.query('DELETE FROM questions');
    console.log('🗑️  Cleared existing data');

    // Insert questions
    for (const q of questions) {
      await client.query(
        `INSERT INTO questions (category, question_text, short_answer) 
         VALUES ($1, $2, $3)`,
        [q.category, q.question, q.short_answer]
      );
    }

    console.log(`✅ Inserted ${questions.length} questions`);
    
    // Show statistics
    const stats = await client.query(`
      SELECT category, COUNT(*) as count 
      FROM questions 
      GROUP BY category 
      ORDER BY category
    `);
    
    console.log('\n📊 Questions by category:');
    stats.rows.forEach(row => {
      console.log(`   ${row.category}: ${row.count} questions`);
    });

    console.log('\n🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during database seeding:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

seedDatabase().catch(console.error);
