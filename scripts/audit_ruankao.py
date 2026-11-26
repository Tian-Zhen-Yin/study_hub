"""Audit RUANKAO questions: options count, answer validity, duplicates, quality."""
import json
import os
import pymysql

conn = pymysql.connect(host="localhost", user="root", password=os.getenv("DB_PASSWORD", "root"), database="study_hub", charset="utf8mb4")
cur = conn.cursor()

cur.execute("SELECT COUNT(*) FROM questions WHERE source='RUANKAO'")
total = cur.fetchone()[0]
print(f"RUANKAO 总题数: {total}")

cur.execute("SELECT id, stem, options_json, answer, analysis, domain_id FROM questions WHERE source='RUANKAO'")
rows = cur.fetchall()

bad_opt_count = 0
bad_answer = 0
empty_stem = 0
empty_analysis = 0
dup_stems = {}
json_fail = 0
opt_lens = {}

for qid, stem, oj, ans, analysis, did in rows:
    if not stem or not stem.strip():
        empty_stem += 1
        continue
    dup_stems.setdefault(stem[:50], []).append(qid)
    if not analysis or not analysis.strip():
        empty_analysis += 1
    try:
        opts = json.loads(oj) if oj else []
    except:
        json_fail += 1
        continue
    n = len(opts)
    opt_lens[n] = opt_lens.get(n, 0) + 1
    if n != 4:
        bad_opt_count += 1
    if ans not in ('A', 'B', 'C', 'D'):
        bad_answer += 1

dups = {k: v for k, v in dup_stems.items() if len(v) > 1}

print(f"\n=== RUANKAO 质量报告 ===")
print(f"总题数: {total}")
print(f"选项数异常(非4): {bad_opt_count}")
print(f"选项数分布: {opt_lens}")
print(f"答案异常(非ABCD): {bad_answer}")
print(f"空题干: {empty_stem}")
print(f"无解析: {empty_analysis}")
print(f"JSON解析失败: {json_fail}")
print(f"重复题干(前50字相同): {len(dups)} 组")

cur.execute("SELECT d.name, COUNT(q.id) FROM questions q JOIN domains d ON q.domain_id=d.id WHERE q.source='RUANKAO' GROUP BY d.name ORDER BY COUNT(q.id) DESC")
print(f"\n=== RUANKAO 各域分布 ===")
for name, cnt in cur.fetchall():
    print(f"  {name}: {cnt}")

if dups:
    print(f"\n=== 重复题干样例(前5组) ===")
    for k, v in list(dups.items())[:5]:
        print(f"  '{k[:40]}...' -> ids={v}")

conn.close()
