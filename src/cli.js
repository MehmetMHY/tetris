#!/usr/bin/env node

import http from "node:http";
import net from "node:net";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import readline from "node:readline/promises";

const ROOT_DIR = path.dirname(new URL(".", import.meta.url).pathname);

const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg",
  ".webmanifest": "application/manifest+json",
};

function findOpenPort(start = 8000, maxAttempts = 100) {
  return new Promise((resolve, reject) => {
    let port = start;

    function tryPort() {
      if (port >= start + maxAttempts) {
        reject(new Error("could not find an available port"));
        return;
      }

      const server = net.createServer();
      server.once("error", () => {
        port++;
        tryPort();
      });
      server.once("listening", () => {
        server.close(() => resolve(port));
      });
      server.listen(port);
    }

    tryPort();
  });
}

function openBrowser(url) {
  const platform = process.platform;
  if (platform === "darwin") {
    spawnSync("open", [url]);
  } else if (platform === "win32") {
    spawnSync("cmd", ["/c", "start", url], { shell: true });
  } else {
    spawnSync("xdg-open", [url]);
  }
}

async function cmdRun() {
  process.chdir(ROOT_DIR);
  let port;
  try {
    port = await findOpenPort();
  } catch {
    console.error("error: could not find an available port");
    process.exit(1);
  }
  const url = `http://localhost:${port}`;
  console.log(`starting http server on ${url}`);
  console.log("press ctrl+c to stop the server");

  const server = http.createServer((req, res) => {
    let filePath = path.join(ROOT_DIR, decodeURIComponent(req.url));

    if (req.url.endsWith("/")) {
      filePath = path.join(filePath, "index.html");
    }

    const ext = path.extname(filePath);
    const contentType = MIME[ext] || "application/octet-stream";

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("404 not found");
        return;
      }
      res.writeHead(200, { "Content-Type": contentType });
      res.end(data);
    });
  });

  server.listen(port, () => {
    openBrowser(url);
  });

  process.on("SIGINT", () => {
    server.close();
    console.log("\nserver stopped");
    process.exit(0);
  });
}

async function confirm(rl, prompt) {
  const answer = (await rl.question(prompt)).trim().toLowerCase();
  return answer === "y" || answer === "";
}

function runGit(args, opts = {}) {
  const result = spawnSync("git", args, { stdio: "inherit", ...opts });
  if (result.status !== 0) {
    console.error(`error: git ${args.join(" ")} failed`);
    process.exit(1);
  }
  return result;
}

async function cmdDeploy() {
  process.chdir(ROOT_DIR);
  const swPath = path.join(ROOT_DIR, "sw.js");

  if (!fs.existsSync(swPath)) {
    console.error(`error: sw.js not found in ${ROOT_DIR}`);
    process.exit(1);
  }

  const content = fs.readFileSync(swPath, "utf-8");
  const match = content.match(/const CACHE_NAME = "tetris-v(\d+)";/);
  if (!match) {
    console.error("error: cache_name line not found or not in expected format");
    process.exit(1);
  }

  const v = parseInt(match[1], 10) + 1;
  const newContent = content.replace(
    /const CACHE_NAME = "tetris-v\d+";/,
    `const CACHE_NAME = "tetris-v${v}";`,
  );
  fs.writeFileSync(swPath, newContent);
  console.log(`bumped cache_name to tetris-v${v}`);

  runGit(["status"]);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const shouldAdd = await confirm(rl, "\ngit add --all? [Y/n]: ");
  if (!shouldAdd) {
    fs.writeFileSync(swPath, content);
    rl.close();
    console.log("aborted, reverted sw.js");
    process.exit(1);
  }

  runGit(["add", "--all"]);

  const editor = process.env.EDITOR || "vi";
  const tmpFile = path.join(os.tmpdir(), `git_commit_msg_${process.pid}.txt`);
  fs.writeFileSync(tmpFile, "");

  console.log("opening editor for commit message...");
  spawnSync(editor, [tmpFile], { stdio: "inherit" });

  const msg = fs.readFileSync(tmpFile, "utf-8").trim();
  fs.unlinkSync(tmpFile);

  if (!msg) {
    fs.writeFileSync(swPath, content);
    runGit(["reset"]);
    rl.close();
    console.log("empty commit message, reverted sw.js and unstaged changes");
    process.exit(1);
  }

  console.log(`\ncommit message:\n${msg}\n`);
  const shouldPush = await confirm(rl, "commit and push? [Y/n]: ");
  if (!shouldPush) {
    fs.writeFileSync(swPath, content);
    runGit(["reset"]);
    rl.close();
    console.log("aborted, reverted sw.js and unstaged changes");
    process.exit(1);
  }

  rl.close();

  spawnSync("git", ["commit", "-F", "-"], {
    input: msg,
    stdio: ["pipe", "inherit", "inherit"],
  });
  runGit(["push"]);
}

function printHelp() {
  console.log(`usage: node cli.js [-r | -d]

options:
  -r, --run     start local dev server and open in browser
  -d, --deploy  bump sw cache version, commit, and push
  -h, --help    show this help message
`);
}

function main() {
  const args = process.argv.slice(2);

  if (args.includes("-h") || args.includes("--help")) {
    printHelp();
    process.exit(0);
  }

  const flags = args.filter(
    (a) => a === "-r" || a === "--run" || a === "-d" || a === "--deploy",
  );
  const wantsRun = flags.some((a) => a === "-r" || a === "--run");
  const wantsDeploy = flags.some((a) => a === "-d" || a === "--deploy");

  if (wantsRun && wantsDeploy) {
    console.error("error: use only one of -r or -d");
    process.exit(1);
  }

  if (!wantsRun && !wantsDeploy) {
    printHelp();
    process.exit(0);
  }

  if (wantsRun) {
    cmdRun();
  } else if (wantsDeploy) {
    cmdDeploy();
  }
}

main();
