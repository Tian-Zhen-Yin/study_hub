"""Cross-verify stored answers vs ✅ markers in source markdown files."""
import json, re, sys, os
from pathlib import Path
import pymysql

EXAM_BANK = Path("data/senior-arch-review/exam-bank")

def extract_answer_from_marker(block_text):
    """Find the option letter marked with ✅."""
    for line in block_text.split("\n"):
        line = line.strip()
        m = re.match(r"^✅\s*\*?\*?([A-D])", line)
        if m:
            return m.group(1)
    return None

def extract_answer_line(block_text):
    """Find **答案**：X line."""
    m = re.search(r"\*\*答案\*\*[：:]\s*([A-D])", block_text)
    return m.group(1) if m else None

def main():
    conn = pymysql.connect(host="localhost", user="root", password="root", database="study_hub", charset="utf8mb4")
    cur = conn.cursor()
    cur.execute("SELECT id, source_file, stem, answer FROM questions WHERE source='GITHUB'")
    db_rows = cur.fetchall()
    db_map = {}
    for qid, sf, stem, ans in db_rows:
        key = (sf, stem[:40])
        db_map.setdefault(key, []).append((qid, ans))

    mismatches = []
    no_marker = []
    no_answer_line = []
    marker_answer_mismatch = 0
    verified = 0

    for md_file in sorted(EXAM_BANK.glob("*.md")):
        if md_file.name == "README.md":
            continue
        content = md_file.read_text(encoding="utf-8")
        blocks = content.split("\n---\n")
        for block in blocks:
            stripped = block.strip()
            if not stripped or (stripped.startswith("#") and not stripped.startswith("##")):
                continue
            lines = stripped.split("\n")
            if len(lines) < 3:
                continue
            stem = re.sub(r"^###\s*\d+\.\s*", "", lines[0]).strip()
            if not stem:
                continue
            marker_ans = extract_answer_from_marker(block)
            line_ans = extract_answer_line(block)
            if marker_ans and line_ans and marker_ans != line_ans:
                marker_answer_mismatch += 1
                mismatches.append((md_file.name, stem[:40], marker_ans, line_ans))
            if not marker_ans:
                no_marker.append((md_file.name, stem[:40]))
            if not line_ans:
                no_answer_line.append((md_file.name, stem[:40]))

            key = (md_file.name, stem[:40])
            if key in db_map:
                for qid, db_ans in db_map[key]:
                    if line_ans and db_ans != line_ans:
                        print(f"[DB不一致] id={qid} file={md_file.name} db={db_ans} 源={line_ans} stem={stem[:30]}")
                    elif line_ans:
                        verified += 1

    print(f"\n=== 交叉验证结果 ===")
    print(f"DB与源文件答案一致: {verified}")
    print(f"源文件内 ✅与答案行不一致: {marker_answer_mismatch}")
    print(f"无✅标记的题块: {len(no_marker)}")
    print(f"无答案行的题块: {len(no_answer_line)}")
    if mismatches:
        print(f"\n=== ✅与答案行不一致样例(前10) ===")
        for f, s, ma, la in mismatches[:10]:
            print(f"  {f}: ✅={ma} 答案行={la} | {s}")
    conn.close()

if __name__ == "__main__":
    main()
