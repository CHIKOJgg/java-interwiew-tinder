# Question Generation Blueprint — Interview Tinder

## Overview
This blueprint defines the structure, distribution, and content strategy for generating ~3000 interview questions across 7 languages.

## Target: ~3000 Questions

### Distribution by Language
| Language   | Target Count | Priority |
|------------|-------------|----------|
| Java       | 700         | Highest  |
| Python     | 400         | High     |
| TypeScript | 350         | High     |
| React      | 400         | High     |
| Go         | 300         | Medium   |
| Rust       | 300         | Medium   |
| Kotlin     | 250         | Medium   |
| **Total**  | **~2700**   |          |
| Misc/General (cross-language) | 300 | Medium |
| **Grand Total** | **~3000** | |

### Difficulty Distribution (per language)
| Difficulty | Percentage | Description |
|-----------|-----------|-------------|
| Junior    | 35%       | Entry-level, basic concepts, syntax, simple patterns |
| Middle    | 45%       | Mid-level, practical application, standard libraries, common frameworks |
| Senior    | 20%       | Advanced, architecture-level, optimization, deep internals |

### Difficulty Distribution (overall)
- Junior: ~1050 questions
- Middle: ~1350 questions
- Senior: ~600 questions

## Languages & Topics

### 1. Java (700 questions)
**Categories:**
- Java Core (150)
- Collections (100)
- Multithreading (80)
- Spring Framework (100)
- JVM Internals (80)
- Exceptions & Error Handling (40)
- OOP Principles (60)
- Stream API & Lambda (50)
- Design Patterns (40)
- Database / SQL / JDBC (50)
- Testing (JUnit, Mockito) (40)
- Microservices (40)
- Security (30)
- Java 8+ Features (30)

### 2. Python (400 questions)
**Categories:**
- Python Core (80)
- Data Structures (40)
- OOP (40)
- Concurrency / Async (50)
- Django (60)
- Flask / FastAPI (40)
- Testing (30)
- Decorators & Generators (40)
- Type Hints (25)
- Async/Await (35)
- Design Patterns (20)
- Database / ORM (20)
- Data Science / NumPy / Pandas (35)
- Python 3.10+ features (20)

### 3. TypeScript (350 questions)
**Categories:**
- TypeScript Core (50)
- Type System (60)
- Generics (50)
- Decorators (30)
- React + TypeScript (40)
- Node.js (50)
- NestJS (30)
- OOP (30)
- Async/Await (25)
- Testing (20)
- Design Patterns (20)
- Modules & Bundling (20)
- Advanced Types (45)

### 4. React (400 questions)
**Categories:**
- React Core (80)
- Hooks (80)
- State Management (50)
- Context API (30)
- Redux / Zustand (40)
- TypeScript + React (30)
- Next.js (40)
- Testing (RTL) (30)
- Performance (30)
- Design Patterns in React (20)
- Server Components (20)
- React Native (30)

### 5. Go (300 questions)
**Categories:**
- Go Core (60)
- Concurrency / Goroutines (70)
- Channels (40)
- Interfaces (40)
- Packages (30)
- Testing (30)
- Web (net/http) (30)
- Middleware (25)
- ORM (GORM) (20)
- Design Patterns (20)
- Database (20)
- Error Handling (15)
- Go 1.20+ features (10)

### 6. Rust (300 questions)
**Categories:**
- Rust Core (50)
- Ownership & Borrowing (50)
- Lifetimes (40)
- Traits (40)
- Enums & Pattern Matching (35)
- Async/Await (25)
- Unsafe Rust (20)
- Cargo (15)
- Testing (20)
- Web (Actix/Axum) (15)
- Design Patterns (10)
- Error Handling (20)

### 7. Kotlin (250 questions)
**Categories:**
- Kotlin Core (50)
- Coroutines (40)
- Null Safety (30)
- DSL (20)
- Android (30)
- Spring Boot (30)
- Ktor (20)
- Multiplatform (15)
- Testing (15)
- Design Patterns (20)
- Extension Functions (15)
- Sealed Classes (15)

### 8. Cross-Language / General (300 questions)
**Categories:**
- Algorithms & Data Structures (80)
- System Design (60)
- Software Engineering Principles (50)
- Database Design (40)
- Architecture Patterns (40)
- CI/CD & DevOps (30)

## Question Structure

Each question in the JSON seed file has the following fields:

```json
{
  "category": "Java Core",
  "question": "What is the difference between == and equals() in Java?",
  "short_answer": "== compares object references, equals() compares content. For primitives, == compares values.",
  "options": [
    "== compares references, equals() compares content",
    "== compares content, equals() compares references",
    "No difference, they are synonyms",
    "== is only for strings"
  ],
  "difficulty": "Junior",
  "language": "Java"
}
```

### Field Definitions
| Field         | Type         | Required | Description |
|--------------|-------------|----------|-------------|
| category     | string      | Yes      | The topic category (e.g., "Java Core", "Spring Framework") |
| question     | string      | Yes      | The full question text |
| short_answer | string      | Yes      | A concise correct explanation (2-3 sentences) |
| options      | array       | Yes      | Array of 4 strings (1 correct + 3 plausible distractors) |
| difficulty   | string      | Yes      | "Junior", "Middle", or "Senior" |
| language     | string      | Yes      | One of: Java, Python, TypeScript, Go, Rust, React, Kotlin |

## Question Templates by Category Type

### Conceptual Questions (60% of questions)
- "What is X?" / "Explain X"
- "What is the difference between X and Y?"
- "How does X work?"
- "Why is X used instead of Y?"

### Application Questions (25% of questions)
- "Which X would you use for Y?"
- "What is the output of the following code?"
- "How would you implement Z?"

### Code Analysis Questions (10% of questions)
- "What is wrong with this code?"
- "What will be the output?"
- "How do you fix this bug?"

### Scenario / Design Questions (5% of questions)
- "How would you design X?"
- "What are the trade-offs of using X vs Y?"

## Quality Guidelines
- Each question must have exactly 4 options (1 correct + 3 distractors)
- Distractors must be plausible but definitively wrong
- short_answer must be clear and concise (2-4 sentences)
- Questions should not repeat the exact same content across languages
- Language-specific questions should use idioms and conventions of that language
- Senior-level questions should require deeper understanding of internals