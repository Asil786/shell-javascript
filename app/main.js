const { exit } = require("process");
const readline = require("readline");
const path = require("path");
const fs = require("fs");
const { execFileSync } = require("child_process");
const os =require("os");
//const { console } = require("inspector");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function cat(files){
  var data = "";
  let filesLen = 0;
  while(filesLen < files.length ){  
    try{
      if(fs.existsSync(files[filesLen])){
        data += (fs.readFileSync(files[filesLen], "utf-8"));
      }else{
        data += "File does not exists.";
      }
    }catch(err){
      data += `Error reading file ${files[filesLen]}:`, err;
      return;
    }
    filesLen += 1;
  }
  process.stdout.write(data);
  prompt();  
}




function prompt(){
  rl.question("$ ", (answer) => {
    const inLst  = ['echo','exit','type','pwd'];
    const paths = process.env.PATH.split(":");
    const [commandType, text] = answer.split(" ");
    const args = answer.split(" ").slice(1);
    const targetPath = paths.filter((path) => fs.existsSync(`${path}/${text}`))
    let found = false;
    if (answer == "exit 0"){
      exit(0);
    } else if(answer == "pwd"){
      console.log(process.cwd());
      prompt();
    } else if(commandType == "cd"){
      if (text.startsWith(".")){
        const filePath = path.join(process.cwd(), text);
        try {
          process.chdir(filePath);
        } catch {
          console.log(`cd: ${filePath}: No such file or directory`);
        }
        prompt();                
      }else if(text == "~"){
        process.chdir(os.homedir());
        prompt();
      }else{
        if (fs.existsSync(text) && fs.statSync(text).isDirectory()) {
          process.chdir(text);
        } else {
          console.log(`cd: ${text}: No such file or directory`);
        }
        prompt();
      }
    } else if(commandType === "cat"){
      const catText = answer.split("cat ");
      let files = []
      if(catText[1].startsWith("'")){
        files=answer.split("'").slice(1).filter(item => item !== '' && item !== ' '); 
      }else{
        files=answer.split('"').slice(1).filter(item => item !== "" && item !== " "); 
      }
      cat(files);    
    } else if(commandType === "echo"){
      // const escSqs = ["\", "$", '"', "\n"];
      const echoText = answer.split("echo ");      
      if (echoText[1].startsWith("'")) {
        const newText = echoText[1].replace(/[']/g, "");
        console.log(newText);
      } else if(echoText[1].startsWith('"')) {  
        const echoText5 = echoText[1];
        const parts = echoText5.split(/(?<=")\s+(?=")/g).join(" ");
        const echoText2 = parts;
        let result = '';
        let i = 1;
        while(i < echoText2.length - 1){   
          let char =  echoText2[i];
          if(char === '\\'){
            const nextChar = echoText2[i+1];
            if (nextChar === '\\' || nextChar === '"' || nextChar === '$' || nextChar === '\n'){
              result += nextChar;
              i += 2;
            }else{
              result += '\\';
              i += 1; 
            }
          }else if(char === '"'){
            i += 1; 
          } else {
            result += char;
            i++;  
          }
        }
        console.log(result);
      } else {
        const newText1 = echoText[1].split(" ").filter(t => t !== "").join(" ");
        const newText2 =newText1.split("\\").join("");
        console.log(newText2);
      }
      prompt();
    } else if(commandType.slice(1,) == "exe"){
      const exeLst = answer.split(/['"]/g);
      const files = exeLst[exeLst.length - 1].trim();
      // console.log(files);
      try{
        if(fs.existsSync(files)){
          data = (fs.readFileSync(files, "utf-8"));
        }else{
          data = "File does not exists.";
        }
      }catch(err){
        data = `Error reading file ${files[filesLen]}:`, err;
        return;
      }
      process.stdout.write(data);
      prompt();
    } else if(answer.startsWith('type ')){ 
      if(inLst.includes(text)){
        console.log(`${text} is a shell builtin`);
      } else{
        for(const pathEnv of paths){
          let destPath = path.join(pathEnv, text);
          if(fs.existsSync(destPath) && fs.statSync(destPath).isFile() && !found){
            console.log(`${text} is ${destPath}`);
            found = true;
          }
        }
        if(!found){
          console.log(`${text}: not found`);
        } 
      }
      prompt();
    } else if(!targetPath.length) {
      found = false;
      for(const pathEnv of paths){
        let destPath = path.join(pathEnv, commandType);
        if(fs.existsSync(destPath) && fs.statSync(destPath).isFile() && !found){
          found = true;
          execFileSync(commandType, args, { encoding: 'utf-8', stdio: 'inherit'});
        }
      } 
      if(!found){
        console.log(`${answer}: command not found`);
        prompt();
      }
      prompt();
    }
  });
}
prompt();