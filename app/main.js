const BUILTIN_COMMANDS = Object.freeze({
  "exit": exit,
  "echo": echo,
  "type": type
});

const INVALID_ARGS = -2;
const NOT_FOUND = -1;
const EXIT = 0;
const SUCCESS = 1;

function exit(args) {
  if (args == 0) {
    return EXIT;
  }
  return EXIT;
}

function echo(args) {
  console.log(args);
  return SUCCESS;
}

function type(args) {
  for(key of Object.keys(BUILTIN_COMMANDS)) {
    if(key == args) {
      console.log(`${args} is a shell builtin`);
      return SUCCESS;
    }
  }

  console.log(`${args}: not found`);
  return SUCCESS;
}

module.exports = {
  BUILTIN_COMMANDS,
  INVALID_ARGS,
  NOT_FOUND,
  EXIT,
  SUCCESS
};
