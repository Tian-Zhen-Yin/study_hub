import urllib.request, json

resp = urllib.request.urlopen("http://localhost:8080/api/questions?count=500")
all_q = json.loads(resp.read())["data"]

opt_counts = {}
generic = 0
number_only = 0
good = 0

for q in all_q:
    opts = json.loads(q["optionsJson"] or "[]")
    n = len(opts)
    opt_counts[n] = opt_counts.get(n, 0) + 1
    
    if n >= 4:
        d = opts[3]
        if d in ["以上都不正确", "以上都不对", "以上说法均不正确"]:
            generic += 1
        elif len(d) <= 5 and d.replace(".","").replace("-","").isdigit():
            number_only += 1
        else:
            good += 1

print("Total:", len(all_q))
print("Options dist:", opt_counts)
print("Good D options:", good)
print("Generic fallback:", generic)
print("Number-only:", number_only)
