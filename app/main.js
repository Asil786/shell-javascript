const readline = require("node:readline");
const fs = require("node:fs");
const { execSync } = require("node:child_process");

/***
 * Returns the file path of a command, if applicable. Otherwise false.
 */
function getAbsPath(cmd) {
	const pathDirs = process.env.PATH.split(":");
	for (dir of pathDirs) {
		if (fs.existsSync(`${dir}/${cmd}`)) {
			return `${dir}/${cmd}`;
		}
	}
	return false;
}

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

const commands = {
	exit: (code) => {
		rl.close();
		process.exit(code ? Number.parseInt(code) : 0);
	},
	echo: (...rest) => {
		console.log(...rest);
	},
	type: (command) => {
		if (commands[command]) {
			console.log(`${command} is a shell builtin`);
			return;
		}

		// check path
		const pathDirs = process.env.PATH.split(":");
		for (dir of pathDirs) {
			if (fs.existsSync(`${dir}/${command}`)) {
				console.log(`${command} is ${dir}/${command}`);
				return;
			}
		}

		console.log(`${command}: not found`);
		return;
	},
	pwd: () => console.log(process.cwd()),
};

function repl() {
	rl.question("$ ", (answer) => {
		const args = answer.split(" ");
		const command = args[0];
		if (commands[command]) {
			commands[command](...args.slice(1));
		} else if (getAbsPath(command)) {
			const output = execSync(`${command} ${args.slice(1).join(" ")}`);
			process.stdout.write(output);
		} else {
			console.log(`${answer}: command not found`);
		}
		repl();
	});
}

repl();