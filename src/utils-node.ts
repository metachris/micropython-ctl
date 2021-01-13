import * as path from 'path';
import crypto from 'crypto';
import { tmpdir } from 'os';

export const getTmpFilename = (ext: string) => {
  return path.join(tmpdir(), crypto.randomBytes(16).toString('hex') + ext)
}
