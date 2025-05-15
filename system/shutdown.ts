export const shutdownCtlr: AbortController = new AbortController;

export function addShutdownHandler(): void {

  function signalHandler() {
    if (shutdownCtlr.signal.aborted) {
      console.error('- interrupted again! Bye');
      Deno.exit(55);
    }
    console.error('- interrupted!');
    shutdownCtlr.abort();
  }

  // Catches ctrl-c during interactive use:
  Deno.addSignalListener('SIGINT', signalHandler);

  // Catches container termination when deployed:
  Deno.addSignalListener('SIGTERM', signalHandler);

  // Workaround for '--watch' interacting badly with our signal listeners
  // Issue is mentioned here: https://github.com/denoland/deno/issues/7590#issuecomment-1857591724
  // I have not found the energy to open a proper dedicated Deno issue for this yet
  globalThis.addEventListener('unload', () => {
    Deno.removeSignalListener('SIGINT', signalHandler);
    Deno.removeSignalListener('SIGTERM', signalHandler);
  });

}
