# mctl - command line interface for MicroPython devices

With `mctl` you can:

* Connect to devices over serial or network (WebREPL)
* List all serial devices: `mctl devices`
* Enter the REPL: `mctl repl`
* Manipulate files and directories: `mctl ls`, `mctl rm`, `mctl put`, `mctl get`, `mctl mkdir`
* Synchronize a folder onto the device: `mctl sync` (only uploads changed files)
* Edit a file and upload if changed: `mctl edit <filename>`
* Reset the device: `mctl reset`
* Run Python scripts: `mctl run <script_or_file>`
* Reuse a `mctl repl` connection to run `mctl` commands in another terminal at the same time
* Mount the device into the local filesystem: `mctl mount` (experimental!)
* More: see `mctl help`

Code: [cli/index.ts](https://github.com/metachris/micropython-ctl/blob/master/cli/index.ts)

## Installation

`mctl` is included in the `micropython-ctl` npm package. As a helper you can also install `mctl` directly:

```npm install -g mctl```

## Usage

```shell
$ mctl help
Usage: index [options] [command]

Options:
  -t, --tty <device>                                      Connect over serial interface (eg. /dev/tty.SLAB_USBtoUART)
  -h, --host <host>                                       Connect over network to hostname or IP of device
  -p, --password <password>                               Password for network device
  -s, --silent                                            Hide unnecessary output
  --help                                                  display help for command

Commands:
  devices                                                 List serial devices
  repl                                                    Open a REPL terminal
  run <fileOrCommand>                                     Execute a Python file or command
  info [options]                                          Get information about the board (versions, unique id, space, memory)
  ls [options] [directory]                                List files on a device
  cat <filename>                                          Print content of a file on the device
  get <file_or_dirname> [out_file_or_dirname]             Download a file or directory from the device. Download everything with 'get /'
  put [options] <file_or_dirname> [dest_file_or_dirname]  Upload a file or directory onto the device
  sync [directory]                                        Sync a local directory onto the device root (upload new/changes files, delete missing)
  edit <filename>                                         Edit a file, and if changed upload afterwards
  mkdir <name>                                            Create a directory
  rm [options] <path>                                     Delete a file or directory
  mv <oldPath> <newPath>                                  Rename a file or directory
  sha256 <filename>                                       Get the SHA256 hash of a file
  reset [options]                                         Reset the MicroPython device
  mount [targetPath]                                      Mount a MicroPython device (over serial or network)
  run-tests                                               Run micropython-ctl tests on a device
  version                                                 Print the version of mctl
  help [command]                                          display help for command
```


Device connection logic:

1. `--host` or `--tty` option
1. `MCTL_TTY` env var: serial connection
1. `MCTL_HOST` env var: network connection
1. `AMPY_PORT` env var: serial connection
1. `WEBREPL_HOST` env var: network connection

For network connection passwords, the env vars `MCTL_PASSWORD` and `WEBREPL_PASSWORD` can be used.

## Examples

#### Set target device

```shell
# List serial devices
mctl devices

# By default connect to first serial device
mctl info

# Connect over specific serial device
mctl -t /dev/USB0 info

# Connect over network
mctl -h DEVICE_IP -p WEBREPL_PASSWORD info
```

#### Get information, REPL, list and read files

```shell
# Get information about the board
mctl info

# Enter the REPL
mctl repl

# List files
mctl ls  # list all files in /
mctl ls foo/  # list all files in /foo/
mctl ls -r  # recursively list all files and directories
mctl ls -r --json  # output as json
mctl ls -r --include-hash --json  # output as json, include sha256 hash of each file

# Print contents of boot.py
mctl cat boot.py
```

#### Upload and download files

```shell
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
```

#### Example Output

`ls -r --json --include-hash`:

```json
[
    {
        "filename": "/",
        "size": 0,
        "isDir": true,
        "mTime": 0
    },
    {
        "filename": "/boot.py",
        "size": 139,
        "isDir": false,
        "mTime": 0,
        "sha256": "16f5b4bcb120e9a032242b47967e649a0cc577b41939e81ef7d4b4da181bd17f"
    },
    {
        "filename": "/main.py",
        "size": 1810,
        "isDir": false,
        "mTime": 14,
        "sha256": "936d92994d0b86eb0e60efd053e12d009d718af3894d7f5c16303b1d7c526306"
    }
]
```

#### Experimental

```shell
# Mount device onto local filesystem (experimental, only works with python files)
mctl mount
```

## Notes

`mctl mount`

* Mounts the device filesystem into the local filesystem. Highly experimental! Doesn't yet work well with binary files, and Windows. Not recommended for production use. Might result in data loss.
* Should work for Python (.py) files on macOS and Linux.
* macOS, Linux: works, using [fuse-native](https://github.com/fuse-friends/fuse-native)
* Windows: experimental, might be buggy. Uses [node-fuse-bindings](https://github.com/direktspeed/node-fuse-bindings) and [Dokany](https://github.com/dokan-dev/dokany/wiki/Installation)
* Keeps the device connection open, which means you cannot connect to it in parallel
* If you encounter problems or have feedback, please post here: https://github.com/metachris/micropython-ctl/issues/3
