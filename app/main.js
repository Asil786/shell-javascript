const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const prompt = () => {
  rl.question("$ ", (answer) => {
    console.log(`${answer}: command not found`);
   prompt();
  });
};

// Start the prompt loop
prompt();