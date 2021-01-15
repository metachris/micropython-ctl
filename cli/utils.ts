import path from 'path'
import { exec, execSync } from 'child_process';

const isWindows = process.platform === 'win32'

export const humanFileSize = (bytes, si = true, dp = 1) => {
  const thresh = si ? 1000 : 1024;

  if (Math.abs(bytes) < thresh) {
    return bytes + 'b';
  }

  const units = si
    ? ['K', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
  let u = -1;
  const r = 10 ** dp;

  do {
    bytes /= thresh;
    ++u;
  } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);


  return bytes.toFixed(dp) + units[u];
}

export const getNodeModulesDirectory = (): string => {
  if (isWindows) {
    return execSync('npm root --global').toString().trim()
  } else {
    // In Linux and macOS, users might use nvm, which is only enabled in their bash/shell profile.
    // In that case, 'npm root' run with execSync will not point to the nvm executable.
    const nodePath = path.dirname(path.dirname(process.execPath));
    return path.join(nodePath, 'lib/node_modules');
  }
}

export const isInstalledGlobally = (): boolean => {
  const nodeModulesDir = getNodeModulesDirectory()
  return __dirname.indexOf(nodeModulesDir) > -1
}

if (require.main === module) {
  console.log('isInstalledGlobally', isInstalledGlobally())
  console.log(getNodeModulesDirectory());
}
