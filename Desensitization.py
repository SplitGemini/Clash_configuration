import re
import os
"""
数据脱敏
"""

# HOME Directory path
path = "../"
# files name
yaml = "parser.yaml"
setting = "cfw-settings.yaml"


# patterns
user = (r"(C:(\\\\|\\|/)Users(\\\\|\\|/))[^\\/]*(?=(\\\\|\\|/)\.config)",r"\1YOURNAME")
# 删除被'##delete start'和'##end'包围的内容
delete = (r"\s*##\s?delete\s?start[\s\S]*?##\s?(delete\s?)?end","")

# parser.yaml
with open(os.path.join(path, yaml), "r", encoding="utf-8") as f:
    result = re.sub(delete[0], delete[1], f.read(), count=0, flags=0)
with open(yaml, "w", encoding="utf-8") as f:
    f.write(result)

# cfw-settings.yaml
with open(os.path.join(path, setting), "r", encoding="utf-8") as f:
    result = re.sub(user[0], user[1], f.read(), count=0, flags=0)
    result = re.sub(delete[0], delete[1], result, count=0, flags=0)
with open(setting, "w", encoding="utf-8") as f:
    f.write(result)

print("Desensitization finished...")