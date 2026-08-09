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

def gen_distractor(stem, options, answer, analysis, source_file):
    """Generate a 4th distractor option based on question context."""
    analysis = analysis or ""
    stem = stem or ""
    
    # Try to extract a related concept from analysis
    # Pattern 1: Look for bold text in analysis
    bold = re.findall(r'\*\*(.+?)\*\*', analysis)
    if bold:
        for b in bold:
            if b not in options and b != answer and len(b) > 2:
                return b
    
    # Pattern 2: Look for key terms in analysis that aren't in options
    words = re.findall(r'[\u4e00-\u9fff\w]+', analysis)
    for w in words:
        if len(w) > 3 and w not in " ".join(options) and w != answer:
            # Create a statement using this word
            for opt in options:
                if w in opt:
                    return opt.replace(w, w + "（错误理解）")
    
    # Pattern 3: For calculation questions, add a common wrong calculation
    nums = re.findall(r'\d+', analysis)
    if nums:
        for n in nums:
            if n not in str(options) and int(n) > 0:
                return n
    
    # Fallback: generic distractor based on domain
    return "以上都不正确"

questions = get_all()
fixed = 0
skipped = 0

for q in questions:
    opts = json.loads(q["optionsJson"] or "[]")
    if len(opts) >= 4:
        skipped += 1
        continue
    
    distractor = gen_distractor(
        q["stem"], opts, q["answer"], q["analysis"], q["sourceFile"]
    )
    
    # Ensure distractor is not already in options
    if distractor in opts:
        distractor = "以上都不对"
    
    opts.append(distractor)
    update(q["id"], json.dumps(opts, ensure_ascii=False))
    fixed += 1
    
    if fixed % 50 == 0:
        print(f"Progress: {fixed}/{len(questions)}")

print(f"\nFixed: {fixed}, Skipped: {skipped}, Total: {len(questions)}")
