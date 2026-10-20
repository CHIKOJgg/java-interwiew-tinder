# Топ вопросов по Spring Boot, Hibernate и SQL на собеседовании: разбор с примерами

Подготовка к собеседованию на Java/Kotlin разработчика практически никогда не обходится без каверзных вопросов по Spring Framework, механизмам транзакций, JPA/Hibernate и оптимизации SQL. В этой статье мы собрали ключевые темы уровня Middle/Senior, на которых чаще всего срезаются кандидаты, и разобрали их простыми словами с примерами кода.

---

## 1. Spring Bean Lifecycle: Как создается и живет бин

### Вопрос с собеседования:
*«Опишите полный жизненный цикл синглтон-бина в ApplicationContext. Где срабатывают BeanPostProcessor и @PostConstruct?»*

### Разбор:
Жизненный цикл бина в Spring состоит из четких этапов:
1. **Загрузка BeanDefinition:** Spring читает аннотации (`@Component`, `@Service`) или конфигурации `@Bean`.
2. **Инстанцирование:** Вызывается конструктор класса (через рефлексию или CGLIB).
3. **Внедрение зависимостей (DI):** Заполняются поля, помеченные `@Autowired` или переданные в конструктор.
4. **Aware-интерфейсы:** Если бин реализует `BeanNameAware`, `ApplicationContextAware`, Spring передает ему ссылки на контекст.
5. **BeanPostProcessor (postProcessBeforeInitialization):** Срабатывает перед инициализацией.
6. **Инициализация:** Вызывается метод с `@PostConstruct`, затем метод `afterPropertiesSet()` интерфейса `InitializingBean`, затем кастомный `initMethod`.
7. **BeanPostProcessor (postProcessAfterInitialization):** **Критически важный этап!** Именно здесь создаются **прокси** (Dynamic Proxy или CGLIB) для `@Transactional`, `@Async`, `@Cacheable` и Spring Security!
8. **Бин готов к работе:** Помещается в Singleton Cache (ConcurrentHashMap в ApplicationContext).
9. **Уничтожение (при закрытии контекста):** `@PreDestroy` -> `DisposableBean.destroy()` -> кастомный `destroyMethod`.

> **Частая ошибка на собесе:** Кандидат думает, что `@PostConstruct` вызывается в прокси. Нет! `@PostConstruct` вызывается в оригинальном объекте ДО создания финального CGLIB-прокси.

---

## 2. Ловушка @Transactional: Почему аннотация не срабатывает

### Вопрос с собеседования:
*«Почему вызов метода с @Transactional из другого метода того же класса не открывает транзакцию? Как это исправить?»*

### Пример кода-ловушки:
```java
@Service
public class OrderService {

    public void processOrder(Long orderId) {
        // Вызов метода внутри того же класса
        saveWithAudit(orderId);
    }

    @Transactional
    public void saveWithAudit(Long orderId) {
        // Логика сохранения в БД
    }
}
```

### Разбор:
По умолчанию Spring использует **прокси на базе CGLIB** (или JDK Dynamic Proxies). Когда внешний клиент вызывает `orderService.processOrder()`, он вызывает метод у прокси-объекта. Но когда `processOrder` вызывает `saveWithAudit()`, вызов идет через `this.saveWithAudit()`, минуя прокси! В результате перехватчик `TransactionInterceptor` просто не вызывается, и транзакция не стартует.

### Как исправить:
1. **Вынести метод в отдельный сервис:** Самый чистый и рекомендуемый подход (Single Responsibility Principle).
2. **Инжектировать сам сервис (`self-injection`):**
   ```java
   @Autowired
   private OrderService self;
   // вызов: self.saveWithAudit(orderId);
   ```
3. **Использовать TransactionTemplate:** Программное управление транзакцией без магии прокси.
4. **Включить AspectJ compile-time / load-time weaving:** Замена CGLIB на байткод-модификацию AspectJ.

---

## 3. Propagation уровни в @Transactional: REQUIRED vs REQUIRES_NEW

### Вопрос с собеседования:
*«Что произойдет, если метод с REQUIRES_NEW выбросит RuntimeException? Откатится ли внешняя транзакция REQUIRED?»*

### Разбор:
- **`REQUIRED` (по умолчанию):** Если транзакция уже существует, метод присоединяется к ней. Если нет — создает новую.
- **`REQUIRES_NEW`:** Приостанавливает текущую транзакцию и открывает полностью независимую транзакцию со своим отдельным физическим соединением к БД.
- **`NESTED`:** Создает точку сохранения (Savepoint) в рамках существующей транзакции.

**Ответ на вопрос:**
Если метод с `REQUIRES_NEW` выбросил необработанное исключение, то его транзакция откатится. Если вызывающий метод с `REQUIRED` **перехватил исключение (try-catch)** и не пробросил дальше, то внешняя транзакция **успешно закоммитится**! Но если исключение улетело выше — откатятся обе.

---

## 4. Hibernate: Проблема N+1 и способы решения

### Вопрос с собеседования:
*«Что такое проблема N+1 запросов в Hibernate и какими 4 способами её можно решить?»*

### Пример:
У вас есть 100 заказов (`Order`), у каждого заказа есть список позиций (`OrderItem` с `FetchType.LAZY`).
При обращении к `order.getItems()` Hibernate выполняет:
- 1 запрос: `SELECT * FROM orders` (получили 100 строк).
- N запросов: 100 отдельных `SELECT * FROM order_items WHERE order_id = ?`.
Итого: **101 запрос в базу данных** вместо одного!

### Способы решения:
1. **`JOIN FETCH` в JPQL / HQL:**
   ```sql
   SELECT DISTINCT o FROM Order o JOIN FETCH o.items
   ```
   Загружает сущности и связанные коллекции за 1 SQL-запрос.
2. **EntityGraph (`@EntityGraph`):**
   ```java
   @EntityGraph(attributePaths = {"items"})
   List<Order> findAll();
   ```
   Декларативное указание, какие связи нужно загрузить жадно для конкретного метода репозитория.
3. **`@BatchSize` (или `default_batch_fetch_size`):**
   Hibernate группирует подзапросы с использованием оператора `IN`:
   `WHERE order_id IN (?, ?, ?, ..., ?)`. Сокращает количество запросов со 100 до 3-5.
4. **DTO-проекции (Spring Data JPA Projections):**
   Выборка только необходимых полей вместо тяжелых сущностей Hibernate.

---

## 5. SQL: Уровни изоляции транзакций и феномены чтения

### Сводная таблица феноменов:
| Уровень изоляции | Грязное чтение (Dirty Read) | Неповторяющееся чтение (Non-repeatable Read) | Фантомное чтение (Phantom Read) |
|---|---|---|---|
| **Read Uncommitted** | ❌ Возможно | ❌ Возможно | ❌ Возможно |
| **Read Committed** | ✅ Защищено | ❌ Возможно | ❌ Возможно |
| **Repeatable Read** | ✅ Защищено | ✅ Защищено | ❌ Возможно (в PG защищено через MVCC) |
| **Serializable** | ✅ Защищено | ✅ Защищено | ✅ Защищено |

### Важная деталь про PostgreSQL:
В PostgreSQL уровень **Repeatable Read** благодаря механизму **MVCC (Multi-Version Concurrency Control)** защищает не только от неповторяющегося чтения, но и от **фантомного чтения**! Строгий Serializable в Postgres использует SSI (Serializable Snapshot Isolation).

---

## 6. Как тренировать такие вопросы перед собеседованием за 10 минут в день

Заучивание ответов по длинным статьям дает ложное ощущение готовности: в стрессовой ситуации на собеседовании сложно быстро сформулировать четкий ответ.

Чтобы закрепить материал на практике:
1. Запустите тренажер **[Prep-it в Telegram: @prep_interview_bot](https://t.me/prep_interview_bot)**.
2. Выберите раздел **Spring** и **Databases & SQL**.
3. Решайте вопросы в формате свайпов (Tinder-style):
   - Тап — быстрый ответ.
   - Свайп влево («Не знаю») — мгновенный AI-разбор с примерами кода.
   - Алгоритм интервальных повторений вернет вопрос через 1, 3 и 7 дней, пока он не осядет в долговременной памяти.

Тренируйтесь бесплатно прямо в Telegram: **[@prep_interview_bot](https://t.me/prep_interview_bot)** или в браузере на **[solve-it-rho.vercel.app](https://solve-it-rho.vercel.app)**.
