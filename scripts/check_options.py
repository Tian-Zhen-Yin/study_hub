"""Check option quality: empty, duplicate, abnormally long options."""
import json, sys, os
import pymysql

conn = pymysql.connect(host="localhost", user="root", password=os.getenv("DB_PASSWORD", "root"), database="study_hub", charset="utf8mb4")
cur = conn.cursor()
cur.execute("SELECT id, source_file, stem, options_json, answer FROM questions WHERE source='GITHUB'")
rows = cur.fetchall()

empty_opts = []
dup_opts = []
long_opts = []
dup_across = {}
ans_in_opts_mismatch = []

for qid, sf, stem, oj, ans in rows:
    try:
        opts = json.loads(oj)
    except:
        print(f"[JSON解析失败] id={qid} file={sf}")
        continue
    if len(opts) != 4:
        print(f"[选项数异常] id={qid} file={sf} count={len(opts)}")
    # empty or whitespace-only options
    for i, o in enumerate(opts):
        if not o or not o.strip():
            empty_opts.append((qid, sf, i))
    # duplicate options within same question
    norm = [o.strip() for o in opts]
    if len(set(norm)) != len(norm):
        dup_opts.append((qid, sf, stem[:30], norm))
    # abnormally long option (>200 chars)
    for o in opts:
        if len(o) > 200:
            long_opts.append((qid, sf, len(o), o[:50]))
    # check answer index validity
    idx = ord(ans) - ord('A') if ans else -1
    if idx < 0 or idx >= len(opts):
        ans_in_opts_mismatch.append((qid, sf, ans, len(opts)))

print(f"=== 选项质量检查 ===")
print(f"总真题数: {len(rows)}")
print(f"空选项题目: {len(empty_opts)}")
print(f"选项重复题目: {len(dup_opts)}")
print(f"超长选项(>200字)题目: {len(long_opts)}")
print(f"答案越界题目: {len(ans_in_opts_mismatch)}")

if dup_opts:
    print(f"\n=== 选项重复样例 ===")
    for qid, sf, s, opts in dup_opts[:5]:
        print(f"  id={qid} {sf} | {s} | {opts}")
if long_opts:
    print(f"\n=== 超长选项样例 ===")
    for qid, sf, l, o in long_opts[:5]:
        print(f"  id={qid} {sf} len={l} | {o}...")

conn.close()
