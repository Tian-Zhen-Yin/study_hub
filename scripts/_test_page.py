html = '''<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Test</title></head>
<body>
<h1>API Test</h1>
<div id="out">Loading...</div>
<script>
fetch('/api/domains')
  .then(r => r.json())
  .then(d => {
    document.getElementById('out').innerHTML = 'Domains: ' + d.data.length + '<br>' +
      d.data.map(function(x) { return x.id + ': ' + x.name; }).join('<br>');
  })
  .catch(e => {
    document.getElementById('out').innerHTML = 'ERROR: ' + e.message;
  });
</script>
</body></html>'''

with open(r'E:\AiProject\study_hub\src\main\resources\static\test.html', 'w', encoding='utf-8') as f:
    f.write(html)
print('Test page created')
