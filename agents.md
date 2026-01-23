# agents.md — Руководство для AI-агентов 🤖

Этот документ является обязательным к прочтению для любого AI-агента, начинающего работу над проектом. Здесь собраны лучшие практики промптинга и правила взаимодействия с кодовой базой.

## 1. Core Principles

1. **Documentation-Driven Development** – _every_ Agent run starts by reading **all** markdown files under `docs/` (tech.md, product.md, testing.md) to understand current architecture, technology stack, and testing patterns before making any code changes.
2. **Instruction-First, Best Practices** – For simple tasks, the Agent follows the human's instructions directly while adhering to best practices and writing clean, maintainable code.
3. **Conditional Planning & Verification** – Detailed planning, linting, and full testing are performed for complex tasks or when explicitly requested. Otherwise, keep the workflow lightweight and focused on the requested change.
4. **Greppable Inline Memory** – Use `AICODE-*:` anchors to leave breadcrumbs for other Agents (§ 4).
5. **Small, Safe, Reversible Commits** – Prefer many focused commits over one massive diff.

---

## 2. Task Execution Protocol

> A human triggers an Agent with a natural-language instruction (example: “implement JWT refresh tokens”).
>
> For complex tasks, the Agent MUST respond with a **plan** file (see § 3) and wait for explicit approval. For simple tasks, proceed directly with implementation while following best practices and consulting `docs/` as needed.

1. **Read Documentation** – First, read ALL files in `docs/` to understand:
   - Technology stack and versions (`docs/tech.md`)
   - Product features and domains (`docs/product.md`)
   - Testing patterns and fixtures (`docs/testing.md`)
2. **Analyse** the request: dependencies, affected code, existing docs, tests. Determine task complexity using § 2.1.
3. **If Complex → Plan Mode** – Draft the plan in `plans/###-objective-description.md` and await approval.
4. **If Simple → Implement** – Implement directly, following best practices, keeping edits tight and relevant.
5. **After Implementation**
   * If complex or requested: run the full test suite (`uv run pytest -q`).
   * If simple: run only the necessary checks to ensure the change is safe and consistent.
   * Commit with a clear message. If tied to a plan, use `<plan-id> <short description>` (example: `042-jwt-refresh add refresh endpoint`).

### 2.1. Determining Task Complexity

A task is considered **complex** if it involves one or more of the following:

* Multiple components or modules
* Significant algorithmic logic or non-trivial data transformations
* Integration with external systems or APIs
* Performance optimization or security implications
* Broad architectural or cross-cutting concerns

If uncertain, ask for clarification or default to Plan Mode.

---

## 3. Plan Mode (Complex Tasks Only)

Plans live in `plans/` and are named `###-objective-description.md` (increment `###`). Use Plan Mode only for complex tasks or when explicitly requested. A plan MUST include:

* **Objective** – the human request verbatim.
* **Proposed Steps** – numbered, short, actionable.
* **Risks / Open Questions** – bullet list.
* **Rollback Strategy** – how to revert if needed.

Only after the human adds a ✅ reaction or otherwise approves may the Agent proceed to implementation.

---

## 4. Поддержание документации в актуальном состоянии 📝

Проект живет и развивается, и его описание не должно отставать от кода.

*   **ЗНАЧИМЫЕ изменения**: Если ты вносишь изменения, которые существенно влияют на проект:
    *   Изменение глобального пути пользователя (User Flow).
    *   Рефакторинг ключевых модулей или архитектуры.
    *   Изменение формата обмена данными между важными частями системы.
    *   Добавление крупных новых функциональных блоков.
*   **Твое действие**: После внесения таких изменений ты **ОБЯЗАН** обновить соответствующие файлы в папке `docs/`. Если подходящего файла нет — создай его.
*   **Краткие изменения**: Для добавления мелких библиотек или исправления багов достаточно краткого упоминания в README.md (если это влияет на запуск проекта) или просто хорошего сообщения в коммите.

---

**Помни**: Твоя задача — не просто написать код, а сделать проект понятным и поддерживаемым для тех, кто придет после тебя!

## Prompt для Cursor (GPT‑5.2 Codex)


Ты — GPT‑5.2‑Codex агент в проекте. Твоя цель: помогать в разработке приложения, описанного в docs/product.md и docs/tech.md.

Жёсткий порядок старта:
1) Прочитай README.md полностью.
2) Прочитай ВСЮ папку docs/ (все файлы).
3) Только потом приступай к работе.

Использование Context7 (обязательно для библиотек/технологий):
- Сначала вызови resolve-library-id.
- Затем query-docs с полученным libraryId.
- Используй результаты как основу решений.
- Перед использованием Context7 агент ОБЯЗАН:
  1) Сначала проверить, что уже есть в Index and Docs (внутренняя документация проекта).
  2) Если там нет ответа или он устарел — только тогда использовать Context7.

Правила работы:
- Следуй требованиям из docs/product.md и docs/tech.md.
- Не добавляй вымышленные требования.
- При значимых изменениях (user flow, архитектура, ключевые сценарии) обновляй docs/.
- Пиши кратко, по делу, простыми словами.

Формат ответа:
- Начни с результата и что сделал.
- Затем перечисли файлы, которые изменил.
- В конце — что можно проверить/тестировать.
