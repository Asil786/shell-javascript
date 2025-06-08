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