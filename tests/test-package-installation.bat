set FILE=E:\micropython-ctl-v1.10.0.tgz

echo "Uninstall and clear caches..."
call npm uninstall --global micropython-ctl node-fuse-bindings
cd C:\Users\IEUser\AppData\Local\Yarn\Cache\v6
rm -r npm-micropython-ctl-*

echo "Create empty project directory"
call rm -r C:\x\tests
mkdir C:\x\tests
cd C:\x\tests

echo "-------------------------------------"
echo "Testing local installation..."
echo "-------------------------------------"
call npm init -y
call npm install %FILE%

echo "Testing mctl..."
call ./node_modules/.bin/mctl version
call ./node_modules/.bin/mctl ls
call ./node_modules/.bin/mctl run-tests
call ./node_modules/.bin/mctl mount

echo "-------------------------------------"
echo "Testing global installation..."
echo "-------------------------------------"

cd ..
call rm -r C:\x\tests
call npm install -g %FILE%

echo "Testing mctl..."
call mctl version
call mctl ls
call mctl run-tests
call mctl mount

echo "All tests successful!"
