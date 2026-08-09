import urllib.request, json

BASE = "http://localhost:8080"

def get_all():
    resp = urllib.request.urlopen(f"{BASE}/api/questions?count=500")
    return json.loads(resp.read())["data"]

def update(qid, opts_json):
    body = json.dumps({"optionsJson": opts_json}).encode()
    req = urllib.request.Request(f"{BASE}/api/questions/{qid}", data=body, method="PUT")
    req.add_header("Content-Type", "application/json")
    return urllib.request.urlopen(req)

questions = get_all()

# Generate 4th option based on stem + existing options + analysis
# For each question, produce a 4th distractor

distractors = {
    # Q1: MIPS = 2000/5 = 400, options are 100,200,1000. Add 400
    1: "400",
    # Q2: total time = k+n-1. Options: n*t, k*t, n*k*t. Add (k+n-1)*t
    2: "(k+n-1)·t",
    # Q3: Cache mapping. Options about direct/full/group. Add correct statement as distractor
    3: "全相联命中率最高但硬件成本高",
    # Q4: 32-bit float mantissa. 1+8+23. Options: 8,11,52. Add 23
    4: "23",
    # Q5: Hamming code. Options about distance. Add d=3 correct statement
    5: "最小码距 d=3 可纠 1 位错或检 2 位错",
}

fixed = 0
for q in questions:
    qid = q["id"]
    if qid in distractors:
        opts = json.loads(q["optionsJson"] or "[]")
        opts.append(distractors[qid])
        update(qid, json.dumps(opts, ensure_ascii=False))
        fixed += 1
        print(f"Fixed Q{qid}: added D option")

print(f"\nFixed {fixed} questions")
print(f"Remaining: {len(questions) - fixed}")
