/**
 * src/services/paymentService.js
 * Gerenciamento de inventário de power-ups, pedidos Pix (Mercado Pago) e Stripe
 */

import { supabase, isSupabaseConfigured } from './supabase.js';
import { authService } from './auth.js';

const INVENTORY_CACHE_KEY = 'hexa_sort_inventory_v2';
const REGION_PREF_KEY = 'hexa_sort_user_region';

class PaymentService {
  constructor() {
    this.inventory = this.loadLocalInventory();
    this.inventoryListeners = [];
    this.activeOrderSubscription = null;
  }

  loadLocalInventory() {
    try {
      const saved = localStorage.getItem(INVENTORY_CACHE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {}
    return { reroll: 0, lightning: 0 };
  }

  saveLocalInventory(inv) {
    this.inventory = { ...this.inventory, ...inv };
    try {
      localStorage.setItem(INVENTORY_CACHE_KEY, JSON.stringify(this.inventory));
    } catch (e) {}
    this.notifyInventoryListeners();
  }

  getInventory() {
    return { ...this.inventory };
  }

  /**
   * Sincroniza inventário com o banco Supabase
   */
  async fetchInventory() {
    const playerId = authService.getActivePlayerId();
    if (!isSupabaseConfigured || !supabase || !playerId) {
      return this.inventory;
    }

    try {
      const { data, error } = await supabase
        .from('player_inventory')
        .select('*')
        .eq('player_id', playerId)
        .maybeSingle();

      if (error) {
        console.warn('Aviso ao buscar inventário online:', error.message);
        return this.inventory;
      }

      if (data) {
        this.saveLocalInventory({
          reroll: data.reroll_count || 0,
          lightning: data.lightning_count || 0
        });
      } else {
        // Inicializar com 0 se ainda não existir registro
        await supabase.from('player_inventory').insert({
          player_id: playerId,
          reroll_count: this.inventory.reroll || 0,
          lightning_count: this.inventory.lightning || 0
        });
      }
    } catch (e) {
      console.warn('Erro ao sincronizar inventário:', e);
    }

    return this.inventory;
  }

  /**
   * Consome 1 uso do power-up (retorna true se tinha saldo e consumiu)
   */
  async consumePowerUp(type) {
    const countKey = type === 'reroll' ? 'reroll' : 'lightning';
    if ((this.inventory[countKey] || 0) <= 0) {
      return false;
    }

    const newCount = this.inventory[countKey] - 1;
    this.saveLocalInventory({ [countKey]: newCount });

    // Atualizar no Supabase em background
    const playerId = authService.getActivePlayerId();
    if (isSupabaseConfigured && supabase && playerId) {
      const dbColumn = type === 'reroll' ? 'reroll_count' : 'lightning_count';
      supabase
        .from('player_inventory')
        .update({ [dbColumn]: newCount, updated_at: new Date().toISOString() })
        .eq('player_id', playerId)
        .then(({ error }) => {
          if (error) console.warn('Erro ao decrementar inventário no Supabase:', error);
        });
    }

    return true;
  }

  /**
   * Credita usos de power-up localmente e no banco
   */
  async creditPowerUp(type, amount = 1) {
    if (type === 'combo_pack') {
      this.saveLocalInventory({
        reroll: (this.inventory.reroll || 0) + 10,
        lightning: (this.inventory.lightning || 0) + 10
      });
    } else {
      const countKey = type === 'reroll' || type === 'pack_reroll' ? 'reroll' : 'lightning';
      this.saveLocalInventory({
        [countKey]: (this.inventory[countKey] || 0) + amount
      });
    }
  }

  /**
   * Detecta se o usuário está no Brasil ou Exterior
   */
  detectPlayerRegion() {
    const saved = localStorage.getItem(REGION_PREF_KEY);
    if (saved === 'BR' || saved === 'INTL') return saved;

    const lang = (navigator.language || navigator.userLanguage || '').toLowerCase();
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';

    if (lang.startsWith('pt') || timeZone.includes('Sao_Paulo') || timeZone.includes('Brazil')) {
      return 'BR';
    }
    return 'INTL';
  }

  setPlayerRegion(region) {
    try {
      localStorage.setItem(REGION_PREF_KEY, region);
    } catch (e) {}
  }

  /**
   * Cria uma ordem de Pix chamando a Supabase Edge Function
   */
  async createPixOrder(itemType, recoveryEmail = '') {
    const playerId = authService.getActivePlayerId();
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl) {
      throw new Error('Supabase URL não configurada.');
    }

    const res = await fetch(`${supabaseUrl}/functions/v1/create-pix-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`
      },
      body: JSON.stringify({
        playerId: playerId,
        itemType: itemType,
        recoveryEmail: recoveryEmail
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Falha ao gerar cobrança Pix.');
    }

    return await res.json();
  }

  /**
   * Simula a confirmação do pagamento (para testes e sandbox)
   */
  async simulatePayment(orderId) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const res = await fetch(`${supabaseUrl}/functions/v1/mercadopago-webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`
      },
      body: JSON.stringify({
        action: 'simulate_test_payment',
        orderId: orderId
      })
    });

    return await res.json();
  }

  /**
   * Cria sessão de pagamento internacional no Stripe
   */
  async createStripeCheckout(itemType) {
    const playerId = authService.getActivePlayerId();
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const res = await fetch(`${supabaseUrl}/functions/v1/create-stripe-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`
      },
      body: JSON.stringify({
        playerId: playerId,
        itemType: itemType,
        successUrl: window.location.href,
        cancelUrl: window.location.href
      })
    });

    return await res.json();
  }

  /**
   * Escuta em tempo real a confirmação do pedido no Supabase
   */
  subscribeToOrder(orderId, onPaidCallback) {
    this.unsubscribeOrder();

    if (!isSupabaseConfigured || !supabase) return;

    const channelName = `order_${orderId}_${Date.now()}`;
    this.activeOrderSubscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payment_orders',
          filter: `id=eq.${orderId}`
        },
        async (payload) => {
          if (payload.new && payload.new.status === 'paid') {
            await this.fetchInventory();
            onPaidCallback(payload.new);
          }
        }
      )
      .subscribe();
  }

  unsubscribeOrder() {
    if (this.activeOrderSubscription && isSupabaseConfigured && supabase) {
      supabase.removeChannel(this.activeOrderSubscription);
      this.activeOrderSubscription = null;
    }
  }

  onInventoryChange(callback) {
    this.inventoryListeners.push(callback);
    callback(this.inventory);
    return () => {
      this.inventoryListeners = this.inventoryListeners.filter(cb => cb !== callback);
    };
  }

  notifyInventoryListeners() {
    for (const listener of this.inventoryListeners) {
      try {
        listener(this.inventory);
      } catch (e) {}
    }
  }
}

export const paymentService = new PaymentService();
