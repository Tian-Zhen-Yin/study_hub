import urllib.request, json

url = "http://localhost:8080/api/questions?domainId=6&count=10"
resp = urllib.request.urlopen(url)
data = json.loads(resp.read())

for q in data["data"]:
    opts = json.loads(q["optionsJson"] or "[]")
    print(f'Q{q["id"]}: {len(opts)} options - {q["sourceFile"]}')
    if len(opts) < 4:
        print(f'  Options: {opts}')
