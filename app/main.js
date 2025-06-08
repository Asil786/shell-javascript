const readline = require("readline");
const { exit } = require("process");
const path = require("path");
const fs = require("fs");
const { execFileSync } = require("child_process");

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
    const paths = process.env.PATH.split(path.delimiter);

    for (const p of paths) {
      const candidatePath = path.join(p, command);
      if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
        exists = true;
        finalPath = candidatePath;
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

function findExecutable(command) {
  // Remove surrounding quotes if any
  const cleanCommand = command.replace(/^['"]|['"]$/g, "");
  // If command is an absolute or relative path, check directly:
  if (cleanCommand.includes("/") || cleanCommand.includes("\\")) {
    if (fs.existsSync(cleanCommand) && fs.statSync(cleanCommand).isFile()) {
      return cleanCommand;
    }
    return null;
  }

  // Otherwise, search in PATH folders
  const paths = process.env.PATH.split(path.delimiter);
  for (const p of paths) {
    const candidate = path.join(p, cleanCommand);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}

function executeCommand(command, args) {
  const execPath = findExecutable(command);
  if (!execPath) {
    console.log(`${command}: command not found`);
    return;
  }
  try {
    const output = execFileSync(execPath, args, { stdio: "inherit" });
  } catch (error) {
    if (error.stdout) process.stdout.write(error.stdout);
    if (error.stderr) process.stderr.write(error.stderr);
  }
}

function prompt() {
  rl.question("$ ", (input) => {
    const args = parseArgs(input);
    if (args.length === 0) return prompt();

    const command = args[0];
    const commandArgs = args.slice(1);

    if (command === "exit" && commandArgs[0] === "0") {
      handleExit();
    } else if (command === "cd") {
      const err = handleCd(commandArgs[0]);
      if (err) console.log(err);
      prompt();
    } else if (command === "echo") {
      console.log(handleEcho(commandArgs));
      prompt();
    } else if (command === "pwd") {
      console.log(handlePwd());
      prompt();
    } else if (command === "type") {
      console.log(handleType(commandArgs[0]));
      prompt();
    } else {
      executeCommand(command, commandArgs);
      prompt();
    }
  });
}

prompt();
