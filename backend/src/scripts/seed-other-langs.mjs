import pool from '../config/database.js';

const otherLangQuestions = [
  // TypeScript
  { category: 'TypeScript Core', question: 'Что такое структурная типизация в TypeScript?', short_answer: 'TypeScript проверяет совместимость типов на основе структуры, а не имени.', language: 'TypeScript', difficulty: 'Junior' },
  { category: 'Type System', question: 'В чём разница между interface и type?', short_answer: 'interface объявляет форму объекта и расширяемо. type — псевдоним, может быть объединением или пересечением.', language: 'TypeScript', difficulty: 'Junior' },
  { category: 'TypeScript Core', question: 'Что такое Generics в TypeScript?', short_answer: 'Параметризованные типы для создания повторно используемых компонентов с безопасностью типов.', language: 'TypeScript', difficulty: 'Middle' },
  // Go
  { category: 'Go Core', question: 'Что такое горутины (goroutines) в Go?', short_answer: 'Лёгкие потоки, управляемые Go runtime. Запускаются через ключевое слово go.', language: 'Go', difficulty: 'Junior' },
  { category: 'Concurrency', question: 'В чём разница между буферизованными и небуферизованными каналами?', short_answer: 'Буферизованные каналы не блокируют отправителя до заполнения буфера. Без буфера — синхронная передача.', language: 'Go', difficulty: 'Junior' },
  { category: 'Go Core', question: 'Что такое defer в Go?', short_answer: 'Отложенный вызов функции, выполняется в LIFO-порядке при выходе из функции.', language: 'Go', difficulty: 'Junior' },
  // Rust
  { category: 'Rust Core', question: 'Что такое владение (ownership) в Rust?', short_answer: 'Каждое значение имеет единственного владельца. При выходе владельца из области видимости значение удаляется.', language: 'Rust', difficulty: 'Junior' },
  { category: 'Ownership', question: 'Как работает заимствование (borrowing)?', short_answer: 'Можно создать ссылки (& или &mut), но не более одной изменяемой одновременно.', language: 'Rust', difficulty: 'Junior' },
  { category: 'Rust Core', question: 'Что такое lifetimes в Rust?', short_answer: 'Аннотации времени жизни, указывающие, как долго ссылка остаётся валидной.', language: 'Rust', difficulty: 'Middle' },
  // React
  { category: 'React Core', question: 'Что такое хуки (hooks) в React?', short_answer: 'Функции для управления состоянием и жизненным циклом в функциональных компонентах.', language: 'React', difficulty: 'Junior' },
  { category: 'Hooks', question: 'В чём разница между useEffect с пустым массивом зависимостей и с зависимостями?', short_answer: 'Пустой массив — эффект выполняется один раз при монтировании. С зависимостями — при изменении любой из них.', language: 'React', difficulty: 'Junior' },
  { category: 'React Core', question: 'Что такое виртуальный DOM в React?', short_answer: 'Абстракция над реальным DOM для минимизации прямых манипуляций и оптимизации рендеринга.', language: 'React', difficulty: 'Junior' },
  // Kotlin
  { category: 'Kotlin Core', question: 'Что такое null-safety в Kotlin?', short_answer: 'Kotlin запрещает присвоение null по умолчанию. Для nullable используется String?.', language: 'Kotlin', difficulty: 'Junior' },
  { category: 'Coroutines', question: 'Что такое suspend-функция?', short_answer: 'Функция, которую можно приостановить и возобновить в корутинах. Вызывается из других suspend-функций.', language: 'Kotlin', difficulty: 'Junior' },
  { category: 'Kotlin Core', question: 'Что такое data class?', short_answer: 'Класс с автоматически сгенерированными equals, hashCode, toString, copy и компонентами.', language: 'Kotlin', difficulty: 'Junior' },
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const q of otherLangQuestions) {
      await client.query(
        `INSERT INTO questions (category, question_text, short_answer, language, difficulty, is_active, options, cached_explanation)
         VALUES ($1, $2, $3, $4, $5, TRUE, ARRAY[]::JSONB, NULL)
         ON CONFLICT (question_text, language) DO NOTHING`,
        [q.category, q.question, q.short_answer, q.language, q.difficulty]
      );
    }
    await client.query('COMMIT');
    console.log('✅ Missing language seed complete:', otherLangQuestions.length, 'questions added');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
