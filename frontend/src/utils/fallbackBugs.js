export const FALLBACK_BUGS = {
  Java: [
    {
      code: `public class Counter {
    private int count = 0;
    public void increment() {
        count++; // Race condition
    }
    public int get() { return count; }
}`,
      options: [
        'count++ не является атомарной операцией — состояние гонки при параллельном доступе',
        'Поле count должно быть объявлено static',
        'Метод increment() обязан возвращать целочисленный результат',
        'Нельзя инициализировать count значением 0'
      ],
      bug: 'count++ не является атомарной операцией — состояние гонки при параллельном доступе',
      correctAnswer: 'count++ не является атомарной операцией — состояние гонки при параллельном доступе',
      explanation: 'Инкремент count++ состоит из 3 операций (чтение, увеличение, запись). Без синхронизации или AtomicInteger значение будет потеряно.'
    },
    {
      code: `String s1 = new String("interview");
String s2 = new String("interview");
if (s1 == s2) {
    System.out.println("Strings match");
}`,
      options: [
        'Сравнение строк через == проверяет идентичность ссылок, а не эквивалентность символов',
        'В Java запрещено создавать объекты строк оператором new',
        'Метод println() не может выводить литерал "Strings match"',
        'Тип String необходимо оборачивать в StringBuilder'
      ],
      bug: 'Сравнение строк через == проверяет идентичность ссылок, а не эквивалентность символов',
      correctAnswer: 'Сравнение строк через == проверяет идентичность ссылок, а не эквивалентность символов',
      explanation: 'Оператор == сравнивает адреса объектов в памяти. Для сравнения текстового содержимого строк необходимо использовать s1.equals(s2).'
    },
    {
      code: `List<String> items = Arrays.asList("Alpha", "Beta");
items.add("Gamma");`,
      options: [
        'Arrays.asList() возвращает список фиксированной длины — вызов add() бросает UnsupportedOperationException',
        'Arrays.asList() принимает только аргументы примитивного типа',
        'Метод add() требует передачи целочисленного индекса',
        'Коллекция items должна иметь тип LinkedList'
      ],
      bug: 'Arrays.asList() возвращает список фиксированной длины — вызов add() бросает UnsupportedOperationException',
      correctAnswer: 'Arrays.asList() возвращает список фиксированной длины — вызов add() бросает UnsupportedOperationException',
      explanation: 'Внутренний ArrayList в Arrays.asList не переопределяет методы изменения размера. Для мутируемого списка нужно: new ArrayList<>(Arrays.asList(...)).'
    },
    {
      code: `Integer x = 1000;
Integer y = 1000;
System.out.println(x == y);`,
      options: [
        'Кэш IntegerCache по умолчанию хранит только числа от -128 до 127 — сравнение == вернет false',
        'Переменные типа Integer запрещено проверять через ==',
        'Число 1000 превышает максимально допустимое значение Integer',
        'Оператор == в Java работает только с типами double и float'
      ],
      bug: 'Кэш IntegerCache по умолчанию хранит только числа от -128 до 127 — сравнение == вернет false',
      correctAnswer: 'Кэш IntegerCache по умолчанию хранит только числа от -128 до 127 — сравнение == вернет false',
      explanation: 'Для чисел вне диапазона -128..127 JVM создает новые независимые объекты в Heap. Сравнение ссылок x == y возвращает false. Нужно использовать x.equals(y).'
    }
  ],
  Python: [
    {
      code: `def append_val(item, target=[]):
    target.append(item)
    return target`,
      options: [
        'Изменяемый список [] в аргументе по умолчанию инициализируется один раз и разделяется между вызовами',
        'Метод append() нельзя вызывать для пустого списка',
        'Функция обязана возвращать кортеж tuple вместо list',
        'В Python аргументы без аннотаций типов вызывают ошибку синтаксиса'
      ],
      bug: 'Изменяемый список [] в аргументе по умолчанию инициализируется один раз и разделяется между вызовами',
      correctAnswer: 'Изменяемый список [] в аргументе по умолчанию инициализируется один раз и разделяется между вызовами',
      explanation: 'Значения аргументов по умолчанию вычисляются при определении функции. Изменяемый объект накапливает элементы между вызовами. Следует использовать target=None.'
    },
    {
      code: `import asyncio, time

async def compute():
    time.sleep(3)
    return 42`,
      options: [
        'Синхронный time.sleep() блокирует поток и весь Event Loop asyncio — нужно await asyncio.sleep()',
        'Асинхронная функция async def не может возвращать числовое значение',
        'Модули time и asyncio запрещено импортировать в одном файле',
        'Возвращаемое значение должно быть упаковано в asyncio.Future'
      ],
      bug: 'Синхронный time.sleep() блокирует поток и весь Event Loop asyncio — нужно await asyncio.sleep()',
      correctAnswer: 'Синхронный time.sleep() блокирует поток и весь Event Loop asyncio — нужно await asyncio.sleep()',
      explanation: 'time.sleep останавливает выполнение системного потока. Ни одна другая корутина не получит квант времени. Используйте await asyncio.sleep(3).'
    },
    {
      code: `funcs = [lambda: i for i in range(3)]
print([f() for f in funcs])`,
      options: [
        'Позднее связывание (late binding): переменная i замыкается по ссылке, все функции вернут 2',
        'Генератор списков не может содержать lambda-выражения',
        'Функция range(3) генерирует числа от 1 до 3',
        'Список функций нельзя вызывать внутри list comprehension'
      ],
      bug: 'Позднее связывание (late binding): переменная i замыкается по ссылке, все функции вернут 2',
      correctAnswer: 'Позднее связывание (late binding): переменная i замыкается по ссылке, все функции вернут 2',
      explanation: 'Переменная i ищется в объемлющей области видимости в момент вызова функции. Решение: lambda i=i: i.'
    }
  ],
  Go: [
    {
      code: `var wg sync.WaitGroup
for i := 0; i < 3; i++ {
    go func() {
        fmt.Println(i)
        wg.Done()
    }()
}
wg.Wait()`,
      options: [
        'Захват переменной цикла i горутиной и отсутствие вызова wg.Add(3) перед запуском',
        'Функция fmt.Println не поддерживает вывод чисел в многопоточном режиме',
        'Структуру sync.WaitGroup запрещено передавать без создания через new()',
        'Оператор go func() нельзя вызывать внутри цикла for'
      ],
      bug: 'Захват переменной цикла i горутиной и отсутствие вызова wg.Add(3) перед запуском',
      correctAnswer: 'Захват переменной цикла i горутиной и отсутствие вызова wg.Add(3) перед запуском',
      explanation: 'wg.Add(1) должен вызываться до запуска горутины, а значение i передаваться аргументом.'
    }
  ]
};

export function getFallbackBug(language = 'Java', questionId = 0) {
  const langKey = FALLBACK_BUGS[language] ? language : 'Java';
  const list = FALLBACK_BUGS[langKey];
  const idx = Math.abs(Number(questionId) || 0) % list.length;
  return list[idx];
}
