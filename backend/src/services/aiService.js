import dotenv from 'dotenv';
dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL ||
  'google/gemini-2.0-flash-lite-preview-02-05:free';

const SYSTEM_PROMPT = `Ты — опытный ментор по Java (Senior Developer). Твоя задача — объяснить пользователю концепцию максимально просто и кратко.

Правила:
1. Используй форматирование Markdown
2. Приводи короткий пример кода, если уместно
3. Объем ответа не более 1000 символов
4. Тон общения: дружелюбный, профессиональный
5. Язык: Русский

Структура ответа:
- Краткое объяснение концепции
- Пример кода (если применимо)
- Практический совет или распространенная ошибка

- Язык: Русский`;

/**
 * Helper to parse JSON from AI response, handling markdown blocks
 * @param {string} content 
 * @returns {any}
 */
const parseAIResponse = (content) => {
  try {
    // Try simple parse first
    return JSON.parse(content);
  } catch (e) {
    try {
      // Look for JSON block in markdown
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                        content.match(/```\s*([\s\S]*?)\s*```/) ||
                        content.match(/\{[\s\S]*\}/) ||
                        content.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1] || jsonMatch[0]);
      }
      throw new Error('No JSON found in response');
    } catch (innerError) {
      console.error('Failed to parse AI response:', content);
      throw innerError;
    }
  }
};

/**
 * Generate AI explanation for a Java question
 * @param {string} questionText - The question to explain
 * @param {string} shortAnswer - Short answer for context
 * @returns {Promise<string>} - Generated explanation
 */
export const generateExplanation = async (questionText, shortAnswer) => {
  try {
    if (!OPENROUTER_API_KEY) {
      console.warn('⚠️  OpenRouter API key not set, returning mock response');
      return getMockExplanation(questionText, shortAnswer);
    }

    const userPrompt = `Объясни вопрос: "${questionText}". 

Правильный краткий ответ: ${shortAnswer}

Пользователь не знает этого и нуждается в подробном объяснении с примерами.`;

    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://github.com/java-interview-tinder',
          'X-Title': 'Java Interview Tinder',
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          messages: [
            {
              role: 'system',
              content: SYSTEM_PROMPT,
            },
            {
              role: 'user',
              content: userPrompt,
            },
          ],
          timeout: 7000,
          max_tokens: 1000,
          temperature: 0.7,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', response.status, errorText);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const explanation = data.choices[0]?.message?.content;

    if (!explanation) {
      throw new Error('No content in OpenRouter response');
    }

    return explanation.trim();
  } catch (error) {
    console.error('Error generating explanation:', error);
    // Return mock explanation on error
    return getMockExplanation(questionText, shortAnswer);
  }
};

/**
 * Generate incorrect options for a test
 * @param {string} questionText
 * @param {string} correctAnswer
 * @returns {Promise<string[]>}
 */
export const generateTestOptions = async (questionText, correctAnswer) => {
  try {
    if (!OPENROUTER_API_KEY) {
      return [
        'Неправильный вариант 1',
        'Неправильный вариант 2',
        'Неправильный вариант 3',
      ];
    }

    const userPrompt = `Вопрос: "${questionText}"
Правильный ответ: "${correctAnswer}"

Сгенерируй 3 неправильных, но максимально правдоподобных и технически грамотных варианта ответа на этот вопрос.
Ответ дай в формате JSON массива строк. Пример: ["вариант 1", "вариант 2", "вариант 3"]
Только массив, без лишнего текста.`;

    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          messages: [
            {
              role: 'system',
              content:
                'You are a technical interview assistant. Return only a JSON array of strings.',
            },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.5,
        }),
      },
    );

    if (!response.ok) throw new Error('API error');

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    const options = parseAIResponse(content);

    return Array.isArray(options) ? options : [];

    return options;
  } catch (error) {
    console.error('Error generating test options:', error);
    return [
      'Ошибка генерации варианта 1',
      'Ошибка генерации варианта 2',
      'Ошибка генерации варианта 3',
    ];
  }
};

/**
 * Generate a buggy code snippet for "Bug Hunting" mode
 * @param {string} questionText
 * @param {string} topic
 * @returns {Promise<Object>}
 */
export const generateBuggyCode = async (questionText, topic) => {
  try {
    if (!OPENROUTER_API_KEY) {
      return {
        code: 'public void test() {\n  List<String> list = new ArrayList<>();\n  list.add("a");\n  for(String s : list) {\n    if(s.equals("a")) list.remove(s);\n  }\n}',
        bug: 'ConcurrentModificationException при удалении во время итерации',
        options: [
          'ConcurrentModificationException',
          'NullPointerException',
          'Код скомпилируется и выполнится успешно',
          'Ошибка компиляции',
        ],
      };
    }

    const userPrompt = `Создай задачу "Bug Hunting" на тему: "${topic}" (основываясь на вопросе: "${questionText}").
Сгенерируй короткий, реалистичный фрагмент кода на Java, содержащий ровно ОДНУ логическую ошибку или ошибку времени выполнения.

Ответ дай СТРОГО в формате JSON:
{
  "code": "код с ошибкой",
  "bug": "краткое описание ошибки (правильный ответ)",
  "options": ["краткое описание ошибки (правильный ответ)", "неправильный 1", "неправильный 2", "неправильный 3"]
}

Варианты ответов в массиве "options" должны быть перемешаны.
Один из вариантов должен СТРОГО совпадать со значением поля "bug".

Требования:
- Код должен быть читаемым
- Варианты ответов должны быть технически грамотными
- Язык описания и вариантов: Русский`;

    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          messages: [
            {
              role: 'system',
              content:
                'You are a senior Java developer. Return ONLY valid JSON.',
            },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.6,
        }),
      },
    );

    if (!response.ok) throw new Error('API error');

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    const result = parseAIResponse(content);

    return result;

    return result;
  } catch (error) {
    console.error('Error generating buggy code:', error);
    return {
      code: '// Ошибка генерации кода',
      bug: 'Не удалось сгенерировать задачу',
      options: ['Ошибка', 'Ошибка', 'Ошибка', 'Ошибка'],
    };
  }
};

/**
 * Generate a True/False statement for "Blitz Mode"
 * @param {string} questionText
 * @param {string} topic
 * @returns {Promise<Object>}
 */
export const generateBlitzStatement = async (questionText, topic) => {
  try {
    if (!OPENROUTER_API_KEY) {
      const isTrue = Math.random() > 0.5;
      return {
        statement: isTrue 
          ? 'String в Java является неизменяемым (immutable) типом данных.'
          : 'Метод finalize() гарантированно вызывается перед удалением объекта GC.',
        isCorrect: isTrue,
      };
    }

    const userPrompt = `Создай задачу для "Blitz Mode" на тему: "${topic}" (основываясь на: "${questionText}").
Сгенерируй одно короткое утверждение о Java, которое может быть либо ИСТИННЫМ, либо ЛОЖНЫМ.

Ответ дай СТРОГО в формате JSON:
{
  "statement": "текст утверждения",
  "isCorrect": true/false (true если утверждение верно, false если нет)
}

Требования:
- Утверждение должно быть коротким (до 100 символов)
- Оно должно проверять конкретный технический факт
- Язык: Русский`;

    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          messages: [
            {
              role: 'system',
              content:
                'You are a senior Java developer. Return ONLY valid JSON.',
            },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
        }),
      },
    );

    if (!response.ok) throw new Error('API error');

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    const result = parseAIResponse(content);

    return result;

    return result;
  } catch (error) {
    console.error('Error generating blitz statement:', error);
    return {
      statement: 'Java — это объектно-ориентированный язык.',
      isCorrect: true,
    };
  }
};

/**
 * Evaluate an interview answer
 * @param {string} question
 * @param {string} answer
 * @returns {Promise<Object>}
 */
export const evaluateInterviewAnswer = async (question, answer) => {
  try {
    if (!OPENROUTER_API_KEY) {
      return {
        score: 8,
        feedback:
          'Это хороший ответ! Вы правильно упомянули основные моменты. Для идеального ответа можно было бы добавить пример из практики.',
        correctVersion: 'Правильный ответ обычно включает детали о...',
      };
    }

    const userPrompt = `Вопрос интервью: "${question}"
Ответ кандидата: "${answer}"

Оцени ответ кандидата как опытный Java интервьюер. 
Дай конструктивную обратную связь и оценку от 1 до 10.

Ответ дай СТРОГО в формате JSON:
{
  "score": число от 1 до 10,
  "feedback": "твоя обратная связь на русском языке",
  "correctVersion": "как бы ответил Senior разработчик"
}

Требования к фидбеку:
- Будь строгим, но справедливым
- Укажи, что было пропущено
- Язык: Русский`;

    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          messages: [
            {
              role: 'system',
              content:
                'You are a senior Java technical interviewer. Return ONLY valid JSON.',
            },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.5,
        }),
      },
    );

    if (!response.ok) throw new Error('API error');

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    const result = parseAIResponse(content);

    return result;

    return result;
  } catch (error) {
    console.error('Error evaluating interview answer:', error);
    return {
      score: 5,
      feedback: 'Не удалось провести оценку. Попробуйте еще раз.',
      correctVersion: 'N/A',
    };
  }
};

/**
 * Generate a code completion puzzle
 * @param {string} questionText
 * @param {string} topic
 * @returns {Promise<Object>}
 */
export const generateCodeCompletion = async (questionText, topic) => {
  try {
    if (!OPENROUTER_API_KEY) {
      return {
        snippet: 'List<String> list = names.stream()\n  .filter(s -> s.startsWith("A"))\n  .___\n  .collect(Collectors.toList());',
        correctPart: 'map(String::toUpperCase)',
        options: [
          'map(String::toUpperCase)',
          'forEach(System.out::println)',
          'sorted()',
          'distinct()',
        ],
      };
    }

    const userPrompt = `Создай задачу "Code Completion" на тему: "${topic}" (основываясь на: "${questionText}").
Сгенерируй короткий фрагмент кода на Java, в котором пропущена одна логическая часть (используй "___" как заполнитель).

Ответ дай СТРОГО в формате JSON:
{
  "snippet": "код с заполнением ___",
  "correctPart": "правильный фрагмент кода",
  "options": ["правильный фрагмент кода", "неправильный 1", "неправильный 2", "неправильный 3"]
}

Варианты в "options" должны быть перемешаны.
Один из вариантов должен СТРОГО совпадать с "correctPart".

Требования:
- Код должен быть современным (Java 8+)
- Пропущенная часть должна быть существенной (например, метод Stream API, условие, ключевое слово)
- Язык: Русский`;

    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          messages: [
            {
              role: 'system',
              content:
                'You are a senior Java developer. Return ONLY valid JSON.',
            },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.6,
        }),
      },
    );

    if (!response.ok) throw new Error('API error');

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    const result = parseAIResponse(content);

    return result;

    return result;
  } catch (error) {
    console.error('Error generating code completion:', error);
    return {
      snippet: '// Ошибка генерации',
      correctPart: 'void',
      options: ['void', 'int', 'String', 'boolean'],
    };
  }
};

/**
 * Mock explanation for development/fallback
 */
const getMockExplanation = (questionText, shortAnswer) => {
  return `## 📚 Подробное объяснение

**Вопрос:** ${questionText}

**Краткий ответ:** ${shortAnswer}

### Детальное объяснение

Это концепция является одной из фундаментальных в Java. Для полного понимания рекомендуется изучить официальную документацию Oracle и практиковаться с примерами кода.

\`\`\`java
// Пример кода (mock)
public class Example {
    public static void main(String[] args) {
        System.out.println("Изучите эту концепцию!");
    }
}
\`\`\`

### 💡 Практический совет

Практикуйтесь с реальными примерами и экспериментируйте с кодом для лучшего понимания.

---
*💡 Это mock-объяснение. Для реальных AI-ответов настройте OPENROUTER_API_KEY в .env файле.*`;
};
