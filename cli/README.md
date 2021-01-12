# mctl - command line interface for MicroPython devices

With `mctl` you can:

* manipulate files and directories
* list all serial devices
* enter the REPL
* mount the device into the local filesystem
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
  ls [options] [directory]                     List files on a device
  cat <filename>                               Print content of a file on the device
  get <file_or_dirname> [out_file_or_dirname]  Download a file or directory from the device
  put <filename> [<destFilename>]              Copy a file onto the device
  mkdir <name>                                 Create a directory
  rm [options] <path>                          Delete a file or directory
  mv <oldPath> <newPath>                       Rename a file or directory
  run <fileOrCommand>                          Execute a Python file or command
  reset [options]                              Reset the MicroPython device
  edit <filename>                              Edit a file, and if changed upload afterwards
  repl                                         Open a REPL terminal
  mount                                        Mount a MicroPython device (over serial or network)
  version                                      Print the version of mctl
  help [command]                               display help for command
```

Note: without tty / host+password options, `mctl` will try to connect to the first found serial device.


### Notes

`mctl mount`

* Mounts the device filesystem into the local filesystem
* macOS, Linux: Works. Uses [fuse-native](https://github.com/fuse-friends/fuse-native)
* Windows: experimental, might be buggy. Uses [node-fuse-bindings](https://github.com/direktspeed/node-fuse-bindings) and [Dokany](https://github.com/dokan-dev/dokany/wiki/Installation)
* Keeps the device connection open, which means you cannot connect to it in parallel
* If you encounter problems or have feedback, please [open an issue](https://github.com/metachris/micropython-ctl/issues/new)


### Future work

* env vars for host, password: WEBREPL, AMPY
* upload everything recursively ('cp -r .')
* wifi status, connect, disconnect
* mount: testing
* mount + repl
* reuse one instance (eg. in mount mode) to execute other commands
