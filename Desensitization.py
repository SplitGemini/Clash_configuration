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
user = r"(C:(\\\\|\\|/)Users(\\\\|\\|/))[^\\/]*(?=(\\\\|\\|/)\.config)"
id = "[0-9a-z]{32}"
token = "[0-9a-z]{40}"
group = "(?<=const fileNames = \{).*(?=\})"
sub = r"\s*#\s*来自订阅：.*"

# js
with open(os.path.join(path, js), "r", encoding="utf-8") as f:
    result = re.sub(id, "", f.read(), count=1, flags=0)
    result = re.sub(token, "", result, count=1, flags=0)
    result = re.sub(group, "\"v2ray\":\"clash\"", result, count=1, flags=0)
    result = re.sub(user, r"\1YOURNAME", result, count=0, flags=0)
with open(js, "w", encoding="utf-8") as f:
    f.write(result)

# yaml
with open(os.path.join(path, yaml), "r", encoding="utf-8") as f:
    result = re.sub(sub, "", f.read(), count=0, flags=0)
with open(yaml, "w", encoding="utf-8") as f:
    f.write(result)

# setting
with open(os.path.join(path, setting), "r", encoding="utf-8") as f:
    result = re.sub(user, r"\1YOURNAME", f.read(), count=0, flags=0)
with open(setting, "w", encoding="utf-8") as f:
    f.write(result)