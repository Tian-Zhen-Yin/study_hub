script = r'''#!/usr/bin/env python3
"""Parse PeterGuy326 exam-bank Markdown files to structured JSON.

Usage: python parse_markdown_questions.py <exam-bank-dir> [output.json]
"""
import json, re, sys
from pathlib import Path

FILE_DOMAIN_MAP = {
    "01-computer-systems": "计算机系统基础",
    "02-os-concepts": "操作系统",
    "03-database": "数据库技术",
    "04-networking": "计算机网络",
    "05-uml": "软件工程",
    "06-ip-and-standards": "软件工程",
    "07-software-engineering": "软件工程",
    "08-project-management": "项目管理",
    "09-software-metrics": "软件工程",
    "10-architecture-styles": "架构设计",
    "11-quality-attributes": "架构设计",
    "12-atam-evaluation": "架构设计",
    "13-design-patterns": "设计模式",
    "14-absd-views": "架构设计",
    "15-microservice-cloud-native": "架构设计",
    "16-middleware": "架构设计",
    "17-distributed-transactions": "架构设计",
    "18-cache": "架构设计",
    "19-big-data": "架构设计",
    "20-reliability": "架构设计",
    "21-security": "系统安全",
    "22-embedded": "计算机系统基础",
    "23-english-reading": "软件工程",
    "24-devops-serverless": "架构设计",
    "25-enterprise-integration": "架构设计",
    "26-soa-evolution": "架构设计",
}

def parse_question_block(block_text, source_file):
    """Parse a single question block, return dict or None."""
    lines = block_text.strip().split("\n")
    if len(lines) < 3:
        return None
    stem = re.sub(r"^###\s*\d+\.\s*", "", lines[0]).strip()
    options = []
    answer = ""
    analysis = ""
    in_analysis = False
    for line in lines[1:]:
        line = line.strip()
        if not line:
            continue
        if line.startswith("**答案**"):
            answer = re.sub(r"\*\*答案\*\*[：:]\s*", "", line).strip()
            in_analysis = False
        elif line.startswith("**解析**"):
            analysis = re.sub(r"\*\*解析\*\*[：:]\s*", "", line).strip()
            in_analysis = True
        elif in_analysis:
            analysis += line
        elif re.match(r"^(?:\*\*)?[A-D](?:\*\*)?\.", line):
            opt = re.sub(r"^(?:✅\s*)?(?:\*\*)?[A-D](?:\*\*)?\.\s*", "", line)
            options.append(opt.strip())
    if not answer or not stem:
        return None
    return {
        "source": "GITHUB",
        "subject": "综合知识",
        "stem": stem,
        "optionsJson": json.dumps(options, ensure_ascii=False),
        "answer": answer,
        "analysis": analysis,
        "sourceFile": source_file,
    }

def parse_markdown_file(filepath):
    """Parse a single Markdown file, return list of question dicts."""
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    stem_name = Path(filepath).stem
    domain_name = FILE_DOMAIN_MAP.get(stem_name, "架构设计")
    blocks = content.split("\n---\n")
    questions = []
    for block in blocks:
        stripped = block.strip()
        if not stripped:
            continue
        # Skip blocks that are just headings (start with single #)
        if stripped.startswith("#") and not stripped.startswith("##"):
            continue
        q = parse_question_block(block, Path(filepath).name)
        if q:
            q["domainName"] = domain_name
            questions.append(q)
    return questions

def main():
    if len(sys.argv) < 2:
        print("Usage: python parse_markdown_questions.py <exam-bank-dir> [output.json]")
        sys.exit(1)
    exam_bank_dir = Path(sys.argv[1])
    output_file = sys.argv[2] if len(sys.argv) > 2 else "questions_output.json"
    all_questions = []
    for md_file in sorted(exam_bank_dir.glob("*.md")):
        if md_file.name == "README.md":
            continue
        questions = parse_markdown_file(md_file)
        all_questions.extend(questions)
        print(f"  {md_file.name}: {len(questions)} questions")
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(all_questions, f, ensure_ascii=False, indent=2)
    print(f"\nTotal: {len(all_questions)} questions -> {output_file}")

if __name__ == "__main__":
    main()
'''

with open(r'E:\AiProject\study_hub\scripts\parse_markdown_questions.py', 'w', encoding='utf-8') as f:
    f.write(script)
print('Parser rewritten')
