import { WebREPL } from '../src/main';
import { ScriptExecutionError } from '../src/errors';
import * as TestScripts from './test-scripts';

const HOST = process.env.WEBREPL_HOST || '10.12.50.25'; // '10.12.50.101', '10.0.1.10'
const PASSWORD = process.env.WEBREPL_PASSWORD || 'test';

(async () => {
  // Create webrepl instance and connect
  const webrepl = new WebREPL()

  try {
    console.log(`connecting to: ${HOST}`)
    await webrepl.connect(HOST, PASSWORD)

    // Run a Python command / script
    const script = TestScripts.simpleRange
    const scriptOutput = await webrepl.runScript(script)
    console.log('->', scriptOutput)

  } catch (e) {
    if (e instanceof ScriptExecutionError) {
      console.log('script execution error:', e.message)

    } else {
      console.error(e.message)
    }

  } finally {
    webrepl.close()
  }
})()
