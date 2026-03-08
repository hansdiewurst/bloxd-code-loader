# Bloxd Code Loader
This code loader not only allows you to split your bloxd worldcode into multiple files, but also to share variables between those files with ESM-like syntax. The code is automatically minified and written to a schematic of codeblocks, to directly paste into your world for quicker debugging.

## Setup
This project requires nodejs and npm. You can download them both [here](https://nodejs.org/en/download).  
Open this project in a code editor like [VSCode](https://code.visualstudio.com/Download). Open the integrated terminal and run `npm install`.
If using npm throws an error, you may need to adjust your ExecutionPolicy in PowerShell.

## Usage
Run `npm run build` in the integrated terminal. Then load the schematic at [out/codeblocks.bloxdschem](./out/codeblocks.bloxdschem) into your bloxd world and paste it at [0, -500, 0], or whatever coordinates you specified at the top of [build.js](./build.js). If necessary, paste the [worldcode](./out/worldcode.js) too. Note that pasting the schem won't update the worldcode - you will need to make some change to it inside of bloxd (like adding an empty comment at the end), for the code to reload.  
Then you can modify the files in the src directory, and follow the previous steps again to test your code. You can also customize the other values at the top of [build.js](./build.js).

## Limitations
Defining callbacks to global wont work with this, use `CBs.[callbackName] = () => { }`.  
Also, while the syntax is similar to that of  ES Modules, there are a few differences:  
- Imported variables *are* writeable, unlike ESM ones. (Except when renaming imports)
- You cannot `export` multiple variables of the same name, even in seperate files
- Default exports (`export default`) are not supported
- deff more but idk