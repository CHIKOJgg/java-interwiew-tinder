import pool from '../config/database.js';

const questions = [
  // ==================== JAVA CORE (58 вопросов) ====================

  // Основы (было 20, оставляем)
  {
    category: 'Java Core',
    question: 'В чем разница между == и equals() в Java?',
    short_answer:
      '== сравнивает ссылки на объекты, equals() сравнивает содержимое объектов. Для примитивов == сравнивает значения.',
  },
  {
    category: 'Java Core',
    question: 'Что такое контракт equals() и hashCode()?',
    short_answer:
      'Если два объекта равны по equals(), их hashCode() должны быть одинаковыми. Обратное не обязательно.',
  },
  {
    category: 'Java Core',
    question: 'Что такое immutable объекты и зачем они нужны?',
    short_answer:
      'Неизменяемые объекты, состояние которых нельзя изменить после создания. Безопасны для многопоточности, кэширования.',
  },
  {
    category: 'Java Core',
    question: 'В чем разница между String, StringBuilder и StringBuffer?',
    short_answer:
      'String - immutable. StringBuilder - mutable, не потокобезопасен. StringBuffer - mutable, потокобезопасен (медленнее).',
  },
  {
    category: 'Java Core',
    question: 'Что такое autoboxing и unboxing?',
    short_answer:
      'Автоматическое преобразование между примитивами и обертками: int ↔ Integer. Может влиять на производительность.',
  },
  {
    category: 'Java Core',
    question: 'Чем отличается final, finally и finalize?',
    short_answer:
      'final - модификатор неизменности. finally - блок в try-catch. finalize - устаревший метод перед GC.',
  },
  {
    category: 'Java Core',
    question: 'Что такое String Pool в Java?',
    short_answer:
      'Область памяти для хранения уникальных строковых литералов. Экономит память через переиспользование.',
  },
  {
    category: 'Java Core',
    question: 'Какие есть модификаторы доступа в Java?',
    short_answer:
      'public (всем), protected (пакет + наследники), default/package-private (только пакет), private (только класс).',
  },
  {
    category: 'Java Core',
    question: 'Что такое static ключевое слово?',
    short_answer:
      'Принадлежит классу, а не экземпляру. Загружается при загрузке класса. Используется для констант, утилит.',
  },
  {
    category: 'Java Core',
    question: 'В чем разница между abstract class и interface?',
    short_answer:
      'Abstract класс может иметь состояние и конструктор. Interface - только методы (с Java 8 - default методы).',
  },
  {
    category: 'Java Core',
    question: 'Что такое Wrapper классы?',
    short_answer:
      'Обертки для примитивов: Integer, Double, Boolean и т.д. Позволяют использовать примитивы как объекты.',
  },
  {
    category: 'Java Core',
    question: 'Что такое varargs?',
    short_answer:
      'Variable arguments - переменное количество аргументов. Синтаксис: void method(String... args). Становится массивом.',
  },
  {
    category: 'Java Core',
    question: 'Что такое enum в Java?',
    short_answer:
      'Специальный тип для перечислений. Может иметь поля, методы, конструктор. Потокобезопасен, реализует Singleton.',
  },
  {
    category: 'Java Core',
    question: 'Что такое Generics?',
    short_answer:
      'Параметризованные типы. Обеспечивают type safety во время компиляции. Пример: List<String>.',
  },
  {
    category: 'Java Core',
    question: 'Что такое Type Erasure?',
    short_answer:
      'Generics информация удаляется во время компиляции. В runtime List<String> = List<Integer> = List.',
  },
  {
    category: 'Java Core',
    question: 'Что такое wildcard в Generics?',
    short_answer:
      '? - неизвестный тип. ? extends T - ограничение сверху. ? super T - ограничение снизу.',
  },
  {
    category: 'Java Core',
    question: 'Что такое transient модификатор?',
    short_answer:
      'Поле не сериализуется. Используется для временных данных, паролей, вычисляемых значений.',
  },
  {
    category: 'Java Core',
    question: 'Что такое volatile переменная?',
    short_answer:
      'Гарантирует видимость изменений между потоками. Запрещает кэширование в CPU кэше.',
  },
  {
    category: 'Java Core',
    question: 'Что такое instanceof оператор?',
    short_answer:
      'Проверяет является ли объект экземпляром класса или интерфейса. Возвращает boolean.',
  },
  {
    category: 'Java Core',
    question: 'Что такое classpath?',
    short_answer:
      'Путь где JVM ищет .class файлы и JAR библиотеки. Задается через -cp или CLASSPATH.',
  },
  // Дополнительные Java Core (30 из предыдущего дополнения)
  {
    category: 'Java Core',
    question: 'Какие примитивные типы есть в Java?',
    short_answer:
      'byte, short, int, long, float, double, char, boolean. Размеры и значения по умолчанию.',
  },
  {
    category: 'Java Core',
    question:
      'Что такое автоматическое приведение типов (widening) и явное (narrowing)?',
    short_answer:
      'Widening – неявное преобразование меньшего типа в больший. Narrowing – явное (cast) с возможной потерей данных.',
  },
  {
    category: 'Java Core',
    question:
      'В чем разница между перегрузкой (overloading) и переопределением (overriding)?',
    short_answer:
      'Overloading – статический полиморфизм (разные сигнатуры в одном классе). Overriding – динамический полиморфизм (изменение поведения в наследнике).',
  },
  {
    category: 'Java Core',
    question: 'Можно ли переопределить static метод?',
    short_answer:
      'Нет, static методы принадлежат классу, скрываются (hiding), а не переопределяются.',
  },
  {
    category: 'Java Core',
    question: 'Что такое конструктор по умолчанию?',
    short_answer:
      'Конструктор без параметров, создаваемый компилятором, если не определён ни один конструктор.',
  },
  {
    category: 'Java Core',
    question: 'Зачем нужен конструктор копирования?',
    short_answer:
      'Создание нового объекта как копии существующего. Позволяет контролировать копирование.',
  },
  {
    category: 'Java Core',
    question: 'Что такое блоки инициализации (instance и static)?',
    short_answer:
      '{} – инициализация экземпляра (выполняется перед конструктором). static {} – инициализация класса (один раз при загрузке).',
  },
  {
    category: 'Java Core',
    question: 'Какие существуют виды вложенных классов?',
    short_answer:
      'static nested class, inner class (non-static), local class, anonymous class. Различия в доступе и области видимости.',
  },
  {
    category: 'Java Core',
    question: 'Что такое анонимные классы?',
    short_answer:
      'Классы без имени, объявляемые и инстанцируемые одновременно. Часто для реализации интерфейсов/абстрактных классов на месте.',
  },
  {
    category: 'Java Core',
    question: 'Для чего используется ключевое слово strictfp?',
    short_answer:
      'Обеспечивает строгую совместимость с плавающей точкой (одинаковые результаты на разных платформах).',
  },
  {
    category: 'Java Core',
    question: 'Что такое var (локальная переменная с выводом типа)?',
    short_answer:
      'Ключевое слово (Java 10+) для автоматического вывода типа локальной переменной на основе инициализатора.',
  },
  {
    category: 'Java Core',
    question: 'Что такое records (Java 14+)?',
    short_answer:
      'Неизменяемые классы-данные, автоматически генерируют конструктор, equals, hashCode, toString, геттеры.',
  },
  {
    category: 'Java Core',
    question: 'Что такое текстовые блоки (text blocks)?',
    short_answer:
      'Многострочные строки (Java 13+) с сохранением форматирования, ограничены тройными кавычками """."',
  },
  {
    category: 'Java Core',
    question: 'Что такое switch expression (Java 12+)?',
    short_answer:
      'Новая форма switch, которая может возвращать значение, использует -> и yield, исключает проваливание.',
  },
  {
    category: 'Java Core',
    question: 'Что такое pattern matching для instanceof (Java 16+)?',
    short_answer:
      'Совмещение проверки типа и объявления переменной: if (obj instanceof String s) { ... }.',
  },
  {
    category: 'Java Core',
    question: 'Что такое sealed классы (Java 17+)?',
    short_answer:
      'Ограничивают иерархию наследования: класс может иметь только указанные подклассы (permits).',
  },
  {
    category: 'Java Core',
    question: 'Как работает рефлексия в Java?',
    short_answer:
      'Позволяет анализировать и изменять поведение классов/объектов во время выполнения через API java.lang.reflect.',
  },
  {
    category: 'Java Core',
    question: 'Для чего нужны аннотации?',
    short_answer:
      'Метаданные для кода. Могут обрабатываться компилятором (@Override) или в runtime через рефлексию.',
  },
  {
    category: 'Java Core',
    question: 'Что такое сериализация и десериализация?',
    short_answer:
      'Процесс преобразования объекта в поток байт (и обратно). Реализуется интерфейсом Serializable.',
  },
  {
    category: 'Java Core',
    question: 'Как запретить сериализацию поля?',
    short_answer:
      'Использовать модификатор transient. Поле не будет сохранено при сериализации.',
  },
  {
    category: 'Java Core',
    question: 'Что такое интерфейс Cloneable и метод clone()?',
    short_answer:
      'Маркерный интерфейс для разрешения клонирования. Object.clone() выполняет поверхностное копирование.',
  },
  {
    category: 'Java Core',
    question: 'В чем разница между глубоким и поверхностным копированием?',
    short_answer:
      'Поверхностное – копирует ссылки на объекты. Глубокое – создаёт копии всех вложенных объектов.',
  },
  {
    category: 'Java Core',
    question: 'Что такое класс Object и его основные методы?',
    short_answer:
      'Базовый класс для всех классов. Методы: equals, hashCode, toString, clone, finalize, getClass, wait, notify, notifyAll.',
  },
  {
    category: 'Java Core',
    question: 'Что такое класс Class и для чего он нужен?',
    short_answer:
      'Объект Class содержит метаинформацию о классе. Получается через .class, getClass(), Class.forName().',
  },
  {
    category: 'Java Core',
    question: 'Что такое загрузка класса (class loading)?',
    short_answer:
      'Процесс поиска и загрузки .class файла в JVM. Выполняется ClassLoader’ом.',
  },
  {
    category: 'Java Core',
    question: 'Что такое инициализация класса?',
    short_answer:
      'Выполнение static инициализаторов и присвоение static полям. Происходит при активном использовании класса.',
  },
  {
    category: 'Java Core',
    question: 'Что такое ковариантность и контравариантность в дженериках?',
    short_answer:
      'Ковариантность: ? extends T (можно читать). Контравариантность: ? super T (можно писать). Инвариантность: List<T>.',
  },
  {
    category: 'Java Core',
    question: 'Что такое Raw Type в дженериках?',
    short_answer:
      'Использование generic-класса без указания типа (List list). Небезопасно, существует для совместимости.',
  },
  {
    category: 'Java Core',
    question:
      'В чем разница между ClassNotFoundException и NoClassDefFoundError?',
    short_answer:
      'ClassNotFoundException – при явной загрузке класса. NoClassDefFoundError – класс был доступен при компиляции, но не найден в runtime.',
  },
  {
    category: 'Java Core',
    question: 'Что такое стек вызовов (call stack)?',
    short_answer:
      'Структура, хранящая информацию о вызванных методах. Каждый вызов создаёт фрейм с локальными переменными.',
  },
  // Дополнительные 8 вопросов (Java Core)
  {
    category: 'Java Core',
    question: 'Что такое метод default в интерфейсах?',
    short_answer:
      'Метод с реализацией по умолчанию (Java 8). Позволяет добавлять новые методы в интерфейсы без нарушения существующего кода.',
  },
  {
    category: 'Java Core',
    question: 'Что такое статический метод в интерфейсе?',
    short_answer:
      'Статический метод (Java 8), принадлежит интерфейсу, вызывается через имя интерфейса, не наследуется классами.',
  },
  {
    category: 'Java Core',
    question: 'Что такое приватный метод в интерфейсе?',
    short_answer:
      'Приватный метод (Java 9) используется внутри интерфейса для разделения общей логики default/static методов.',
  },
  {
    category: 'Java Core',
    question: 'Что такое маркерный интерфейс (marker interface)?',
    short_answer:
      'Интерфейс без методов (например, Serializable, Cloneable). Указывает, что класс обладает определённым свойством.',
  },
  {
    category: 'Java Core',
    question: 'Что такое функциональный интерфейс?',
    short_answer:
      'Интерфейс с одним абстрактным методом. Может иметь default и static методы. Используется в лямбда-выражениях.',
  },
  {
    category: 'Java Core',
    question:
      'Что такое инвариантность, ковариантность и контравариантность в дженериках?',
    short_answer:
      'Инвариантность: List<T> не может быть присвоен List<U>. Ковариантность: ? extends T. Контравариантность: ? super T.',
  },
  {
    category: 'Java Core',
    question: 'Что такое захват типа (type capture) в дженериках?',
    short_answer:
      'Процесс, при котором компилятор заменяет wildcard на уникальный идентификатор для обеспечения типобезопасности.',
  },
  {
    category: 'Java Core',
    question: 'Что такое перегрузка методов с varargs?',
    short_answer:
      'Может привести к неоднозначности. Правила разрешения перегрузки учитывают совместимость с varargs в последнюю очередь.',
  },

  // ==================== COLLECTIONS (58 вопросов) ====================

  // Существующие 15 вопросов (из исходного файла)
  {
    category: 'Collections',
    question: 'Как работает HashMap внутри?',
    short_answer:
      "Массив bucket'ов + связные списки/деревья. Использует hashCode() для определения bucket, equals() для поиска внутри.",
  },
  {
    category: 'Collections',
    question: 'В чем разница между ArrayList и LinkedList?',
    short_answer:
      'ArrayList - массив (быстрый доступ O(1), вставка O(n)). LinkedList - двусвязный список (доступ O(n), вставка O(1)).',
  },
  {
    category: 'Collections',
    question: 'Что такое fail-fast и fail-safe итераторы?',
    short_answer:
      'Fail-fast бросает ConcurrentModificationException при изменении коллекции. Fail-safe работает с копией.',
  },
  {
    category: 'Collections',
    question: 'В чем разница между HashMap и ConcurrentHashMap?',
    short_answer:
      'ConcurrentHashMap потокобезопасен без полной блокировки (сегментная блокировка). HashMap не потокобезопасен.',
  },
  {
    category: 'Collections',
    question: 'Для чего нужен TreeMap?',
    short_answer:
      'Отсортированная Map на основе красно-черного дерева. Ключи хранятся в отсортированном порядке.',
  },
  {
    category: 'Collections',
    question: 'В чем разница между Set и List?',
    short_answer:
      'Set - не содержит дубликатов, порядок не гарантирован. List - допускает дубликаты, сохраняет порядок вставки.',
  },
  {
    category: 'Collections',
    question: 'Что такое Comparable и Comparator?',
    short_answer:
      'Comparable - естественный порядок (compareTo в классе). Comparator - внешний компаратор для кастомной сортировки.',
  },
  {
    category: 'Collections',
    question: 'Когда использовать HashSet vs TreeSet?',
    short_answer:
      'HashSet - O(1) операции, без порядка. TreeSet - O(log n), элементы отсортированы.',
  },
  {
    category: 'Collections',
    question: 'Что такое LinkedHashMap?',
    short_answer:
      'HashMap с сохранением порядка вставки. Использует двусвязный список для поддержания порядка.',
  },
  {
    category: 'Collections',
    question: 'В чем разница между Collection и Collections?',
    short_answer:
      'Collection - интерфейс для коллекций. Collections - утилитный класс со статическими методами (sort, shuffle).',
  },
  {
    category: 'Collections',
    question: 'Что такое PriorityQueue?',
    short_answer:
      'Очередь с приоритетом на основе кучи. Элементы извлекаются в порядке приоритета, не FIFO.',
  },
  {
    category: 'Collections',
    question: 'Что такое ArrayDeque?',
    short_answer:
      'Двусторонняя очередь на массиве. Быстрее Stack и LinkedList для операций стека/очереди.',
  },
  {
    category: 'Collections',
    question: 'Как работает WeakHashMap?',
    short_answer:
      'Ключи - слабые ссылки. GC может удалить entry если ключ больше нигде не используется.',
  },
  {
    category: 'Collections',
    question: 'Что такое IdentityHashMap?',
    short_answer:
      'Сравнивает ключи по == вместо equals(). Используется для объектов с переопределенным equals.',
  },
  {
    category: 'Collections',
    question: 'В чем разница между HashMap и Hashtable?',
    short_answer:
      'Hashtable устарела, синхронизирована, не допускает null. HashMap современная, быстрее, допускает null.',
  },
  // Дополнительные 35 вопросов из предыдущего дополнения
  {
    category: 'Collections',
    question: 'Как устроена HashMap (детали: бакеты, коллизии, пороги)?',
    short_answer:
      'Массив Node<K,V> (бакеты). При коллизии – цепочка (связный список) или дерево (TREEIFY_THRESHOLD = 8). Коэффициент загрузки 0.75.',
  },
  {
    category: 'Collections',
    question: 'Как работает HashSet внутри?',
    short_answer:
      'Использует HashMap с фиктивным значением-заглушкой (PRESENT). Элементы хранятся как ключи.',
  },
  {
    category: 'Collections',
    question: 'В чем разница между TreeSet и HashSet?',
    short_answer:
      'TreeSet – на основе TreeMap, отсортирован, O(log n). HashSet – на основе HashMap, O(1), без порядка.',
  },
  {
    category: 'Collections',
    question: 'Что такое EnumSet и EnumMap?',
    short_answer:
      'Специализированные коллекции для enum’ов. Реализованы через битовые векторы, очень эффективны по памяти и скорости.',
  },
  {
    category: 'Collections',
    question: 'Что такое IdentityHashMap и где применяется?',
    short_answer:
      'Сравнивает ключи по == (референс), а не equals. Используется для системных задач, прокси, сериализации.',
  },
  {
    category: 'Collections',
    question: 'В чем разница между Stack и Deque (ArrayDeque)?',
    short_answer:
      'Stack – устаревший, синхронизирован. Deque – современная двусторонняя очередь, рекомендуется вместо Stack и LinkedList.',
  },
  {
    category: 'Collections',
    question: 'Что такое BlockingQueue и какие реализации знаете?',
    short_answer:
      'Очередь с блокирующими операциями (put/take). Реализации: ArrayBlockingQueue, LinkedBlockingQueue, PriorityBlockingQueue, DelayQueue, SynchronousQueue.',
  },
  {
    category: 'Collections',
    question:
      'Что такое ConcurrentHashMap и как обеспечивает потокобезопасность?',
    short_answer:
      'Использует сегментирование (до Java 8) или CAS + synchronized на отдельных бакетах (Java 8+). Не блокирует всю таблицу.',
  },
  {
    category: 'Collections',
    question: 'Что такое CopyOnWriteArrayList?',
    short_answer:
      'Потокобезопасный список, при модификации создаёт новую копию массива. Итератор не бросает ConcurrentModificationException.',
  },
  {
    category: 'Collections',
    question: 'Что такое ConcurrentSkipListMap?',
    short_answer:
      'Потокобезопасная сортированная карта на основе skip-list. Аналог TreeMap для многопоточности.',
  },
  {
    category: 'Collections',
    question: 'Что такое LinkedHashSet и LinkedHashMap?',
    short_answer:
      'Сохраняют порядок вставки (или порядок доступа для LinkedHashMap с параметром accessOrder).',
  },
  {
    category: 'Collections',
    question:
      'Как получить синхронизированную коллекцию из несинхронизированной?',
    short_answer:
      'Collections.synchronizedList(list), synchronizedMap(map) и т.д. Оборачивают коллекцию, синхронизируя методы.',
  },
  {
    category: 'Collections',
    question: 'Что такое unmodifiable коллекции?',
    short_answer:
      'Неизменяемые обёртки: Collections.unmodifiableList(list). Любая попытка модификации бросит исключение.',
  },
  {
    category: 'Collections',
    question: 'Что такое List.of(), Set.of(), Map.of() (Java 9)?',
    short_answer:
      'Фабричные методы для создания неизменяемых коллекций (immutable). Не допускают null.',
  },
  {
    category: 'Collections',
    question: 'В чем разница между Iterator и ListIterator?',
    short_answer:
      'ListIterator позволяет итерироваться в обоих направлениях, изменять элементы, узнавать индекс. Доступен только для List.',
  },
  {
    category: 'Collections',
    question: 'Что такое Spliterator?',
    short_answer:
      'Специализированный итератор для параллельной обработки (обхода и разбиения данных), используется в Stream API.',
  },
  {
    category: 'Collections',
    question: 'Что такое fail-safe итератор?',
    short_answer:
      'Работает с копией коллекции или не бросает исключений при изменении. Пример: итератор ConcurrentHashMap.',
  },
  {
    category: 'Collections',
    question: 'Как работает PriorityQueue?',
    short_answer:
      'Основана на куче (min-heap по умолчанию). Элементы упорядочиваются согласно Comparator или Comparable.',
  },
  {
    category: 'Collections',
    question: 'Что такое ArrayDeque и почему быстрее Stack и LinkedList?',
    short_answer:
      'Реализован на циклическом массиве. Операции добавления/удаления с обоих концов за O(1), меньше накладных расходов.',
  },
  {
    category: 'Collections',
    question: 'Что такое WeakHashMap и для чего используется?',
    short_answer:
      'Ключи хранятся по слабым ссылкам. Если ключ больше не используется вне карты, запись удаляется GC. Применяется в кэшах.',
  },
  {
    category: 'Collections',
    question: 'Что такое Properties и как используется?',
    short_answer:
      'Наследник Hashtable для хранения пар ключ-значение (строки). Используется для конфигураций, загрузки .properties файлов.',
  },
  {
    category: 'Collections',
    question: 'Что такое BitSet?',
    short_answer:
      'Динамический массив битов. Позволяет эффективно хранить флаги и выполнять поразрядные операции.',
  },
  {
    category: 'Collections',
    question: 'Какая сложность основных операций в ArrayList?',
    short_answer:
      'get, set – O(1); add (в конец) – амортизированно O(1); add(index), remove – O(n).',
  },
  {
    category: 'Collections',
    question: 'Какая сложность основных операций в LinkedList?',
    short_answer:
      'get, set – O(n); add/remove в начале/конце – O(1); add/remove по индексу – O(n).',
  },
  {
    category: 'Collections',
    question: 'Что такое initial capacity и load factor в HashMap?',
    short_answer:
      'Начальный размер массива бакетов (по умолчанию 16) и коэффициент заполнения (0.75), при превышении происходит увеличение (rehash).',
  },
  {
    category: 'Collections',
    question: 'Может ли HashMap содержать null ключ и null значения?',
    short_answer:
      'Да, HashMap допускает один null ключ и множество null значений. Hashtable не допускает null.',
  },
  {
    category: 'Collections',
    question: 'Что такое TreeMap и как он сортирует ключи?',
    short_answer:
      'Реализация красно-черного дерева. Ключи сортируются либо естественным порядком (Comparable), либо через Comparator.',
  },
  {
    category: 'Collections',
    question: 'Чем отличается Collection от Collections?',
    short_answer:
      'Collection – интерфейс верхнего уровня. Collections – утилитный класс со статическими методами.',
  },
  {
    category: 'Collections',
    question: 'Что такое keySet(), values(), entrySet() в Map?',
    short_answer:
      'Представления коллекций ключей, значений и пар. Изменения в представлениях отражаются на исходной Map.',
  },
  {
    category: 'Collections',
    question: 'Как перебрать HashMap и удалить элементы во время итерации?',
    short_answer:
      'Использовать Iterator.remove() или метод removeIf() (Java 8) для коллекций-представлений.',
  },
  {
    category: 'Collections',
    question: 'Что такое computeIfAbsent, merge, putIfAbsent в Map?',
    short_answer:
      'Методы для атомарных операций: вычислить значение, если ключ отсутствует; объединить значения; положить, только если отсутствует.',
  },
  {
    category: 'Collections',
    question: 'В чем разница между remove и poll в очереди?',
    short_answer:
      'remove() бросает исключение, если очередь пуста; poll() возвращает null.',
  },
  {
    category: 'Collections',
    question: 'Что такое Deque и его основные методы?',
    short_answer:
      'Двусторонняя очередь. Методы: addFirst/addLast, removeFirst/removeLast, peekFirst/peekLast.',
  },
  {
    category: 'Collections',
    question: 'Какие коллекции синхронизированы по умолчанию?',
    short_answer:
      'Vector, Stack, Hashtable, а также обёртки Collections.synchronizedXXX(). Concurrent коллекции не синхронизированы, а потокобезопасны.',
  },
  {
    category: 'Collections',
    question: 'Что такое randomAccess интерфейс?',
    short_answer:
      'Маркерный интерфейс для списков с быстрым произвольным доступом (ArrayList). Используется в алгоритмах для выбора стратегии итерации.',
  },
  // Дополнительные 8 вопросов (Collections)
  {
    category: 'Collections',
    question: 'Что такое NavigableMap и NavigableSet?',
    short_answer:
      'Расширения SortedMap/SortedSet с методами для навигации: lowerEntry, floorEntry, ceilingEntry, higherEntry и т.д.',
  },
  {
    category: 'Collections',
    question: 'Как работает LinkedHashSet?',
    short_answer:
      'Использует LinkedHashMap для хранения элементов с сохранением порядка вставки.',
  },
  {
    category: 'Collections',
    question: 'В чем разница между Synchronized и Concurrent коллекциями?',
    short_answer:
      'Synchronized коллекции блокируют всю коллекцию при каждом доступе. Concurrent используют сегментные блокировки или CAS, позволяя параллельный доступ.',
  },
  {
    category: 'Collections',
    question: 'Что такое BlockingDeque?',
    short_answer:
      'Двусторонняя блокирующая очередь. Реализация: LinkedBlockingDeque.',
  },
  {
    category: 'Collections',
    question: 'Как реализован DelayQueue?',
    short_answer:
      'Очередь элементов, которые могут быть взяты только после истечения задержки. Использует PriorityQueue с Delayed элементами.',
  },
  {
    category: 'Collections',
    question: 'Что такое TransferQueue?',
    short_answer:
      'Блокирующая очередь, в которой производитель может ждать, пока потребитель не заберёт элемент (метод transfer). Реализация: LinkedTransferQueue.',
  },
  {
    category: 'Collections',
    question: 'Что такое Queue и Deque, в чем разница?',
    short_answer:
      'Queue – очередь (FIFO). Deque – двусторонняя очередь, поддерживает добавление/удаление с обоих концов.',
  },
  {
    category: 'Collections',
    question: 'Как создать неизменяемую коллекцию до Java 9?',
    short_answer:
      'Collections.unmodifiableXXX(list) или Arrays.asList() для фиксированного размера, но неизменяемость не полная (можно изменить элементы).',
  },

  // ==================== MULTITHREADING (58 вопросов) ====================

  // Существующие 15 вопросов (из исходного файла)
  {
    category: 'Multithreading',
    question: 'Чем отличается процесс от потока?',
    short_answer:
      'Процесс - независимая программа с собственной памятью. Поток - легковесная единица выполнения внутри процесса.',
  },
  {
    category: 'Multithreading',
    question: 'Что такое синхронизация?',
    short_answer:
      'Механизм предотвращения одновременного доступа к общим ресурсам. Решает проблему race condition.',
  },
  {
    category: 'Multithreading',
    question: 'В чем разница между synchronized и Lock?',
    short_answer:
      'synchronized - встроенный, автоосвобождение. Lock - гибкий API (tryLock, lockInterruptibly), ручное освобождение.',
  },
  {
    category: 'Multithreading',
    question: 'Что такое volatile переменная?',
    short_answer:
      'Гарантирует видимость изменений между потоками. Чтение/запись из основной памяти, не из кэша CPU.',
  },
  {
    category: 'Multithreading',
    question: 'Что такое deadlock?',
    short_answer:
      'Взаимная блокировка потоков. Избежать: упорядоченная блокировка, timeout, избегать вложенных блокировок.',
  },
  {
    category: 'Multithreading',
    question: 'Для чего нужен ThreadLocal?',
    short_answer:
      'Хранит переменные уникальные для каждого потока. Каждый поток видит только свою копию.',
  },
  {
    category: 'Multithreading',
    question: 'Что такое ExecutorService?',
    short_answer:
      'Фреймворк для управления пулом потоков. Упрощает выполнение асинхронных задач.',
  },
  {
    category: 'Multithreading',
    question: 'В чем разница между wait() и sleep()?',
    short_answer:
      'wait() освобождает монитор, вызывается на объекте. sleep() не освобождает монитор, вызывается на Thread.',
  },
  {
    category: 'Multithreading',
    question: 'Что такое AtomicInteger?',
    short_answer:
      'Потокобезопасные атомарные операции над int без синхронизации. Использует CAS (Compare-And-Swap).',
  },
  {
    category: 'Multithreading',
    question: 'Что такое CountDownLatch?',
    short_answer:
      'Синхронизатор позволяющий потокам ждать пока счетчик не достигнет нуля. Одноразовый.',
  },
  {
    category: 'Multithreading',
    question: 'Что такое CyclicBarrier?',
    short_answer:
      'Барьер для синхронизации потоков. Потоки ждут друг друга. Переиспользуемый.',
  },
  {
    category: 'Multithreading',
    question: 'Что такое Semaphore?',
    short_answer:
      'Ограничивает количество потоков имеющих доступ к ресурсу. Используется для пулов соединений.',
  },
  {
    category: 'Multithreading',
    question: 'Что такое ReadWriteLock?',
    short_answer:
      'Разделяет блокировки на чтение и запись. Много читателей или один писатель.',
  },
  {
    category: 'Multithreading',
    question: 'Что такое ForkJoinPool?',
    short_answer:
      'Пул потоков для divide-and-conquer алгоритмов. Work-stealing для балансировки нагрузки.',
  },
  {
    category: 'Multithreading',
    question: 'Что такое CompletableFuture?',
    short_answer:
      'Асинхронные вычисления с цепочкой обработчиков. Композиция и комбинирование Future.',
  },
  // Дополнительные 35 вопросов из предыдущего дополнения
  {
    category: 'Multithreading',
    question: 'Какие состояния (жизненный цикл) потока в Java?',
    short_answer:
      'NEW, RUNNABLE, BLOCKED, WAITING, TIMED_WAITING, TERMINATED. Переходы между состояниями.',
  },
  {
    category: 'Multithreading',
    question: 'Как создать поток?',
    short_answer:
      '1) extends Thread, переопределить run(). 2) implements Runnable, передать в Thread. 3) implements Callable, через FutureTask. 4) ExecutorService.',
  },
  {
    category: 'Multithreading',
    question: 'Что такое демон-потоки?',
    short_answer:
      'Потоки, работающие в фоне (setDaemon(true)). JVM завершается, когда все пользовательские потоки закончены, не дожидаясь демонов.',
  },
  {
    category: 'Multithreading',
    question: 'Чем отличается wait() от sleep()?',
    short_answer:
      'wait() требует монитора, освобождает его, может быть разбужен notify(). sleep() статический метод, не освобождает монитор.',
  },
  {
    category: 'Multithreading',
    question: 'Что такое монитор в Java?',
    short_answer:
      'Механизм синхронизации: каждый объект имеет монитор. Поток получает монитор при входе в synchronized блок/метод.',
  },
  {
    category: 'Multithreading',
    question: 'В чем разница между synchronized методом и synchronized блоком?',
    short_answer:
      'Метод синхронизируется на this (или на классе для static). Блок позволяет синхронизироваться на любом объекте, сужая область блокировки.',
  },
  {
    category: 'Multithreading',
    question: 'Что такое взаимная блокировка (deadlock) и как её избежать?',
    short_answer:
      'Ситуация, когда потоки вечно ждут ресурсы друг друга. Избегать: фиксированный порядок блокировок, tryLock с таймаутом, использование Lock.',
  },
  {
    category: 'Multithreading',
    question: 'Что такое livelock?',
    short_answer:
      'Потоки не блокируются, но постоянно меняют состояние в ответ друг на друга, не выполняя полезной работы (как два человека в коридоре).',
  },
  {
    category: 'Multithreading',
    question: 'Что такое голодание (starvation)?',
    short_answer:
      'Поток не получает доступа к ресурсу, т.к. другие потоки постоянно его захватывают (например, низкий приоритет).',
  },
  {
    category: 'Multithreading',
    question: 'Что такое race condition?',
    short_answer:
      'Состояние гонки – непредсказуемый результат при одновременном доступе к общим данным без синхронизации.',
  },
  {
    category: 'Multithreading',
    question: 'Что такое happens-before отношения?',
    short_answer:
      'Правила видимости изменений между потоками. Например, synchronized, volatile, start(), join() создают happens-before.',
  },
  {
    category: 'Multithreading',
    question: 'Для чего нужен volatile?',
    short_answer:
      'Гарантирует видимость изменений для всех потоков и запрещает переупорядочивание инструкций (happens-before).',
  },
  {
    category: 'Multithreading',
    question: 'Что такое атомарность?',
    short_answer:
      'Неделимость операции. Чтение/запись примитивов (кроме long/double) атомарны. Атомарные классы (AtomicInteger) обеспечивают атомарность составных операций.',
  },
  {
    category: 'Multithreading',
    question: 'Что такое CAS (Compare-And-Swap)?',
    short_answer:
      'Атомарная инструкция, используемая в атомарных классах. Сравнивает значение с ожидаемым и заменяет, если совпадает. Без блокировок.',
  },
  {
    category: 'Multithreading',
    question: 'Что такое LongAdder и когда его использовать?',
    short_answer:
      'Альтернатива AtomicLong при высоком конкурентном обновлении. Поддерживает набор счётчиков, уменьшая contention.',
  },
  {
    category: 'Multithreading',
    question: 'Что такое ReentrantLock?',
    short_answer:
      'Реализация Lock с возможностью повторного захвата тем же потоком. Поддерживает fairness, tryLock, lockInterruptibly.',
  },
  {
    category: 'Multithreading',
    question: 'Что такое Condition в Lock?',
    short_answer:
      'Аналог wait/notify для Lock. Позволяет иметь несколько очередей ожидания на одном Lock.',
  },
  {
    category: 'Multithreading',
    question: 'Что такое ReadWriteLock?',
    short_answer:
      'Позволяет разделять блокировки на чтение (много потоков) и запись (один поток). Увеличивает производительность при чтении.',
  },
  {
    category: 'Multithreading',
    question: 'Что такое StampedLock?',
    short_answer:
      'Более производительная альтернатива ReadWriteLock (Java 8). Поддерживает оптимистичные чтения без блокировки.',
  },
  {
    category: 'Multithreading',
    question: 'Что такое Semaphore?',
    short_answer:
      'Синхронизатор, ограничивающий количество потоков, одновременно работающих с ресурсом. Счётчик разрешений.',
  },
  {
    category: 'Multithreading',
    question: 'Что такое CountDownLatch?',
    short_answer:
      'Потоки ждут, пока счётчик не станет 0. Одноразовый. Используется для ожидания завершения группы операций.',
  },
  {
    category: 'Multithreading',
    question: 'Что такое CyclicBarrier?',
    short_answer:
      'Барьер, который ждёт, пока все потоки не достигнут его. После этого они продолжают работу. Может быть переиспользован.',
  },
  {
    category: 'Multithreading',
    question: 'Что такое Phaser?',
    short_answer:
      'Более гибкая версия CyclicBarrier и CountDownLatch. Позволяет динамически регистрировать стороны (участников).',
  },
  {
    category: 'Multithreading',
    question: 'Что такое Exchanger?',
    short_answer:
      'Синхронизатор для обмена данными между двумя потоками. Оба встают в ожидание, затем обмениваются объектами.',
  },
  {
    category: 'Multithreading',
    question:
      'Что такое BlockingQueue и как используется в паттерне Producer-Consumer?',
    short_answer:
      'Очередь с поддержкой блокирующих операций. Производитель кладёт, потребитель забирает; автоматически синхронизируется.',
  },
  {
    category: 'Multithreading',
    question: 'Что такое ThreadPoolExecutor и его параметры?',
    short_answer:
      'Реализация ExecutorService. Параметры: corePoolSize, maximumPoolSize, keepAliveTime, очередь задач, фабрика потоков, обработчик переполнения.',
  },
  {
    category: 'Multithreading',
    question: 'Что такое ScheduledThreadPoolExecutor?',
    short_answer:
      'Пул потоков для выполнения задач с задержкой или периодически. Расширяет ThreadPoolExecutor.',
  },
  {
    category: 'Multithreading',
    question: 'Что такое ForkJoinPool и work-stealing?',
    short_answer:
      'Пул для рекурсивных задач. Работники могут "воровать" задачи из очередей других работников для балансировки.',
  },
  {
    category: 'Multithreading',
    question: 'Что такое CompletableFuture?',
    short_answer:
      'Future с возможностью асинхронного выполнения, композиции, обработки результатов и исключений (thenApply, exceptionally, etc.).',
  },
  {
    category: 'Multithreading',
    question: 'Что такое FutureTask?',
    short_answer:
      'Реализация Future, обёртка для Callable/Runnable. Может быть использована с Executor или напрямую.',
  },
  {
    category: 'Multithreading',
    question: 'Что такое ThreadFactory?',
    short_answer:
      'Фабрика для создания потоков с заданной конфигурацией (имя, демон, приоритет). Используется в пулах.',
  },
  {
    category: 'Multithreading',
    question: 'Что такое ThreadLocalRandom?',
    short_answer:
      'Генератор случайных чисел, изолированный по потокам. Быстрее, чем общий Random в многопоточной среде.',
  },
  {
    category: 'Multithreading',
    question: 'Что такое параллельные стримы (parallel streams) и общий пул?',
    short_answer:
      'Стримы, использующие общий ForkJoinPool (commonPool) для параллельной обработки. Можно использовать свой пул через ForkJoinPool.submit().',
  },
  {
    category: 'Multithreading',
    question: 'Как остановить поток корректно?',
    short_answer:
      'Использовать флаг с volatile, вызывать interrupt() и проверять Thread.interrupted() или isInterrupted().',
  },
  {
    category: 'Multithreading',
    question: 'Что такое ThreadGroup?',
    short_answer:
      'Группа потоков для организации. Может применяться для управления несколькими потоками сразу (устаревший подход).',
  },
  {
    category: 'Multithreading',
    question: 'Что такое ThreadMXBean?',
    short_answer:
      'Интерфейс для мониторинга потоков через JMX. Позволяет получать информацию о deadlockах, времени выполнения и т.д.',
  },
  // Дополнительные 8 вопросов (Multithreading)
  {
    category: 'Multithreading',
    question: 'Что такое синхронизаторы в java.util.concurrent?',
    short_answer:
      'Классы, управляющие взаимодействием потоков: Semaphore, CountDownLatch, CyclicBarrier, Phaser, Exchanger.',
  },
  {
    category: 'Multithreading',
    question: 'Что такое happens-before связь?',
    short_answer:
      'Правило, определяющее, когда действия одного потока видны другому. Используется для анализа многопоточных программ.',
  },
  {
    category: 'Multithreading',
    question: 'Что такое изменчивость (visibility) проблем в многопоточности?',
    short_answer:
      'Проблема, когда изменения, сделанные одним потоком, не видны другим. Решается через volatile или синхронизацию.',
  },
  {
    category: 'Multithreading',
    question: 'Что такое атомарные операции с массивами?',
    short_answer:
      'AtomicIntegerArray, AtomicLongArray, AtomicReferenceArray обеспечивают атомарное обновление элементов.',
  },
  {
    category: 'Multithreading',
    question: 'Что такое Striped Locking?',
    short_answer:
      'Техника, при которой множество блокировок разделяют ресурс (например, ConcurrentHashMap использует сегменты/бакеты).',
  },
  {
    category: 'Multithreading',
    question: 'Что такое спин-блокировка (spinlock)?',
    short_answer:
      'Блокировка, при которой поток в цикле проверяет доступность ресурса, не отдавая процессор. Эффективна при коротких ожиданиях.',
  },
  {
    category: 'Multithreading',
    question: 'Что такое оптимистичная блокировка (optimistic locking)?',
    short_answer:
      'Предполагает, что конфликты редки, проверяет версию при записи (CAS, версии в БД).',
  },
  {
    category: 'Multithreading',
    question: 'Что такое пессимистичная блокировка (pessimistic locking)?',
    short_answer:
      'Предполагает, что конфликты часты, блокирует ресурс на время работы (synchronized, Lock).',
  },

  // ==================== SPRING (58 вопросов) ====================

  // Существующие 15 вопросов (из исходного файла)
  {
    category: 'Spring',
    question: 'Что такое Dependency Injection?',
    short_answer:
      'Паттерн передачи зависимостей извне. Spring контейнер управляет зависимостями.',
  },
  {
    category: 'Spring',
    question: 'Какие есть scope у Spring beans?',
    short_answer:
      'singleton (по умолчанию), prototype, request, session, application (для веб).',
  },
  {
    category: 'Spring',
    question: 'В чем разница между @Component, @Service, @Repository?',
    short_answer:
      '@Component - общий. @Service - бизнес-логика. @Repository - работа с БД. Семантическая разница.',
  },
  {
    category: 'Spring',
    question: 'Что такое @Transactional?',
    short_answer:
      'Управление транзакциями. При исключении откатывает изменения БД. По умолчанию только RuntimeException.',
  },
  {
    category: 'Spring',
    question: 'Что такое Spring Boot Auto-configuration?',
    short_answer:
      'Автоматическая настройка компонентов на основе classpath. Уменьшает boilerplate.',
  },
  {
    category: 'Spring',
    question: 'Как работает @Autowired?',
    short_answer:
      'Автоматическое внедрение зависимостей. По типу, по имени (@Qualifier), через конструктор/setter/поле.',
  },
  {
    category: 'Spring',
    question: 'Что такое ApplicationContext?',
    short_answer:
      'Центральный интерфейс Spring IoC контейнера. Управляет бинами, их жизненным циклом.',
  },
  {
    category: 'Spring',
    question: 'В чем разница между @RequestMapping и @GetMapping?',
    short_answer:
      '@GetMapping - специализация для GET. @RequestMapping - универсальная для любых HTTP методов.',
  },
  {
    category: 'Spring',
    question: 'Что такое @Configuration?',
    short_answer:
      'Класс Java-конфигурации Spring. Содержит @Bean методы для создания бинов.',
  },
  {
    category: 'Spring',
    question: 'Что такое Spring AOP?',
    short_answer:
      'Aspect-Oriented Programming. Внедрение сквозной функциональности (логирование, транзакции) через аспекты.',
  },
  {
    category: 'Spring',
    question: 'Что такое @PostConstruct и @PreDestroy?',
    short_answer:
      '@PostConstruct - вызывается после инициализации. @PreDestroy - перед уничтожением бина.',
  },
  {
    category: 'Spring',
    question: 'В чем разница между @Controller и @RestController?',
    short_answer:
      '@RestController = @Controller + @ResponseBody. Автоматически возвращает JSON/XML.',
  },
  {
    category: 'Spring',
    question: 'Что такое @PathVariable и @RequestParam?',
    short_answer:
      '@PathVariable - из URL пути (/users/{id}). @RequestParam - из query параметров (?id=5).',
  },
  {
    category: 'Spring',
    question: 'Что такое Spring Data JPA?',
    short_answer:
      'Упрощает работу с БД. Автогенерация запросов по имени метода. CrudRepository, JpaRepository.',
  },
  {
    category: 'Spring',
    question: 'Что такое @Conditional?',
    short_answer:
      'Условное создание бинов. Бин создается только если условие истинно.',
  },
  // Дополнительные 35 вопросов из предыдущего дополнения
  {
    category: 'Spring',
    question: 'Что такое Inversion of Control (IoC)?',
    short_answer:
      'Принцип, при котором управление потоком программы и объектами передаётся контейнеру (Spring IoC).',
  },
  {
    category: 'Spring',
    question: 'Какие способы конфигурации Spring существуют?',
    short_answer:
      'XML-конфигурация, Java-конфигурация (@Configuration, @Bean), аннотационная (@Component, @Autowired).',
  },
  {
    category: 'Spring',
    question: 'Что такое жизненный цикл бина в Spring?',
    short_answer:
      'Создание (через конструктор), внедрение зависимостей, пост-обработка (@PostConstruct, afterPropertiesSet), использование, уничтожение (@PreDestroy, destroy-method).',
  },
  {
    category: 'Spring',
    question: 'Что такое BeanPostProcessor?',
    short_answer:
      'Интерфейс для перехвата инициализации бинов (до/после методов init). Позволяет модифицировать или оборачивать бины.',
  },
  {
    category: 'Spring',
    question: 'Что такое BeanFactory vs ApplicationContext?',
    short_answer:
      'BeanFactory – базовый контейнер, ленивая инициализация. ApplicationContext – расширенный (события, ресурсы, i18n, AOP), eager инициализация.',
  },
  {
    category: 'Spring',
    question: 'Как задать scope prototype?',
    short_answer:
      '@Scope("prototype") или scope="prototype". Каждый запрос создаёт новый экземпляр.',
  },
  {
    category: 'Spring',
    question: 'Что такое @Qualifier и @Primary?',
    short_answer:
      '@Qualifier уточняет кандидата при внедрении по типу, если несколько бинов. @Primary указывает основной бин.',
  },
  {
    category: 'Spring',
    question: 'Как работает @Value?',
    short_answer:
      'Внедряет значения из properties файлов, system properties или выражений SpEL: @Value("${my.property}").',
  },
  {
    category: 'Spring',
    question: 'Что такое @PropertySource?',
    short_answer:
      'Указывает расположение properties файлов для загрузки в Environment.',
  },
  {
    category: 'Spring',
    question: 'Что такое профили Spring (Profiles)?',
    short_answer:
      'Позволяют активировать/деактивировать набор бинов в зависимости от окружения (@Profile, spring.profiles.active).',
  },
  {
    category: 'Spring',
    question: 'Что такое события (ApplicationEvent) и слушатели?',
    short_answer:
      'Механизм взаимодействия между бинами через публикацию и прослушивание событий. @EventListener, ApplicationEventPublisher.',
  },
  {
    category: 'Spring',
    question: 'Что такое ResourceLoader и Resource?',
    short_answer:
      'Абстракция для доступа к ресурсам (файлы, classpath, URL). ResourceLoader загружает Resource.',
  },
  {
    category: 'Spring',
    question: 'Что такое MessageSource и интернационализация?',
    short_answer:
      'Интерфейс для получения локализованных сообщений. Используется с ReloadableResourceBundleMessageSource.',
  },
  {
    category: 'Spring',
    question: 'Что такое Validation и BindingResult?',
    short_answer:
      'Spring поддерживает валидацию через аннотации JSR-303 (например, @Valid) и собственный Validator. BindingResult содержит ошибки.',
  },
  {
    category: 'Spring',
    question: 'Что такое Data Binding в Spring MVC?',
    short_answer:
      'Автоматическое связывание параметров запроса с полями объекта (@ModelAttribute).',
  },
  {
    category: 'Spring',
    question: 'Что такое Conversion Service и Property Editors?',
    short_answer:
      'Конвертация типов в Spring. ConversionService – центральный сервис, Property Editors – устаревший подход.',
  },
  {
    category: 'Spring',
    question: 'Что такое SpEL (Spring Expression Language)?',
    short_answer:
      'Язык выражений для манипуляции объектами во время выполнения, используется в аннотациях, XML, @Value.',
  },
  {
    category: 'Spring',
    question: 'Как работает @Async?',
    short_answer:
      'Позволяет выполнять методы асинхронно в отдельном потоке. Требует @EnableAsync. Возвращает Future или CompletableFuture.',
  },
  {
    category: 'Spring',
    question: 'Как работает @Scheduled?',
    short_answer:
      'Планирование периодических задач. Параметры: fixedDelay, fixedRate, cron. Требует @EnableScheduling.',
  },
  {
    category: 'Spring',
    question: 'Что такое Cache Abstraction в Spring?',
    short_answer:
      'Декларативное кэширование (@Cacheable, @CacheEvict, @CachePut). Поддерживает различные провайдеры (EhCache, Redis).',
  },
  {
    category: 'Spring',
    question: 'Что такое @ControllerAdvice?',
    short_answer:
      'Глобальная обработка исключений в контроллерах (@ExceptionHandler), добавление глобальных данных (@ModelAttribute).',
  },
  {
    category: 'Spring',
    question: 'Что такое ResponseEntity в Spring MVC?',
    short_answer:
      'Объект, представляющий весь HTTP-ответ: статус, заголовки, тело. Позволяет тонко управлять ответом.',
  },
  {
    category: 'Spring',
    question: 'Что такое RestTemplate и WebClient?',
    short_answer:
      'RestTemplate – синхронный HTTP-клиент (устарел). WebClient – реактивный, неблокирующий.',
  },
  {
    category: 'Spring',
    question: 'Что такое Spring Boot Actuator?',
    short_answer:
      'Предоставляет production-ready функции: метрики, health checks, информацию о приложении через endpoints (health, info, metrics).',
  },
  {
    category: 'Spring',
    question: 'Что такое Spring Boot DevTools?',
    short_answer:
      'Набор инструментов для разработки: автоматический рестарт, отключение кэшей, LiveReload.',
  },
  {
    category: 'Spring',
    question: 'Что такое @SpringBootApplication?',
    short_answer:
      'Комбинированная аннотация: @Configuration + @EnableAutoConfiguration + @ComponentScan.',
  },
  {
    category: 'Spring',
    question: 'Как работают тесты в Spring (@SpringBootTest)?',
    short_answer:
      'Загружает полный контекст приложения для интеграционных тестов. Поддерживает срезы (@WebMvcTest, @DataJpaTest).',
  },
  {
    category: 'Spring',
    question: 'Что такое @MockBean и @SpyBean?',
    short_answer:
      'Добавляют моки или шпионы Mockito в контекст Spring для замены реальных бинов в тестах.',
  },
  {
    category: 'Spring',
    question: 'Что такое Transaction Propagation в Spring?',
    short_answer:
      'Распространение транзакций: REQUIRED, REQUIRES_NEW, NESTED, SUPPORTS, NOT_SUPPORTED, NEVER, MANDATORY.',
  },
  {
    category: 'Spring',
    question: 'Что такое isolation level в @Transactional?',
    short_answer:
      'Уровень изоляции транзакции: DEFAULT, READ_UNCOMMITTED, READ_COMMITTED, REPEATABLE_READ, SERIALIZABLE.',
  },
  {
    category: 'Spring',
    question: 'Как задать правила отката транзакции (rollbackFor)?',
    short_answer:
      'Параметры @Transactional: rollbackFor (по умолчанию RuntimeException и Error), noRollbackFor.',
  },
  {
    category: 'Spring',
    question: 'Что такое Spring Data JPA и его основные интерфейсы?',
    short_answer:
      'Упрощает работу с JPA. Интерфейсы: CrudRepository, PagingAndSortingRepository, JpaRepository.',
  },
  {
    category: 'Spring',
    question: 'Как написать кастомный запрос в Spring Data JPA?',
    short_answer:
      'Использовать @Query с JPQL или nativeQuery = true. Также можно использовать именованные запросы.',
  },
  {
    category: 'Spring',
    question: 'Что такое auditing в Spring Data JPA?',
    short_answer:
      'Автоматическое заполнение полей createdDate, lastModifiedDate и т.д. через аннотации @CreatedDate, @LastModifiedDate, @CreatedBy.',
  },
  {
    category: 'Spring',
    question: 'Что такое Spring Security (основные понятия)?',
    short_answer:
      'Фреймворк для аутентификации и авторизации. Основные компоненты: AuthenticationManager, UserDetailsService, SecurityContext, фильтры.',
  },
  // Дополнительные 8 вопросов (Spring)
  {
    category: 'Spring',
    question: 'Что такое @Lazy аннотация?',
    short_answer:
      'Откладывает инициализацию бина до первого обращения. Может применяться к @Bean, @Autowired.',
  },
  {
    category: 'Spring',
    question: 'Что такое @Scope("request") и как работает?',
    short_answer:
      'Бин создаётся на каждый HTTP-запрос. Доступен только в веб-приложениях.',
  },
  {
    category: 'Spring',
    question: 'Что такое @SessionScope?',
    short_answer:
      'Бин живёт в течение HTTP-сессии. Используется для хранения данных пользователя.',
  },
  {
    category: 'Spring',
    question: 'Что такое @ApplicationScope?',
    short_answer:
      'Бин создаётся один раз на всё веб-приложение, аналог синглтона, но в контексте сервлета.',
  },
  {
    category: 'Spring',
    question: 'Что такое @CrossOrigin и для чего используется?',
    short_answer:
      'Разрешает кросс-доменные запросы к контроллеру. Можно настроить origins, methods.',
  },
  {
    category: 'Spring',
    question: 'Что такое @ExceptionHandler?',
    short_answer:
      'Обрабатывает исключения в контроллере. Может возвращать ResponseEntity или ModelAndView.',
  },
  {
    category: 'Spring',
    question: 'Что такое @InitBinder?',
    short_answer:
      'Настраивает привязку данных в контроллере: регистрирует редакторы свойств, валидацию.',
  },
  {
    category: 'Spring',
    question: 'Что такое @ModelAttribute на уровне метода?',
    short_answer:
      'Метод, аннотированный @ModelAttribute, добавляет атрибуты в модель для всех запросов контроллера.',
  },

  // ==================== JVM & MEMORY (33 вопроса) ====================

  // Существующие 8 вопросов (из исходного файла)
  {
    category: 'JVM',
    question: 'Из каких областей памяти состоит JVM?',
    short_answer:
      'Heap (объекты), Stack (локальные переменные), Metaspace (метаданные классов), Code Cache.',
  },
  {
    category: 'JVM',
    question: 'Что такое Garbage Collection?',
    short_answer:
      'Автоматическое освобождение памяти от неиспользуемых объектов. Алгоритмы: Serial, Parallel, G1, ZGC.',
  },
  {
    category: 'JVM',
    question: 'Что такое OutOfMemoryError?',
    short_answer:
      'Ошибка когда JVM не может выделить память. Heap space, Metaspace, GC overhead limit.',
  },
  {
    category: 'JVM',
    question: 'Что такое ClassLoader?',
    short_answer:
      'Загружает классы в JVM. Иерархия: Bootstrap, Platform, Application. Делегирование родителю.',
  },
  {
    category: 'JVM',
    question: 'Что такое JIT компиляция?',
    short_answer:
      'Just-In-Time компиляция байт-кода в нативный код. Оптимизирует горячие участки.',
  },
  {
    category: 'JVM',
    question: 'Что такое Stack и Heap?',
    short_answer:
      'Stack - локальные переменные и вызовы методов. Heap - объекты и массивы. Stack быстрее.',
  },
  {
    category: 'JVM',
    question: 'Что такое String interning?',
    short_answer:
      'Сохранение строки в String Pool. Литералы автоматически, вручную через intern().',
  },
  {
    category: 'JVM',
    question: 'Что такое Weak, Soft, Phantom references?',
    short_answer:
      'Weak - GC может удалить. Soft - удаляется при нехватке памяти. Phantom - после finalization.',
  },
  // Дополнительные 22 вопроса из предыдущего дополнения
  {
    category: 'JVM',
    question: 'Какие бывают сборщики мусора в HotSpot JVM?',
    short_answer:
      'Serial, Parallel, CMS, G1 (по умолчанию с Java 9), ZGC (экспериментальный), Shenandoah. Различаются по приоритетам (паузы, пропускная способность).',
  },
  {
    category: 'JVM',
    question: 'Что такое Garbage Collection (подробнее об алгоритмах)',
    short_answer:
      'Алгоритмы: Mark-Sweep, Mark-Compact, Copying. Современные сборщики поколенческие (Young, Old, Metaspace).',
  },
  {
    category: 'JVM',
    question: 'Что такое поколения в GC (Young, Old, Permanent/Metaspace)?',
    short_answer:
      'Heap делится на Young (Eden, Survivor) и Old. Young собирается часто (Minor GC), Old реже (Major GC). Metaspace (ранее PermGen) для метаданных классов.',
  },
  {
    category: 'JVM',
    question: 'Как работает G1 (Garbage-First) сборщик?',
    short_answer:
      'Делит heap на регионы, собирает регионы с наибольшим количеством мусора (Garbage-First). Предсказуемые паузы.',
  },
  {
    category: 'JVM',
    question: 'Что такое ZGC?',
    short_answer:
      'Масштабируемый сборщик с низкими паузами (менее 10 мс) независимо от размера heap. Использует цветные указатели и load barriers.',
  },
  {
    category: 'JVM',
    question: 'Какие ключевые опции JVM для настройки памяти?',
    short_answer:
      '-Xms (начальный размер heap), -Xmx (макс. размер), -XX:PermSize / -XX:MetaspaceSize, -XX:MaxMetaspaceSize, -Xss (размер стека потока).',
  },
  {
    category: 'JVM',
    question: 'Что такое Heap Dump и как его получить?',
    short_answer:
      'Снимок памяти JVM (объекты, классы). Получить: jmap, jcmd, через -XX:+HeapDumpOnOutOfMemoryError, VisualVM.',
  },
  {
    category: 'JVM',
    question: 'Что такое Thread Dump и как его получить?',
    short_answer:
      'Снимок состояния всех потоков. Получить: jstack, kill -3, jcmd, VisualVM.',
  },
  {
    category: 'JVM',
    question: 'Что такое Java Flight Recorder (JFR)?',
    short_answer:
      'Инструмент профилирования с низкими накладными расходами. Собирает метрики, события, исключения без остановки приложения.',
  },
  {
    category: 'JVM',
    question: 'Что такое JMX (Java Management Extensions)?',
    short_answer:
      'Технология для управления и мониторинга приложений через MBeans. Используется JConsole, VisualVM.',
  },
  {
    category: 'JVM',
    question: 'Что такое ClassLoader, его виды и делегирование?',
    short_answer:
      'Bootstrap (загружает java.*), Platform (ранее Extension), Application (classpath). Делегирование: сначала родитель, затем сам.',
  },
  {
    category: 'JVM',
    question: 'Как написать свой ClassLoader?',
    short_answer:
      'Расширить ClassLoader, переопределить findClass(), в нём определить defineClass() для массива байт.',
  },
  {
    category: 'JVM',
    question:
      'Что такое стадии загрузки класса (loading, linking, initialization)?',
    short_answer:
      'Loading – поиск и загрузка бинарного представления. Linking – verification (проверка), preparation (создание static полей), resolution (разрешение ссылок). Initialization – выполнение static инициализаторов.',
  },
  {
    category: 'JVM',
    question: 'Что такое байт-код и как его посмотреть?',
    short_answer:
      'Инструкции, выполняемые JVM. Посмотреть через javap -c, или декомпиляторы (CFR, Fernflower).',
  },
  {
    category: 'JVM',
    question: 'Что такое JIT-компиляция и её уровни?',
    short_answer:
      'Just-In-Time компиляция байт-кода в машинный. Уровни компиляции: интерпретация, C1 (с оптимизациями), C2 (полная оптимизация), tiered compilation.',
  },
  {
    category: 'JVM',
    question: 'Что такое escape analysis и stack allocation?',
    short_answer:
      'Анализ области видимости объекта. Если объект не покидает метод, он может быть размещён на стеке (ускорение, уменьшение GC).',
  },
  {
    category: 'JVM',
    question: 'Что такое lock elision и biased locking?',
    short_answer:
      'Оптимизации синхронизации: устранение излишних блокировок, смещённая блокировка (для неконкурентного случая).',
  },
  {
    category: 'JVM',
    question: 'Что такое TLAB (Thread Local Allocation Buffer)?',
    short_answer:
      'Область в Eden, выделенная потоку для быстрого размещения объектов без синхронизации.',
  },
  {
    category: 'JVM',
    question: 'Что такое безопасные точки (safepoints)?',
    short_answer:
      'Моменты, когда все потоки остановлены для глобальных операций (GC, деоптимизация). Проверяются в определённых инструкциях.',
  },
  {
    category: 'JVM',
    question: 'Что такое Native Memory Tracking (NMT)?',
    short_answer:
      'Отслеживание памяти, выделенной JVM вне heap (стек, метаспейс, код кэш). Включается опцией -XX:NativeMemoryTracking=summary.',
  },
  {
    category: 'JVM',
    question: 'Что такое Java Object Header и из чего состоит?',
    short_answer:
      'Заголовок объекта: Mark Word (хэш, возраст, блокировка), Klass Pointer (ссылка на класс). В 64-бит: 12 байт (с выравниванием).',
  },
  {
    category: 'JVM',
    question: 'Что такое Compressed Oops?',
    short_answer:
      'Сжатые указатели (32-битные) для экономии памяти в 64-битных JVM (до 32 Гб heap). Включается -XX:+UseCompressedOops.',
  },
  {
    category: 'JVM',
    question: 'Что такое метод finalize() и его проблемы?',
    short_answer:
      'Вызывается перед сборкой объекта. Непредсказуем, может замедлить GC. Deprecated с Java 9.',
  },
  // Дополнительные 3 вопроса (JVM)
  {
    category: 'JVM',
    question: 'Что такое Metaspace и чем отличается от PermGen?',
    short_answer:
      'Metaspace (Java 8+) хранит метаданные классов в нативной памяти, не в heap. PermGen был фиксированного размера, Metaspace может расти.',
  },
  {
    category: 'JVM',
    question: 'Что такое Code Cache?',
    short_answer:
      'Область памяти для хранения скомпилированного JIT кода. Если заполняется, компиляция прекращается.',
  },
  {
    category: 'JVM',
    question: 'Что такое Direct Memory?',
    short_answer:
      'Память вне heap, используемая для NIO буферов (ByteBuffer.allocateDirect). Управляется -XX:MaxDirectMemorySize.',
  },

  // ==================== EXCEPTIONS (22 вопроса) ====================

  // Существующие 5 вопросов (из исходного файла)
  {
    category: 'Exceptions',
    question: 'В чем разница между checked и unchecked exceptions?',
    short_answer:
      'Checked - обязательная обработка (IOException). Unchecked - RuntimeException, необязательна обработка.',
  },
  {
    category: 'Exceptions',
    question: 'Когда использовать throw vs throws?',
    short_answer:
      'throw - бросить исключение в теле. throws - объявить что метод может бросить (в сигнатуре).',
  },
  {
    category: 'Exceptions',
    question: 'Что такое try-with-resources?',
    short_answer:
      'Автоматическое закрытие ресурсов (AutoCloseable). Закрывается даже при исключении.',
  },
  {
    category: 'Exceptions',
    question: 'Можно ли поймать Error?',
    short_answer:
      'Технически можно, но не нужно. Error для критических ошибок JVM, приложение не восстановится.',
  },
  {
    category: 'Exceptions',
    question: 'Что такое multi-catch?',
    short_answer:
      'Ловля нескольких типов исключений в одном catch. catch (IOException | SQLException e).',
  },
  // Дополнительные 15 вопросов из предыдущего дополнения
  {
    category: 'Exceptions',
    question: 'Иерархия исключений в Java?',
    short_answer:
      'Throwable -> Error (необрабатываемые) и Exception. Exception -> RuntimeException (unchecked) и другие checked (IOException, SQLException).',
  },
  {
    category: 'Exceptions',
    question: 'Какие исключения являются checked?',
    short_answer:
      'Все, кроме Error и RuntimeException (и их подклассов). Проверяются компилятором: требуют throws или try-catch.',
  },
  {
    category: 'Exceptions',
    question: 'Можно ли бросить исключение в статическом блоке?',
    short_answer:
      'Да, но если это checked, оно должно быть обёрнуто в ExceptionInInitializerError (unchecked).',
  },
  {
    category: 'Exceptions',
    question: 'Что такое подавленные исключения (suppressed exceptions)?',
    short_answer:
      'Исключения, возникшие при автоматическом закрытии ресурсов в try-with-resources. Доступны через getSuppressed().',
  },
  {
    category: 'Exceptions',
    question: 'Как правильно создать своё исключение?',
    short_answer:
      'Наследоваться от Exception (checked) или RuntimeException (unchecked). Добавить конструкторы.',
  },
  {
    category: 'Exceptions',
    question: 'Что происходит, если исключение брошено в catch или finally?',
    short_answer:
      'Если в finally брошено исключение, оно подавляет предыдущее (кроме try-with-resources).',
  },
  {
    category: 'Exceptions',
    question: 'Можно ли использовать return в finally?',
    short_answer:
      'Да, но он переопределит возвращаемое значение из try/catch, что часто является ошибкой.',
  },
  {
    category: 'Exceptions',
    question:
      'В чём разница между NoClassDefFoundError и ClassNotFoundException?',
    short_answer:
      'NoClassDefFoundError – класс был при компиляции, но пропал в runtime (неправильный classpath). ClassNotFoundException – при явной загрузке Class.forName().',
  },
  {
    category: 'Exceptions',
    question: 'Что такое StackOverflowError и почему возникает?',
    short_answer:
      'Переполнение стека вызовов (глубокая рекурсия, бесконечные вызовы).',
  },
  {
    category: 'Exceptions',
    question: 'Что такое OutOfMemoryError: Java heap space?',
    short_answer:
      'Закончилась память в куче. Объекты не удаляются GC, либо слишком большой размер.',
  },
  {
    category: 'Exceptions',
    question: 'Что такое ExceptionInInitializerError?',
    short_answer:
      'Исключение в статическом инициализаторе или статическом поле.',
  },
  {
    category: 'Exceptions',
    question: 'Какие исключения могут быть при работе с рефлексией?',
    short_answer:
      'ClassNotFoundException, NoSuchMethodException, IllegalAccessException, InvocationTargetException и др.',
  },
  {
    category: 'Exceptions',
    question: 'Как получить цепочку исключений (caused by)?',
    short_answer:
      'Использовать конструктор с Throwable cause или initCause(). Затем getCause().',
  },
  {
    category: 'Exceptions',
    question: 'Что такое try-with-resources и какие требования к ресурсам?',
    short_answer:
      'Автоматическое закрытие объектов, реализующих AutoCloseable. Ресурсы закрываются в обратном порядке.',
  },
  {
    category: 'Exceptions',
    question: 'Как обработать несколько исключений одинаково до Java 7?',
    short_answer:
      'Несколько catch блоков или один catch с instanceof. С Java 7 multi-catch.',
  },
  // Дополнительные 2 вопроса (Exceptions)
  {
    category: 'Exceptions',
    question: 'Что такое Error и когда его использовать?',
    short_answer:
      'Error – критическая проблема JVM, обычно не обрабатывается. Примеры: OutOfMemoryError, StackOverflowError.',
  },
  {
    category: 'Exceptions',
    question: 'Может ли метод переопределить throws?',
    short_answer:
      'Да, переопределяющий метод может не бросать checked исключения или бросать их подтипы, но не расширять список.',
  },

  // ==================== OOP (22 вопроса) ====================

  // Существующие 5 вопросов (из исходного файла)
  {
    category: 'OOP',
    question: 'Что такое инкапсуляция?',
    short_answer:
      'Сокрытие внутренней реализации, доступ через публичные методы (геттеры/сеттеры).',
  },
  {
    category: 'OOP',
    question: 'Что такое полиморфизм?',
    short_answer:
      'Объект принимает разные формы. Переопределение методов (runtime) и перегрузка (compile time).',
  },
  {
    category: 'OOP',
    question: 'Что такое композиция и агрегация?',
    short_answer:
      'Композиция - сильная связь (компонент не существует отдельно). Агрегация - слабая связь.',
  },
  {
    category: 'OOP',
    question: 'Что такое SOLID принципы?',
    short_answer:
      'S-Single Responsibility, O-Open/Closed, L-Liskov Substitution, I-Interface Segregation, D-Dependency Inversion.',
  },
  {
    category: 'OOP',
    question: 'Что такое наследование?',
    short_answer:
      'Механизм создания класса на основе другого. Наследует поля и методы. Java - одиночное наследование.',
  },
  // Дополнительные 15 вопросов из предыдущего дополнения
  {
    category: 'OOP',
    question: 'Что такое абстракция в ООП?',
    short_answer:
      'Выделение существенных характеристик объекта, игнорирование несущественных. Достигается через абстрактные классы/интерфейсы.',
  },
  {
    category: 'OOP',
    question: 'Чем отличается интерфейс от абстрактного класса после Java 8?',
    short_answer:
      'Интерфейсы могут иметь default и static методы, но не состояние (кроме констант). Абстрактные классы могут иметь поля и конструкторы.',
  },
  {
    category: 'OOP',
    question: 'Что такое множественное наследование и как его избегают в Java?',
    short_answer:
      'Класс может наследовать только один класс. Множественное наследование типов реализуется через интерфейсы.',
  },
  {
    category: 'OOP',
    question: 'Что такое полиморфизм (ad-hoc, parametric, subtyping)?',
    short_answer:
      'Ad-hoc – перегрузка. Parametric – дженерики. Subtyping – наследование/переопределение.',
  },
  {
    category: 'OOP',
    question:
      'Что такое ковариантность возвращаемого типа при переопределении?',
    short_answer:
      'Переопределяющий метод может возвращать подтип возвращаемого типа родительского метода.',
  },
  {
    category: 'OOP',
    question: 'Можно ли сузить модификатор доступа при переопределении?',
    short_answer:
      'Нет, можно только расширить (например, protected -> public). Иначе ошибка компиляции.',
  },
  {
    category: 'OOP',
    question: 'Что такое сигнатура метода?',
    short_answer:
      'Имя метода и типы параметров (без учёта возвращаемого типа и исключений).',
  },
  {
    category: 'OOP',
    question: 'Для чего нужны статические методы?',
    short_answer:
      'Принадлежат классу, вызываются без объекта. Используются для утилит, фабрик, констант.',
  },
  {
    category: 'OOP',
    question: 'Что такое final класс и методы?',
    short_answer:
      'final класс нельзя наследовать. final метод нельзя переопределить.',
  },
  {
    category: 'OOP',
    question: 'Что такое внутренние классы (inner classes) и их особенности?',
    short_answer:
      'Нестатические вложенные классы. Имеют доступ к полям внешнего класса, требуют экземпляр внешнего.',
  },
  {
    category: 'OOP',
    question: 'Что такое локальные классы?',
    short_answer:
      'Классы, определённые внутри блока (метода). Видны только внутри блока. Могут обращаться к effectively final переменным.',
  },
  {
    category: 'OOP',
    question:
      'Порядок инициализации объекта: статические блоки, поля, блоки инициализации, конструктор.',
    short_answer:
      'Статические блоки/поля (при загрузке класса), затем блоки инициализации экземпляра, затем конструктор.',
  },
  {
    category: 'OOP',
    question: 'Что такое this и super?',
    short_answer:
      'this – ссылка на текущий объект. super – ссылка на родительский объект (для доступа к методам/конструкторам родителя).',
  },
  {
    category: 'OOP',
    question:
      'Что такое класс Object и его методы, которые обычно переопределяют?',
    short_answer: 'equals, hashCode, toString, clone, finalize (реже).',
  },
  {
    category: 'OOP',
    question:
      'Что такое контракт equals и hashCode? (повтор, но можно углубить)',
    short_answer:
      'При переопределении equals всегда переопределять hashCode. Равные объекты должны иметь равные hashCode. Неравные – желательно разные.',
  },
  // Дополнительные 2 вопроса (OOP)
  {
    category: 'OOP',
    question: 'Что такое принцип подстановки Лисков (Liskov Substitution)?',
    short_answer:
      'Объекты подкласса должны быть взаимозаменяемы с объектами суперкласса без нарушения работы программы.',
  },
  {
    category: 'OOP',
    question: 'Что такое принцип открытости/закрытости (Open/Closed)?',
    short_answer:
      'Классы должны быть открыты для расширения, но закрыты для изменения. Использовать абстракции и наследование.',
  },

  // ==================== STREAM API & LAMBDA (32 вопроса) ====================

  // Существующие 8 вопросов (из исходного файла)
  {
    category: 'Stream API',
    question: 'Что такое Stream API?',
    short_answer:
      'Функциональный стиль обработки коллекций. Конвейер операций: filter, map, collect.',
  },
  {
    category: 'Stream API',
    question: 'В чем разница между map() и flatMap()?',
    short_answer:
      'map() - один элемент в один. flatMap() - один элемент в stream элементов, затем объединяет.',
  },
  {
    category: 'Stream API',
    question: 'Что такое Collector?',
    short_answer:
      'Интерфейс для свертки элементов stream. Collectors.toList(), groupingBy(), joining().',
  },
  {
    category: 'Stream API',
    question: 'В чем разница между intermediate и terminal операций?',
    short_answer:
      'Intermediate - ленивые, возвращают stream (filter, map). Terminal - запускают выполнение (collect, forEach).',
  },
  {
    category: 'Stream API',
    question: 'Что такое Optional?',
    short_answer:
      'Контейнер для значения которое может отсутствовать. Избегает NullPointerException.',
  },
  {
    category: 'Stream API',
    question: 'Что такое лямбда-выражение?',
    short_answer:
      'Анонимная функция. Краткая запись функционального интерфейса. (a, b) -> a + b.',
  },
  {
    category: 'Stream API',
    question: 'Что такое функциональный интерфейс?',
    short_answer:
      'Интерфейс с одним абстрактным методом. @FunctionalInterface. Может использоваться с лямбдами.',
  },
  {
    category: 'Stream API',
    question: 'Что такое method reference?',
    short_answer:
      'Сокращенная запись лямбды вызывающей метод. System.out::println вместо x -> System.out.println(x).',
  },
  // Дополнительные 22 вопроса из предыдущего дополнения
  {
    category: 'Stream API',
    question: 'Какие существуют способы создания стрима?',
    short_answer:
      'collection.stream(), Stream.of(), Arrays.stream(), Stream.iterate(), Stream.generate(), Files.lines().',
  },
  {
    category: 'Stream API',
    question: 'Что такое промежуточные (intermediate) операции?',
    short_answer:
      'Ленивые операции, возвращающие новый стрим: filter, map, flatMap, peek, sorted, distinct, limit, skip.',
  },
  {
    category: 'Stream API',
    question: 'Что такое терминальные (terminal) операции?',
    short_answer:
      'Запускают обработку и закрывают стрим: forEach, collect, toList, toArray, reduce, count, anyMatch, allMatch, noneMatch, findFirst, findAny, min, max.',
  },
  {
    category: 'Stream API',
    question: 'В чём разница между findFirst и findAny?',
    short_answer:
      'findFirst – первый элемент стрима (важен порядок). findAny – любой элемент (оптимизирован для параллельных стримов).',
  },
  {
    category: 'Stream API',
    question: 'Как работает peek? Пример использования.',
    short_answer:
      'Промежуточная операция для отладки (например, System.out::println), но не гарантирует выполнение, если нет терминальной.',
  },
  {
    category: 'Stream API',
    question: 'Что такое редукция (reduce)?',
    short_answer:
      'Свёртка элементов в одно значение. Три перегрузки: с identity, бинарным оператором; с identity, accumulator, combiner.',
  },
  {
    category: 'Stream API',
    question: 'Что такое коллекторы (Collectors)?',
    short_answer:
      'Функции для преобразования стрима в коллекцию или другую структуру: toList, toSet, toMap, joining, groupingBy, partitioningBy.',
  },
  {
    category: 'Stream API',
    question: 'Как работает groupingBy?',
    short_answer:
      'Группирует элементы по классификатору, возвращает Map. Может с дополнительным downstream коллектором.',
  },
  {
    category: 'Stream API',
    question: 'Что такое partitioningBy?',
    short_answer:
      'Разделяет элементы на две группы по предикату, возвращает Map<Boolean, List>.',
  },
  {
    category: 'Stream API',
    question: 'Что такое parallelStream и как он работает?',
    short_answer:
      'Создаёт параллельный стрим, используя общий ForkJoinPool. Операции выполняются в нескольких потоках.',
  },
  {
    category: 'Stream API',
    question: 'Как сделать стрим параллельным?',
    short_answer:
      'Вызвать parallel() на существующем стриме или использовать parallelStream() вместо stream().',
  },
  {
    category: 'Stream API',
    question: 'Когда стоит использовать параллельные стримы?',
    short_answer:
      'При больших объёмах данных, независимых элементах, дорогих операциях. Не стоит, если порядок важен или есть общие ресурсы.',
  },
  {
    category: 'Stream API',
    question:
      'Что такое примитивные стримы (IntStream, LongStream, DoubleStream)?',
    short_answer:
      'Специализированные стримы для примитивов, чтобы избежать боксинга. Имеют свои методы (sum, average, range).',
  },
  {
    category: 'Stream API',
    question: 'Как преобразовать стрим объектов в примитивный стрим?',
    short_answer: 'mapToInt, mapToLong, mapToDouble. Обратно – boxed().',
  },
  {
    category: 'Stream API',
    question: 'Что такое Optional и его методы?',
    short_answer:
      'Контейнер для одного значения (может быть пустым). Методы: isPresent, ifPresent, orElse, orElseGet, orElseThrow, map, flatMap, filter.',
  },
  {
    category: 'Stream API',
    question: 'Как обработать стрим, который может содержать null?',
    short_answer:
      'Использовать Stream.ofNullable (Java 9) или фильтровать Objects::nonNull.',
  },
  {
    category: 'Stream API',
    question: 'Что такое takeWhile и dropWhile (Java 9)?',
    short_answer:
      'takeWhile – выбирает элементы, пока условие истинно. dropWhile – пропускает, пока условие истинно. Работают на упорядоченных стримах.',
  },
  {
    category: 'Stream API',
    question: 'Что такое iterate в Stream API (Java 9)?',
    short_answer:
      'Stream.iterate(seed, predicate, next) – создаёт последовательность, пока предикат истинен.',
  },
  {
    category: 'Stream API',
    question: 'Как объединить два стрима?',
    short_answer:
      'Stream.concat(stream1, stream2) – создаёт ленивый объединённый стрим.',
  },
  {
    category: 'Stream API',
    question: 'Что такое flatMap для Optional?',
    short_answer:
      'Optional.flatMap – применяет функцию, возвращающую Optional, и избегает вложенности Optional<Optional<T>>.',
  },
  {
    category: 'Stream API',
    question: 'Что такое метод reference?',
    short_answer:
      'Сокращённая запись лямбды: ClassName::staticMethod, object::instanceMethod, ClassName::instanceMethod, ClassName::new.',
  },
  {
    category: 'Stream API',
    question: 'Что такое функциональный интерфейс? Примеры в Java.',
    short_answer:
      'Интерфейс с одним абстрактным методом. Примеры: Runnable, Callable, Predicate, Function, Consumer, Supplier.',
  },
  // Дополнительные 2 вопроса (Stream API)
  {
    category: 'Stream API',
    question: 'Что такое Stream.iterate() и Stream.generate()?',
    short_answer:
      'iterate – создаёт бесконечный стрим, применяя функцию к предыдущему элементу. generate – создаёт бесконечный стрим, генерируя значения Supplier.',
  },
  {
    category: 'Stream API',
    question: 'Что такое IntStream.range() и rangeClosed()?',
    short_answer:
      'range – создаёт IntStream от start включительно до end исключительно. rangeClosed – включает end.',
  },

  // ==================== DESIGN PATTERNS (22 вопроса) ====================

  // Существующие 5 вопросов (из исходного файла)
  {
    category: 'Design Patterns',
    question: 'Что такое Singleton паттерн?',
    short_answer:
      'Гарантирует единственный экземпляр класса. Глобальная точка доступа. Ленивая инициализация.',
  },
  {
    category: 'Design Patterns',
    question: 'Что такое Factory паттерн?',
    short_answer:
      'Создание объектов через фабричный метод. Скрывает логику создания. Определяет интерфейс создания.',
  },
  {
    category: 'Design Patterns',
    question: 'Что такое Builder паттерн?',
    short_answer:
      'Пошаговое создание сложных объектов. Флюент интерфейс. Удобен для объектов с множеством параметров.',
  },
  {
    category: 'Design Patterns',
    question: 'Что такое Observer паттерн?',
    short_answer:
      'Подписка на события. Субъект оповещает наблюдателей об изменениях. Один-ко-многим.',
  },
  {
    category: 'Design Patterns',
    question: 'Что такое Strategy паттерн?',
    short_answer:
      'Семейство алгоритмов. Выбор алгоритма в runtime. Инкапсуляция поведения.',
  },
  // Дополнительные 15 вопросов из предыдущего дополнения
  {
    category: 'Design Patterns',
    question: 'Что такое Factory Method?',
    short_answer:
      'Порождающий паттерн, определяет интерфейс создания объекта, но позволяет подклассам изменять тип создаваемого объекта.',
  },
  {
    category: 'Design Patterns',
    question: 'Что такое Abstract Factory?',
    short_answer:
      'Порождающий паттерн, предоставляет интерфейс для создания семейств взаимосвязанных объектов без указания конкретных классов.',
  },
  {
    category: 'Design Patterns',
    question: 'Что такое Prototype?',
    short_answer:
      'Порождающий паттерн, создание объектов через клонирование прототипа (Cloneable).',
  },
  {
    category: 'Design Patterns',
    question: 'Что такое Adapter?',
    short_answer:
      'Структурный паттерн, преобразует интерфейс одного класса в другой, ожидаемый клиентом.',
  },
  {
    category: 'Design Patterns',
    question: 'Что такое Decorator?',
    short_answer:
      'Структурный паттерн, динамически добавляет обязанности объекту, оборачивая его.',
  },
  {
    category: 'Design Patterns',
    question: 'Что такое Facade?',
    short_answer:
      'Структурный паттерн, предоставляет простой интерфейс к сложной подсистеме.',
  },
  {
    category: 'Design Patterns',
    question: 'Что такое Proxy?',
    short_answer:
      'Структурный паттерн, предоставляет заменитель для управления доступом к объекту.',
  },
  {
    category: 'Design Patterns',
    question: 'Что такое Composite?',
    short_answer:
      'Структурный паттерн, группирует объекты в древовидную структуру для работы с единичными и составными объектами одинаково.',
  },
  {
    category: 'Design Patterns',
    question: 'Что такое Chain of Responsibility?',
    short_answer:
      'Поведенческий паттерн, передаёт запрос по цепочке обработчиков до тех пор, пока он не будет обработан.',
  },
  {
    category: 'Design Patterns',
    question: 'Что такое Command?',
    short_answer:
      'Поведенческий паттерн, инкапсулирует запрос как объект, позволяя параметризовать клиенты очередями, логировать и отменять операции.',
  },
  {
    category: 'Design Patterns',
    question: 'Что такое Iterator?',
    short_answer:
      'Поведенческий паттерн, предоставляет способ последовательного доступа к элементам коллекции без раскрытия её внутренней структуры.',
  },
  {
    category: 'Design Patterns',
    question: 'Что такое Mediator?',
    short_answer:
      'Поведенческий паттерн, уменьшает связанность классов, заставляя их общаться через посредника.',
  },
  {
    category: 'Design Patterns',
    question: 'Что такое Memento?',
    short_answer:
      'Поведенческий паттерн, позволяет сохранять и восстанавливать состояние объекта, не нарушая инкапсуляцию.',
  },
  {
    category: 'Design Patterns',
    question: 'Что такое State?',
    short_answer:
      'Поведенческий паттерн, позволяет объекту изменять поведение при изменении внутреннего состояния.',
  },
  {
    category: 'Design Patterns',
    question: 'Что такое Template Method?',
    short_answer:
      'Поведенческий паттерн, определяет скелет алгоритма, перекладывая реализацию некоторых шагов на подклассы.',
  },
  {
    category: 'Design Patterns',
    question: 'Что такое Visitor?',
    short_answer:
      'Поведенческий паттерн, позволяет добавлять новые операции к объектам, не изменяя их классы.',
  },
  // Дополнительные 2 вопроса (Design Patterns)
  {
    category: 'Design Patterns',
    question: 'Что такое Dependency Injection (как паттерн)?',
    short_answer:
      'Внедрение зависимостей извне. Реализуется через конструктор, сеттеры или интерфейс. Уменьшает связанность.',
  },
  {
    category: 'Design Patterns',
    question: 'Что такое MVC (Model-View-Controller)?',
    short_answer:
      'Архитектурный паттерн, разделяющий приложение на модель (данные), представление (UI) и контроллер (обработка ввода).',
  },

  // ==================== TESTING (16 вопросов) ====================

  // Существующие 5 вопросов (из исходного файла)
  {
    category: 'Testing',
    question: 'Что такое Unit тест?',
    short_answer:
      'Тестирование отдельного модуля/метода в изоляции. Использует моки для зависимостей.',
  },
  {
    category: 'Testing',
    question: 'Что такое Integration тест?',
    short_answer:
      'Тестирование взаимодействия компонентов. Проверяет интеграцию с БД, API, сервисами.',
  },
  {
    category: 'Testing',
    question: 'Что такое Mock?',
    short_answer:
      'Подставной объект с заранее определенным поведением. Используется для изоляции тестов.',
  },
  {
    category: 'Testing',
    question: 'В чем разница между Mock и Stub?',
    short_answer:
      'Mock - проверяет взаимодействия. Stub - возвращает заранее заданные значения.',
  },
  {
    category: 'Testing',
    question: 'Что такое TDD?',
    short_answer:
      'Test-Driven Development. Сначала тест, потом код. Red-Green-Refactor цикл.',
  },
  // Дополнительные 10 вопросов из предыдущего дополнения
  {
    category: 'Testing',
    question: 'Какие уровни тестирования существуют?',
    short_answer:
      'Модульное (unit), интеграционное, системное, приемочное (acceptance).',
  },
  {
    category: 'Testing',
    question: 'Что такое Mockito и как его использовать?',
    short_answer:
      'Фреймворк для создания моков. Создание: mock(), @Mock. Настройка: when().thenReturn(). Проверка: verify().',
  },
  {
    category: 'Testing',
    question: 'Что такое аннотации @Mock, @InjectMocks, @Spy?',
    short_answer:
      '@Mock – создаёт мок. @InjectMocks – создаёт экземпляр и внедряет моки. @Spy – частичный мок.',
  },
  {
    category: 'Testing',
    question: 'Что такое ArgumentCaptor?',
    short_answer:
      'Позволяет захватить аргумент, переданный в мок, для дальнейшей проверки.',
  },
  {
    category: 'Testing',
    question: 'В чем разница между Mock и Spy в Mockito?',
    short_answer:
      'Mock – полностью подставной объект. Spy – обёртка над реальным объектом, можно вызывать реальные методы.',
  },
  {
    category: 'Testing',
    question: 'Что такое @SpringBootTest и как его использовать?',
    short_answer:
      'Аннотация для загрузки полного контекста Spring в тестах. Можно указать классы, веб-среду.',
  },
  {
    category: 'Testing',
    question: 'Что такое @DataJpaTest?',
    short_answer:
      'Срез тестов для JPA. Загружает только компоненты, связанные с БД, использует встроенную БД.',
  },
  {
    category: 'Testing',
    question: 'Что такое @WebMvcTest?',
    short_answer:
      'Срез тестов для веб-слоя (контроллеры). Загружает только контроллеры и связанные компоненты.',
  },
  {
    category: 'Testing',
    question: 'Что такое TestContainers?',
    short_answer:
      'Библиотека для запуска Docker-контейнеров в тестах (например, для тестирования с реальной БД).',
  },
  {
    category: 'Testing',
    question: 'Что такое @Transactional в тестах Spring?',
    short_answer:
      'Тесты, помеченные @Transactional, автоматически откатываются после выполнения (по умолчанию).',
  },
  // Дополнительный 1 вопрос (Testing)
  {
    category: 'Testing',
    question: 'Что такое BDD (Behavior-Driven Development)?',
    short_answer:
      'Подход к разработке, расширяющий TDD, использует естественно-языковые сценарии (given-when-then). Инструменты: Cucumber, Spock.',
  },

  // ==================== DATABASE & HIBERNATE (21 вопрос) ====================

  // Существующие 5 вопросов (из исходного файла)
  {
    category: 'Database',
    question: 'Что такое N+1 проблема?',
    short_answer:
      'Один запрос для списка + N запросов для связанных данных. Решение: JOIN FETCH, batch size.',
  },
  {
    category: 'Database',
    question: 'Что такое Lazy и Eager loading?',
    short_answer:
      'Lazy - загрузка при обращении. Eager - загрузка сразу. Lazy экономит память, Eager - запросы.',
  },
  {
    category: 'Database',
    question: 'Что такое транзакция?',
    short_answer:
      'Логическая единица работы. ACID свойства: Atomicity, Consistency, Isolation, Durability.',
  },
  {
    category: 'Database',
    question: 'Что такое уровни изоляции транзакций?',
    short_answer:
      'READ UNCOMMITTED, READ COMMITTED, REPEATABLE READ, SERIALIZABLE. Баланс между производительностью и согласованностью.',
  },
  {
    category: 'Database',
    question: 'Что такое ORM?',
    short_answer:
      'Object-Relational Mapping. Маппинг объектов на таблицы БД. Hibernate, JPA, MyBatis.',
  },
  // Дополнительные 15 вопросов из предыдущего дополнения
  {
    category: 'Database',
    question: 'Какие типы соединений (JOIN) в SQL?',
    short_answer:
      'INNER JOIN, LEFT JOIN, RIGHT JOIN, FULL JOIN, CROSS JOIN. Разница и примеры.',
  },
  {
    category: 'Database',
    question: 'Что такое GROUP BY и HAVING?',
    short_answer:
      'GROUP BY группирует строки по атрибуту. HAVING фильтрует группы (аналог WHERE для групп).',
  },
  {
    category: 'Database',
    question:
      'Что такое первичный ключ (primary key) и внешний ключ (foreign key)?',
    short_answer:
      'Primary key – уникальный идентификатор записи. Foreign key – ссылка на primary key другой таблицы, обеспечивает ссылочную целостность.',
  },
  {
    category: 'Database',
    question: 'Что такое индексы и зачем они нужны?',
    short_answer:
      'Структуры данных (B-tree, hash) для ускорения поиска. Замедляют вставку/обновление, увеличивают размер.',
  },
  {
    category: 'Database',
    question: 'Что такое нормализация и денормализация?',
    short_answer:
      'Нормализация – устранение избыточности (1НФ, 2НФ, 3НФ). Денормализация – добавление избыточности для ускорения чтения.',
  },
  {
    category: 'Database',
    question: 'Что такое ACID? (повтор, но можно уточнить)',
    short_answer:
      'Atomicity, Consistency, Isolation, Durability – свойства транзакций.',
  },
  {
    category: 'Database',
    question: 'Какие бывают уровни изоляции транзакций? (повтор)',
    short_answer:
      'READ UNCOMMITTED, READ COMMITTED, REPEATABLE READ, SERIALIZABLE. Различия в фантомах, неповторяемом чтении, грязном чтении.',
  },
  {
    category: 'Database',
    question: 'Что такое optimistic и pessimistic locking?',
    short_answer:
      'Optimistic – предполагает, что конфликты редки, проверяет версию. Pessimistic – блокирует запись на время транзакции.',
  },
  {
    category: 'Database',
    question: 'Какие состояния есть у entity в Hibernate?',
    short_answer:
      'Transient (новый, не сохранён), Persistent (связан с сессией), Detached (отсоединён), Removed (удалён).',
  },
  {
    category: 'Database',
    question: 'Что такое dirty checking в Hibernate?',
    short_answer:
      'Автоматическое обнаружение изменений persistent объектов и синхронизация с БД при flush.',
  },
  {
    category: 'Database',
    question:
      'Что такое кэш первого уровня (L1 cache) и второго уровня (L2 cache)?',
    short_answer:
      'L1 – кэш сессии, всегда включён. L2 – кэш SessionFactory, настраивается (Ehcache, Redis).',
  },
  {
    category: 'Database',
    question: 'Как работают каскады (cascade) в Hibernate?',
    short_answer:
      'Определяют, какие операции (persist, merge, delete) распространяются на связанные сущности. Типы: ALL, PERSIST, MERGE, REMOVE, REFRESH, DETACH.',
  },
  {
    category: 'Database',
    question: 'Что такое стратегии наследования в JPA?',
    short_answer:
      'SINGLE_TABLE (одна таблица), JOINED (таблица на каждый класс), TABLE_PER_CLASS (таблица на каждый конкретный класс).',
  },
  {
    category: 'Database',
    question: 'Что такое @Embeddable и @Embedded?',
    short_answer:
      'Используются для встраиваемых компонентов (value objects). Поля встраиваются в таблицу владельца.',
  },
  {
    category: 'Database',
    question: 'Что такое @ElementCollection?',
    short_answer:
      'Коллекция простых типов или embeddable объектов, хранится в отдельной таблице.',
  },
  // Дополнительный 1 вопрос (Database)
  {
    category: 'Database',
    question: 'Что такое Native Query в Hibernate?',
    short_answer:
      'Запрос на чистом SQL, а не JPQL. Используется createNativeQuery(). Требует указания результата.',
  },
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
        [q.category, q.question, q.short_answer],
      );
    }

    console.log(`✅ Inserted ${questions.length} questions`);

    // Show statistics
    const stats = await client.query(`
      SELECT category, COUNT(*) as count 
      FROM questions 
      GROUP BY category 
      ORDER BY count DESC
    `);

    console.log('\n📊 Questions by category:');
    let total = 0;
    stats.rows.forEach((row) => {
      console.log(`   ${row.category}: ${row.count} questions`);
      total += parseInt(row.count);
    });
    console.log(`   ─────────────────────────────`);
    console.log(`   TOTAL: ${total} questions`);

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
