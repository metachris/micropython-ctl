/**
 * Mount a MicroPython device onto the local file system.
 *
 * Linux & macOS: https://github.com/fuse-friends/fuse-native
 * Windows:
 * - https://github.com/direktspeed/node-fuse-bindings (fuse-bindings is outdated - see https://github.com/mafintosh/fuse-bindings/issues/77)
 * - https://github.com/dokan-dev/dokany
 *
 * See also:
 * - http://libfuse.github.io/doxygen/structfuse__operations.html#a4a6f1b50c583774125b5003811ecebce
 * - http://events17.linuxfoundation.org/sites/events/files/slides/frontendFS.pdf
 *
 * TODO:
 * - rename, unlink
 * - mkdir, rmdir
 */
import * as nodePath from 'path'
import * as crypto from 'crypto'
import { Buffer } from 'buffer/'
import { MicroPythonDevice, FileListEntry as UpstreamFileListEntry} from '../src/main';
import { checkAndInstall as checkAndInstallFuse } from './fuse-dependencies'

// const device = '/dev/tty.SLAB_USBtoUART'
// const device = '/dev/ttyUSB0'

// Show debug output on a per-file basis. Use '*' for all files, or an empty array for no debug output.
const SHOW_DEBUG_OUTPUT_FOR_PATHS = ['/a']

const fuseDebug = (op: string, path: string, ...args: any) => {
  if (SHOW_DEBUG_OUTPUT_FOR_PATHS.indexOf('*') > -1 || SHOW_DEBUG_OUTPUT_FOR_PATHS.indexOf(path) > -1) {
    console.log(op, path, ...args)
  }
}

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
  micropythonDevice?: MicroPythonDevice
  tty?: string
  host?: string
  password?: string
}

/**
 * Main code entry point
 */
export const mount = async (opts: MountOpts) => {
  // Ensure Fuse is installed and ready
  await checkAndInstallFuse()

  // tslint:disable-next-line: no-var-requires
  const fuseModule = process.platform === 'win32' ? 'node-fuse-bindings' : 'fuse-native'
  const Fuse: any = require(fuseModule)
  console.log(Fuse)

  // Connect to the micropython device
  const micropython = new MicroPythonDevice();
  if (opts.micropythonDevice) {
    if (!opts.micropythonDevice.isConnected()) {
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

  console.log(`Getting list of files...`)
  const deviceFileList = await micropython.listFiles({ recursive: true })

  // Create a new FileSystem instance
  const fs = new FileSystem(deviceFileList)
  // console.log(fs.nodes)

  // console.log('----------------- in / -------------')
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
      fuseDebug('getattr', path)
      const statInfo = fs.getStatInfo(path)
      if (!statInfo) return process.nextTick(cb, Fuse.ENOENT)
      return process.nextTick(cb, null, statInfo)
    },

    open(path: string, flags, cb) {
      fuseDebug('open', path, flags)
      return process.nextTick(cb, 0, 42) // 42 is an fd
    },

    async read(path: string, fd: number, buf, len: number, pos: number, cb) {
      fuseDebug('read', path, `fd=${fd}`, buf, `len=${len}, pos=${pos}`)
      const node = fs.getNodeByFullpath(path)
      if (!node) {
        fuseDebug('read', path, '- file not found')
        return process.nextTick(cb, -1)
      }

      if (node.contents === null) {
        console.log(`Downloading ${path} from device...`)
        const fileContents = await micropython.getFile(path)
        node.contents = Buffer.from(fileContents)
        node.contentsSavedHash = crypto.createHash('md5').update(node.contents).digest('hex')
      }

      const bufferSlize = node.contents.slice(pos, pos + len)
      if (!bufferSlize.length) {
        console.log('endRead')
        return process.nextTick(cb, 0)  // end of contents
      }

      const str = bufferSlize.toString()
      fuseDebug('read', path, '-> output:', str)
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
      if (!node.contents) node.contents = Buffer.alloc(0)

      const contentsHash = crypto.createHash('md5').update(node.contents).digest('hex')
      if (contentsHash !== node.contentsSavedHash) {
        console.log('writing file to device...')
        node.contentsSavedHash = contentsHash
        await micropython.putFile(path, node.contents)
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
    }
  }

  const fuse = new Fuse('./mnt', fuseOps, {
    force: true,
    mkdir: true,
    debug: false,
    displayFolder: true
  })

  fuse.mount(err => {
    if (err) throw err
    console.log('filesystem mounted on ' + fuse.mnt)
  })

  process.once('SIGINT', () => {
    fuse.unmount(err => {
      if (err) {
        console.log('filesystem at ' + fuse.mnt + ' not unmounted', err)
      } else {
        console.log('filesystem at ' + fuse.mnt + ' unmounted')
      }
      console.log(1)
      fs.nodes = []
      console.log(2)

      micropython.disconnect()
      console.log(3)
    })
  })
}

// mount({ tty: '/dev/tty.SLAB_USBtoUART' })
mount({ tty: 'COM4' })

