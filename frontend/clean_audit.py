import os

file_path = 'src/pages/AuditLogPage.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('{log.description}', '{log.description?.replace(/[^a-zA-Z0-9 :.,()-]/g, " ").replace(/\\s+/g, " ").trim()}')
content = content.replace('{log.action_type}', '{log.action_type?.replace(/_/g, " ").toUpperCase()}')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
