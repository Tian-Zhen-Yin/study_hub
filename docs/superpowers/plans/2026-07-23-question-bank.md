# 题库模块实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 构建三级题库导入管线：Markdown 自编题（PeterGuy326）+ PDF 真题（xiaomabenten）+ 在线刷题，支撑 SFT 诊断循环。

**Architecture:** Spring Boot 后端提供 REST API，QuestionImporter 适配器模式处理 Markdown 和 PDF 两种导入源，统一入库。前端通过 api.js 调用后端，按知识域抽题作答。

**Tech Stack:** Spring Boot 3.2 + Spring Data JPA + MySQL 8.0 + Python 3（解析脚本）+ 原生 JavaScript

---

## 文件结构

```
study-hub/
├── pom.xml
├── src/main/java/com/studyhub/
│   ├── StudyHubApplication.java
│   ├── entity/
│   │   ├── Question.java
│   │   └── Domain.java
│   ├── repository/
│   │   ├── QuestionRepository.java
│   │   └── DomainRepository.java
│   ├── dto/
│   │   ├── QuestionDTO.java
│   │   ├── ImportResultDTO.java
│   │   └── DomainDTO.java
│   ├── service/
│   │   ├── QuestionService.java
│   │   └── DomainService.java
│   ├── controller/
│   │   ├── QuestionController.java
│   │   └── DomainController.java
│   ├── adapter/
│   │   ├── QuestionImporter.java
│   │   ├── MarkdownImporter.java
│   │   └── PdfImporter.java
│   └── config/
│       ├── CorsConfig.java
│       └── DataInitializer.java
├── src/main/resources/
│   └── application.yml
├── src/main/frontend/
│   ├── index.html
│   ├── css/quiz.css
│   └── js/
│       ├── api.js
│       └── pages/quiz.js
└── scripts/
    ├── parse_markdown_questions.py
    └── parse_pdf_questions.py
```
---
### Task 1: 项目骨架搭建

**Files:**
- Create: `pom.xml`
- Create: `src/main/java/com/studyhub/StudyHubApplication.java`
- Create: `src/main/resources/application.yml`

- [ ] **Step 1: 创建 Maven pom.xml**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.2.0</version>
    </parent>
    <groupId>com.studyhub</groupId>
    <artifactId>study-hub</artifactId>
    <version>1.0.0</version>
    <name>Study Hub</name>

    <properties>
        <java.version>17</java.version>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        <dependency>
            <groupId>com.mysql</groupId>
            <artifactId>mysql-connector-j</artifactId>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <configuration>
                    <excludes>
                        <exclude>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok</artifactId>
                        </exclude>
                    </excludes>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
```

- [ ] **Step 2: 创建启动类**

```java
package com.studyhub;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class StudyHubApplication {
    public static void main(String[] args) {
        SpringApplication.run(StudyHubApplication.class, args);
    }
}
```

- [ ] **Step 3: 创建 application.yml**

```yaml
server:
  port: 8080

spring:
  datasource:
    url: jdbc:mysql://localhost:3306/study_hub?useUnicode=true&characterEncoding=utf8mb4&serverTimezone=Asia/Shanghai
    username: root
    password: your_password
    driver-class-name: com.mysql.cj.jdbc.Driver
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: false
    properties:
      hibernate:
        format_sql: true
        dialect: org.hibernate.dialect.MySQLDialect

app:
  exam-date: 2026-10-24
  week-start-date: 2026-07-28
```

- [ ] **Step 4: 验证启动**

Run: `mvn spring-boot:run`
Expected: 服务启动在 localhost:8080

- [ ] **Step 5: Commit**

```bash
git add pom.xml src/main/java/com/studyhub/StudyHubApplication.java src/main/resources/application.yml
git commit -m "feat: init Spring Boot project skeleton"
```

---
### Task 2: Domain Entity + Data Init

**Files:**
- Create: `src/main/java/com/studyhub/entity/Domain.java`
- Create: `src/main/java/com/studyhub/repository/DomainRepository.java`
- Create: `src/main/java/com/studyhub/config/DataInitializer.java`

See `docs/superpowers/specs/2026-07-23-study-hub-design.md` Section 6.2 for the full Domain entity definition with 5 fields: id (PK), name (unique), pct (0-100), priority (必备/掌握/了解), state (待诊断/已诊断/补缺中/已验证).

DomainRepository extends JpaRepository with `findByName(String name)`.

DataInitializer implements CommandLineRunner, inserts 9 domains on first run if table is empty:
计算机系统基础(掌握), 操作系统(掌握), 数据库技术(必备), 计算机网络(掌握), 软件工程(必备), 架构设计(必备), 设计模式(必备), 系统安全(掌握), 项目管理(了解).

- [ ] **Step 1:** Create Domain.java, DomainRepository.java, DataInitializer.java
- [ ] **Step 2:** Run `mvn spring-boot:run`, verify `SELECT * FROM domains;` returns 9 rows
- [ ] **Step 3:** Commit

---
### Task 3: Question Entity + Repository

**Files:**
- Create: `src/main/java/com/studyhub/entity/Question.java`
- Create: `src/main/java/com/studyhub/repository/QuestionRepository.java`

Question entity: id (PK), source (GITHUB/PDF/MANUAL), subject (综合知识/案例分析), domain (ManyToOne->Domain), stem (TEXT), optionsJson (TEXT), answer (VARCHAR 10), analysis (TEXT), examYear (VARCHAR 10), sourceFile (VARCHAR 200). Indexes on domain_id and source.

QuestionRepository extends JpaRepository:
- `findByDomainId(Long)` - all questions for a domain
- `findBySource(String)` - questions by source type
- `findRandomByDomain(Long domainId, int count)` - native query: `SELECT * FROM questions WHERE domain_id = :domainId ORDER BY RAND() LIMIT :count`
- `countByDomainId(Long)` - JPQL count query

- [ ] **Step 1:** Create Question.java and QuestionRepository.java
- [ ] **Step 2:** Run `mvn spring-boot:run`, verify `DESC questions;` shows all columns
- [ ] **Step 3:** Commit

---
### Task 4: Markdown Question Importer

**Files:**
- Create: `scripts/parse_markdown_questions.py`
- Create: `src/main/java/com/studyhub/adapter/QuestionImporter.java`
- Create: `src/main/java/com/studyhub/adapter/MarkdownImporter.java`
- Create: `src/main/java/com/studyhub/dto/ImportResultDTO.java`

**Python parser** (`parse_markdown_questions.py`):
- Input: exam-bank directory path, output: JSON file
- Parses PeterGuy326 format: `### N. stem` + `✅ **A. option**` + `**答案**：X` + `**解析**：text`
- Splits by `---`, maps filename to domain via FILE_DOMAIN_MAP dict
- Outputs JSON array with fields: source, subject, stem, optionsJson, answer, analysis, sourceFile, domainName

**QuestionImporter** interface:
- `ImportResultDTO importQuestions(String filePath)`
- `String getSourceType()`

**MarkdownImporter** (Spring @Component):
- Calls Python script via ProcessBuilder
- Reads output JSON, maps domainName to Domain entity
- Creates Question entities, calls repository.saveAll()
- Returns ImportResultDTO with total/imported/skipped counts

**ImportResultDTO**: total (int), imported (int), skipped (int), source (String)

- [ ] **Step 1:** Create parse_markdown_questions.py
- [ ] **Step 2:** Test: `python scripts/parse_markdown_questions.py <exam-bank-dir> test.json` => 454 questions
- [ ] **Step 3:** Create ImportResultDTO, QuestionImporter, MarkdownImporter
- [ ] **Step 4:** Commit

---
### Task 5: PDF Question Importer

**Files:**
- Create: `scripts/parse_pdf_questions.py`
- Create: `src/main/java/com/studyhub/adapter/PdfImporter.java`

**Prerequisites:** `pip install pdfplumber`

**Python parser** (`parse_pdf_questions.py`):
- Input: PDF root directory (xiaomabenten format: year-dirs with 综合知识.pdf + 答案详解.pdf)
- Uses pdfplumber to extract text from PDFs
- Splits questions by regex `
(?=\d+[\.、])`
- Extracts options (A./B./C./D.), stem, answer from answer PDF
- Classifies domain via keyword matching (KEYWORD_DOMAIN_MAP)
- Outputs JSON with additional fields: examYear, domainName

**PdfImporter** (Spring @Component):
- Same pattern as MarkdownImporter: calls Python, reads JSON, maps to entities
- Skips duplicates by source+examYear (no unique constraint, just skips existing)

- [ ] **Step 1:** `pip install pdfplumber`
- [ ] **Step 2:** Create parse_pdf_questions.py
- [ ] **Step 3:** Create PdfImporter.java
- [ ] **Step 4:** Commit

---
### Task 6: Question Service + REST API

**Files:**
- Create: `src/main/java/com/studyhub/dto/QuestionDTO.java`
- Create: `src/main/java/com/studyhub/service/QuestionService.java`
- Create: `src/main/java/com/studyhub/controller/QuestionController.java`

**QuestionDTO:** id, source, subject, domainId, domainName, stem, optionsJson, answer, analysis, examYear, sourceFile

**QuestionService:**
- `getQuestions(Long domainId, Integer count, String source)` - dispatches to appropriate repository method
- `importMarkdown(String dirPath)` - delegates to MarkdownImporter
- `importPdf(String dirPath)` - delegates to PdfImporter
- `countByDomain(Long domainId)` - count query

**QuestionController** (`/api/questions`):
- `GET /api/questions?domainId=&count=10&source=` - list questions
- `GET /api/questions/count?domainId=` - count by domain
- `POST /api/questions/import/markdown` - body: `{"path":"..."}` - import Markdown
- `POST /api/questions/import/pdf` - body: `{"path":"..."}` - import PDF

All responses use unified format: `{"code":200,"data":...,"message":"ok"}`

- [ ] **Step 1:** Create QuestionDTO, QuestionService, QuestionController
- [ ] **Step 2:** Verify: `curl "http://localhost:8080/api/questions?domainId=1&count=5"`
- [ ] **Step 3:** Commit

---
### Task 7: Domain API + CORS Config

**Files:**
- Create: `src/main/java/com/studyhub/dto/DomainDTO.java`
- Create: `src/main/java/com/studyhub/service/DomainService.java`
- Create: `src/main/java/com/studyhub/controller/DomainController.java`
- Create: `src/main/java/com/studyhub/config/CorsConfig.java`

**DomainDTO:** id, name, pct, priority, state

**DomainService:**
- `getAllDomains()` - returns all 9 domains
- `updateDomain(Long id, DomainDTO)` - partial update (pct, state, priority)

**DomainController** (`/api/domains`):
- `GET /api/domains` - list all domains
- `PUT /api/domains/{id}` - update domain progress

**CorsConfig:** WebMvcConfigurer bean allowing all origins on `/api/**` for local development.

- [ ] **Step 1:** Create DomainDTO, DomainService, DomainController, CorsConfig
- [ ] **Step 2:** Verify: `curl http://localhost:8080/api/domains` => 9 domains
- [ ] **Step 3:** Commit

---
### Task 8: Frontend API Module + Quiz Page

**Files:**
- Create: `src/main/frontend/js/api.js`
- Create: `src/main/frontend/js/pages/quiz.js`
- Create: `src/main/frontend/css/quiz.css`

**api.js:** Unified fetch wrapper with error handling. Exports `api` object:
- `getDomains()`, `updateDomain(id, dto)`
- `getQuestions(domainId, count=10)`, `getQuestionCount(domainId)`
- `importMarkdown(path)`, `importPdf(path)`

**quiz.js:** `QuizPage` object managing quiz state:
- `init(domainId)` - fetches 10 random questions, renders first
- `renderQuestion()` - builds DOM: progress bar, stem, options (clickable), analysis (if answered), nav buttons
- `selectAnswer(label)` - records answer, re-renders
- `nextQuestion()` / `prevQuestion()` - navigation
- `showResult()` - calculates score, shows result page with "再来一组" button
- `escapeHtml(text)` - XSS prevention

**quiz.css:** Dark theme consistent with design doc. Styles for:
- `.quiz-progress`, `.quiz-stem` (left accent border), `.quiz-options` (flex column)
- `.quiz-option` (hover + selected states), `.opt-label` (monospace)
- `.quiz-analysis.correct` (green border), `.quiz-analysis.wrong` (red border)
- `.quiz-nav` buttons, `.quiz-result` score display

- [ ] **Step 1:** Create api.js, quiz.js, quiz.css
- [ ] **Step 2:** Commit

---
### Task 9: Integration Test & Data Import

- [ ] **Step 1: Import Markdown questions**
```bash
git clone https://github.com/PeterGuy326/senior-software-architect-review.git data/senior-arch-review
curl -X POST http://localhost:8080/api/questions/import/markdown   -H "Content-Type: application/json"   -d '{"path":"data/senior-arch-review/exam-bank"}'
```
Expected: `{"total":454,"imported":454,"skipped":0,"source":"GITHUB"}`

- [ ] **Step 2: Import PDF questions**
```bash
git clone https://github.com/xiaomabenten/system_architect.git data/system_architect
curl -X POST http://localhost:8080/api/questions/import/pdf   -H "Content-Type: application/json"   -d '{"path":"data/system_architect/03、历年真题(2009年-2025年)+答案解析"}'
```

- [ ] **Step 3: Verify data**
```bash
curl "http://localhost:8080/api/questions/count?domainId=1"
curl "http://localhost:8080/api/questions?domainId=3&count=5"
```

- [ ] **Step 4: Frontend verification**
Open `src/main/frontend/index.html` in browser, verify:
- Question display is correct
- Options are clickable
- Analysis shows after answering
- Previous/Next navigation works
- Result page shows correct score

- [ ] **Step 5: Commit**

---

## Execution Order

1. Task 1 -> Project skeleton (already in plan header)
2. Task 2 -> Domain entity + init
3. Task 3 -> Question entity + repo
4. Task 4 -> Markdown importer
5. Task 5 -> PDF importer
6. Task 6 -> Service + REST API
7. Task 7 -> Domain API + CORS
8. Task 8 -> Frontend quiz page
9. Task 9 -> Integration test

Commit after each task. Task 9 validates the complete flow.
