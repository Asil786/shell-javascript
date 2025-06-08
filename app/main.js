const readline = require("readline");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const EXIT = 0;
const SUCCESS = 1;
const NOT_FOUND = -1;

function exit(args) {
  process.exit(0);
}

function echo(args) {
  console.log(args);
  return SUCCESS;
}

function type(args) {
  const command = args.trim();
  if (BUILTIN_COMMANDS.hasOwnProperty(command)) {
    console.log(`${command} is a shell builtin`);
    return SUCCESS;
  }

  const pathDirs = process.env.PATH ? process.env.PATH.split(":") : [];
  for (const dir of pathDirs) {
    const filePath = path.join(dir, command);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      console.log(`${command} is ${filePath}`);
      return SUCCESS;
    }
  }

  console.log(`${command}: not found`);
  return NOT_FOUND;
}

const BUILTIN_COMMANDS = Object.freeze({
  exit: exit,
  echo: echo,
  type: type,
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const prompt = () => {
  rl.question("$ ", (input) => {
    const [cmd, ...argsArr] = input.trim().split(" ");
    const args = argsArr.join(" ");

    if (BUILTIN_COMMANDS.hasOwnProperty(cmd)) {
      BUILTIN_COMMANDS[cmd](args);
    } else {
      const result = spawnSync(cmd, argsArr, {
        encoding: "utf-8",
        stdio: "inherit",
      });

      if (result.error && result.error.code === 'ENOENT') {
        console.log(`${cmd}: command not found`);
      }
    }

    prompt();
  });
};

prompt();