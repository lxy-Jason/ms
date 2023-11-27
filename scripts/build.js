#!/usr/bin/env node
// @ts-check
import { mkdirSync, readFileSync, rmdirSync } from 'fs';
import { writeFile } from 'fs/promises';
import { join, sep, normalize } from 'path'; //sep可以根据操作系统返回正确的分割符
import ts from 'typescript';

const DIR = './dist'; //输出目录

// Delete and recreate the output directory.
try {
  rmdirSync(DIR, { recursive: true }); //删除dist文件夹,第二个参数会删除dist下面的全部文件和目录
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
mkdirSync(DIR); //创建dist文件夹

// Read the TypeScript config file.
const { config } = ts.readConfigFile('tsconfig.json', (fileName) =>
  readFileSync(fileName).toString(),
);

const sourceFile = join('src', 'index.ts'); //路径拼接,会根据操作系统不同,使用不同的分割符
// Build CommonJS module.
compile([sourceFile], { module: ts.ModuleKind.CommonJS });
// Build an ES2015 module and type declarations.
compile([sourceFile], {
  module: ts.ModuleKind.ES2020,
  declaration: true,
});

/**
 * Compiles files to JavaScript.
 * 根据配置可以输出不同规范的文件
 * @param {string[]} files
 * @param {ts.CompilerOptions} options
 */
function compile(files, options) {
  const compilerOptions = { ...config.compilerOptions, ...options }; //ts配置文件合并
  const host = ts.createCompilerHost(compilerOptions); //这个host对象将被用于后续的 TypeScript 编译过程中，以处理源代码文件、生成输出文件等操作。

  host.writeFile = (fileName, contents) => {
    //自定义写文件函数,
    const isDts = fileName.endsWith('.d.ts');
    const normalizedFileName = normalize(fileName); //win11 好像有bug,fileName拿到的路径符对不上,这里我用normalize再判断了一次
    let path = join(DIR, normalizedFileName.split(sep)[1]); //得到./dist/index.js

    if (!isDts) {
      //不是声明文件
      switch (
        compilerOptions.module //根据ts配置中的模块选择
      ) {
        case ts.ModuleKind.CommonJS: {
          // Adds backwards-compatibility(向后兼容性) for Node.js.
          // eslint-disable-next-line no-param-reassign
          contents += `module.exports = exports.default;\nmodule.exports.default = exports.default;\n`; //这里的content就是最终输出的文件,这里是在输出文件的最后添加了内容
          // Use the .cjs file extension.
          path = path.replace(/\.js$/, '.cjs'); //替换后缀
          break;
        }
        case ts.ModuleKind.ES2020: {
          // Use the .mjs file extension.
          path = path.replace(/\.js$/, '.mjs');
          break;
        }
        default:
          throw Error('Unhandled module type');
      }
    }

    writeFile(path, contents)
      .then(() => {
        // eslint-disable-next-line no-console
        console.log('Built', path);
      })
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.error(error);
      });
  };

  const program = ts.createProgram(files, compilerOptions, host);

  program.emit(); //根据编译选项将 TypeScript 代码转换为 JavaScript 代码
}
