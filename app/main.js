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
        if (next === '"' || next === "\\" || next === "$" || next === "`") {
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

function findExecutable(command) {
  // Preserve the exact command name including any quotes
  let unquotedCommand = command;
  
  // Remove only outer quotes, preserve inner quotes
  if ((command.startsWith('"') && command.endsWith('"')) {
    unquotedCommand = command.slice(1, -1);
    // Unescape escaped double quotes inside
    unquotedCommand = unquotedCommand.replace(/\\"/g, '"');
  } else if ((command.startsWith("'") && command.endsWith("'"))) {
    unquotedCommand = command.slice(1, -1);
    // Single quotes preserve everything literally
  }

  // If command contains path separators, treat as direct path
  if (unquotedCommand.includes("/") || unquotedCommand.includes("\\")) {
    const resolvedPath = path.resolve(process.cwd(), unquotedCommand);
    if (fs.existsSync(resolvedPath)) {
      return resolvedPath;
    }
    return null;
  }

  // Search in PATH
  const paths = process.env.PATH.split(path.delimiter);
  for (const p of paths) {
    const candidate = path.join(p, unquotedCommand);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

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
      // Find the executable path
      const exePath = findExecutable(cmd);
      if (!exePath) {
        console.log(`${cmd}: command not found`);
        prompt();
        return;
      }

      try {
        // Execute the command directly with arguments
        const out = execFileSync(exePath, args.slice(1), {
          encoding: 'utf-8',
          stdio: 'pipe'
        });
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