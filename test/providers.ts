import { describe, it } from 'mocha';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { createHash } from 'crypto';

import axios from 'axios';

import { BaseProvider, getProvider, ProviderKey, Providers } from '../src/providers';

async function getCached(apiName, url) {
  try {
    await mkdir('.cache');
  } catch (e) {
    if (e.code !== 'EEXIST') {
      throw e;
    }
  }
  const hash = createHash('sha256').update(url).digest().toString('hex');
  const path = `.cache/${apiName}_${hash}.json`;
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (e) {
    if (e.code !== 'ENOENT') {
      throw e;
    }
  }

  const { data } = await axios.get(url);
  await writeFile(path, JSON.stringify(data, null, 2), 'utf8');
  return data;
}

describe('providers', function () {
  Object.keys(Providers).forEach((name: ProviderKey) => {
    it(`${name}`, async function () {
      const provider = getProvider(name);
      const ticker: BaseProvider.Ticker = provider.getDefaultTicker();
      const url = provider.getUrl(ticker);

      let respBody;
      try {
        respBody = await getCached(name, url);
      } catch (e) {
        if (e.response) {
          console.log(e.response.data);
        }
        throw e;
      }

      const tickerFmt = `[${ticker.base}/${ticker.quote}]`;
      try {
        const amount = provider.parseData(respBody, ticker);
        console.log(
          `${name.padEnd(24)} ${tickerFmt.padStart(20)} ${amount
            .toLocaleString(undefined, {
              minimumFractionDigits: 4,
              maximumFractionDigits: 4,
            })
            .padStart(32)}`,
        );
      } catch (e) {
        console.log(`error parsing response`, url, respBody);
        throw e;
      }
    });
  });
});
