path = r'E:\AiProject\study_hub\scripts\parse_markdown_questions.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix option extraction to handle ✅ **A. text** format
old = "opt = re.sub(r'^[A-D]\.\s*', '', line)\n            opt = re.sub(r'^✅\s*', '', opt)"
new = "opt = re.sub(r'^(?:✅\s*)?(?:\*\*)?[A-D](?:\*\*)?\.\s*', '', line)"
content = content.replace(old, new)

with open(path, 'w', encoding='utf-8', newline='') as f:
    f.write(content)
print('Fixed option extraction')
