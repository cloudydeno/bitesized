export class Cli {
  constructor(
    public readonly label: string,
  ) {}

  die(template: TemplateStringsArray, ...stuff: unknown[]): never {
    const rendered = String.raw(template, ...stuff.map(() => '%o'));
    console.error(`\n%c${this.label}%c: ${rendered}\n`, 'color: red', '', ...stuff);
    Deno.exit(1);
  }

  log(template: TemplateStringsArray, ...stuff: unknown[]): void {
    const rendered = String.raw(template, ...stuff.map(() => '%o'));
    console.info(`\n%c${this.label}%c: ${rendered}`, 'color: gray', '', ...stuff);
  }
}
