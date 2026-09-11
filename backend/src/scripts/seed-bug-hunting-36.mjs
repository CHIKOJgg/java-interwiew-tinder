import dotenv from 'dotenv';
dotenv.config({ path: 'backend/.env' });
import pool from '../config/database.js';

const JAVA_BUGS = [
  {
    topic: 'Spring & AOP',
    code: `@Service
public class OrderService {
    public void processOrder(Order order) {
        // Вызов транзакционного метода из того же класса
        this.saveWithAudit(order);
    }

    @Transactional
    public void saveWithAudit(Order order) {
        orderRepository.save(order);
        auditRepository.log("Saved: " + order.getId());
    }
}`,
    bug: 'Вызов @Transactional метода через this обходит AOP-прокси, транзакция не откроется',
    options: [
      'Вызов @Transactional метода через this обходит AOP-прокси, транзакция не откроется',
      'Метод saveWithAudit не может быть public внутри @Service бина',
      'Необходимо добавить аннотацию @Async к методу processOrder',
      'Транзакция откатится из-за конкатенации строки в auditRepository.log'
    ]
  },
  {
    topic: 'Multithreading',
    code: `public class Counter {
    private volatile int count = 0;

    public void increment() {
        count++;
    }

    public int getCount() {
        return count;
    }
}`,
    bug: 'Операция count++ неатомарна, volatile не защищает от race condition при параллельной записи',
    options: [
      'Операция count++ неатомарна, volatile не защищает от race condition при параллельной записи',
      'Переменная volatile не может быть примитивного типа int',
      'Метод getCount() вернет отрицательное значение при переполнении',
      'Необходимо использовать модификатор final для переменной count'
    ]
  },
  {
    topic: 'Collections',
    code: `List<String> items = new ArrayList<>(List.of("A", "B", "delete", "C"));

for (String item : items) {
    if ("delete".equals(item)) {
        items.remove(item);
    }
}`,
    bug: 'Удаление элемента из списка в цикле for-each приводит к ConcurrentModificationException',
    options: [
      'Удаление элемента из списка в цикле for-each приводит к ConcurrentModificationException',
      'Метод List.of создает неизменяемый список, конструктор ArrayList выбросит UnsupportedOperationException',
      'Строковый литерал "delete" должен проверяться через item.equals("delete")',
      'Метод items.remove(item) возвращает boolean и требует присвоения'
    ]
  },
  {
    topic: 'NullSafety & Unboxing',
    code: `public class PriceCalculator {
    public static double calculateDiscount(Double price, boolean isVip) {
        Double discount = isVip ? 0.2 : null;
        return price * (1 - discount);
    }
}`,
    bug: 'Автораспаковка переменной discount со значением null в примитив double вызывает NullPointerException',
    options: [
      'Автораспаковка переменной discount со значением null в примитив double вызывает NullPointerException',
      'Тернарный оператор не может присваивать null в обертку Double',
      'Арифметическая операция (1 - discount) приводит к потере точности double',
      'Параметр price должен быть объявлен как final'
    ]
  },
  {
    topic: 'Memory Management',
    code: `public class SessionRegistry {
    private static final Map<String, byte[]> CACHE = new HashMap<>();

    public static void register(String token, byte[] payload) {
        CACHE.put(token, payload);
    }
}`,
    bug: 'Статическая HashMap накапливает ссылки без очистки, приводя к утечке памяти (OutOfMemoryError)',
    options: [
      'Статическая HashMap накапливает ссылки без очистки, приводя к утечке памяти (OutOfMemoryError)',
      'Массив байтов byte[] не может быть значением в HashMap',
      'HashMap не компилируется без указания начального размера initialCapacity',
      'Строковый ключ token должен реализовывать интерфейс Comparable'
    ]
  },
  {
    topic: 'Equals & HashCode',
    code: `public class Point {
    private final int x;
    private final int y;

    public Point(int x, int y) { this.x = x; this.y = y; }

    // Перегрузка вместо переопределения
    public boolean equals(Point other) {
        return other != null && this.x == other.x && this.y == other.y;
    }
}`,
    bug: 'Метод equals(Point) перегружает, а не переопределяет equals(Object), ломая поиск в HashSet/HashMap',
    options: [
      'Метод equals(Point) перегружает, а не переопределяет equals(Object), ломая поиск в HashSet/HashMap',
      'Поля x и y должны быть private static для корректного сравнения',
      'Нельзя использовать оператор == для сравнения примитивов int',
      'Конструктор Point должен проверять аргументы на null'
    ]
  },
  {
    topic: 'Strings & Comparison',
    code: `String s1 = "hello";
String s2 = new String("hello");

if (s1 == s2) {
    System.out.println("Strings are identical");
} else {
    System.out.println("Different objects");
}`,
    bug: 'Сравнение строк через == проверяет идентичность ссылок, а не эквивалентность содержимого (.equals())',
    options: [
      'Сравнение строк через == проверяет идентичность ссылок, а не эквивалентность содержимого (.equals())',
      'Создание строки через new String() запрещено компилятором в Java 17+',
      'Строка s1 не интернируется строковым пулом JVM',
      'В блоке else вызовется NullPointerException'
    ]
  },
  {
    topic: 'Financial Calculations',
    code: `public class BankService {
    public static void transfer() {
        BigDecimal a = new BigDecimal(0.1);
        BigDecimal b = new BigDecimal(0.2);
        System.out.println(a.add(b));
    }
}`,
    bug: 'Конструктор new BigDecimal(double) переносит неточность представления double, нужен new BigDecimal("0.1") или valueOf',
    options: [
      'Конструктор new BigDecimal(double) переносит неточность представления double, нужен new BigDecimal("0.1") или valueOf',
      'Метод a.add(b) изменяет значение переменной a на месте',
      'Тип BigDecimal не поддерживает вызов метода System.out.println',
      'Литерал 0.1 компилируется как float, вызывая ClassCastException'
    ]
  },
  {
    topic: 'Resources & I/O',
    code: `public String readFirstLine(String path) throws IOException {
    BufferedReader br = new BufferedReader(new FileReader(path));
    String line = br.readLine();
    if (line == null) throw new IllegalArgumentException("Empty file");
    br.close();
    return line;
}`,
    bug: 'При выбросе исключения поток br не закрывается; необходимо использовать try-with-resources',
    options: [
      'При выбросе исключения поток br не закрывается; необходимо использовать try-with-resources',
      'FileReader не поддерживает оборачивание в BufferedReader',
      'Метод readLine() возвращает char[], а не String',
      'Исключение IllegalArgumentException должно быть объявлено в throws'
    ]
  },
  {
    topic: 'Stream API',
    code: `List<Integer> list = List.of(1, 2, 3, 4, 5);
Stream<Integer> stream = list.stream().filter(x -> x % 2 == 0);

long count = stream.count();
List<Integer> evens = stream.toList();`,
    bug: 'Повторное использование уже закрытого Stream вызывает IllegalStateException',
    options: [
      'Повторное использование уже закрытого Stream вызывает IllegalStateException',
      'Метод filter() не может принимать лямбда-выражение с операцией остатка %',
      'Метод toList() возвращает массив Integer[], а не List',
      'Коллекция List.of не поддерживает вызов .stream()'
    ]
  },
  {
    topic: 'Deadlock & Concurrency',
    code: `public void transfer(Account from, Account to, int amount) {
    synchronized (from) {
        synchronized (to) {
            from.debit(amount);
            to.credit(amount);
        }
    }
}`,
    bug: 'Несогласованный порядок блокировок приводит к взаимной блокировке (Deadlock) при параллельных переводах A→B и B→A',
    options: [
      'Несогласованный порядок блокировок приводит к взаимной блокировке (Deadlock) при параллельных переводах A→B и B→A',
      'Вложенные блоки synchronized запрещены в спецификации JVM',
      'Метод debit обязан вызываться после метода credit',
      'Параметр amount должен быть типа AtomicInteger'
    ]
  },
  {
    topic: 'ThreadLocal Leak',
    code: `public class UserContextFilter implements Filter {
    private static final ThreadLocal<User> ctx = new ThreadLocal<>();

    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain) throws Exception {
        ctx.set(extractUser(req));
        chain.doFilter(req, res);
        // Забыли вызвать ctx.remove()
    }
}`,
    bug: 'Отсутствие ctx.remove() в блоке finally приводит к утечке данных между запросами в пуле потоков сервлета',
    options: [
      'Отсутствие ctx.remove() в блоке finally приводит к утечке данных между запросами в пуле потоков сервлета',
      'ThreadLocal не может хранить пользовательские классы вроде User',
      'Метод chain.doFilter нельзя вызывать после ctx.set',
      'Переменная ctx должна быть объявлена без модификатора static'
    ]
  },
  {
    topic: 'Arrays & Math',
    code: `public int binarySearch(int[] arr, int target) {
    int low = 0;
    int high = arr.length - 1;
    while (low <= high) {
        int mid = (low + high) / 2;
        if (arr[mid] == target) return mid;
        if (arr[mid] < target) low = mid + 1;
        else high = mid - 1;
    }
    return -1;
}`,
    bug: 'Вычисление (low + high) / 2 приводит к целочисленному переполнению при больших индексах, нужно low + (high - low) / 2',
    options: [
      'Вычисление (low + high) / 2 приводит к целочисленному переполнению при больших индексах, нужно low + (high - low) / 2',
      'Условие цикла while должно быть строго low < high',
      'Массив arr должен быть обязательно типа long[]',
      'Возвращаемое значение -1 вызывает ArrayIndexOutOfBoundsException'
    ]
  },
  {
    topic: 'Optional Misuse',
    code: `public String getEmailDomain(User user) {
    Optional<String> email = Optional.ofNullable(user.getEmail());
    // Прямой get без проверки
    return email.get().substring(email.get().indexOf("@") + 1);
}`,
    bug: 'Вызов email.get() без проверки isPresent() или orElse/map выбросит NoSuchElementException, если email равен null',
    options: [
      'Вызов email.get() без проверки isPresent() или orElse/map выбросит NoSuchElementException, если email равен null',
      'Метод Optional.ofNullable не принимает null значения',
      'Метод substring не работает с результатом indexOf',
      'Параметр user должен быть обернут в Optional<User>'
    ]
  },
  {
    topic: 'JPA & Hibernate',
    code: `@Entity
public class User {
    @Id @GeneratedValue
    private Long id;

    @OneToMany(cascade = CascadeType.ALL)
    private List<Order> orders = new ArrayList<>();
}`,
    bug: 'Отсутствие mappedBy в двунаправленной связи @OneToMany создает лишнюю промежуточную join-таблицу в БД',
    options: [
      'Отсутствие mappedBy в двунаправленной связи @OneToMany создает лишнюю промежуточную join-таблицу в БД',
      'Поле orders обязано быть интерфейсом Set, а не List',
      'Аннотация @GeneratedValue требует явного указания strategy = AUTO',
      'CascadeType.ALL запрещен для связей типа OneToMany'
    ]
  },
  {
    topic: 'Spring Scheduled',
    code: `@Component
public class ReportScheduler {
    @Scheduled(fixedRate = 1000)
    public void generateHourlyReport() throws Exception {
        Thread.sleep(5000); // Долгая блокирующая операция
    }
}`,
    bug: 'По умолчанию ScheduledTaskExecutor однопоточный, долгая задача заблокирует выполнение всех остальных @Scheduled задач',
    options: [
      'По умолчанию ScheduledTaskExecutor однопоточный, долгая задача заблокирует выполнение всех остальных @Scheduled задач',
      'Параметр fixedRate не может быть меньше времени сна Thread.sleep',
      'Метод генерации отчетов обязан возвращать Future<Void>',
      'Аннотация @Scheduled требует обязательного атрибута cron'
    ]
  },
  {
    topic: 'Polymorphism & Hiding',
    code: `class Parent {
    public static void print() { System.out.println("Parent"); }
}
class Child extends Parent {
    public static void print() { System.out.println("Child"); }
}
public class Test {
    public static void main(String[] args) {
        Parent p = new Child();
        p.print();
    }
}`,
    bug: 'Статические методы не полиморфны (они скрываются, а не переопределяются), поэтому вызовется Parent.print()',
    options: [
      'Статические методы не полиморфны (они скрываются, а не переопределяются), поэтому вызовется Parent.print()',
      'Компилятор запрещает объявлять статический метод с тем же именем в классе-наследнике',
      'Создание new Child() вызовет ClassCastException при присвоении в тип Parent',
      'Метод print обязан принимать строковый аргумент'
    ]
  },
  {
    topic: 'Collections Sorting',
    code: `List<Integer> list = Arrays.asList(3, 1, 2);
Collections.sort(list);
list.add(4);`,
    bug: 'Arrays.asList возвращает список фиксированного размера, вызов list.add(4) выбросит UnsupportedOperationException',
    options: [
      'Arrays.asList возвращает список фиксированного размера, вызов list.add(4) выбросит UnsupportedOperationException',
      'Метод Collections.sort не может сортировать список с примитивными обертками Integer',
      'Список list должен быть объявлен как ArrayList<Integer>',
      'Значение 4 должно быть приведено к типу (Integer) 4'
    ]
  }
];

const PYTHON_BUGS = [
  {
    topic: 'Functions & Defaults',
    code: `def add_item(item, basket=[]):
    basket.append(item)
    return basket

cart1 = add_item('apple')
cart2 = add_item('banana')
print(cart2)`,
    bug: 'Изменяемое значение по умолчанию (list) создается один раз и сохраняет состояние между вызовами функции',
    options: [
      'Изменяемое значение по умолчанию (list) создается один раз и сохраняет состояние между вызовами функции',
      'Функция append не возвращает обновленный список',
      'В Python имена переменных basket и cart1 должны совпадать',
      'Параметр basket обязан быть объявлен как tuple'
    ]
  },
  {
    topic: 'Closures & Scopes',
    code: `multipliers = [lambda x: x * i for i in range(4)]
results = [m(2) for m in multipliers]
print(results)  # Ожидалось [0, 2, 4, 6]`,
    bug: 'Позднее связывавание в замыканиях: переменная i берется из внешней области на момент вызова lambda, все выдадут 6',
    options: [
      'Позднее связывавание в замыканиях: переменная i берется из внешней области на момент вызова lambda, все выдадут 6',
      'Лямбда-функции в Python не поддерживают доступ к переменной цикла range',
      'Генератор списков multipliers не может содержать объекты функций',
      'Выражение m(2) вызывает TypeError, так как лямбда не принимает аргументов'
    ]
  },
  {
    topic: 'Dictionaries & Iteration',
    code: `data = {'a': 1, 'b': 2, 'c': 3}

for key in data:
    if data[key] % 2 == 0:
        del data[key]`,
    bug: 'Изменение размера словаря во время итерации по нему вызывает RuntimeError: dictionary changed size during iteration',
    options: [
      'Изменение размера словаря во время итерации по нему вызывает RuntimeError: dictionary changed size during iteration',
      'Оператор del data[key] удаляет весь словарь, а не отдельный ключ',
      'Словарь в Python не поддерживает операцию итерации напрямую без .items()',
      'Ключ key не может быть строковым при проверке остатка от деления'
    ]
  },
  {
    topic: 'Scopes & Local Variables',
    code: `counter = 0

def increment():
    counter += 1
    return counter

print(increment())`,
    bug: 'Присваивание делает counter локальной переменной, вызывая UnboundLocalError до чтения; нужен global counter',
    options: [
      'Присваивание делает counter локальной переменной, вызывая UnboundLocalError до чтения; нужен global counter',
      'Оператор += не поддерживается для глобальных переменных в Python',
      'Функция increment не принимает обязательный аргумент counter',
      'Переменная counter должна быть объявлена как static int'
    ]
  },
  {
    topic: 'Identity vs Equality',
    code: `a = 1000
b = 1000

if a is b:
    print("Same object")
else:
    print("Different objects")`,
    bug: 'Оператор is проверяет идентичность id объектов в памяти; для чисел вне кеша (-5..256) нужно использовать сравнение ==',
    options: [
      'Оператор is проверяет идентичность id объектов в памяти; для чисел вне кеша (-5..256) нужно использовать сравнение ==',
      'В Python числа больше 255 не могут быть присвоены переменным типа int',
      'Конструкция if a is b запрещена стандартом PEP 8 и вызывает SyntaxError',
      'Переменные a и b автоматически приводятся к типу float'
    ]
  },
  {
    topic: 'AsyncIO & Concurrency',
    code: `import asyncio

async def fetch_data():
    await asyncio.sleep(1)
    return {"status": "ok"}

async def main():
    # Забыли await
    result = fetch_data()
    print("Data received:", result)

asyncio.run(main())`,
    bug: 'Вызов корутины без await возвращает объект coroutine вместо результата и не выполняет тело функции',
    options: [
      'Вызов корутины без await возвращает объект coroutine вместо результата и не выполняет тело функции',
      'asyncio.sleep нельзя вызывать внутри async def функций',
      'Функция main() не может быть запущена через asyncio.run',
      'Словарь {"status": "ok"} не поддерживает асинхронную сериализацию'
    ]
  },
  {
    topic: 'Dataclasses & Mutables',
    code: `from dataclasses import dataclass

@dataclass
class Team:
    name: str
    members: list = []`,
    bug: 'Использование list = [] в dataclass вызывает ValueError: mutable default is not allowed, нужно field(default_factory=list)',
    options: [
      'Использование list = [] в dataclass вызывает ValueError: mutable default is not allowed, нужно field(default_factory=list)',
      'Класс Team должен явно наследовать стандартный класс object',
      'Декоратор @dataclass не поддерживает списки в качестве типов полей',
      'Поле name должно иметь значение по умолчанию'
    ]
  },
  {
    topic: 'List In-Place Methods',
    code: `numbers = [4, 2, 8, 1]
sorted_numbers = numbers.sort()

for n in sorted_numbers:
    print(n)`,
    bug: 'Метод list.sort() сортирует список на месте и возвращает None, вызывая TypeError: NoneType object is not iterable',
    options: [
      'Метод list.sort() сортирует список на месте и возвращает None, вызывая TypeError: NoneType object is not iterable',
      'Метод sort() не работает со списками, содержащими четные числа',
      'Итерация по списку в Python требует обязательного вызова функции range()',
      'Переменная sorted_numbers должна быть объявлена через ключевое слово sorted'
    ]
  },
  {
    topic: 'Exception Handling',
    code: `def get_user_age(user_dict):
    try:
        return int(user_dict['age'])
    except:
        pass
    return 0`,
    bug: 'Голый except: перехватывает системные исключения SystemExit, KeyboardInterrupt и скрывает синтаксические ошибки',
    options: [
      'Голый except: перехватывает системные исключения SystemExit, KeyboardInterrupt и скрывает синтаксические ошибки',
      'Словарь user_dict не может содержать строковые ключи внутри try блока',
      'Функция int() не умеет преобразовывать строки в целые числа',
      'Оператор pass вызывает завершение программы с кодом 1'
    ]
  },
  {
    topic: 'File Handling & Context',
    code: `def save_log(entry):
    f = open('app.log', 'w')
    f.write(entry + '\n')
    # Забыли закрыть файл при возможной ошибке`,
    bug: 'Файл не закрывается при возникновении исключения; необходимо использовать менеджер контекста with open(...) as f',
    options: [
      'Файл не закрывается при возникновении исключения; необходимо использовать менеджер контекста with open(...) as f',
      'Режим w блокирует запись символа перевода строки \\n',
      'Функция write требует передачи объекта типа bytes',
      'Имя файла должно быть обязательно абсолютным системным путем'
    ]
  },
  {
    topic: 'Copies & Deepcopy',
    code: `import copy

original = [[1, 2, 3], [4, 5, 6]]
clone = original.copy()

clone[0][0] = 999
print(original[0][0])  # Выведет 999!`,
    bug: 'Метод copy() выполняет мелкое копирование (shallow copy), внутренние вложенные списки остаются общими; нужен copy.deepcopy',
    options: [
      'Метод copy() выполняет мелкое копирование (shallow copy), внутренние вложенные списки остаются общими; нужен copy.deepcopy',
      'Модуль copy несовместим со списками целых чисел в Python 3',
      'Синтаксис clone[0][0] недопустим для двумерных массивов в Python',
      'Метод copy() возвращает кортеж tuple, изменяемый только на месте'
    ]
  },
  {
    topic: 'Operator Precedence',
    code: `status = False
flags = ['active', 'verified']

if not status in flags:
    print("Not in flags")`,
    bug: 'Приоритет: not status in flags трактуется как (not status) in flags -> True in flags (вычислится неверно), нужно status not in flags',
    options: [
      'Приоритет: not status in flags трактуется как (not status) in flags -> True in flags (вычислится неверно), нужно status not in flags',
      'Оператор in не умеет искать булевы значения в строковых списках',
      'Списки flags не могут содержать строковые литералы в условиях',
      'Выражение status in flags обязано быть обернуто в функцию bool()'
    ]
  },
  {
    topic: 'Pandas & SettingWithCopy',
    code: `import pandas as pd

df = pd.DataFrame({'status': ['pending', 'done'], 'score': [10, 20]})
# Чейнинг индексации
df[df['status'] == 'pending']['score'] = 100`,
    bug: 'Чейнинг индексации приводит к SettingWithCopyWarning и не изменяет исходный DataFrame, нужно df.loc[condition, "score"] = 100',
    options: [
      'Чейнинг индексации приводит к SettingWithCopyWarning и не изменяет исходный DataFrame, нужно df.loc[condition, "score"] = 100',
      'DataFrame не может содержать колонки с разными типами данных (str и int)',
      'Значение 100 должно быть передано как строковый литерал "100"',
      'Оператор == запрещен для фильтрации столбцов в библиотеке pandas'
    ]
  },
  {
    topic: 'String Slicing & Indices',
    code: `text = "Python"
# Индекс за пределами строки
char = text[10]`,
    bug: 'Прямое обращение по несуществующему индексу вызывает IndexError, в отличие от срезов text[10:11], возвращающих пустую строку',
    options: [
      'Прямое обращение по несуществующему индексу вызывает IndexError, в отличие от срезов text[10:11], возвращающих пустую строку',
      'Строка text в Python является мутабельным массивом и должна быть зафиксирована',
      'Индексация строк в Python начинается с 1, поэтому 10 допустимо только для 11-символьных строк',
      'Вызов text[10] вернет значение None без выброса ошибки'
    ]
  },
  {
    topic: 'Tuples vs Single Item',
    code: `def get_singleton():
    item = (42)
    return type(item)`,
    bug: 'item = (42) создает int, а не кортеж; для одноэлементного tuple обязательна запятая: (42,)',
    options: [
      'item = (42) создает int, а не кортеж; для одноэлементного tuple обязательна запятая: (42,)',
      'Круглые скобки в Python зарезервированы только для вызова функций',
      'Функция type() не может возвращать тип локальных переменных',
      'Число 42 не может входить в состав кортежей без упаковки в строку'
    ]
  },
  {
    topic: 'Class Variables vs Instance',
    code: `class Dog:
    tricks = []

    def __init__(self, name):
        self.name = name

    def add_trick(self, trick):
        self.tricks.append(trick)

d1 = Dog('Fido')
d2 = Dog('Buddy')
d1.add_trick('roll over')
print(d2.tricks)`,
    bug: 'tricks — атрибут класса, а не экземпляра, поэтому список трюков разделяется между всеми собаками',
    options: [
      'tricks — атрибут класса, а не экземпляра, поэтому список трюков разделяется между всеми собаками',
      'Метод __init__ обязан инициализировать все атрибуты класса как static',
      'Вызов self.tricks.append() выбросит AttributeError у объекта d2',
      'Имена классов в Python не могут начинаться с заглавной буквы Dog'
    ]
  },
  {
    topic: 'JSON Serialization',
    code: `import json
from datetime import datetime

data = {"timestamp": datetime.now(), "event": "click"}
serialized = json.dumps(data)`,
    bug: 'Стандартный json.dumps не умеет сериализовать datetime, вызывая TypeError: Object of type datetime is not JSON serializable',
    options: [
      'Стандартный json.dumps не умеет сериализовать datetime, вызывая TypeError: Object of type datetime is not JSON serializable',
      'Словарь data должен иметь строковые ключи только в одинарных кавычках',
      'Модуль json в Python 3 устарел и заменен на модуль simplejson',
      'Функция datetime.now() возвращает генератор, требующий вызова list()'
    ]
  },
  {
    topic: 'Regular Expressions & Escapes',
    code: `import re

# Забыли raw-строку r"..."
pattern = "\\d+\\s+"
text = "123  abc"
match = re.search(pattern, text)`,
    bug: 'Без префикса raw-строки r"\\d+\\s+" экранирование бэкслешей в строковом литерале Python может приводить к искажению регулярного выражения',
    options: [
      'Без префикса raw-строки r"\\d+\\s+" экранирование бэкслешей в строковом литерале Python может приводить к искажению регулярного выражения',
      'Метод re.search не поддерживает поиск совпадений с цифрами \\d',
      'Паттерн должен быть предварительно скомпилирован через re.split',
      'Строка text обязана содержать только латинские символы'
    ]
  }
];

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function runSeed() {
  console.log('🚀 Seeding 36 high-quality Bug Hunting exercises (18 Java, 18 Python)...');

  // Find candidate questions in Java and Python
  const javaQuestions = await pool.query(
    `SELECT id, question_text, category FROM questions 
     WHERE language = 'Java' AND is_active = TRUE 
     ORDER BY id ASC LIMIT 50`
  );

  const pythonQuestions = await pool.query(
    `SELECT id, question_text, category FROM questions 
     WHERE language = 'Python' AND is_active = TRUE 
     ORDER BY id ASC LIMIT 50`
  );

  console.log(`Found ${javaQuestions.rows.length} Java candidates and ${pythonQuestions.rows.length} Python candidates.`);

  let javaUpdated = 0;
  for (let i = 0; i < JAVA_BUGS.length; i++) {
    const bugDef = JAVA_BUGS[i];
    const targetQ = javaQuestions.rows[i];
    if (!targetQ) break;

    const bugHuntingData = {
      code: bugDef.code,
      bug: bugDef.bug,
      options: shuffle(bugDef.options),
      topic: bugDef.topic
    };

    await pool.query(
      'UPDATE questions SET bug_hunting_data = $1 WHERE id = $2',
      [JSON.stringify(bugHuntingData), targetQ.id]
    );
    javaUpdated++;
  }

  let pythonUpdated = 0;
  for (let i = 0; i < PYTHON_BUGS.length; i++) {
    const bugDef = PYTHON_BUGS[i];
    const targetQ = pythonQuestions.rows[i];
    if (!targetQ) break;

    const bugHuntingData = {
      code: bugDef.code,
      bug: bugDef.bug,
      options: shuffle(bugDef.options),
      topic: bugDef.topic
    };

    await pool.query(
      'UPDATE questions SET bug_hunting_data = $1 WHERE id = $2',
      [JSON.stringify(bugHuntingData), targetQ.id]
    );
    pythonUpdated++;
  }

  console.log(`✅ Successfully seeded ${javaUpdated} Java bugs and ${pythonUpdated} Python bugs!`);

  const verify = await pool.query(
    'SELECT language, COUNT(*) as count FROM questions WHERE bug_hunting_data IS NOT NULL GROUP BY language'
  );
  console.log('📊 Current bug_hunting_data distribution in database:');
  console.table(verify.rows);

  await pool.end();
}

runSeed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
