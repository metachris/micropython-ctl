/**
 * Mount a MicroPython device onto the local file system.
 *
 * Linux & macOS: https://github.com/fuse-friends/fuse-native
 *
 * Windows:
 * - https://github.com/direktspeed/node-fuse-bindings (fuse-bindings is outdated - see https://github.com/mafintosh/fuse-bindings/issues/77)
 * - https://github.com/dokan-dev/dokany
 *
 * TODO:
 * - Windows support: almost working, but crash on repeated read https://github.com/direktspeed/node-fuse-bindings/issues/11
 */
import * as nodePath from 'path'
import * as crypto from 'crypto'
import { Buffer } from 'buffer/'
import { MicroPythonDevice, FileListEntry as UpstreamFileListEntry} from '../src/main';
import { checkAndInstall as checkAndInstallFuse } from './fuse-dependencies'

// Show debug output on a per-file basis. Use '*' for all files, or an empty array for no debug output.
const SHOW_DEBUG_OUTPUT_FOR_PATHS = ['*']

const fuseDebug = (op: string, path: string, ...args: any) => {
  if (SHOW_DEBUG_OUTPUT_FOR_PATHS.indexOf('*') > -1 || SHOW_DEBUG_OUTPUT_FOR_PATHS.indexOf(path) > -1) {
    console.log(op, path, ...args)
  }
}

const isWin = process.platform === 'win32'

interface Node {
  fullpath: string;
  dirname: string;
  basename: string;

  isDir: boolean;
  size: number;

  // If a file, then can have contents
  contents: Buffer | null

  // Hash of the contents on last save. If this changed, then we upload to device
  contentsSavedHash: string | null
}

/**
 * Naive, simple file system implementation.
 * Stores all nodes in an array, no tree structure or anything.
 */
class FileSystem {
  nodes: Node[]

  constructor(items: UpstreamFileListEntry[]) {
    this.nodes = []
    this.addItems(items)
  }

  public addNode(path: string, isDir = false, size = 0) {
    const node = {
      fullpath: path,
      dirname: nodePath.dirname(path),
      basename: nodePath.basename(path),
      isDir,
      size,
      contents: null,
      contentsSavedHash: null
    }
    this.nodes.push(node)
  }

  public addItems(items: UpstreamFileListEntry[]) {
    if (!items) return
    return items.map(item => this.addNode(item.filename, item.isDir, item.size))
  }

  public getNodeByFullpath(fullpath: string): Node | null {
    for (const node of this.nodes) {
      if (node.fullpath === fullpath) return node
    }
    return null
  }

  public removeNode(node: Node) {
    this.nodes = this.nodes.filter(_node => _node.fullpath !== node.fullpath)
  }

  public removeNodeByFullpath(fullpath: string) {
    this.nodes = this.nodes.filter(node => node.fullpath !== fullpath)
  }

  public getStatInfo(fullpath: string) {
    const node = this.getNodeByFullpath(fullpath)
    if (!node) return null
    return {
      mtime: new Date(),
      atime: new Date(),
      ctime: new Date(),
      nlink: 1,
      size: node.isDir ? 100 : node.size,
      mode: node.isDir ? 16877 : 33188,
      uid: process.getuid ? process.getuid() : 0,
      gid: process.getgid ? process.getgid() : 0
    }
  }

  /**
   *
   * @param dirname (no trailing /): /, /a, /a/b, ...
   */
  public getNodesInDirectory(dirname: string): Node[] {
    return this.nodes.filter(node => node.dirname === dirname)
  }

  /**
   * Returns whether the node at dirname isDir === true
   */
  public isDir(dirname: string): boolean {
    const node = this.getNodeByFullpath(dirname)
    return !!node && node.isDir
  }
}

interface MountOpts {
  useDummyMicropython?: boolean
  micropythonDevice?: MicroPythonDevice
  tty?: string
  host?: string
  password?: string
  mountPath?: string
}

/**
 * Main code entry point.
 *
 * By default mounts the device to ./mnt/ on Linux/macOS, and to M:\ on Windows
 */
export const mount = async (opts: MountOpts) => {
  const mountPath = opts.mountPath || isWin ? 'M:\\' : './mnt'

  // Ensure Fuse is installed and ready
  await checkAndInstallFuse()

  // tslint:disable-next-line: no-var-requires
  const fuseModule = isWin ? 'node-fuse-bindings' : 'fuse-native'
  const Fuse = require(fuseModule)

  // Connect to the micropython device
  const micropython = opts.micropythonDevice || new MicroPythonDevice();
  if (!opts.useDummyMicropython) {
    if (opts.micropythonDevice) {
      if (!micropython.isConnected()) {
        throw new Error('mount() called with disconnected MicroPythonCtl instance')
      }
    } else {
      if (opts.host && opts.password) {
        console.log(`Connecting over network to ${opts.host}...`)
        await micropython.connectNetwork(opts.host, opts.password)
      } else if (opts.tty) {
        console.log(`Connecting over serial to ${opts.tty}...`)
        await micropython.connectSerial(opts.tty)
      } else {
        throw new Error('Invalid options ' + JSON.stringify(opts))
      }
    }
  }

  console.log(`Getting list of files...`)
  let deviceFileList: UpstreamFileListEntry[]
  if (opts.useDummyMicropython) {
    deviceFileList = [
      { filename: '/', isDir: true, size: 100},
      { filename: '/test2', isDir: false, size: 124}
    ]
  } else {
    deviceFileList = await micropython.listFiles('/', { recursive: true })
  }

  // Create a new FileSystem instance
  const fs = new FileSystem(deviceFileList)
  // console.log(fs.getNodesInDirectory('/'))

  const fuseOps = {
    readdir(path: string, cb) {
      fuseDebug('readdir', path)

      if (!fs.isDir(path)) {
        return process.nextTick(cb, Fuse.ENOENT)
      }

      const nodes = fs.getNodesInDirectory(path).filter(node => node.basename)
      const fileNames = nodes.map(node => node.basename)
      const fileStats = nodes.map(node => fs.getStatInfo(node.fullpath))
      return process.nextTick(cb, 0, fileNames, fileStats)
    },

    getattr(path: string, cb) {
      // fuseDebug('getattr', path)
      const statInfo = fs.getStatInfo(path)
      if (!statInfo) return process.nextTick(cb, Fuse.ENOENT)
      return process.nextTick(cb, null, statInfo)
    },

    open(_path: string, _flags, cb) {
      // fuseDebug('open', path, flags)
      return process.nextTick(cb, 0, 42) // 42 is an fd
    },

    async read(path: string, fd: number, buf, len: number, pos: number, cb) {
      fuseDebug('read', path, `fd=${fd}`, `len=${len}, pos=${pos}`)
      const node = fs.getNodeByFullpath(path)
      if (!node) {
        fuseDebug('read', path, '- file not found')
        return process.nextTick(cb, -1)
      }

      if (node.contents === null) {
        console.log(`Downloading ${path} from device...`)
        let fileContents: Buffer
        if (opts.useDummyMicropython) {
          fileContents = Buffer.from(crypto.randomBytes(node.size).toString('hex').slice(0, node.size))
        } else {
          fileContents = await micropython.getFile(path)
        }
        node.contents = Buffer.from(fileContents)
        node.contentsSavedHash = crypto.createHash('sha256').update(node.contents).digest('hex')
      }

      const bufferSlize = node.contents.slice(pos, pos + len)
      if (!bufferSlize.length) {
        console.log('endRead')
        return process.nextTick(cb, 0)  // end of contents
      }

      const str = bufferSlize.toString()
      // fuseDebug('read', path, '-> output:', str)
      buf.write(str)
      return process.nextTick(cb, str.length)
    },

    create (path: string, flags, cb) {
      fuseDebug('create', path, flags)
      fs.addNode(path)
      return process.nextTick(cb, 0, 42)  // 42 is fd
    },

    write (path: string, fd, buf: Buffer, len, pos, cb) {
      fuseDebug('write', path, `fd=${fd}`, buf, buf.length, `len=${len}, pos=${pos}`)
      const node = fs.getNodeByFullpath(path)
      if (!node) return process.nextTick(cb, -1)
      if (node.contents === null) node.contents = Buffer.alloc(0)

      // Copy from buffer into contents
      const curBufferSize = node.contents.length
      const newBufferSize = Math.max(pos + len, node.size)
      if (curBufferSize < newBufferSize) {
        // Expand content buffer
        // fuseDebug('write', path, 'EXPAND buffer to', newBufferSize)
        node.contents = Buffer.concat([node.contents, Buffer.alloc(newBufferSize - curBufferSize)])
      }

      buf.slice(0, len).copy(node.contents, pos)
      node.size = newBufferSize

      fuseDebug('write', path, '->', node.contents.slice(0, node.size), node.contents.toString())
      process.nextTick(cb, len)
    },

    async release (path: string, fd, cb) {
      fuseDebug('release', path, fd)

      // on file release, save to device
      const node = fs.getNodeByFullpath(path)
      if (!node) return process.nextTick(cb, -1)
      if (!node.contents) return process.nextTick(cb, 0)

      const contentsHash = crypto.createHash('sha256').update(node.contents).digest('hex')
      if (contentsHash !== node.contentsSavedHash) {
        console.log(`Saving ${path} to device...`)
        node.contentsSavedHash = contentsHash
        if (!opts.useDummyMicropython) {
          await micropython.putFile(path, node.contents)
        }
      }

      // done
      process.nextTick(cb, 0)
    },

    truncate (path: string, size: number, cb) {
      fuseDebug('truncate', path, size)
      const node = fs.getNodeByFullpath(path)
      if (!node) return process.nextTick(cb, -1)
      node.size = size
      if (node.contents === null) node.contents = Buffer.alloc(size)
      node.contents.fill(0, size)
      process.nextTick(cb, 0)
    },

    async rename (src: string, dest: string, cb) {
      fuseDebug('rename', src, dest)
      const node = fs.getNodeByFullpath(src)
      if (!node) return process.nextTick(cb, -1)
      node.fullpath = dest
      node.basename = nodePath.basename(dest)
      node.dirname = nodePath.dirname(dest)
      if (!opts.useDummyMicropython) {
        console.log(`Moving ${src} to ${dest} on device...`)
        await micropython.rename(src, dest)
      }

      return process.nextTick(cb, 0)
    },

    async unlink (path: string, cb) {
      fuseDebug('unlink', path)
      const node = fs.getNodeByFullpath(path)
      if (!node) return process.nextTick(cb, -1)

      fs.removeNodeByFullpath(path)
      if (!opts.useDummyMicropython) {
        console.log(`Removing ${path} on device...`)
        await micropython.remove(path)
      }

      return process.nextTick(cb, 0)
    },

    async mkdir (path: string, mode, cb) {
      fuseDebug('mkdir', path, mode)
      const node = fs.getNodeByFullpath(path)
      if (!node) fs.addNode(path, true)
      if (!opts.useDummyMicropython) {
        console.log(`mkdir ${path} on device...`)
        await micropython.mkdir(path)
      }

      return process.nextTick(cb, 0)
    },

    async rmdir (path: string, cb) {
      fuseDebug('rmdir', path)
      const node = fs.getNodeByFullpath(path)
      if (!node) return process.nextTick(cb, Fuse.ENOENT)
      if (!node.isDir) process.nextTick(cb, Fuse.ENOENT)
      const children = fs.getNodesInDirectory(node.fullpath)
      if (children.length) {
        console.log('cannot remove, dir not empty', children)
        return process.nextTick(cb, Fuse.ENOTEMPTY)
      }
      fs.removeNode(node)
      if (!opts.useDummyMicropython) {
        console.log(`Removing ${path} on device...`)
        await micropython.remove(path)
      }

      return process.nextTick(cb, 0)
    }
  }

  if (isWin) {
    /**
     * Mounting the device on Windows
     */
    console.log('Mounting a device on Windows is experimental. One bug causes crashes when reading a file. See more here: https://github.com/metachris/micropython-ctl/issues/2')
    Fuse.mount(mountPath, fuseOps, {
      options: ['volname=MicroPython']
    })
    console.log('Mounted on', mountPath)

    // handle Ctrl+C
    process.on('SIGINT', () => {
      Fuse.unmount(mountPath, (err: any) => {
        if (err) {
          console.error('filesystem at ' + mountPath + ' not unmounted')
          console.error(err)
          process.exit(1)
        } else {
          console.log('filesystem at ' + mountPath + ' unmounted')
        }
      })
    })

  } else {
    const fuse = new Fuse('./mnt', fuseOps, {
      force: true,
      mkdir: true,
      debug: false,
      displayFolder: true
    })

    fuse.mount(err => {
      if (err) throw err
      console.log('Mounted on ' + fuse.mnt)
    })

    // handle Ctrl+C
    process.once('SIGINT', () => {
      fuse.unmount(err => {
        if (err) {
          console.log('filesystem at ' + fuse.mnt + ' not unmounted', err)
        } else {
          console.log('filesystem at ' + fuse.mnt + ' unmounted')
        }
        micropython.disconnect()
        process.exit(err ? 1 : 0)
      })
    })
  }
}

// mount({ useDummyMicropython: true })
// mount({ tty: '/dev/tty.SLAB_USBtoUART' })
// mount({ tty: 'COM4' })

