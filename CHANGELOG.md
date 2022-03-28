# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [1.13.8](https://github.com/metachris/micropython-ctl/compare/v1.13.4...v1.13.8) (2022-02-10)


### Bug Fixes

* add ctrl+x for exit (ctrl+k taken in vscode) ([5b7bc4b](https://github.com/metachris/micropython-ctl/commit/5b7bc4bcf456b450ae8c89e6f7bde99324a8a090))
* bump + fix for serialport ([179cff7](https://github.com/metachris/micropython-ctl/commit/179cff7ab3e465374b1e81cc8c46d3bb89a238a5))
* serialport bad version ([e8a61a4](https://github.com/metachris/micropython-ctl/commit/e8a61a41b8ca8a1514382836a71b3359449ea98e))

1.13.8-beta1 (dev)
------------------

https://github.com/metachris/micropython-ctl/pull/8

* cli: guess /dev/tty device by ending of `-t` argument
  * searches for files that start with `/dev/tty` and end with the argument
  * eg. `mctl ls -t USB0` uses `/dev/ttyUSB0`
  * so does `mctl ls -t 0`
* end repl fix
* more debug output


1.13.4 (2020-03-15)
-------------------
* `putFile`: run gc.collect by default
* added `main.gcCollect()`
* should help with out-of-memory issues with larger file uploads (mctl sync)


1.13.2 (2021-03-12)
-------------------
* Proxy mode also works with webrepl/network connection

1.13.0 (2021-03-12)
-------------------
* `mctl sync`: synchronize a directory onto the device. checks file hashes and only uploads changed ones, deletes removed one.
* `listFiles` can now include sha256 hash (also `mctl ls --include-hash`)
* `mctl put`: `--changed-only` flag to check hash and upload only if changed (useful for large files, downside it needs to calculate the hash before uploading)
* `mctl repl` opens a webserver allowing other `mctl` processes to reuse that session for running scripts
* connect bugfix (implemented `readUntil`)
* major `runScript` speed improvements (tests run in 10s, before 16s)


1.11.2 (2021-03-09)
-------------------
* fix for `mctl rm / -r` (threw an error on some devices)


1.11.0 (26.2.2021)
------------------
* Establishing a connection doesn't kill running MicroPython process (eg. `mctl repl`, etc.)
* `ls` with JSON output
* `runScript` options: `runGcCollectBeforeCommand`
* various smaller fixes and improvements


1.10.0 (28.1.2021)
------------------

* First feature-complete, allround tested version.
* `mctl` works on Windows, Linux and macOS!
* See also https://github.com/metachris/micropython-ctl
