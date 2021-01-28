# mctl - command line interface for MicroPython devices

With `mctl` you can:

* Manipulate files and directories
* List all serial devices: `mctl devices`
* Enter the REPL: `mctl repl`
* Mount the device into the local filesystem: `mctl mount` (experimental!)
* Use serial or network connection

Code: [cli/index.ts](https://github.com/metachris/micropython-ctl/blob/master/cli/index.ts)

### Installation

```npm install -g micropython-ctl```

### Usage

```shell
$ mctl help
Usage: index [options] [command]

Options:
  -t, --tty [device]                            Connect over serial interface (eg.
                                                /dev/tty.SLAB_USBtoUART)
  -h, --host <host>                             Connect over network to hostname or IP of device
  -p, --password <password>                     Password for network device
  -s, --silent                                  Hide unnecessary output
  --help                                        display help for command

Commands:
  devices                                       List serial devices
  repl                                          Open a REPL terminal
  run <fileOrCommand>                           Execute a Python file or command
  info [options]                                Get information about the board (versions, unique
                                                id, space, memory)
  ls [options] [directory]                      List files on a device
  cat <filename>                                Print content of a file on the device
  get <file_or_dirname> [out_file_or_dirname]   Download a file or directory from the device.
                                                Download everything with 'get /'.
  put <file_or_dirname> [dest_file_or_dirname]  Upload a file or directory onto the device
  edit <filename>                               Edit a file, and if changed upload afterwards
  mkdir <name>                                  Create a directory
  rm [options] <path>                           Delete a file or directory
  mv <oldPath> <newPath>                        Rename a file or directory
  sha256 <filename>                             Get the SHA256 hash of a file
  reset [options]                               Reset the MicroPython device
  mount                                         Mount a MicroPython device (over serial or
                                                network)
  run-tests                                     Run micropython-ctl tests on a device
  version                                       Print the version of mctl
  help [command]                                display help for command
```

Note: without `--tty` / `--host` + `--password` options, `mctl` will connect to the first serial device.

### Examples

```shell
# List serial devices
mctl devices

# Get information about the board: versions, id, etc.)
mctl info

# List files
mctl ls -r

# Print contents of boot.py
mctl cat boot.py

# Download all files and directories recursively, into the current directory
mctl get /

# Download all files and directories recursively, into /tmp/
mctl get / /tmp/

# Upload a file
mctl put boot.py

# Upload all Python scripts
mctl put "*.py"

# Upload everything recursively
mctl put .

# Mount device onto local filesystem (experimental, only works with python files)
mctl mount
```

### Notes

`mctl mount`

* Mounts the device filesystem into the local filesystem. Highly experimental! Doesn't yet work well with binary files, and Windows. Not recommended for production use. Might result in data loss.
* Should work for Python (.py) files on macOS and Linux.
* macOS, Linux: works, using [fuse-native](https://github.com/fuse-friends/fuse-native)
* Windows: experimental, might be buggy. Uses [node-fuse-bindings](https://github.com/direktspeed/node-fuse-bindings) and [Dokany](https://github.com/dokan-dev/dokany/wiki/Installation)
* Keeps the device connection open, which means you cannot connect to it in parallel
* If you encounter problems or have feedback, please post here: https://github.com/metachris/micropython-ctl/issues/3
