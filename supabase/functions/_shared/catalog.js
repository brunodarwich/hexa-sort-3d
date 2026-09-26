// Shared by the storefront and checkout handlers. Never accept prices from a client.
export const PRODUCTS = Object.freeze({
  reroll: Object.freeze({ name: '1 troca de pilhas', description: 'Troca as 3 pilhas disponíveis', quantity: 1, brlCents: 25, usdCents: null, icon: '🔄' }),
  lightning: Object.freeze({ name: '1 raio', description: 'Elimina até 3 pilhas do tabuleiro', quantity: 1, brlCents: 25, usdCents: null, icon: '⚡' }),
  pack_reroll: Object.freeze({ name: '4 trocas de pilhas', description: 'Pacote com 4 usos', quantity: 4, brlCents: 100, usdCents: 100, icon: '🔄' }),
  pack_lightning: Object.freeze({ name: '4 raios', description: 'Pacote com 4 usos', quantity: 4, brlCents: 100, usdCents: 100, icon: '⚡' }),
  combo_pack: Object.freeze({ name: 'Combo Mestre', description: '8 raios + 8 trocas de pilhas', quantity: 8, brlCents: 299, usdCents: 180, icon: '⚡🔄' })
});

const PRODUCT_ALIASES = Object.freeze({
  powerup_lightning_4x: 'pack_lightning',
  powerup_reroll_4x: 'pack_reroll',
  powerup_hammer_4x: 'pack_lightning',
  powerup_swap_4x: 'pack_reroll',
  combo_mestre: 'combo_pack'
});

export function getProduct(id) {
  const normalizedId = PRODUCT_ALIASES[id] || id;
  return Object.hasOwn(PRODUCTS, normalizedId) ? PRODUCTS[normalizedId] : null;
}

export function formatBRL(cents) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}
