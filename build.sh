#!/bin/bash
set -eu -o pipefail  # Abort on errors, disallow undefined variables
yarn clean

# Build Node.js version
yarn build-node
cd dist-node
cp ../package.json .
cd ..

# Build browser version
yarn build-browser
rm -f dist-browser/main.js.LICENSE.txt

version=`git describe --tags`
content=`tail -n 2 dist-browser/main.js`
echo "/* https://github.com/metachris/micropython-ctl | $version | MIT License | reach out: https://twitter.com/metachris */" > dist-browser/main.js
echo "$content" >> dist-browser/main.js

gzip < dist-browser/main.js > dist-browser/main.js.gz
