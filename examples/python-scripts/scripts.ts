export const lsSimple = `
import os
print(os.listdir())
`

// https://github.com/scientifichackers/ampy/blob/master/ampy/files.py#L88
export const ls = (args = { directory: "/", includeFilesize: true, recursive: false }) => {
  const { directory, includeFilesize, recursive } = args
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
            os.stat(dir_or_file)
            result.add(dir_or_file)
        else:
            # probably a directory, add to result if empty.
            if children:
                # queue the children to be dealt with in next iteration.
                for child in children:
                    # create the full path.
                    if dir_or_file == '/':
                        next = dir_or_file + child
                    else:
                        next = dir_or_file + '/' + child

                    _listdir(next)
            else:
                result.add(dir_or_file)
    _listdir(directory)
    return sorted(result)
`
  } else {
    command += `
def listdir(directory):
    if directory == '/':
        return sorted([directory + f for f in os.listdir(directory)])
    else:
        return sorted([directory + '/' + f for f in os.listdir(directory)])
`
  }

  if (includeFilesize) {
      command += `
for f in listdir('${finalDir}'):
    size = os.stat(f)[6]
    s = '{0} - {1} bytes'.format(f, size)
    print(s)
pass  # why the fuck is this needed?
`
  } else {
    command += `print(listdir('${finalDir}'))`
  }

  return command
}


export const manyPrints = (lines = 200) => {
  let ret = ''
  for (let i = 0; i < lines; i++) {
    ret += `print(${i})\n`
  }
  return ret
}
