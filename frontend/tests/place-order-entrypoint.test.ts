import test from 'node:test';
import assert from 'node:assert/strict';
import { selectPlaceOrderEntrypoint } from '../src/contracts/place-order-entrypoint';

test('prefers public_place_order when available', () => {
  const entrypoint = selectPlaceOrderEntrypoint({
    public_place_order: 6,
    place_order: 7,
  });

  assert.equal(entrypoint?.mode, 'public_place_order');
  assert.equal(entrypoint?.requiresAdminCap, false);
  assert.equal(entrypoint?.includePriceBps, true);
});

test('uses place_order_user when public entry is missing', () => {
  const entrypoint = selectPlaceOrderEntrypoint({
    place_order_user: 5,
  });

  assert.equal(entrypoint?.mode, 'place_order_user');
  assert.equal(entrypoint?.requiresAdminCap, false);
  assert.equal(entrypoint?.includePriceBps, false);
});

test('falls back to legacy admin place_order when no user entry exists', () => {
  const entrypoint = selectPlaceOrderEntrypoint({
    place_order: 7,
  });

  assert.equal(entrypoint?.mode, 'place_order');
  assert.equal(entrypoint?.requiresAdminCap, true);
  assert.equal(entrypoint?.includePriceBps, false);
});

test('returns null when no order entry is exposed', () => {
  const entrypoint = selectPlaceOrderEntrypoint({
    settle_market: 5,
  });

  assert.equal(entrypoint, null);
});
