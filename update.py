#!/usr/bin/env python3

import re
import subprocess
import os
import tempfile
from pathlib import Path

sw_path = Path("sw.js")
content = sw_path.read_text(encoding="utf-8")
m = re.search(r'const CACHE_NAME = "tetris-v(\d+)";', content)
if not m:
    raise SystemExit("cache_name line not found or not in expected format")
v = int(m.group(1)) + 1
new_content = re.sub(
    r'const CACHE_NAME = "tetris-v\d+";',
    f'const CACHE_NAME = "tetris-v{v}";',
    content,
    count=1,
)
sw_path.write_text(new_content, encoding="utf-8")
print(f"bumped cache_name to tetris-v{v}")

subprocess.run(["git", "status"], check=True)
subprocess.run(["git", "add", "--all"], check=True)

editor = os.environ.get("EDITOR", "vi")
fd, tf_path = tempfile.mkstemp(suffix=".txt", prefix="git_commit_msg_")
with os.fdopen(fd, "w") as f:
    f.write(f"bump cache_name to tetris-v{v}\n\n")

print("opening editor for commit message...")
subprocess.run([editor, tf_path], check=True)

with open(tf_path, "r", encoding="utf-8") as f:
    msg = f.read().strip()
os.unlink(tf_path)

if not msg:
    sw_path.write_text(content, encoding="utf-8")
    raise SystemExit("empty commit message, reverted sw.js and aborting")

subprocess.run(["git", "commit", "-F", "-"], input=msg.encode(), check=True)
subprocess.run(["git", "push"], check=True)
