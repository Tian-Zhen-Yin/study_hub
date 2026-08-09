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

def better_distractor(stem, options, answer, analysis, source_file):
    """Generate a better D option for questions with bad D options."""
    analysis = (analysis or "").strip()
    stem = (stem or "").strip()
    
    # Strategy 1: Use the analysis to create a wrong variant
    if analysis:
        # Extract key concept from analysis
        sentences = re.split(r'[。；]', analysis)
        for s in sentences:
            s = re.sub(r'\*\*', '', s).strip()
            if len(s) > 10 and len(s) < 120 and s not in options:
                # Check if this is a factual statement
                if any(kw in s for kw in ["是", "为", "指", "即", "可", "需", "应", "包含", "属于", "需要", "支持"]):
                    # Create a slight variation
                    modified = s
                    # Flip truth value
                    modified = re.sub(r'^(.*?)(是|为|即|指)(.*)', r'\1不\2\3', modified)
                    if modified != s and modified not in options and len(modified) > 6:
                        return modified
                    # Just use the statement itself if it's a correct definition
                    return s
    
    # Strategy 2: Look at the existing options and create a contrast
    if len(options) >= 2:
        # Take the first two options and combine them in a wrong way
        a = options[0]
        b = options[1]
        if len(a) > 3 and len(b) > 3:
            # Create "A 和 B 都正确" or similar
            candidate = "A和B都正确"
            if candidate not in options:
                return candidate
    
    # Strategy 3: Use the answer letter to create a meta-option
    labels = ['A', 'B', 'C', 'D']
    answer_idx = -1
    for i, opt in enumerate(options):
        if answer == labels[i]:
            answer_idx = i
            break
    
    if answer_idx >= 0 and len(options[answer_idx]) > 3:
        # Create "不是" + answer option
        return "不是" + options[answer_idx]
    
    # Strategy 4: Domain-specific fallbacks
    domain_hints = {
        "01-computer-systems": "以上计算均不正确",
        "02-os-concepts": "以上说法均不准确",
        "03-database": "以上特征描述均不完整",
        "04-networking": "以上协议特性均不匹配",
        "05-uml": "以上模型关系均不正确",
        "07-software-engineering": "以上模型描述均不准确",
        "08-project-management": "以上计算方法均不正确",
        "09-software-metrics": "以上度量方式均不准确",
        "10-architecture-styles": "以上风格分类均不正确",
        "11-quality-attributes": "以上属性战术均不匹配",
        "12-atam-evaluation": "以上评估方法均不正确",
        "13-design-patterns": "以上模式描述均不准确",
        "14-absd-views": "以上视图描述均不正确",
        "15-microservice-cloud-native": "以上技术选型均不正确",
        "16-middleware": "以上中间件特性均不准确",
        "17-distributed-transactions": "以上方案描述均不正确",
        "18-cache": "以上缓存策略均不正确",
        "19-big-data": "以上架构特性均不正确",
        "20-reliability": "以上容错方案均不正确",
        "21-security": "以上安全措施均不正确",
        "22-embedded": "以上调度方案均不正确",
        "23-english-reading": "以上翻译均不正确",
        "24-devops-serverless": "以上DevOps实践均不正确",
        "25-enterprise-integration": "以上集成方案均不正确",
        "26-soa-evolution": "以上架构演化均不正确",
    }
    return domain_hints.get(source_file.replace(".md", ""), "以上说法均不准确")

questions = get_all()
fixed = 0

for q in questions:
    opts = json.loads(q["optionsJson"] or "[]")
    if len(opts) < 4:
        continue
    
    d = opts[3]
    is_bad = (d in ["以上都不正确", "以上都不对", "以上说法均不正确"]) or \
             (len(d) <= 5 and d.replace(".","").replace("-","").isdigit())
    
    if is_bad:
        new_d = better_distractor(q["stem"], opts[:3], q["answer"], q["analysis"], q["sourceFile"])
        opts[3] = new_d
        update(q["id"], json.dumps(opts, ensure_ascii=False))
        fixed += 1
        if fixed % 30 == 0:
            print(f"Fixed {fixed} bad options...")

print(f"Fixed {fixed} bad D options")
