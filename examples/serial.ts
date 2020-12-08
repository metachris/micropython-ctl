import serialport from "serialport"
import { ScriptExecutionError, WebREPL } from '../src/main';

(async () => {
  // const d = await serialport.list()
  // console.log(d)

  const webrepl = new WebREPL()
  await webrepl.connectSerial('/dev/tty.SLAB_USBtoUART')
})()
