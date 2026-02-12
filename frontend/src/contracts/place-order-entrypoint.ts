export type PlaceOrderMode = 'public_place_order' | 'place_order_user' | 'place_order';

export interface PlaceOrderEntrypoint {
  mode: PlaceOrderMode;
  includePriceBps: boolean;
  requiresAdminCap: boolean;
}

function hasPriceParam(parameterCount: number, baseArgsWithoutPriceAndTx: number): boolean {
  // Move entry function parameters always include a trailing `&mut TxContext`.
  // baseArgsWithoutPriceAndTx = number of non-price business args before TxContext.
  // If there is exactly one extra arg, we treat it as `price_bps: u64`.
  return parameterCount === baseArgsWithoutPriceAndTx + 2;
}

export function selectPlaceOrderEntrypoint(
  functions: Partial<Record<PlaceOrderMode, number>>
): PlaceOrderEntrypoint | null {
  const publicParamCount = functions.public_place_order;
  if (typeof publicParamCount === 'number') {
    return {
      mode: 'public_place_order',
      includePriceBps: hasPriceParam(publicParamCount, 4),
      requiresAdminCap: false,
    };
  }

  const userParamCount = functions.place_order_user;
  if (typeof userParamCount === 'number') {
    return {
      mode: 'place_order_user',
      includePriceBps: hasPriceParam(userParamCount, 4),
      requiresAdminCap: false,
    };
  }

  const adminParamCount = functions.place_order;
  if (typeof adminParamCount === 'number') {
    return {
      mode: 'place_order',
      includePriceBps: hasPriceParam(adminParamCount, 6),
      requiresAdminCap: true,
    };
  }

  return null;
}
