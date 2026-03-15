#!/usr/bin/env python3

import subprocess
import tempfile
import os
import re

script_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(script_dir)

sw_path = os.path.join(script_dir, "sw.js")
if not os.path.isfile(sw_path):
    raise SystemExit("sw.js not found in " + script_dir)

with open(sw_path, "r", encoding="utf-8") as f:
    content = f.read()

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
with open(sw_path, "w", encoding="utf-8") as f:
    f.write(new_content)
print(f"bumped cache_name to tetris-v{v}")

subprocess.run(["git", "status"], check=True)

confirm_add = input("\ngit add --all? [y/n]: ").strip().lower()
if confirm_add != "y":
    with open(sw_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("aborted, reverted sw.js")
    raise SystemExit(1)

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
    with open(sw_path, "w", encoding="utf-8") as f:
        f.write(content)
    subprocess.run(["git", "reset"], check=True)
    print("empty commit message, reverted sw.js and unstaged changes")
    raise SystemExit(1)

print(f"\ncommit message:\n{msg}\n")
confirm_push = input("commit and push? [y/n]: ").strip().lower()
if confirm_push != "y":
    with open(sw_path, "w", encoding="utf-8") as f:
        f.write(content)
    subprocess.run(["git", "reset"], check=True)
    print("aborted, reverted sw.js and unstaged changes")
    raise SystemExit(1)

subprocess.run(["git", "commit", "-F", "-"], input=msg.encode(), check=True)
subprocess.run(["git", "push"], check=True)
