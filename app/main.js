const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const readline = require("readline");
const { OutputHandler } = require("./OutputHandler");
const { InputHandler } = require("./InputHandler");
const { CommandRegistry } = require("./CommandRegistry");
const { ExitCommand } = require("./ExitCommand");
const { EchoCommand } = require("./EchoCommand");
const { TypeCommand } = require("./TypeCommand");
const { PwdCommand } = require("./PwdCommand");
const { CdCommand } = require("./CdCommand");
class Shell {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    this.outputHandler = new OutputHandler();
    this.inputHandler = new InputHandler(this.rl);
    this.commandRegistry = new CommandRegistry();
    
    // Register builtin commands
    this.commandRegistry.registerBuiltin('exit', new ExitCommand(this.rl));
    this.commandRegistry.registerBuiltin('echo', new EchoCommand(this.outputHandler));
    this.commandRegistry.registerBuiltin('pwd', new PwdCommand(this.outputHandler));
    this.commandRegistry.registerBuiltin('cd', new CdCommand(this.outputHandler));
    this.commandRegistry.registerBuiltin('type', new TypeCommand(this.commandRegistry, this.outputHandler));
  }

  getCommandNameAndArgs(input) {
    const args = input.match(/(?:[^\s'"]+|'[^']*'|"[^"]*")+/g) || [];
    const commandName = args.shift().replace(/['"]/g, '');
    const cleanedArgs = args.map(arg => arg.replace(/['"]/g, ''));
    return { commandName, args: cleanedArgs };
  }
  
  async parseCommand(input) {
    const { commandName, args } = this.getCommandNameAndArgs(input);

    // Check if it's a builtin command
    const command = this.commandRegistry.getCommand(commandName);
    if (command) {
      return { command, args };
    }
    
    // Check if it's an external command
    const commandType = this.commandRegistry.getCommandType(commandName);
    if (commandType === CommandRegistry.COMMAND_TYPE.EXTERNAL) {
      const externalCommand = this.commandRegistry.createExternalCommand(commandName, this.outputHandler);
      return { command: externalCommand, args };
    }
    
    // Command not found
    this.outputHandler.write(`${commandName}: command not found`);
    return { command: null, args };
  }
  
  async start() {
    let shouldContinue = true;
    
    while (shouldContinue) {
      const input = await this.inputHandler.getInput("$ ");
      
      if (input.trim() === '') {
        continue;
      }
      
      const { command, args } = await this.parseCommand(input);
      
      if (command) {
        const result = await command.execute(args);
        shouldContinue = result.shouldContinue;
      }
    }
  }
}

// Initialize and start the shell
const shell = new Shell();
shell.start();

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