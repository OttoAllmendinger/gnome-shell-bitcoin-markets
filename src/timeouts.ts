import * as GLib from '@imports/GLib-2.0';

const timeoutIds: number[] = [];

export function timeoutAdd(intervalMS: number, callback: () => void): number {
  const sourceId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, intervalMS, () => {
    callback();
    return true;
  });
  timeoutIds.push(sourceId);
  return sourceId;
}

export function removeAllTimeouts() {
  timeoutIds.forEach((sourceId) => {
    GLib.Source.remove(sourceId);
  });
}
