import * as path from 'path';
import { Buffer } from 'buffer/'
import { tmpdir } from 'os';
import crypto from 'crypto';

export const IS_NODEJS = !!globalThis.process?.release?.name
export const IS_ELECTRON = typeof (navigator) !== 'undefined' && navigator.userAgent.indexOf('Electron/') > -1

// Enable debug output if Node.js and DEBUG env var, alternatively
const SHOW_DEBUG_OUTPUT_NODE = IS_NODEJS && !!process.env.DEBUG

export const debug = (...args: any) => {
  // console.log(...args)
  if (SHOW_DEBUG_OUTPUT_NODE || (typeof window !== 'undefined' && (window as any).DEBUG)) {
    console.log(...args)
  }
}

export const delayMillis = (delayMs: number) => new Promise(resolve => setTimeout(resolve, delayMs));

export const getTmpFilename = (ext: string) => {
  return path.join(tmpdir(), crypto.randomBytes(16).toString('hex') + ext)
}

/**
 * Return trimmed, dedented text.
 * Just like the Python equivalent: https://docs.python.org/3/library/textwrap.html#textwrap.dedent
 */
export const dedent = (text: string): string => {
  // Remove newline from start and end
  const lines = text.replace(/^\n|\s+$/g, '').split("\n");
  // console.log(lines)
  if (lines.length === 0) return text.trim()

  // find smallest common indentation
  let mindent: number | null = null;
  lines.forEach(l => {
    const m = l.match(/^(\s+)\S+/);
    // console.log(m)
    if (m) {
      const indent = m[1].length;
      mindent = mindent ? Math.min(mindent, indent) : indent
    } else {
      mindent = 0
    }
  })

  // console.log(mindent)

  if (!mindent) return text.trim()
  const result = lines.map(l => l.slice(mindent!)).join("\n");
  return result.trim()
}

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

/**
 * Turn a string or buffer into a hex string
 */
export const hexlify = (data: string | Buffer) => {
  return Buffer.isBuffer(data) ? data.toString('hex') : Buffer.from(data).toString('hex')
}

/**
 * Turn hexlified data into a string
 */
export const unhexlify = (str: string) => {
  return Buffer.from(str, 'hex').toString()
}
