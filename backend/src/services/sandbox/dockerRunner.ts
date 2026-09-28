// backend/src/services/sandbox/dockerRunner.ts

import Docker from 'dockerode';
import { LANGUAGE_CONFIGS } from './languageConfigs';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const docker = new Docker();

interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  runtimeMs: number;
}

export async function runInSandbox(
  language: string,
  code: string,
  stdin: string,
  timeLimitMs: number,
  memoryLimitMb: number
): Promise<RunResult> {
  const config = LANGUAGE_CONFIGS[language];
  if (!config) throw new Error(`Unsupported language: ${language}`);

  // 1. Write code to a temp dir that we'll bind-mount into the container
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'urlap-'));
  const filePath = path.join(tmpDir, config.fileName);
  await fs.writeFile(filePath, code, 'utf8');

  const startTime = Date.now();
  let container: Docker.Container | null = null;
  let timedOut = false;

  try {
    // 2. Build the shell command: optional compile step, then run, feeding stdin
    const compilePart = config.compileCmd ? config.compileCmd.join(' ') + ' && ' : '';
    const runPart = config.runCmd.join(' ');
    const fullCmd = `${compilePart}${runPart}`;

    container = await docker.createContainer({
      Image: config.image,
      Cmd: ['sh', '-c', `echo "${stdin.replace(/"/g, '\\"')}" | ${fullCmd}`],
      WorkingDir: '/sandbox',
      HostConfig: {
        Binds: [`${tmpDir}:/sandbox`],
        Memory: memoryLimitMb * 1024 * 1024,
        MemorySwap: memoryLimitMb * 1024 * 1024, // disable swap
        CpuQuota: 50000, // 50% of one CPU
        NetworkMode: 'none', // ⚠️ no network access — critical for security
        AutoRemove: false,
        PidsLimit: 64, // prevent fork bombs
        ReadonlyRootfs: false,
      },
      AttachStdout: true,
      AttachStderr: true,
    });

    await container.start();

    // 3. Enforce the time limit ourselves — kill the container if it overruns
    const timeoutHandle = setTimeout(async () => {
      timedOut = true;
      try {
        await container?.kill();
      } catch {
        /* already stopped */
      }
    }, timeLimitMs);

    const stream = await container.attach({ stream: true, stdout: true, stderr: true });
    let stdout = '';
    let stderr = '';

    container.modem.demuxStream(
      stream,
      { write: (chunk: Buffer) => (stdout += chunk.toString()) },
      { write: (chunk: Buffer) => (stderr += chunk.toString()) }
    );

    const { StatusCode } = await container.wait();
    clearTimeout(timeoutHandle);

    return {
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      exitCode: StatusCode,
      timedOut,
      runtimeMs: Date.now() - startTime,
    };
  } finally {
    // 4. ALWAYS clean up — remove the container and temp files
    if (container) {
      try {
        await container.remove({ force: true });
      } catch {
        /* ignore */
      }
    }
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}