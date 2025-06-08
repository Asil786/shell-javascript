const { prependListener } = require("process");
const readline = require("readline");
const { exit } = require("process")
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Uncomment this block to pass the first stage
function prompt (){
  rl.question("$ ", (answer) => {
   
    if(answer==="exit 0"){
      exit(0);
    }else if(answer.substring(0,4) =="echo" ){
      console.log(answer.substring(5,answer.length));
    }else{
      console.log(`${answer}: command not found`)
    }
    prompt()
  });
}
prompt();