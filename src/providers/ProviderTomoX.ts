import * as BaseProvider from './BaseProvider';

type TokenInfo = {
  address: string;
  decimal: number;
};

const tokenInfo: Record<string, TokenInfo> = {
  TOMO: { address: '0x0000000000000000000000000000000000000001', decimal: 18 },
  BTC: { address: '0xAE44807D8A9CE4B30146437474Ed6fAAAFa1B809', decimal: 8 },
  ETH: { address: '0x2EAA73Bd0db20c64f53fEbeA7b5F5E5Bccc7fb8b', decimal: 18 },
  USDT: { address: '0x381B31409e4D220919B2cFF012ED94d70135A59e', decimal: 6 },
  POMO: { address: '0X31E58CCA9ECAA057EDABACCFF5ABFBBC3443480C', decimal: 18 },
  YFI: { address: '0XE189A56891F6CA22797878E34992395A4AFBDE46', decimal: 18 },
  ORBYT: { address: '0X4DD28C75B28F05DF193B4E1BBB61CD186EB968C6', decimal: 18 },
  DEC: { address: '0xfEB9aE1cCEc15cD8CcD37894eF3E24EC5414e781', decimal: 18 },
  SRM: { address: '0xc01643aC912B6a8ffC50CF8c1390934A6142bc91', decimal: 6 },
  VNDC: { address: '0xC43A2df23dAfACb9106AB239896599B705E2e67e', decimal: 0 },
  FTX: { address: '0x33fa3c0c714638f12339F85dae89c42042a2D9Af', decimal: 18 },
};

function getTokenInfo(code: string): TokenInfo {
  if (!(code in tokenInfo)) {
    throw new Error(`no TokenInfo for ${code}`);
  }
  return tokenInfo[code];
}

export class Api extends BaseProvider.Api {
  apiName = 'TomoX(TomoChain)';

  apiDocs = [['API Docs', 'https://apidocs.tomochain.com/#tomodex-apis-trades']];

  interval = 15;

  getDefaultTicker(): BaseProvider.Ticker {
    return { base: 'TOMO', quote: 'USDT' };
  }

  getUrl({ base, quote }): string {
    const baseAddress = getTokenInfo(base).address;
    const quoteAddress = getTokenInfo(quote).address;
    return `https://dex.tomochain.com/api/pair/data?baseToken=${baseAddress}&quoteToken=${quoteAddress}`;
  }

  getLast({ data }): number {
    let decimal = 18;
    Object.keys(tokenInfo).forEach(function (key) {
      if (tokenInfo[key].address == data.pair.quoteToken) {
        decimal = tokenInfo[key].decimal;
      }
    });
    return data.close / Math.pow(10, decimal);
  }
}
