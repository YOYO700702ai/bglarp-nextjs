export const FLAGSHIP_PRICE_MIN = 900;
export const FLAGSHIP_SCRIPT_LABEL = '旗艦劇本';

export function isFlagshipScript(card) {
  const hasFixedPrice = card?.priceStatus === 'fixed'
    || (card?.priceStatus == null && typeof card?.price === 'number');

  return hasFixedPrice
    && Number.isFinite(card.price)
    && card.price >= FLAGSHIP_PRICE_MIN;
}
