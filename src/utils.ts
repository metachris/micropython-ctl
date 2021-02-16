import { Buffer } from 'buffer/'

// export const IS_ELECTRON = typeof (navigator) !== 'undefined' && navigator.userAgent.indexOf('Electron/') > -1

// Show debug output when DEBUG variable is set (env or window)
export const debug = (...args: any) => {
  if (!!process.env.DEBUG || (typeof window !== 'undefined' && (window as any).DEBUG)) {
    console.log(...args)
  }
}

export const delayMillis = (delayMs: number) => new Promise(resolve => setTimeout(resolve, delayMs));

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
