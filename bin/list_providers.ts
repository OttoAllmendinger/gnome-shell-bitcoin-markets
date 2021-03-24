import { Providers, getProvider } from '../src/providers';
function main() {
  process.stdout.write(
    Object.keys(Providers)
      .map((p) => '- ' + getProvider(p).apiName)
      .sort()
      .join('\n'),
  );
}

if (require.main === module) {
  main();
}
