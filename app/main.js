const { exit } = require("process");
const readline = require("readline");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { execFileSync } = require("child_process");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const builtin = ["cd", "echo", "exit", "pwd", "type", "cat", "exe"];

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
      if (char === "\\") {
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
  if (!inPath || inPath === "~") {
    inPath = os.homedir();
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

function handleExit(args) {
  // Supports exit or exit 0, any other exit code can be extended here
  if (args.length === 0 || args[0] === "0") {
    exit(0);
  } else {
    exit(parseInt(args[0], 10) || 0);
  }
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

    const paths = process.env.PATH.split(path.delimiter);

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

function handleCat(files) {
  let data = "";
  for (const file of files) {
    try {
      if (fs.existsSync(file)) {
        data += fs.readFileSync(file, "utf-8");
      } else {
        data += `cat: ${file}: No such file or directory\n`;
      }
    } catch (err) {
      data += `cat: error reading file ${file}: ${err.message}\n`;
    }
  }
  return data;
}

function handleExe(files) {
  // files is expected to be an array with one element - file path
  if (files.length === 0) return "exe: missing file operand";
  const file = files[0];
  try {
    if (fs.existsSync(file)) {
      return fs.readFileSync(file, "utf-8");
    } else {
      return `exe: ${file}: No such file or directory`;
    }
  } catch (err) {
    return `exe: error reading file ${file}: ${err.message}`;
  }
}

function executeExternalCommand(command, args) {
  const paths = process.env.PATH.split(path.delimiter);
  for (const p of paths) {
    const fullPath = path.join(p, command);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      try {
        execFileSync(fullPath, args, { stdio: "inherit" });
        return true;
      } catch (e) {
        console.error(e.message);
        return true;
      }
    }
  }
  return false;
}

function prompt() {
  rl.question("$ ", (answer) => {
    if (!answer.trim()) {
      prompt();
      return;
    }

    const args = parseArgs(answer);
    const command = args[0];
    const cmdArgs = args.slice(1);
    let output = null;

    switch (command) {
      case "exit":
        handleExit(cmdArgs);
        break;

      case "cd":
        output = handleCd(cmdArgs[0]);
        break;

      case "echo":
        output = handleEcho(cmdArgs);
        break;

      case "pwd":
        output = handlePwd();
        break;

      case "type":
        output = handleType(cmdArgs[0]);
        break;

      case "cat":
        if (cmdArgs.length === 0) {
          output = "cat: missing file operand";
        } else {
          output = handleCat(cmdArgs);
        }
        break;

      case "exe":
        if (cmdArgs.length === 0) {
          output = "exe: missing file operand";
        } else {
          output = handleExe(cmdArgs);
        }
        break;

      default:
        const executed = executeExternalCommand(command, cmdArgs);
        if (!executed) {
          output = `${command}: command not found`;
        }
        break;
    }

    if (output !== null) {
      console.log(output);
    }
    prompt();
  });
}

prompt();
