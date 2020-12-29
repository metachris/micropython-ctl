#!/bin/bash
yarn clean
yarn buildNode
yarn buildBrowser
rm -f dist-browser/main.js.LICENSE.txt

version=`git describe --tags`
content=`tail -n 2 dist-browser/main.js`
echo "/* https://github.com/metachris/micropython-ctl | $version | MIT License | reach out: https://twitter.com/metachris */" > dist-browser/main.js
echo "$content" >> dist-browser/main.js

gzip < dist-browser/main.js > dist-browser/main.js.gz
