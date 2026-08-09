#!/usr/bin/env python3
"""Parse xiaomabenten/system_architect PDF exam papers to structured JSON.

Usage: python parse_pdf_questions.py <pdf-root-dir> <output.json> [--uploads-dir <dir>]

Image extraction:
  - For each PDF page, detect embedded images via pdfplumber.Page.images.
  - Each detected image is rendered to a PNG file under <uploads-dir>/questions/.
  - The first usable image on a question's page is attached to that question
    via the "imageUrl" field; the value is a relative URL "/uploads/questions/<filename>".
  - The Java side serves /uploads/** from <project>/data/uploads/ (see application.yml).
"""
import argparse
import json
import re
import sys
from pathlib import Path

try:
    import pdfplumber
except ImportError:
    print("Please install pdfplumber: pip install pdfplumber")
    sys.exit(1)

try:
    from PIL import Image
except ImportError:
    print("Please install Pillow: pip install Pillow")
    sys.exit(1)

KEYWORD_DOMAIN_MAP = [
    (r'cache|流水线|编码|浮点|校验|进制|补码|CPU|内存|总线|中断|DMA|存储', '计算机系统基础'),
    (r'进程|线程|调度|死锁|分页|分段|虚拟|PV操作|信号量|文件系统|I/O|SPOOL', '操作系统'),
    (r'数据库|SQL|范式|函数依赖|ER图|事务|锁|并发|ACID|关系代数|无损|BCNF|3NF|2NF|1NF|主键|外键|索引', '数据库技术'),
    (r'OSI|TCP|IP|UDP|HTTP|DNS|ARP|路由|子网|端口|协议|网络层|传输层|VLAN|VPN|防火墙', '计算机网络'),
    (r'软件工程|CMMI|生命周期|敏捷|Scrum|XP|RUP|瀑布|原型|螺旋|V模型|需求|测试|维护|耦合|内聚|McCabe|Halstead|净室', '软件工程'),
    (r'架构风格|管道|过滤器|分层|黑板|MVC|事件驱动|SOA|微服务|ABSD|ATAM|质量属性|视图|ADL|构件|连接件|战术|敏感点|权衡点', '架构设计'),
    (r'设计模式|GoF|创建型|结构型|行为型|工厂|单例|观察者|策略|装饰|代理|适配|桥接|组合|外观|享元|模板|命令|状态|迭代|访问|中介|备忘录|解释|职责|原型|建造', '设计模式'),
    (r'安全|加密|解密|RSA|AES|DES|MD5|SHA|认证|授权|审计|数字签名|CA|PKI|STRIDE|等保|国密|CIA|机密性|完整性|可用性|攻击|入侵|漏洞|XSS|SQL注入|CSRF|DDoS', '系统安全'),
    (r'项目|PERT|CPM|甘特|WBS|风险管理|挣值|EVM|SPI|CPI|进度|成本|质量|沟通|干系人|配置|变更', '项目管理'),
]

# Minimum area (in PDF points^2) for an embedded image to be considered meaningful.
MIN_IMAGE_AREA = 1500


def classify_domain(text):
    for pattern, domain in KEYWORD_DOMAIN_MAP:
        if re.search(pattern, text, re.IGNORECASE):
            return domain
    return "架构设计"


def extract_year_from_path(pdf_path):
    m = re.search(r'(\d{4})年', str(pdf_path))
    return m.group(1) if m else ""


def extract_page_images(page, out_dir, source_slug, page_idx, used_keys):
    """Render embedded images on a PDF page to PNGs in out_dir.
    Returns a list of (rel_url, dedup_key) tuples, biggest first."""
    results = []
    images = sorted(page.images, key=lambda im: -(im.get('width', 0) * im.get('height', 0)))
    for img_idx, img in enumerate(images):
        try:
            w, h = img.get('width', 0), img.get('height', 0)
            if w * h < MIN_IMAGE_AREA:
                continue
            x0, top, x1, bottom = img['x0'], img['top'], img['x1'], img['bottom']
            bbox = (x0, top, x1, bottom)
            cropped = page.crop(bbox)
            pil = cropped.to_image(resolution=200).original
            fname = f"{source_slug}_p{page_idx + 1}_i{img_idx}.png"
            dedup = fname.split('_i')[0]
            if dedup in used_keys:
                continue
            out_dir.mkdir(parents=True, exist_ok=True)
            fpath = out_dir / fname
            pil.save(fpath, 'PNG')
            rel_url = f"/uploads/questions/{fname}"
            results.append((rel_url, dedup))
            used_keys.add(dedup)
        except Exception as e:
            print(f"  WARN: failed to extract image on page {page_idx + 1} idx {img_idx}: {e}")
    return results


def split_questions_in_page(page_text):
    """Split a single page's text into question block dicts: {num, stem, options}.
    A block starts with '<num>. ' or '<num>、' at the beginning of a line."""
    blocks = []
    if not page_text:
        return blocks
    # Normalize: split on a newline that is followed by <digit><. or 、>
    chunks = re.split(r'\n(?=\s*\d+[\.、])', page_text)
    for chunk in chunks:
        chunk = chunk.strip()
        if not chunk or len(chunk) < 10:
            continue
        m = re.match(r'(\d+)[\.、]', chunk)
        if not m:
            continue
        blocks.append({"num": m.group(1), "raw": chunk})
    return blocks


def parse_block_to_question(block_raw, source_file, exam_year, image_url):
    """Convert a raw question chunk into a question dict, including imageUrl."""
    options = []
    for opt_label in ['A', 'B', 'C', 'D']:
        opt_match = re.search(rf'{opt_label}\.\s*(.+?)(?=\n[A-D]\.|\n*$)', block_raw, re.DOTALL)
        if opt_match:
            options.append(opt_match.group(1).strip())
    stem = re.split(r'\nA\.', block_raw)[0].strip()
    stem = re.sub(r'^\d+[\.、]\s*', '', stem).strip()
    domain = classify_domain(stem)
    return {
        "source": "PDF",
        "subject": "综合知识",
        "stem": stem,
        "optionsJson": json.dumps(options, ensure_ascii=False),
        "answer": "",
        "analysis": "",
        "examYear": exam_year,
        "sourceFile": source_file,
        "domainName": domain,
        "imageUrl": image_url,
    }


def parse_pdf_questions(pdf_path, answer_pdf_path, uploads_dir):
    questions = []
    exam_year = extract_year_from_path(pdf_path)
    source_slug = re.sub(r'[^A-Za-z0-9_-]+', '_', pdf_path.stem)[:60]
    used_keys = set()

    answers = {}
    if answer_pdf_path and answer_pdf_path.exists():
        try:
            with pdfplumber.open(answer_pdf_path) as pdf:
                answer_text = ""
                for page in pdf.pages:
                    text = page.extract_text()
                    if text:
                        answer_text += text + "\n"
                for m in re.finditer(r'(\d+)[\.、]\s*([A-D])', answer_text):
                    answers[m.group(1)] = m.group(2)
        except Exception as e:
            print(f"  WARNING: Cannot parse answers {answer_pdf_path.name}: {e}")

    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page_idx, page in enumerate(pdf.pages):
                page_text = page.extract_text() or ""
                page_blocks = split_questions_in_page(page_text)
                if not page_blocks:
                    continue
                page_images = extract_page_images(page, uploads_dir, source_slug, page_idx, used_keys)
                for block in page_blocks:
                    q = parse_block_to_question(block["raw"], pdf_path.name, exam_year,
                                                page_images[0][0] if page_images else "")
                    q["answer"] = answers.get(block["num"], "")
                    questions.append(q)
    except Exception as e:
        print(f"  WARNING: Cannot parse {pdf_path.name}: {e}")

    return questions


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf_root", help="Directory containing <year>/<name>.pdf subdirs")
    parser.add_argument("output", nargs="?", default="pdf_questions_output.json",
                        help="Output JSON file")
    parser.add_argument("--uploads-dir", default="data/uploads/questions",
                        help="Directory to write extracted images (default: data/uploads/questions)")
    args = parser.parse_args()

    pdf_root = Path(args.pdf_root)
    output_file = Path(args.output)
    uploads_dir = Path(args.uploads_dir)

    if not pdf_root.is_dir():
        print(f"PDF root not found: {pdf_root}")
        sys.exit(1)

    uploads_dir.mkdir(parents=True, exist_ok=True)

    all_questions = []
    for year_dir in sorted(pdf_root.iterdir()):
        if not year_dir.is_dir():
            continue
        print(f"Processing: {year_dir.name}")
        zhishi_pdf = None
        daan_pdf = None
        for pdf_file in year_dir.glob("*.pdf"):
            if '综合知识' in pdf_file.name:
                zhishi_pdf = pdf_file
            elif '答案' in pdf_file.name or '解析' in pdf_file.name:
                daan_pdf = pdf_file
        if zhishi_pdf:
            questions = parse_pdf_questions(zhishi_pdf, daan_pdf, uploads_dir)
            img_count = sum(1 for q in questions if q.get("imageUrl"))
            print(f"  -> {len(questions)} questions, {img_count} with image")
            all_questions.extend(questions)
        else:
            print(f"  WARNING: No knowledge PDF found")
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(all_questions, f, ensure_ascii=False, indent=2)
    print(f"\nTotal: {len(all_questions)} questions -> {output_file}")
    print(f"Images saved under: {uploads_dir}")


if __name__ == "__main__":
    main()
