# mctl - command line interface for MicroPython devices

With `mctl` you can

* manipulate files and directories
* enter the REPL
* mount the device into the local filesystem
* all over serial or network connection

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
  repl                                         Open a REPL terminal
  mount                                        Mount a MicroPython device (over serial or network)
  version                                      Print the version of mctl
  help [command]                               display help for command
```
