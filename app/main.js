const readline = require("readline");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const builtins = ["echo", "exit", "type", "pwd", "cd"];

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
    const args = input.trim().split(/\s+/);
    const cmd = args[0];
    const cmdArgs = args.slice(1);

    if (cmd === "exit" && args[1] === "0") {
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
        // Replace ~ with HOME
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
        });

        child.on("close", () => {
          prompt();
        });

        return; // Don't prompt again until child exits
      } else {
        console.log(`${cmd}: command not found`);
      }
    }

    prompt();
  });
};

prompt();