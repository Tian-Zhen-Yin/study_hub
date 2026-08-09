import urllib.request, json, sys

BASE = "http://localhost:8080"

def get_questions(offset, limit=50):
    url = f"{BASE}/api/questions?count={limit}"
    # Need to get all, but API doesn't support offset. Use domain-based pagination
    resp = urllib.request.urlopen(url)
    data = json.loads(resp.read())
    return data["data"]

def update_question(qid, options_json, answer=None):
    body = json.dumps({"optionsJson": options_json, "answer": answer} if answer else {"optionsJson": options_json}).encode()
    req = urllib.request.Request(f"{BASE}/api/questions/{qid}", data=body, method="PUT")
    req.add_header("Content-Type", "application/json")
    resp = urllib.request.urlopen(req)
    return json.loads(resp.read())

# Fetch first batch
questions = get_questions(0, 100)
print(f"Fetched {len(questions)} questions")

# Show first 5 for verification
for q in questions[:5]:
    opts = json.loads(q["optionsJson"] or "[]")
    print(f"\nID={q['id']} [{q['sourceFile']}]")
    print(f"  Q: {q['stem'][:80]}")
    print(f"  Options ({len(opts)}): {opts}")
    print(f"  Answer: {q['answer']}")
    print(f"  Analysis: {(q['analysis'] or '')[:80]}")
