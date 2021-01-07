export const lsSimple = `
import os
print(os.listdir())
`

// https://github.com/scientifichackers/ampy/blob/master/ampy/files.py#L88
export const ls = (args = { directory: "/", recursive: false }) => {
  const { directory, recursive } = args
  const finalDir = directory.startsWith("/") ? directory : "/" + directory

  let command = `
try:
    import os
except ImportError:
    import uos as os
`

  if (recursive) {
    command += `
def listdir(directory):
    result = set()
    def _listdir(dir_or_file):
        try:
            # if its a directory, then it should provide some children.
            children = os.listdir(dir_or_file)
        except OSError:
            # probably a file. run stat() to confirm.
            stat = os.stat(dir_or_file)
            result.add((dir_or_file, False, stat[6]))
        else:
            # probably a directory, add to result if empty.
            result.add((dir_or_file, True, 0))
            if children:
                # queue the children to be dealt with in next iteration.
                for child in children:
                    # create the full path.
                    if dir_or_file == '/':
                        next = dir_or_file + child
                    else:
                        next = dir_or_file + '/' + child

                    _listdir(next)
    _listdir(directory)
    return sorted(result)
`
  } else {
    command += `
def listdir(directory):
    files = os.ilistdir(directory)
    out = []
    for (filename, filetype, inode, size) in files:
        if size == -1:
            size = os.stat(f)[6]
        isdir = filetype == 0x4000
        filename = directory + filename if directory == '/' else directory + '/' + f
        out.append((filename, isdir, size))
    return sorted(out)
`
  }

  command += `
for (filename, isdir, size) in listdir('${finalDir}'):
    print("%s | %s | %s" % (filename, 'd' if isdir else 'f', size))
#
`

  return command
}


export const manyPrints = (lines = 200) => {
  let ret = ''
  for (let i = 0; i < lines; i++) {
    ret += `print(${i})\n`
  }
  return ret
}

export const getFile = (filename: string) => {
  return `
import sys
import ubinascii
with open('${filename}', 'rb') as infile:
    while True:
        result = infile.read(32)
        if result == b'':
            break
        len = sys.stdout.write(ubinascii.hexlify(result))
#`  // this # is needed, else we get an error (SyntaxError: invalid syntax)
}

export const stat = (path: string) => {
  return `
try:
    import os
except ImportError:
    import uos as os

s = os.stat('${path}')
print('%s | %s' % ('f' if s[0] == 32768 else 'd', s[6]))
`
}
