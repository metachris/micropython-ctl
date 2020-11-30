import { dedent } from "../src/utils";

export const listFiles = `import os; print(os.listdir());
`

export const simpleRange = `
    for x in range(3):
        print(x)
`;

export const simpleRange2 = `
\tfor x in range(3):
\t\tprint(x)
`;

export const simpleRange3 = `for x in range(3):
    print(x)
`;

export const simpleRangeWithError = `
    for x in range(3):
        print(x)
        error
`;

// https://github.com/scientifichackers/ampy/blob/master/ampy/files.py#L88
export const ls = ({ directory = "/", includeFilesize = true, recursive = false, jsonOutput = true }) => {
  if (!directory.startsWith("/")) {
    directory = "/" + directory
  }

  let command = `
try:
    import os
except ImportError:
    import uos as os
`

  if (jsonOutput) command += `
import json
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
r = []
for f in listdir('${directory}'):
    size = os.stat(f)[6]
    r.append('{0} - {1} bytes'.format(f, size))
print(r)
`
  } else {
    command += `print(listdir('${directory}'))`
  }

  return command
  // if (longFormat):
  //     command += `
  //         r = []
  //         for f in listdir('${directory}'):
  //             size = os.stat(f)[6]
  //             r.append('${dir - {{1}} bytes'.format(f, size))
  //         print(r)
  //     `.format(
  //         directory
  //     )
  // else:
  //     command += """
  //         print(listdir('{0}'))
  //     """.format(
  //         directory
  //     )
}

// console.log(ls())

export const ls1 = `
    import os
    print(os.listdir())
    `

export const ls2 = `
    import os
    files = os.listdir()

    def listdir(directory):
        if directory == '/':
            return sorted([directory + f for f in os.listdir(directory)])
        else:
            return sorted([directory + '/' + f for f in os.listdir(directory)])

    r = []
    for f in listdir('/'):
        size = os.stat(f)[6]
        r.append('{0} - {1} bytes'.format(f, size))
    print(r)
`


export const manyPrints = (lines = 200) => {
  let ret = ''
  for (let i = 0; i < lines; i++) {
    ret += `print(${i})\n`
  }
  return ret
}
