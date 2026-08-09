import urllib.request, json

url = "http://localhost:8080/api/questions?count=1000"
resp = urllib.request.urlopen(url)
data = json.loads(resp.read())

counts = {}
for q in data["data"]:
    opts = json.loads(q["optionsJson"] or "[]")
    n = len(opts)
    counts[n] = counts.get(n, 0) + 1

print("Options distribution:")
for k in sorted(counts.keys()):
    print(f"  {k} options: {counts[k]} questions")
print(f"  Total: {sum(counts.values())}")
