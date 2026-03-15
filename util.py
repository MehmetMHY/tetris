#!/usr/bin/env python3

import http.server
import subprocess
import webbrowser
import argparse
import tempfile
import socket
import sys
import os
import re

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))


def find_open_port(start=8000, max_attempts=100):
    for port in range(start, start + max_attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(("localhost", port)) != 0:
                return port
    print("Error: Could not find an available port")
    sys.exit(1)


def cmd_run():
    os.chdir(SCRIPT_DIR)
    port = find_open_port()
    url = f"http://localhost:{port}"
    print(f"Starting HTTP server on {url}")
    print("Press Ctrl+C to stop the server")
    webbrowser.open(url)
    handler = http.server.SimpleHTTPRequestHandler
    with http.server.HTTPServer(("", port), handler) as server:
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped")


def cmd_deploy():
    os.chdir(SCRIPT_DIR)
    sw_path = os.path.join(SCRIPT_DIR, "sw.js")
    if not os.path.isfile(sw_path):
        raise SystemExit("sw.js not found in " + SCRIPT_DIR)

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


def main():
    parser = argparse.ArgumentParser(
        description="Tetris project utility",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="examples:\n  python3 util.py -r\n  python3 util.py -d",
    )
    parser.add_argument(
        "-r",
        "--run",
        action="store_true",
        help="start local dev server and open in browser",
    )
    parser.add_argument(
        "-d",
        "--deploy",
        action="store_true",
        help="bump SW cache version, commit, and push",
    )

    args = parser.parse_args()

    if not args.run and not args.deploy:
        parser.print_help()
        sys.exit(0)

    if args.run and args.deploy:
        print("Error: use either -r or -d, not both")
        sys.exit(1)

    if args.run:
        cmd_run()
    elif args.deploy:
        cmd_deploy()


if __name__ == "__main__":
    main()
