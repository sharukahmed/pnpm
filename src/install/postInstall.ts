import path = require('path')
import findUp = require('find-up')
import createDebug from '../debug'
const debug = createDebug('pnpm:post_install')
import fs = require('mz/fs')
import runScript from '../runScript'
import requireJson from '../fs/requireJson'

const pnpmNodeModules = findUp.sync('node_modules', {cwd: __dirname})
const nodeGyp = path.resolve(pnpmNodeModules, 'node-gyp/bin/node-gyp.js')

export default async function postInstall (root_: string, log: Function) {
  const root = path.join(root_, '_')
  const pkg = await requireJson(path.join(root, 'package.json'))
  debug('postinstall', pkg.name + '@' + pkg.version)
  const scripts = pkg && pkg.scripts || {}

  if (!scripts['install']) {
    await checkBindingGyp(root, log)
  }

  if (scripts['install']) {
    await npmRunScript('install')
    return
  }
  await npmRunScript('preinstall')
  await npmRunScript('postinstall')
  return

  async function npmRunScript (scriptName: string) {
    if (!scripts[scriptName]) return
    return runScript('npm', ['run', scriptName], { cwd: root, log })
  }
}

/**
 * Run node-gyp when binding.gyp is available. Only do this when there's no
 * `install` script (see `npm help scripts`).
 */
async function checkBindingGyp (root: string, log: Function) {
  try {
    await fs.stat(path.join(root, 'binding.gyp'))
  } catch (err) {
    if ((<NodeJS.ErrnoException>err).code === 'ENOENT') {
      return
    }
  }
  return runScript(nodeGyp, ['rebuild'], { cwd: root, log })
}
