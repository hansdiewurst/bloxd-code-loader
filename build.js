//Replace with the path to your index file
const ENTRY_POINT = "./src/index.js";
//Important: Replace with the the position you're using `//paste` with.
//With this offset, you will need to paste the codeblocks using `//paste 0 -500 0`
const CODE_BLOCK_OFFSET = [0, -500, 0];
//(optional) Replace with your project name (used to name the schematic)
const NAME = "project";
//(optional) Replace with the desired location for the finished schematic
const OUT_PATH = "./out";




// --------- CODE ---------
import fs from "node:fs";
import node_path from "node:path";
import { Buffer } from "node:buffer";

const entryPoint = node_path.resolve(import.meta.dirname, ENTRY_POINT);

const log = (msg, babelNode, path) => {
    if(!babelNode || !path) return console.log(msg);

    const { line, column } = babelNode.loc.start;
    console.log(msg, `(at \x1b[34m${node_path.relative(rootPath, path)} ${line}:${column}\x1b[0m)`);
};
const info = (msg, n, p) => log(`\x1b[33m\x1b[1mInfo: \x1b[0m${msg}`, n, p);
const error = (msg, fatal = false, n, p) => {
    if(fatal) {
        log(`\x1b[31m\x1b[1mError: \x1b[0m${msg} \x1b[31m(fatal)\x1b[0m`, n, p);
        process.exit();
    } else log(`\x1b[31m\x1b[1mError: \x1b[0m${msg}`, n, p);
}


//code processing
import { traverse, parse } from "@babel/core";
import { generate } from "@babel/generator";
import types from "@babel/types";
import * as esbuild from "esbuild";

const rootPath = node_path.dirname(entryPoint);
const moduleCode = {};
const allExports = new Set();
const allCBs = new Set();
const moduleStack = [];
const fileQueue = [ entryPoint ];

function handleFile(filePath) {
    filePath = node_path.resolve(filePath.replace(/(?<!\.js)$/, ".js"));
    moduleStack.push(filePath);

    const dirname = node_path.dirname(filePath);
    if(!fs.existsSync(filePath)) {
        error(`Module at \x1b[34m${filePath}\x1b[0m does not exist.`, true);
    }
    const code = fs.readFileSync(filePath, "utf-8");
    const ast = parse(code);

    traverse(ast, {
        ImportDeclaration(path) {
            const importPath = node_path.resolve(dirname, path.node.source.value.replace(/(?<!\.js)$/, ".js"));
            if(!moduleStack.includes(importPath) && !fileQueue.includes(importPath)) {
                fileQueue.push(importPath);
            }

            const aliases = [];
            for(const specifier of path.node.specifiers) {
                if(specifier.local.name === specifier.imported.name) continue;
                info("Renaming an import will alias it to a `const`, meaning you cannot reassign its value", specifier, filePath);
                aliases.push([specifier.local.name, specifier.imported.name]);
            }

            if(!aliases.length) {
                path.remove();
            } else {
                const declarators = [];
                for(const [ local, global ] of aliases) {
                    //const [local] = globalThis.[global];
                    const declarator = types.variableDeclarator(
                        types.identifier(local),
                        types.memberExpression(
                            types.identifier("globalThis"),
                            types.identifier(global)
                        )
                    );

                    declarators.push(declarator);
                }

                const declaration = types.variableDeclaration("const", declarators);

                path.replaceWith(declaration);
            }
        },
        ExportNamedDeclaration(path) {
            const assignments = [];
            if(path.node.declaration.type === "ClassDeclaration") {
                const declaration = path.node.declaration;
                const expression = types.classExpression(declaration.id, declaration.superClass, declaration.body);
                const assignment = types.assignmentExpression(
                    "=",
                    types.memberExpression(
                        types.identifier("globalThis"),
                        declaration.id
                    ),
                    expression
                );
                assignments.push(assignment);
            } else {
                for(const declaration of path.node.declaration.declarations) {
                    const id = declaration.id.name;
                    if(allExports.has(id)) error(`Variable with name "${id}" exported multiple times. This won't behave correctly, as both exports will reference the same variable`);
                    else allExports.add(id);

                    //globalThis.[exportVarName] = [exportValue];
                    const assignment = types.assignmentExpression(
                        "=",
                        types.memberExpression(
                            types.identifier("globalThis"),
                            declaration.id
                        ),
                        declaration.init
                    );

                    assignments.push(assignment);
                }
            }
            path.replaceWithMultiple(assignments);
        },
        ExportDefaultDeclaration(path) {
            error("Default exports are not supported.", false, path.node, filePath);
            path.remove();
        },
        MemberExpression(path) {
            if(path.node.object.name === "CBs") {
                const callback = path.node.property.name ?? path.node.property.value;

                allCBs.add(callback);
            }
        }
    });

    const modifiedCode = generate(ast).code;
    const minifiedCode = esbuild.transformSync(modifiedCode, { minify: true }).code;

    moduleCode[filePath] = minifiedCode;
}

while(fileQueue.length) {
    handleFile(fileQueue.shift());
}

log("\x1b[33mCode processing complete.\x1b[0m");


//schematic
import avsc from "avsc";

const fullSchema = avsc.Type.forSchema({
    type: "record",
    name: "Schematic",
    fields: [
        { name: 'headers', type: { type: 'fixed', size: 4 }, default: "\u{4}\u{0}\u{0}\u{0}" },
        { name: "name", type: "string" },
        { name: "x", type: "int" },
        { name: "y", type: "int" },
        { name: "z", type: "int" },
        { name: "sizeX", type: "int" },
        { name: "sizeY", type: "int" },
        { name: "sizeZ", type: "int" },
        {
            name: "chunks",
            type: {
                type: "array",
                items: {
                    type: "record",
                    fields: [
                        { name: "x", type: "int" },
                        { name: "y", type: "int" },
                        { name: "z", type: "int" },
                        { name: "blocks", type: "bytes" }
                    ]
                }
            }
        },
		{
			name: "blockdatas",
			type: {
                type: "array",
                items: {
                    type: "record",
                    fields: [
                        { name: "blockX", type: "int" },
                        { name: "blockY", type: "int" },
                        { name: "blockZ", type: "int" },
						{ name: "blockdataStr", type: "string"}
                    ]
                }
            },
            default: []
		},
        { name: "globalX", type: "int", default: 0 },
        { name: "globalY", type: "int", default: 0 },
        { name: "globalZ", type: "int", default: 0 },
        { name: 'wtvthisis', type: { type: 'fixed', size: 2 }, default: "\u{0}\u{0}" },
    ]
});
const write = function(json) {
    const avroJson = {
        name: json.name,
        x: 0,
        y: 0,
        z: 0,
        sizeX: 0,
        sizeY: 0,
        sizeZ: 0,
        chunks: [],
        blockdatas: json.blockdatas,
        filler: 0
    };
    function encodeLEB128(value) {
        const bytes = new Array();
        while((value & -128) != 0) {
            let schemId = value & 127 | 128;
            bytes.push(schemId);
            value >>>= 7;
        }
        bytes.push(value);
        return bytes;
    }

    [
        avroJson.x,
        avroJson.y,
        avroJson.z
    ] = json.pos;
    [
        avroJson.sizeX,
        avroJson.sizeY,
        avroJson.sizeZ,
    ] = json.size;

    //chunk run length encoding + leb128
    for(let chunkI = 0; chunkI < json.chunks.length; chunkI++) {
        const chunk = json.chunks[chunkI];
        const avroChunk = {};
        const RLEArray = [];

        let currId = chunk.blocks[0];
        let currAmt = 1;

        for(let i = 1; i <= chunk.blocks.length; i++) {
            const id = chunk.blocks[i];
            if(id === currId) {
                currAmt++;
            } else {
                RLEArray.push(...encodeLEB128(currAmt));
                RLEArray.push(...encodeLEB128(currId));
                currAmt = 1;
                currId = id;
            }
        }

        [
            avroChunk.x,
            avroChunk.y,
            avroChunk.z
        ] = chunk.pos;
        avroChunk.blocks = Buffer.from(RLEArray);

        avroJson.chunks.push(avroChunk);
    }

    const binary = fullSchema.toBuffer(avroJson);
    return binary;
};

const schemJSON = {
    name: `${NAME}-codeblocks`,
    pos: [0, 0, 0],
    size: [0, 0, 0],
    chunks: [
        {
            pos: [0, 0, 0],
            blocks: new Array(32768).fill(0)
        }
    ],
    blockdatas: []
};
const codeBlockPositions = [];

let blockI = 0;
const idxToPos = idx => {
    const x = Math.floor(idx / (32**2));
    const y = Math.floor(idx / 32) % 32;
    const z = idx % 32;

    return [x, y, z];
};
const writeCode = code => {
    //ensure codeblock cant run
    code = "@" + code;

    const pos = idxToPos(blockI);
    codeBlockPositions.push(pos);

    schemJSON.chunks[0].blocks[blockI] = 1510;
    schemJSON.blockdatas.push({
        blockX: pos[0],
        blockY: pos[1],
        blockZ: pos[2],
        blockdataStr: JSON.stringify({
            persisted: {
                shared: {
                    text: "",
                    uncensoredText: code,
                    textSize: 0
                },
                author: "",
                builder: "",
                builderCanEditCode: false
            }
        })
    });

    schemJSON.size[0] = Math.max(pos[0] + 2, schemJSON.size[0]);
    schemJSON.size[1] = Math.max(pos[1] + 2, schemJSON.size[1]);
    schemJSON.size[2] = Math.max(pos[2] + 1, schemJSON.size[2]);

    blockI++;
};

const initCode = Array.from(allExports).map(name => `globalThis.${name} = undefined;`).join("\n");
writeCode(initCode);

for(let i = moduleStack.length - 1; i >= 0; i--) {
    const code = moduleCode[moduleStack[i]];

    writeCode(code);
}

const binary = write(schemJSON);
const outPath = node_path.resolve(import.meta.dirname, OUT_PATH);
fs.writeFileSync(node_path.resolve(outPath, "codeblocks.bloxdschem"), Buffer.from(binary));
log("\x1b[33mSuccessfully wrote bloxdschem.\x1b[0m");


//world code
const callbacksStr = `const usedCallbacks = ${JSON.stringify(Array.from(allCBs))};`;
const absCodeBlockPositions = codeBlockPositions.map(pos => pos.map((c, i) => c + CODE_BLOCK_OFFSET[i]));
const codeBlocksStr = `const positions = ${JSON.stringify(absCodeBlockPositions)};`;

const loaderCode = fs.readFileSync(node_path.resolve(import.meta.dirname, "loader.js"), "utf-8").split("//--split--")[1];
const worldCode = `${callbacksStr}\n${codeBlocksStr}\n${loaderCode}`;

const worldcodePath = node_path.resolve(outPath, "worldcode.js");
let existingWorldCode;
try {
    existingWorldCode = fs.readFileSync(worldcodePath, "utf-8");
} catch { }

if(existingWorldCode === worldCode) info("World code not modified, you do \x1b[1mnot\x1b[0m need to paste it again.");
else fs.writeFileSync(worldcodePath, worldCode);

log("\x1b[33mBuild process finished.\x1b[0m");