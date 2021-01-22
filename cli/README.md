# mctl - command line interface for MicroPython devices

With `mctl` you can:

* manipulate files and directories: `mctl ls -r`, ...
* list all serial devices: `mctl devices`
* enter the REPL: `mctl repl`
* mount the device into the local filesystem: `mctl mount`
* use serial or network connection

Code: [cli/index.ts](https://github.com/metachris/micropython-ctl/blob/master/cli/index.ts)

### Installation

```npm install -g micropython-ctl```

### Usage

```shell
$ mctl --help
Usage: index [options] [command]

Options:
  -t, --tty [device]                           Connect over serial interface (eg. /dev/tty.SLAB_USBtoUART)
  -h, --host <host>                            Connect over network to hostname or IP of device
  -p, --password <password>                    Password for network device
  -s, --silent                                 Hide unnecessary output
  --help                                       display help for command

Commands:
  devices                                      List serial devices
  repl                                         Open a REPL terminal
  run <fileOrCommand>                          Execute a Python file or command
  ls [options] [directory]                     List files on a device
  cat <filename>                               Print content of a file on the device
  get <file_or_dirname> [out_file_or_dirname]  Download a file or directory from the device
  put <filename> [<destFilename>]              Copy a file onto the device
  edit <filename>                              Edit a file, and if changed upload afterwards
  mkdir <name>                                 Create a directory
  rm [options] <path>                          Delete a file or directory
  mv <oldPath> <newPath>                       Rename a file or directory
  reset [options]                              Reset the MicroPython device
  mount                                        Mount a MicroPython device (over serial or network)
  run-tests                                    Run micropython-ctl tests on a device
  version                                      Print the version of mctl
  help [command]                               display help for command
```

Note: without tty / host+password options, `mctl` will try to connect to the first found serial device.

### Examples

```shell
# List serial devices
mctl devices

# List files
mctl ls -r

# Print contents of boot.py
mctl cat boot.py

# Download all files and directories recursively, into the current directory
mctl get -r /

# Download all files and directories recursively, into /tmp/
mctl get -r / /tmp/
```

### Notes

`mctl mount`

* Mounts the device filesystem into the local filesystem. Highly experimental! Doesn't yet work well with binary files, and Windows. Not recommended for production use. Might result in data loss.
* Should work for Python (.py) files on macOS and Linux.
* macOS, Linux: works, using [fuse-native](https://github.com/fuse-friends/fuse-native)
* Windows: experimental, might be buggy. Uses [node-fuse-bindings](https://github.com/direktspeed/node-fuse-bindings) and [Dokany](https://github.com/dokan-dev/dokany/wiki/Installation)
* Keeps the device connection open, which means you cannot connect to it in parallel
* If you encounter problems or have feedback, please post here: https://github.com/metachris/micropython-ctl/issues/3
