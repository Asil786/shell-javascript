const readline = require("readline");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const builtins = ["echo", "exit", "type", "pwd", "cd"];

function parseArgs(input) {
  const args = [];
  let current = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let i = 0;

  while (i < input.length) {
    const char = input[i];

    if (inSingleQuote) {
      if (char === "'") {
        inSingleQuote = false;
      } else {
        current += char;
      }
      i++;
      continue;
    }

    if (inDoubleQuote) {
      if (char === '"') {
        inDoubleQuote = false;
        i++;
        continue;
      }
      if (char === '\\') {
        const nextChar = input[i + 1];
        if (nextChar === '\\' || nextChar === '"' || nextChar === '$' || nextChar === '\n') {
          current += nextChar;
          i += 2;
        } else {
          current += char;
          i++;
        }
        continue;
      }
      current += char;
      i++;
      continue;
    }

    if (char === "'") {
      inSingleQuote = true;
      i++;
    } else if (char === '"') {
      inDoubleQuote = true;
      i++;
    } else if (char === ' ') {
      if (current !== "") {
        args.push(current);
        current = "";
      }
      i++;
      while (input[i] === ' ') i++;
    } else {
      current += char;
      i++;
    }
  }

  if (current !== "") {
    args.push(current);
  }

  return args;
}

function isExecutable(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function findExecutable(command) {
  const pathDirs = process.env.PATH ? process.env.PATH.split(":") : [];
  for (const dir of pathDirs) {
    const fullPath = path.join(dir, command);
    if (fs.existsSync(fullPath) && isExecutable(fullPath)) {
      return fullPath;
    }
  }
  return null;
}

const prompt = () => {
  rl.question("$ ", (input) => {
    if (!input.trim()) {
      prompt();
      return;
    }

    const args = parseArgs(input.trim());
    const cmd = args[0];
    const cmdArgs = args.slice(1);

    if (cmd === "exit" && cmdArgs[0] === "0") {
      process.exit(0);
    } else if (cmd === "echo") {
      console.log(cmdArgs.join(" "));
    } else if (cmd === "pwd") {
      console.log(process.cwd());
    } else if (cmd === "cd") {
      const targetPath = cmdArgs[0];

      if (!targetPath) {
        console.log("cd: missing operand");
      } else {
        let resolvedPath = targetPath;
        if (targetPath === "~") {
          resolvedPath = process.env.HOME;
        }

        try {
          process.chdir(resolvedPath);
        } catch (err) {
          console.log(`cd: ${targetPath}: No such file or directory`);
        }
      }
    } else if (cmd === "type") {
      const target = cmdArgs[0];
      if (!target) {
        console.log("type: missing operand");
      } else if (builtins.includes(target)) {
        console.log(`${target} is a shell builtin`);
      } else {
        const exePath = findExecutable(target);
        if (exePath) {
          console.log(`${target} is ${exePath}`);
        } else {
          console.log(`${target}: not found`);
        }
      }
    } else if (builtins.includes(cmd)) {
      console.log(`${cmd}: shell builtin but invalid usage`);
    } else {
      const exePath = findExecutable(cmd);
      if (exePath) {
        const child = spawn(cmd, cmdArgs, { stdio: "inherit" });

        child.on("error", (err) => {
          console.error(`Failed to start: ${err}`);
          prompt();
        });

        child.on("close", () => {
          prompt();
        });

        return;
      } else {
        console.log(`${cmd}: command not found`);
      }
    }

    prompt();
  });
};

prompt();