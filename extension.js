const vscode = require('vscode')
const path = require('path')
const fs = require('fs')

const promisify = function promisify (func) {
  return async function wrapper (...args) {
    return new Promise((resolve, reject) => {
      func(...args, (err, result) => (err ? reject(err) : resolve(result)))
    })
  }
}

const readFile = promisify(fs.readFile)
const writeFile = promisify(fs.writeFile)
const mkDir = promisify(fs.mkdir)

exports.activate = async function activate (context) {
  let buildSub = vscode.commands.registerCommand('pico8.build', buildCarts)

  context.subscriptions.push(buildSub)
}

async function findPico8Projects () {
  let packages = await vscode.workspace.findFiles(
    '**/package.json',
    '**/node_modules/**'
  )

  return packages
    .map(uri => {
      let proj = require(uri.fsPath)
      proj.path = uri.fsPath
      return proj
    })
    .filter(proj => proj.pico8 !== undefined)
}

async function buildCarts () {
  let projects = await findPico8Projects()
  if (projects.length === 0) {
    vscode.window.showErrorMessage('No compatible package.json located')
    return
  }

  vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Building Pico-8 Cart'
    },
    async progress => buildAll(projects, progress)
  )
}

async function buildAll (projects, progress) {
  for (let proj of projects) {
    await buildProject(proj)
    progress.increment(1 / projects.length * 100)
  }
}

async function buildProject (project) {
  let dir = path.dirname(project.path)
  let buildDir = path.join(dir, 'build')
  let cartFile = path.join(buildDir, `${project.cartName}.p8`)

  let cartData = []
  cartData.push('pico-8 cartridge // http://www.pico-8.com')
  cartData.push('version 16')

  let allCode = await buildCode(path.join(dir, project.codeDirectory))

  cartData.push('__lua__')
  cartData.push(`--${project.labelTag1}`)
  cartData.push(`--${project.labelTag2}`)
  cartData.push(allCode)

  if (project.dataCart && project.dataCart.length > 0) {
    let allData = await readFile(path.join(dir, project.dataCart), {
      encoding: 'utf8'
    })
    let dataArray = allData.split('\n')

    let found = false
    for (let data of dataArray) {
      if (data.indexOf('__gfx__') >= 0) found = true
      if (found) cartData.push(data.replace('\r', ''))
    }

    try {
      await mkDir(buildDir)
    } catch (_) {
      /* don't care */
    }
    await writeFile(cartFile, cartData.join('\n'), {})
  }
}

async function buildCode (codeDir) {
  let codeStr = []
  let codeFiles = await vscode.workspace.findFiles('**/*.lua')
  codeFiles = codeFiles.filter(x => x.fsPath.startsWith(codeDir))

  for (let codeFile of codeFiles) {
    let code = await readFile(codeFile.fsPath)
    codeStr.push(code)
  }

  return codeStr.join('\n')
}
