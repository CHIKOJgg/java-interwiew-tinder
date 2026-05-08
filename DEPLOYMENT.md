# 🚀 Инструкция по развертыванию

Этот проект использует GitHub Actions для автоматической интеграции и деплоя.

## Среды окружения

- **Production:** Деплоится из ветки `main`.
  - Backend: `java-interwiew-tinder.fly.dev`
  - Frontend: `java-interview-tinder.vercel.app`
- **Staging:** Деплоится из ветки `staging`.
  - Backend: `java-interwiew-tinder-staging.fly.dev`
  - Frontend: `staging.interview-tinder.vercel.app`

## Необходимые GitHub Secrets

Для работы деплоя необходимо добавить следующие секреты в настройках репозитория (`Settings > Secrets and variables > Actions`):

| Secret | Описание |
|--------|----------|
| `FLY_API_TOKEN` | Токен API от Fly.io (`fly auth token`) |
| `VERCEL_TOKEN` | Personal Access Token от Vercel |
| `VERCEL_ORG_ID` | Vercel Team/Org ID (в настройках проекта) |
| `VERCEL_PROJECT_ID` | Vercel Project ID (в настройках проекта) |

## Логика CI/CD конвейера

1. **CI (`ci.yml`):**
   - Запускается на каждый push и PR.
   - Устанавливает зависимости для backend и frontend.
   - Запускает линтинг и тесты.
   - Блокирует слияние PR, если какой-либо шаг не пройден.

2. **Deploy (`deploy.yml`):**
   - Запускается при push в `main` или `staging`.
   - Сначала выполняет шаги CI.
   - Деплоит backend контейнер на Fly.io через `--remote-only`.
   - Выполняет `node src/scripts/migrate.js` на инстансе Fly.io после успешного деплоя.
   - Деплоит frontend на Vercel (Production использует `--prod`).

## Ручные миграции

Если вам нужно запустить специфичный скрипт миграции вручную на продакшене:
```bash
flyctl ssh console --app java-interwiew-tinder -C "node src/scripts/migrate-stars.js"
```

---

## Шаг 1: Создание Telegram бота

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте команду `/newbot`
3. Следуйте инструкциям (имя, username)
4. Сохраните полученный токен

## Шаг 2: Настройка базы данных (Supabase)

1. Зарегистрируйтесь на [supabase.com](https://supabase.com)
2. Создайте новый проект
3. Перейдите в Settings → Database
4. Скопируйте Connection String

## Безопасность данных и бэкапы

- **Автоматические бэкапы:** Supabase выполняет полное резервное копирование каждые 24 часа.
- **PITR:** Поддерживается восстановление на любой момент времени (Point-in-Time Recovery).
- **Проверка целостности:** Background worker запускает еженедельную проверку (Sunday 02:00 UTC), логируя количество строк в таблицах.
- **Восстановление:** См. подробную инструкцию в [RESTORE_PROCEDURE.md](./RESTORE_PROCEDURE.md).

## Шаг 3: Настройка Mini App в Telegram

1. Откройте [@BotFather](https://t.me/BotFather)
2. Выберите вашего бота: `/mybots` → выберите бота
3. Настройте Menu Button: Web App URL: `https://your-frontend-url.vercel.app`
