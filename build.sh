#!/bin/bash
yarn clean
yarn buildNode
yarn buildBrowser
rm -f dist-browser/main.js.LICENSE.txt

content=`tail -n 2 dist-browser/main.js`
echo "/* MIT License | https://github.com/metachris/micropython-ctl | reach out: https://twitter.com/metachris */" > dist-browser/main.js
echo $content >> dist-browser/main.js

cp dist-browser/main.js dist-browser/main.js.1
gzip dist-browser/main.js
mv dist-browser/main.js.1 dist-browser/main.js
