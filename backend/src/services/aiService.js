import dotenv from 'dotenv';
dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-lite-preview-02-05:free';

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
- Практический совет или распространенная ошибка`;

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

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/java-interview-tinder',
        'X-Title': 'Java Interview Tinder'
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      })
    });

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
