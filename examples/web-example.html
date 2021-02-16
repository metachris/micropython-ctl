<!doctype html>
<html lang="en">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">

  <!-- Bootstrap CSS -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.5.3/dist/css/bootstrap.min.css" integrity="sha384-TX8t27EcRE3e/ihU7zmQxVncDAy5uIKz4rEkgIXeMed4M0jlfIDPvg6uqKI2xXr2" crossorigin="anonymous">

  <!-- MicroPythonCtl JS -->
  <script src="https://cdn.jsdelivr.net/npm/micropython-ctl@1.10.0/dist-browser/main.js"></script>
  <!-- <script src="../dist-browser/main.js"></script> -->
  <!-- <script src="../dist-esbuild/browser.js"></script> -->

  <title>MicroPythonCtl Example</title>

  <style>
    .container {
      margin-top: 40px;
    }

    #output {
      margin-top: 20px;
    }
  </style>
</head>

<body>
  <div class="container">

    <h1>micropython-ctl Browser Example</h1>

    <a href="https://github.com/metachris/micropython-ctl">https://github.com/metachris/micropython-ctl</a>
    <br><br>

    <div>
      <form class="form-inline">

        <div class="input-group mb-3">
          <label class="sr-only" for="inlineFormInputGroupUsername2">Host:</label>
          <div class="input-group mb-2 mr-sm-2">
            <div class="input-group-prepend">
              <div class="input-group-text">Host:</div>
            </div>
            <input type="text" class="form-control" id="txtHost" placeholder="IP Address">
          </div>

          <label class="sr-only" for="inlineFormInputGroupUsername2">Password:</label>
          <div class="input-group mb-2 mr-sm-2">
            <div class="input-group-prepend">
              <div class="input-group-text">Password:</div>
            </div>
            <input type="text" class="form-control" id="txtPassword" placeholder="password">
          </div>

          <button type="button" class="btn btn-primary mb-2" id="btnConnect" onclick="connect()">Connect</button>
      </form>
    </div>

    <div id="status">Disconnected</div>
    <div id="output"></div>
  </div> <!-- EOF container -->

</body>
</html>

<script>
  let micropython = null;

  const DIV_STATUS = document.getElementById('status')
  const DIV_OUTPUT = document.getElementById('output')
  const INPUT_HOST = document.getElementById('txtHost')
  const INPUT_PASS = document.getElementById('txtPassword')
  const BTN_CONNECT = document.getElementById('btnConnect')

  // Restore remembered host and password values (from localStorage)
  INPUT_HOST.value = localStorage.getItem('MicroPythonCtl:Host')
  INPUT_PASS.value = localStorage.getItem('MicroPythonCtl:Password')

  // Connect to device on button click
  async function connect() {
    DIV_STATUS.textContent = BTN_CONNECT.textContent = 'Connecting...'

    // Save login details for next page load
    const host = INPUT_HOST.value
    const password = INPUT_PASS.value
    localStorage.setItem('MicroPythonCtl:Host', host)
    localStorage.setItem('MicroPythonCtl:Password', password)

    // Connect
    micropython = new MicroPythonCtl.MicroPythonDevice()
    try {
      await micropython.connectNetwork(host, password)
    } catch (e) {
      DIV_STATUS.innerHTML = `Error: ${e.message}`
      BTN_CONNECT.textContent = 'Connect'
      return
    }
    DIV_STATUS.innerHTML = BTN_CONNECT.textContent = 'Connected'

    // onclose is a function which is called when the connection is closed
    micropython.onclose = () => DIV_STATUS.textContent = BTN_CONNECT.textContent = "Disconnected"

    // Display board info
    DIV_OUTPUT.innerHTML += `<p>Getting board info...</p>`
    const boardInfo = await micropython.getBoardInfo()
    DIV_OUTPUT.innerHTML += '<pre>' + JSON.stringify(boardInfo, null, 4) + '</pre> <hr>'

    // Run a Python script and capture the output
    const script = 'import os; print(os.listdir())'
    DIV_OUTPUT.innerHTML += `<p>Running a Python script: <tt>${script}</tt> ...</p>`
    const output = await micropython.runScript(script)
    DIV_OUTPUT.innerHTML += '<pre>' + output + '</pre> <hr>'

    // List all files in the root
    DIV_OUTPUT.innerHTML += '<p>Listing files...</p>'
    const files = await micropython.listFiles('/', { recursive: true })
    console.log('files', files)
    const s = files.map(file => `${file.size}b\t${file.filename}`).join('\n')
    DIV_OUTPUT.innerHTML += '<pre>' + s + '</pre> <hr>'
  }
</script>
