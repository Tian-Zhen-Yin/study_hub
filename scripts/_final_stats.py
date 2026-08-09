import urllib.request, json

resp = urllib.request.urlopen("http://localhost:8080/api/questions?count=500")
all_q = json.loads(resp.read())["data"]

generic = 0
number_only = 0
good = 0

for q in all_q:
    opts = json.loads(q["optionsJson"] or "[]")
    if len(opts) >= 4:
        d = opts[3]
        if d in ["以上都不正确", "以上都不对", "以上说法均不正确"]:
            generic += 1
        elif len(d) <= 5 and d.replace(".","").replace("-","").isdigit():
            number_only += 1
        else:
            good += 1

print("Total:", len(all_q))
print("Good D:", good)
print("Generic:", generic)
print("Number-only:", number_only)

# Show a few samples
import random
samples = random.sample(all_q, 5)
for q in samples:
    opts = json.loads(q["optionsJson"] or "[]")
    print(f"\nQ{q['id']} [{q['sourceFile']}]")
    for i, opt in enumerate(opts):
        print(f"  {chr(65+i)}: {opt[:100]}")
