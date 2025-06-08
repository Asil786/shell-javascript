const readline = require("readline");
const { exit } = require("process");
const path = require("path");
const fs = require("fs");
const { execFileSync } = require("child_process");
const os = require("os");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const builtin = ["cd", "echo", "exit", "pwd", "type"];

function parseArgs(input) {
  const args = [];
  let current = "";
  let inSingle = false;
  let inDouble = false;
  let i = 0;

  while (i < input.length) {
    const char = input[i];

    if (inSingle) {
      if (char === "'") {
        inSingle = false;
      } else {
        current += char;
      }
    } else if (inDouble) {
      if (char === "\\") {
        const next = input[i + 1];
        if (next === '"' || next === "\\" || next === "$" || next === "`" || next === "'") {
          current += next;
          i++;
        } else {
          current += char;
        }
      } else if (char === '"') {
        inDouble = false;
      } else {
        current += char;
      }
    } else {
      if (char === "'") {
        inSingle = true;
      } else if (char === '"') {
        inDouble = true;
      } else if (char === " ") {
        if (current.length > 0) {
          args.push(current);
          current = "";
        }
      } else {
        current += char;
      }
    }
    i++;
  }
  if (current.length > 0) {
    args.push(current);
  }
  return args;
}


function unescapeQuotesAndBackslashes(str) {
  // Replace escaped quotes and backslashes with actual chars
  return str.replace(/\\(["'\\])/g, "$1");
}

function findExecutable(command) {
  // Strip outer quotes if present
  if (
    (command.startsWith('"') && command.endsWith('"')) ||
    (command.startsWith("'") && command.endsWith("'"))
  ) {
    command = command.slice(1, -1);
    command = unescapeQuotesAndBackslashes(command);
  } else {
    // Also unescape if no outer quotes? Depends on input, safer not to
  }

  if (command.includes("/") || command.includes("\\")) {
    if (fs.existsSync(command) && fs.statSync(command).isFile()) {
      return command;
    }
    return null;
  }

  const paths = process.env.PATH.split(path.delimiter);
  for (const p of paths) {
    const candidate = path.join(p, command);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}

// Builtin handlers
function handleCd(dir) {
  if (!dir || dir === "~") {
    dir = os.homedir();
  }
  const newPath = path.resolve(process.cwd(), dir);
  if (fs.existsSync(newPath) && fs.statSync(newPath).isDirectory()) {
    process.chdir(newPath);
  } else {
    console.log(`cd: ${dir}: No such file or directory`);
  }
}

function handleEcho(args) {
  console.log(args.join(" "));
}

function handlePwd() {
  console.log(process.cwd());
}

function handleType(cmd) {
  if (builtin.includes(cmd)) {
    console.log(`${cmd} is a shell builtin`);
    return;
  }
  const exe = findExecutable(cmd);
  if (exe) {
    console.log(`${cmd} is ${exe}`);
  } else {
    console.log(`${cmd}: not found`);
  }
}

function handleExit(args) {
  if (args[1] === "0") {
    exit(0);
  } else {
    exit(1);
  }
}

function prompt() {
  rl.question("$ ", (input) => {
    if (!input.trim()) {
      return prompt();
    }
    const args = parseArgs(input);
    const cmd = args[0];

    if (cmd === "exit") {
      handleExit(args);
    } else if (cmd === "cd") {
      handleCd(args[1]);
      prompt();
    } else if (cmd === "echo") {
      handleEcho(args.slice(1));
      prompt();
    } else if (cmd === "pwd") {
      handlePwd();
      prompt();
    } else if (cmd === "type") {
      handleType(args[1]);
      prompt();
    } else {
      // Execute external command
      const exePath = findExecutable(cmd);
      if (!exePath) {
        console.log(`${cmd}: command not found`);
        prompt();
        return;
      }
      try {
        // execFileSync requires args without the command itself
        const out = execFileSync(exePath, args.slice(1), { encoding: "utf-8", stdio: "pipe" });
        process.stdout.write(out);
      } catch (err) {
        if (err.stdout) process.stdout.write(err.stdout);
        if (err.stderr) process.stderr.write(err.stderr);
        else console.error(err.message);
      }
      prompt();
    }
  });
}

prompt();
