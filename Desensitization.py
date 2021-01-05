import re
import os
"""
数据脱敏
"""

# HOME Directory path
path = "../"
# files name
js = "parser.js"
yaml = "parser.yaml"
setting = "cfw-settings.yaml"

# patterns
user = (r"(C:(\\\\|\\|/)Users(\\\\|\\|/))[^\\/]*(?=(\\\\|\\|/)\.config)",r"\1YOURNAME")
id = ("[0-9a-z]{32}","")
token = ("[0-9a-z]{40}","")
group = ("(?<=const fileNames = \{).*(?=\})","\"v2ray\":\"clash\"")
# 删除被'##delete start'和'##end'包围的内容
delete = (r"\s*##\s?delete\s?start[\s\S]*?##\s?(delete\s?)?end","")

# js
with open(os.path.join(path, js), "r", encoding="utf-8") as f:
    result = re.sub(id[0], id[1], f.read(), count=1, flags=0)
    result = re.sub(token[0], token[1], result, count=1, flags=0)
    result = re.sub(group[0], group[1], result, count=1, flags=0)
    result = re.sub(user[0], user[1], result, count=0, flags=0)
with open(js, "w", encoding="utf-8") as f:
    f.write(result)

# yaml
with open(os.path.join(path, yaml), "r", encoding="utf-8") as f:
    result = re.sub(delete[0], delete[1], f.read(), count=0, flags=0)
with open(yaml, "w", encoding="utf-8") as f:
    f.write(result)

# setting
with open(os.path.join(path, setting), "r", encoding="utf-8") as f:
    result = re.sub(user[0], user[1], f.read(), count=0, flags=0)
    result = re.sub(delete[0], delete[1], result, count=0, flags=0)
with open(setting, "w", encoding="utf-8") as f:
    f.write(result)
print("Desensitization finished...")