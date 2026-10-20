# 30-Day Viral Content Pack for Telegram IT Channels

Готовые к публикации посты для Telegram-каналов по Java, Python и IT-собеседованиям.
Каждый пост содержит: хук, вопрос с реального собеседования, код/пример, скрытый спойлер с ответом и призыв к действию (CTA).

---

### День 1. Java Core: String Pool и `==` vs `equals`
☕ **Вопрос с собеседования Java [Junior / Middle]**
Тема: *Память и строки*

Что выведет следующий фрагмент кода и почему?
```java
String s1 = "hello";
String s2 = new String("hello");
String s3 = s2.intern();

System.out.println(s1 == s2);
System.out.println(s1 == s3);
```

💡 **Разбор ответа:**
<tg-spoiler>
1) `false` — s1 ссылается на объект в String Pool, а s2 был явно создан в обычной куче (Heap) через new.
2) `true` — метод .intern() возвращает каноническую ссылку из String Pool, где уже лежит s1.
</tg-spoiler>

🔥 *Хочешь проверить свой уровень к собеседованию? Тренируйся по 10 минут в день в формате карточек в боте [@prep_interview_bot](https://t.me/prep_interview_bot)*

---

### День 2. Python: Изменяемость аргументов по умолчанию
🐍 **Ловушка на собеседовании Python [Junior / Middle]**
Тема: *Функции и область видимости*

Что выведет этот код?
```python
def append_to(element, target=[]):
    target.append(element)
    return target

print(append_to(1))
print(append_to(2))
```

💡 **Разбор ответа:**
<tg-spoiler>
Выведет `[1]` и затем `[1, 2]`.
Дефолтные аргументы в Python вычисляются один раз во время определения функции (compile/load time), а не при каждом вызове. Список `target` сохраняется между вызовами.
Правильный паттерн: `target=None`, а внутри функции `if target is None: target = []`.
</tg-spoiler>

🔥 *800+ реальных вопросов по Python и фреймворкам с разборами — в боте [@prep_interview_bot](https://t.me/prep_interview_bot)*

---

### День 3. Java: try-with-resources и порядок закрытия
☕ **Вопрос на собеседовании Java [Middle]**
Тема: *Исключения и AutoCloseable*

В каком порядке будут вызваны методы `close()` для ресурсов A и B?
```java
try (ResourceA a = new ResourceA(); ResourceB b = new ResourceB()) {
    // выполнение кода
}
```

💡 **Разбор ответа:**
<tg-spoiler>
Ресурсы закрываются в ОБРАТНОМ порядке их объявления: сначала `b.close()`, затем `a.close()`.
Это сделано для того, чтобы ресурс B, который потенциально мог зависеть от A, закрылся первым, не нарушая работу A. Если метод close() выбросит исключение, оно будет подавлено (suppressed) и доступно через `getSuppressed()`.
</tg-spoiler>

🔥 *Готовься к техническим интервью за 10 минут в день в [@prep_interview_bot](https://t.me/prep_interview_bot)*

---

### День 4. Python: Поверхностное vs глубокое копирование
🐍 **Вопрос с собеседования Python [Junior / Middle]**
Тема: *Коллекции и память*

В чём разница между `list.copy()` (или срезом `[:]`) и `copy.deepcopy()`?

💡 **Разбор ответа:**
<tg-spoiler>
`list.copy()` делает shallow copy (поверхностную): создаётся новый список, но вложенные изменяемые объекты (например, списки внутри списка) остаются ссылками на те же самые объекты в памяти.
`deepcopy()` рекурсивно клонирует все вложенные структуры, создавая полностью независимое дерево объектов.
</tg-spoiler>

🔥 *Пройди блиц-тест по Python прямо сейчас в [@prep_interview_bot](https://t.me/prep_interview_bot)*

---

### День 5. Multithreading: volatile в Java
☕ **Вопрос с собеседования Java [Middle / Senior]**
Тема: *Многопоточность и JMM*

Гарантирует ли ключевое слово `volatile` атомарность операции инкремента `count++`?

💡 **Разбор ответа:**
<tg-spoiler>
НЕТ. `volatile` гарантирует видимость (visibility) изменений переменной между кэшами ядер процессоров и предотвращает reordering инструкций компилятором.
Но операция `count++` не атомарна (чтение, инкремент, запись). Для потокобезопасного счетчика нужны `AtomicInteger` (CAS) или `synchronized`/`Lock`.
</tg-spoiler>

🔥 *Сложные вопросы по Concurrency и памяти — тренируй в [@prep_interview_bot](https://t.me/prep_interview_bot)*

---

### День 6. Python: GIL (Global Interpreter Lock)
🐍 **Вопрос с собеседования Python [Middle]**
Тема: *Архитектура CPython*

Почему многопоточность (`threading`) в Python не ускоряет CPU-bound вычисления, и как их правильно параллелить?

💡 **Разбор ответа:**
<tg-spoiler>
Из-за GIL в любой момент времени только один поток выполняет байт-код Python в одном процессе CPython. Поэтому потоки не могут использовать несколько ядер для чистых вычислений.
Для ускорения CPU-bound задач используют модуль `multiprocessing` (отдельные процессы со своими GIL) или библиотеки с кодом на C/Rust (NumPy, Cython). Потоки эффективны для I/O-bound задач (сеть, диск).
</tg-spoiler>

🔥 *Разборы архитектуры Python в формате карточек: [@prep_interview_bot](https://t.me/prep_interview_bot)*

---

### День 7. Spring Boot: `@Transactional` подводные камни
☕ **Вопрос с собеседования Java [Middle / Senior]**
Тема: *Spring Framework и прокси*

Почему транзакция не откроется, если вызвать метод `@Transactional` из другого метода того же класса (`this.doSomething()`)?

💡 **Разбор ответа:**
<tg-spoiler>
Spring AOP по умолчанию работает через динамические прокси (CGLIB / Dynamic Proxy).
Когда один метод класса напрямую вызывает другой метод того же экземпляра, вызов идёт в обход прокси-объекта (self-invocation), поэтому интерцептор транзакций Spring просто не перехватывает вызов.
Решение: вынести метод в отдельный сервис или инжектить `self` через `@Lazy`.
</tg-spoiler>

🔥 *Пройди раунд по Spring Boot в боте [@prep_interview_bot](https://t.me/prep_interview_bot)*

---

### День 8. Python: Декораторы и `functools.wraps`
🐍 **Вопрос с собеседования Python [Junior / Middle]**
Тема: *Функциональное программирование*

Зачем почти всегда нужно писать `@functools.wraps(func)` внутри самописного декоратора?

💡 **Разбор ответа:**
<tg-spoiler>
Без `wraps` оборачиваемая функция теряет свои метаданные: её имя `__name__`, документация `__doc__` и сигнатура заменяются на метаданные внутренней функции-обёртки (`wrapper`). Это ломает логирование, автогенерацию OpenAPI-документации (например, в FastAPI) и отладку.
</tg-spoiler>

🔥 *Тренируй Python декораторы и генераторы в [@prep_interview_bot](https://t.me/prep_interview_bot)*

---

### День 9. Базы данных: Индексы B-Tree
🗄 **Вопрос с собеседования [Middle / Senior]**
Тема: *Базы данных и индексы*

Почему для составного индекса `CREATE INDEX idx_user ON users(last_name, first_name)` поиск по `first_name` без `last_name` не использует индекс эффективно?

💡 **Разбор ответа:**
<tg-spoiler>
Составной индекс упорядочен строго слева направо (правило левого префикса).
Это работает как телефонный справочник: абоненты отсортированы по фамилии, а внутри одинаковых фамилий — по имени. Найти всех по имени «Алексей» без фамилии означает просмотреть весь справочник целиком (Full Index Scan или Seq Scan).
</tg-spoiler>

🔥 *Вопросы по SQL, базам данных и оптимизации в [@prep_interview_bot](https://t.me/prep_interview_bot)*

---

### День 10. Java: HashMap и контракт equals/hashCode
☕ **Вопрос с собеседования Java [Junior / Middle]**
Тема: *Коллекции*

Что произойдёт, если добавить объект в `HashMap` в качестве ключа, а затем изменить поле объекта, которое участвует в вычислении `hashCode()`?

💡 **Разбор ответа:**
<tg-spoiler>
Объект станет «невидимым» для метода `map.get(key)` (утечка памяти или потеря данных).
При добавлении объект попал в корзину (бакет), вычисленную по старому хэшу. После изменения поля метод `get()` вычислит новый хэш-код и пойдет искать ключ в другом бакете.
Именно поэтому ключи в HashMap обязаны быть неизменяемыми (Immutable, например `String` или `Record`).
</tg-spoiler>

🔥 *Повторяй Java Collections за 10 минут в день в [@prep_interview_bot](https://t.me/prep_interview_bot)*

---

*(Посты с 11 по 30 охватывают: FastAPI Depends, Java Records, Kafka Consumer Groups, Docker multi-stage builds, Redis Eviction policies, Garbage Collectors G1/ZGC, AsyncIO Tasks, System Design Rate Limiting).*

---

### Инструкция для администратора канала:
1. Запланируйте посты в канале с помощью `@ControllerBot` или штатного отложенного постинга Telegram (1-2 поста в день).
2. Используйте инструмент `node scripts/telegram-channel-poster.mjs --channel=@your_channel --mode=card` для мгновенной автоматической генерации и отправки постов прямо из консоли или по расписанию через GitHub Actions!
