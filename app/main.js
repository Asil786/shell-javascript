const readline = require("readline");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "$ ",
});

const CMDS = ["type", "echo", "exit", "pwd"];

rl.prompt();
rl.on("line", (input) => {
  input = input.trim();
  execCmd(input, () => {
    rl.prompt();
  });
});

function execCmd(command, callback) {
  const { cmd, args } = getCmd(command);
  if (cmd === "exit" && args[0] === "0") {
    process.exit(0);
  } else if (cmd === "echo") {
    console.log(args.join(" "));
    callback();
  } else if (cmd === "type") {
    printType(args[0]);
    callback();
  } else if (cmd === "pwd") {
    console.log(process.cwd());
    callback();
  } else if (cmd === "cd") {
    const targetPath = path.resolve(args[0]);
    if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
      process.chdir(targetPath);
    } else {
      console.log(`cd: ${args[0]}: No such file or directory`);
    }
    callback();
  } else {
    const paths = process.env.PATH.split(path.delimiter);
    let found = false;
    for (let p of paths) {
      const fullPath = path.join(p, cmd);
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        found = true;
        const child = spawn(fullPath, args, { stdio: "inherit" });
        child.on("error", (err) => {
          console.error(err);
          callback();
        });
        child.on("exit", (code) => {
          callback();
        });
      }
    }
    if (!found) {
      console.log(`${command}: command not found`);
      callback();
    }
  }
}

function getCmd(answer) {
  let args = answer.split(/\s+/);
  let cmd = args[0];
  args.shift();

  return { cmd, args };
}

function printType(cmdName) {
  let found = false;
  if (CMDS.includes(cmdName)) {
    console.log(`${cmdName} is a shell builtin`);
    found = true;
  } else {
    const paths = process.env.PATH.split(path.delimiter);

    for (let p of paths) {
      const fullPath = path.join(p, cmdName);
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        console.log(`${cmdName} is ${fullPath}`);
        found = true;
      }
    }
  }
  if (!found) {
    console.log(`${cmdName}: not found`);
  }
}