next
----
* `mctl put <filename> --changed-only`: flag to check hash and upload only if changed (useful for large files, downside it needs to calculate the hash before uploading)


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
