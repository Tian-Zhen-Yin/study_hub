import urllib.request, json, re

BASE = "http://localhost:8080"

def get_all():
    resp = urllib.request.urlopen(f"{BASE}/api/questions?count=500")
    return json.loads(resp.read())["data"]

def update(qid, opts_json):
    body = json.dumps({"optionsJson": opts_json}).encode()
    req = urllib.request.Request(f"{BASE}/api/questions/{qid}", data=body, method="PUT")
    req.add_header("Content-Type", "application/json")
    urllib.request.urlopen(req)

questions = get_all()
fixed = 0

for q in questions:
    opts = json.loads(q["optionsJson"] or "[]")
    changed = False
    for i in range(len(opts)):
        # Remove "（混淆项）" suffix
        old = opts[i]
        new_opt = re.sub(r'[（(]混淆项[）)]', '', old).strip()
        if new_opt != old:
            opts[i] = new_opt
            changed = True
    
    if changed:
        update(q["id"], json.dumps(opts, ensure_ascii=False))
        fixed += 1

print(f"Cleaned {fixed} questions")
