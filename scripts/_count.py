import urllib.request, json
resp = urllib.request.urlopen("http://localhost:8080/api/questions?count=500")
data = json.loads(resp.read())
print("Total:", len(data["data"]))
