const readline = require("readline");
const { exit } = require("process");
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const builtin = ["cd", "echo", "exit", "pwd", "type"];

// Utility to parse shell-like arguments (handles quotes and escapes)
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
      if (char === '\\') {
        const next = input[i + 1];
        if (next === '"' || next === '\\' || next === '$' || next === '`') {
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

function handleCd(inPath) {
  if (inPath === "~") {
    inPath = process.env.HOME || "/home/user";
  }

  const newPath = path.resolve(process.cwd(), inPath);
  if (fs.existsSync(newPath) && fs.statSync(newPath).isDirectory()) {
    process.chdir(newPath);
    return null;
  } else {
    return `cd: ${newPath}: No such file or directory`;
  }
}

function handleEcho(args) {
  return args.join(" ");
}

function handleExit() {
  exit(0);
}

function handlePwd() {
  return process.cwd();
}

function handleType(command) {
  if (builtin.includes(command)) {
    return `${command} is a shell builtin`;
  } else {
    let exists = false;
    let finalPath = null;

    const paths = process.env.PATH.split(":");

    for (const p of paths) {
      const commandPath = path.join(p, command);
      if (fs.existsSync(commandPath) && fs.statSync(commandPath).isFile()) {
        exists = true;
        finalPath = commandPath;
        break;
      }
    }

    if (exists) {
      return `${command} is ${finalPath}`;
    } else {
      return `${command}: not found`;
    }
  }
}

const { execFileSync } = require("child_process");

function handleFile(answer) {
  const rawArgs = parseArgs(answer);
  if (rawArgs.length === 0) return { isFile: false, fileResult: null };

  let rawCommand = rawArgs[0];

  // Remove surrounding quotes for lookup
  const cleanCommand = rawCommand.replace(/^["']|["']$/g, "");

  const paths = process.env.PATH.split(":");

  for (const p of paths) {
    const candidatePath = path.join(p, cleanCommand);
    if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
      try {
        const result = execFileSync(candidatePath, rawArgs.slice(1), {
          stdio: "pipe",
        }).toString().trim();
        return { isFile: true, fileResult: result };
      } catch (e) {
        return { isFile: true, fileResult: e.stderr?.toString() || e.message };
      }
    }
  }

  return { isFile: false, fileResult: null };
}


function prompt() {
  rl.question("$ ", (answer) => {
    const args = parseArgs(answer);
    const command = args[0];

    let result = null;

    if (command === "exit" && args[1] === "0") {
      handleExit();
    } else if (command === "cd") {
      result = handleCd(args[1]);
    } else if (command === "echo") {
      result = handleEcho(args.slice(1));
    } else if (command === "pwd") {
      result = handlePwd();
    } else if (command === "type") {
      result = handleType(args[1]);
    } else {
      const { isFile, fileResult } = handleFile(answer);
      if (!isFile) {
        result = `${command}: command not found`;
      } else {
        result = fileResult;
      }
    }

    if (result !== null) console.log(result);
    prompt();
  });
}

prompt();
