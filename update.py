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
os.close(fd)

print("opening editor for commit message...")
subprocess.run([editor, tf_path], check=True)

with open(tf_path, "r", encoding="utf-8") as f:
    msg = f.read().strip()
os.unlink(tf_path)

if not msg:
    sw_path.write_text(content, encoding="utf-8")
    print("empty commit message, reverted sw.js")
    raise SystemExit(1)

print(f"\ncommit message:\n{msg}\n")
confirm = input("commit and push? [y/n]: ").strip().lower()
if confirm != "y":
    sw_path.write_text(content, encoding="utf-8")
    subprocess.run(["git", "reset"], check=True)
    print("aborted, reverted sw.js and unstaged changes")
    raise SystemExit(1)

subprocess.run(["git", "commit", "-F", "-"], input=msg.encode(), check=True)
subprocess.run(["git", "push"], check=True)
