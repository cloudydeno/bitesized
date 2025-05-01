// Intended to be useful for piping together processes like in a Unix shell

export class SubProcess<Tstdin extends 'piped' | 'null' = 'piped' | 'null'> {
  constructor(
    public label: string,
    public opts: {
      errorPrefix: RegExp,

      cmd: string[];
      env?: Record<string,string>;
      stdin: Tstdin;
    },
  ) {
    try {
      this.proc = new Deno.Command(opts.cmd[0], {
        args: opts.cmd.slice(1),
        stdout: 'piped',
        stderr: 'piped',
        ...this.opts,
      }).spawn();
    } catch (error: unknown) {
      throw attachErrorData(error, this, -1,
        `Child process failed to launch: ${(error as Error).message}`);
    }

    this.#stdin = opts.stdin == 'piped' ? this.proc.stdin : null;
    this.#stderrText = new Response(this.proc.stderr)
      .text()
      .then(raw => {
        if (raw.length == 0) return [];
        const lines = raw.split('\n');
        if (lines[lines.length - 1] == '') lines.pop();
        for (const line of lines) {
          console.log(`${this.label}: ${line}`);
        }
        return lines;
      });
  }
  proc: Deno.ChildProcess;
  #stdin: WritableStream<Uint8Array> | null;
  #stderrText: Promise<string[]>;

  async status(): Promise<string[]> {
    const [stderr, status] = await Promise.all([
      this.#stderrText,
      this.proc.status,
    ]);
    if (status.code !== 0) {
      const errorText = stderr.find(x => x.match(this.opts.errorPrefix));
      const error = new Error(`Subprocess "${this.label}" (${this.opts.cmd.join(' ')}) failed with ${errorText || `exit code ${status.code}. Sorry about that.`}`);
      throw attachErrorData(error, this, status.code, errorText);
    }
    return stderr;
  }

  async writeInputText(text: string): Promise<void> {
    const stdin = this.#stdin;
    if (!stdin) throw new Error(`This process isn't writable`);
    this.#stdin = null;

    const writer = stdin.getWriter();
    await writer.write(new TextEncoder().encode(text));
    await writer.close();
  }
  async pipeInputFrom(source: SubProcess): Promise<{
    stderr: string[];
  }> {
    const stdin = this.#stdin;
    if (!stdin) throw new Error(`This process isn't writable`);
    this.#stdin = null;

    await source.proc.stdout.pipeTo(stdin);
    return {
      stderr: await this.status(),
    };
  }

  async captureAllOutput(): Promise<ArrayBuffer> {
    const [data] = await Promise.all([
      new Response(this.proc.stdout).arrayBuffer(),
      this.status(),
    ]);
    return data;
  }
  async captureAllTextOutput(): Promise<string> {
    const output = await this.captureAllOutput();
    return new TextDecoder().decode(output);
  }
  async captureAllJsonOutput(): Promise<unknown> {
    const output = await this.captureAllTextOutput();
    if (output[0] !== '{') throw new Error(`Expected JSON from "${this.opts.cmd.join(' ')}"`);
    return JSON.parse(output);
  }

  async toStreamingResponse(headers: Record<string,string>): Promise<{
    status: number;
    body: ReadableStream<Uint8Array<ArrayBuffer>>;
    headers: Headers;
  }> {
    this.status(); // throw this away because not really a way of reporting problems mid-stream
    return {
      status: 200,
      body: this.proc.stdout,
      headers: new Headers(headers),
    };
  }
}

interface SubprocessError extends Error {
  subproc: SubprocessErrorData;
}
export interface SubprocessErrorData {
  procLabel: string;
  cmdLine: string[];
  exitCode: number;
  foundError?: string;
}
function attachErrorData(error: unknown, proc: SubProcess, exitCode: number, foundError?: string): SubprocessError {
  const subErr = error as SubprocessError;
  subErr.subproc = {
    procLabel: proc.label,
    cmdLine: proc.opts.cmd,
    exitCode, foundError,
  };
  return subErr;
}
