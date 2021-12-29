import * as assert from 'assert';
import { describe, it } from 'mocha';
import { getMoscowTime, toSegmentStr } from '../src/format/moscowTime';

describe('moscowTime', function () {
  it('formats correctly', function () {
    assert.strictEqual(toSegmentStr('10:00'), '🯱🯰:🯰🯰');
    assert.strictEqual(getMoscowTime(10_000), '🯱🯰🯰:🯰🯰');
    assert.strictEqual(getMoscowTime(100_000), '🯱🯰:🯰🯰');
    assert.strictEqual(getMoscowTime(1_000_000), '🯱:🯰🯰');
  });
});
