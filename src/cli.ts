export async function runCli(): Promise<void> {
  throw new Error('CLI entrypoint is not implemented yet.');
}

if (require.main === module) {
  void runCli().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
