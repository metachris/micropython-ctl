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
