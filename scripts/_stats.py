import urllib.request, json

resp = urllib.request.urlopen("http://localhost:8080/api/questions?count=500")
data = json.loads(resp.read())

opt_counts = {}
generic = 0
number_only = 0
good = 0

for q in data["data"]:
    opts = json.loads(q["optionsJson"] or "[]")
    n = len(opts)
    opt_counts[n] = opt_counts.get(n, 0) + 1
    
    if n >= 4:
        d = opts[3]
        if d == "以上都不正确" or d == "以上都不对" or d == "以上说法均不正确":
            generic += 1
        elif len(d) <= 5 and d.replace(".","").replace("-","").isdigit():
            number_only += 1
        else:
            good += 1

print(f"Total questions: {len(data)}")
print(f"Options: {opt_counts}")
print(f"Good D options: {good}")
print(f"Generic fallback: {generic}")
print(f"Number-only (bad): {number_only}")
