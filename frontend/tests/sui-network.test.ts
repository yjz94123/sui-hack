import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSuiNetwork, toSuiChain } from '../src/config/network';

test('parseSuiNetwork falls back to testnet for invalid values', () => {
  assert.equal(parseSuiNetwork(undefined), 'testnet');
  assert.equal(parseSuiNetwork(''), 'testnet');
  assert.equal(parseSuiNetwork('unknown'), 'testnet');
  assert.equal(parseSuiNetwork('mainnet'), 'mainnet');
  assert.equal(parseSuiNetwork('DEVNET'), 'devnet');
});

test('toSuiChain builds wallet chain string', () => {
  assert.equal(toSuiChain('testnet'), 'sui:testnet');
  assert.equal(toSuiChain('mainnet'), 'sui:mainnet');
  assert.equal(toSuiChain('devnet'), 'sui:devnet');
});
