import urllib.request, json, random

# Check random sample across domains
for domain_id in [1, 3, 6, 7, 8]:
    resp = urllib.request.urlopen(f"http://localhost:8080/api/questions?domainId={domain_id}&count=3")
    data = json.loads(resp.read())
    for q in data["data"]:
        opts = json.loads(q["optionsJson"] or "[]")
        print(f'Q{q["id"]} [{q["sourceFile"]}]')
        for i, opt in enumerate(opts):
            print(f'  {chr(65+i)}: {opt[:100]}')
        print(f'  Answer: {q["answer"]}')
        print()

# Overall stats
resp = urllib.request.urlopen("http://localhost:8080/api/questions?count=500")
data = json.loads(resp.read())
opt_counts = {}
for q in data["data"]:
    n = len(json.loads(q["optionsJson"] or "[]"))
    opt_counts[n] = opt_counts.get(n, 0) + 1
print(f"Options distribution: {opt_counts}")
