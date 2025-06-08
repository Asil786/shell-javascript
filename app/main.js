const readline = require("readline");

const INVALID_ARGS = -2;
const NOT_FOUND = -1;
const EXIT = 0;
const SUCCESS = 1;

function exit(args) {
  // Always exit with 0
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
  } else {
    console.log(`${command}: not found`);
  }
  return SUCCESS;
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
      console.log(`${cmd}: command not found`);
    }

    prompt();
  });
};

prompt();