import urllib.request, json

resp = urllib.request.urlopen("http://localhost:8080/api/questions?domainId=1&count=5")
data = json.loads(resp.read())

for q in data["data"]:
    opts = json.loads(q["optionsJson"] or "[]")
    print(f'Q{q["id"]} [{q["sourceFile"]}]')
    for i, opt in enumerate(opts):
        label = chr(65+i)
        print(f'  {label}: {opt[:80]}')
    print(f'  Answer: {q["answer"]}')
    print()
