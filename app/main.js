const readline = require("readline");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "$ ",
});

const builtins = new Set(["echo", "exit", "type", "pwd", "cd"]);

function parseCommandLine(input) {
  const args = [];
  let current = "";
  let i = 0;
  let state = "normal";
  while (i < input.length) {
    const c = input[i];
    if (state === "normal") {
      if (c === "'") {
        state = "single_quote";
      } else if (c === '"') {
        state = "double_quote";
      } else if (c === "\\") {
        i++;
        if (i < input.length) {
          current += input[i];
        }
      } else if (/\s/.test(c)) {
        if (current.length > 0) {
          args.push(current);
          current = "";
        }
      } else {
        current += c;
      }
    } else if (state === "single_quote") {
      if (c === "'") {
        state = "normal";
      } else {
        current += c;
      }
    } else if (state === "double_quote") {
      if (c === '"') {
        state = "normal";
      } else if (c === "\\") {
        i++;
        if (i < input.length) {
          const next = input[i];
          if (next === "\\" || next === "$" || next === '"' || next === "\n") {
            current += next;
          } else {
            current += "\\" + next;
          }
        }
      } else {
        current += c;
      }
    }
    i++;
  }
  if (current.length > 0) {
    args.push(current);
  }
  return args;
}

function findExecutable(cmd) {
  if (cmd.includes("/")) {
    try {
      if (
        fs.existsSync(cmd) &&
        fs.statSync(cmd).isFile() &&
        fs.accessSync(cmd, fs.constants.X_OK) === undefined
      ) {
        return path.resolve(cmd);
      }
    } catch {}
    return null;
  }
  const pathEnv = process.env.PATH || "";
  const dirs = pathEnv.split(":");
  for (const dir of dirs) {
    const fullPath = path.join(dir, cmd);
    try {
      if (
        fs.existsSync(fullPath) &&
        fs.statSync(fullPath).isFile() &&
        (() => {
          try {
            fs.accessSync(fullPath, fs.constants.X_OK);
            return true;
          } catch {
            return false;
          }
        })()
      ) {
        return fullPath;
      }
    } catch {}
  }
  return null;
}

function handleTypeCommand(cmd) {
  if (builtins.has(cmd)) {
    console.log(`${cmd} is a shell builtin`);
  } else {
    const exePath = findExecutable(cmd);
    if (exePath) {
      console.log(`${cmd} is ${exePath}`);
    } else {
      console.log(`${cmd}: not found`);
    }
  }
}

function changeDirectory(target) {
  let dir = target;
  if (dir === "~") {
    dir = process.env.HOME || "";
  }
  try {
    process.chdir(dir);
  } catch {
    console.log(`cd: ${target}: No such file or directory`);
  }
}

function mainLoop() {
  rl.prompt();
  rl.on("line", (line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      rl.prompt();
      return;
    }
    const args = parseCommandLine(trimmed);
    const cmd = args[0];
    if (cmd === "exit") {
      process.exit(0);
    } else if (cmd === "echo") {
      console.log(args.slice(1).join(" "));
      rl.prompt();
    } else if (cmd === "type") {
      if (args.length < 2) {
        rl.prompt();
        return;
      }
      handleTypeCommand(args[1]);
      rl.prompt();
    } else if (cmd === "pwd") {
      console.log(process.cwd());
      rl.prompt();
    } else if (cmd === "cd") {
      if (args.length < 2) {
        changeDirectory("~");
      } else {
        changeDirectory(args[1]);
      }
      rl.prompt();
    } else {
      const exePath = findExecutable(cmd);
      if (exePath) {
        const child = spawn(exePath, args.slice(1), {
          stdio: "inherit",
          argv0: path.basename(exePath),
        });
        child.on("exit", () => {
          rl.prompt();
        });
        child.on("error", () => {
          console.log(`${cmd}: command not found`);
          rl.prompt();
        });
      } else {
        console.log(`${cmd}: command not found`);
        rl.prompt();
      }
    }
  });
}

mainLoop();