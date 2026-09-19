import { fileURLToPath } from 'node:url';
import { webkit } from '@playwright/test';

// The macOS test embedder can strand native window-animation threads in long
// unattended runs. NSArgumentDomain applies only to the launched process.
// Keep the managed browser/version, default arguments, assertions and timeouts.
export function webkitLaunchOptions(platform = process.platform) {
  if (platform !== 'darwin') return {};
  return {
    executablePath: fileURLToPath(new URL('./launch-webkit-macos.sh', import.meta.url)),
    env: { ...process.env, APW_WEBKIT_EXECUTABLE: webkit.executablePath() },
  };
}
