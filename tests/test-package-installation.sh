#!/bin/bash
#
# Tests for module installation (to run on macOS and Linux)
#
set -eEu -o pipefail

if [ $# -eq 0 ]; then
  echo "Missing package as argument"
  exit 1
fi

on_error() {
  echo "ERROR"
}
trap on_error ERR

PACKAGE=`realpath $1`
echo "Package to test: $PACKAGE"

# Create empty project directory
DIR="/tmp/mctl-test"
rm -rf $DIR && mkdir $DIR && cd $DIR && npm init -y

echo "Uninstall and clear caches..."
npm uninstall --global micropython-ctl fuse-native
(cd `yarn cache dir` && rm -rf npm-micropython-ctl-*)

echo "-------------------------------------"
echo "Testing local installation..."
echo "-------------------------------------"
npm install $PACKAGE

echo "Testing mctl..."
./node_modules/.bin/mctl ls
./node_modules/.bin/mctl run-tests
./node_modules/.bin/mctl mount || true

echo "-------------------------------------"
echo "Testing global installation..."
echo "-------------------------------------"
cd /tmp && rm -rf $DIR
npm install -g $PACKAGE

echo "Testing mctl..."
which mctl
mctl ls
mctl run-tests
mctl mount || true

echo "✅ All tests successful!"
