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

def smart_distractor(stem, options, answer, analysis):
    """Generate a smart 4th option."""
    analysis = (analysis or "").strip()
    stem = (stem or "").strip()
    
    # Strategy 1: Extract a key phrase from analysis, create a negation
    # e.g., "全相联命中率最高" -> "全相联命中率最低"
    if analysis:
        # Look for statements with key terms
        opposites = {
            "最高": "最低", "最低": "最高",
            "正确": "错误", "错误": "正确",
            "可以": "不可以", "不能": "可以",
            "增加": "减少", "减少": "增加",
            "大于": "小于", "小于": "大于",
        }
        for k, v in opposites.items():
            if k in analysis:
                candidate = analysis.replace(k, v)
                # Extract a short phrase
                phrases = re.split(r'[，。；]', candidate)
                for p in phrases:
                    p = p.strip()
                    if len(p) > 6 and len(p) < 80 and p not in options:
                        return p
    
    # Strategy 2: Extract a correct concept from analysis, make it wrong
    if analysis:
        sentences = re.split(r'[。；]', analysis)
        for s in sentences:
            s = s.strip()
            # Remove bold markers
            s = re.sub(r'\*\*', '', s)
            if len(s) > 8 and len(s) < 100 and s not in options:
                # Check if it's a factual statement we can flip
                if any(kw in s for kw in ["是", "为", "可", "需", "包含", "属于"]):
                    return s + "（混淆项）"
    
    # Strategy 3: Use stem keywords to create a related option
    keywords = re.findall(r'[\u4e00-\u9fff]{2,}', stem)
    if len(keywords) > 3:
        for i in range(len(keywords)-2):
            candidate = keywords[i] + keywords[i+1] + "不属于此类"
            if candidate not in options and len(candidate) > 6:
                return candidate
    
    # Strategy 4: Look at what the existing options are about and create a contrast
    if options:
        first_opt = options[0]
        # Add a negation of the first option
        if "是" in first_opt:
            return first_opt.replace("是", "不一定是")
        if "可以" in first_opt:
            return first_opt.replace("可以", "不能")
    
    # Fallback
    return "以上说法均不正确"

questions = get_all()
fixed = 0
good = 0
bad = 0

for q in questions:
    opts = json.loads(q["optionsJson"] or "[]")
    if len(opts) >= 4:
        # Check if current D is bad (just a number)
        d = opts[3]
        if d and len(d) <= 5 and d.isdigit():
            # Replace bad option
            opts[3] = smart_distractor(q["stem"], opts[:3], q["answer"], q["analysis"])
            update(q["id"], json.dumps(opts, ensure_ascii=False))
            fixed += 1
        else:
            good += 1
        continue
    
    distractor = smart_distractor(q["stem"], opts, q["answer"], q["analysis"])
    if len(distractor) <= 5 and distractor.isdigit():
        bad += 1
    else:
        good += 1
    
    opts.append(distractor)
    update(q["id"], json.dumps(opts, ensure_ascii=False))
    fixed += 1

print(f"Fixed: {fixed}, Good: {good}, Bad: {bad}")
