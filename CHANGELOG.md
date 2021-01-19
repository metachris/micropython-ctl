dev
---
* `MicroPythonDevice.getFileHash(filename: string)` / `mctl sha256 <filename>`
* Check if file is already the same
  * `MicroPythonDevice.isFileTheSame(filename: string, data: Buffer)`
  * `putFile` option `checkIfSimilarBeforeUpload` to avoid uploading another the file if it's already there (requires one more `runScript` if uploading)


1.7.3 (2021-01-15)
------------------
First pretty feature-complete, allround tested version.

`mctl` works on Windows, Linux and macOS!


1.7.2 (2021-01-13)
------------------
* many improvements and adding missing commands to the module and mctl
* mounting the device with FUSE


1.7.0 (2021-01-08)
------------------
* `putFile`
* `getFile` returns Buffer
* `mctl mkdir`
* `mctl rm [-r]`


1.6.0 (2021-01-05)
------------------

* renamed `examples/cli.js` -> `examples/mctl.js` (and `yarn cli` to `yarn mctl`)
* `mctl repl`: open a REPL terminal
* `mctl version`: print the current version


1.5.2 (2021-01-05)
-----------------------

* Command-line tool `mctl` (`examples/cli.js`)
* bugfix in `listFiles` for browser
