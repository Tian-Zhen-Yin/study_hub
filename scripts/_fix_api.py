path = r'E:\AiProject\study_hub\src\main\resources\static\js\api.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
old = "const API_BASE = 'http://localhost:8080/api';"
new = "const API_BASE = '/api';"
content = content.replace(old, new)
with open(path, 'w', encoding='utf-8', newline='') as f:
    f.write(content)
print('Fixed API_BASE')
