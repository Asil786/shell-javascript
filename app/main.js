const readline = require("readline/promises");

const path = require("path");

const fs = require("fs");

const { execFileSync } = require("node:child_process");

const rl = readline.createInterface({
  input: process.stdin,

  output: process.stdout,
});

function handleExit() {
  rl.close();
}

function isFile(answer) {
  let isFile = false;

  const fileName = answer.split(" ")[0];

  const paths = process.env.PATH.split(":");

  for (const pathEnv of paths) {
    let destPath = path.join(pathEnv, fileName);

    if (fs.existsSync(destPath) && fs.statSync(destPath).isFile()) {
      isFile = true;
    }
  }

  return isFile;
}

function handleInvalid(answer) {
  rl.write(`${answer}: command not found\n`);
}

function handleEcho(answer) {
  // Skip the "echo" command itself
  let result = [];
  let currentArg = "";
  let inSingleQuotes = false;
  let inDoubleQuotes = false;
  let skipCommand = true;

  // Process each character in the input
  for (let i = 0; i < answer.length; i++) {
    const char = answer[i];

    // Skip the "echo" command at the beginning
    if (skipCommand && (char === " " || char === "\t")) {
      skipCommand = false;
      continue;
    }
    if (skipCommand) {
      continue;
    }

    if (char === "'" && !inDoubleQuotes) {
      // Toggle single quote state
      inSingleQuotes = !inSingleQuotes;
    } else if (char === '"' && !inSingleQuotes) {
      // Toggle double quote state
      inDoubleQuotes = !inDoubleQuotes;
    } else if (
      (char === " " || char === "\t") &&
      !inSingleQuotes &&
      !inDoubleQuotes
    ) {
      // Space outside quotes - end of an argument
      if (currentArg) {
        result.push(currentArg);
        currentArg = "";
      }
    } else if (char === "\\" && !inSingleQuotes) {
      // Escape character outside single quotes
      if (i + 1 < answer.length) {
        // Add the next character literally
        currentArg += answer[++i];
      }
    } else {
      // Regular character, add to current argument
      currentArg += char;
    }
  }

  // Add any remaining argument
  if (currentArg) {
    result.push(currentArg);
  }

  // Join the processed arguments with spaces and output
  rl.write(result.join(" ") + "\n");
}

function handleType(answer) {
  const command = answer.split(" ")[1];

  const commands = new Set(["exit", "echo", "type", "pwd"]);

  if (commands.has(command.toLowerCase())) {
    rl.write(`${command} is a shell builtin\n`);
  } else {
    const paths = process.env.PATH.split(":");

    for (const pathEnv of paths) {
      let destPath = path.join(pathEnv, command);

      if (fs.existsSync(destPath) && fs.statSync(destPath).isFile()) {
        rl.write(`${command} is ${destPath}\n`);

        return;
      }
    }

    rl.write(`${command}: not found\n`);
  }
}

function handleFile(answer) {
  const fileName = answer.split(" ")[0];

  let args = answer.split(" ").slice(1);

  if (args[0].startsWith("'")) {
    //cat checking files inside single quote

    args = answer

      .split("'")

      .slice(1)

      .filter((a) => a != "" && a != " ");
  }

  if (args[0].startsWith('"')) {
    //cat checking files inside double quote

    args = answer

      .split('"')

      .slice(1)

      .filter((a) => a != "" && a != " ");
  }

  const paths = process.env.PATH.split(":");

  for (const pathEnv of paths) {
    let destPath = path.join(pathEnv, fileName);

    if (fs.existsSync(destPath) && fs.statSync(destPath).isFile()) {
      try {
        return execFileSync(fileName, args, {
          encoding: "utf-8",

          stdio: "inherit",
        });
      } catch {
        rl.write(`${fileName}: ${destPath}: No such file or directory\n`);
      }
    }
  }
}

function handlePwd() {
  rl.write(process.cwd());

  rl.write("\n");
}

function handleCd(answer) {
  const restCommands = answer.split(" ");

  restCommands.shift();

  if (restCommands[0] == "~") {
    process.chdir(process.env.HOME);
  } else if (
    fs.existsSync(restCommands[0]) &&
    fs.statSync(restCommands[0]).isDirectory()
  ) {
    process.chdir(restCommands[0]);
  } else {
    console.log(`cd: ${restCommands[0]}: No such file or directory`);
  }
}

async function question() {
  const answer = await rl.question("$ ");

  const command = answer.split(" ")[0];

  const commands = new Set(["pwd", "type", "exit", "echo", "cd"]);

  const isFayl = isFile(answer);

  if (answer == "") {
    question();

    return;
  }

  if (commands.has(command)) {
    switch (command) {
      case "exit":
        handleExit();

        break;

      case "echo":
        handleEcho(answer);

        question();

        break;

      case "type":
        handleType(answer);

        question();

        break;

      case "pwd":
        handlePwd();

        question();

        break;

      case "cd":
        handleCd(answer);

        question();

        break;
    }
  } else if (isFayl) {
    handleFile(answer);

    question();
  } else {
    handleInvalid(answer);

    question();
  }
}

question();