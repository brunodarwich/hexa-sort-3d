import { Capacitor } from '@capacitor/core';
import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import { supabase, isSupabaseConfigured } from './supabase.js';
import { authService } from './auth.js';

const LOCAL_INVENTORY_KEY = 'hexa_sort_player_inventory_v2';

function getLocalStoredInventory() {
  try {
    const raw = localStorage.getItem(LOCAL_INVENTORY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        reroll: Math.max(0, Number(parsed.reroll) || 0),
        lightning: Math.max(0, Number(parsed.lightning) || 0)
      };
    }
  } catch (e) {}
  return { reroll: 0, lightning: 0 };
}

function saveLocalStoredInventory(inv) {
  try {
    localStorage.setItem(LOCAL_INVENTORY_KEY, JSON.stringify({
      reroll: Math.max(0, Number(inv.reroll) || 0),
      lightning: Math.max(0, Number(inv.lightning) || 0)
    }));
  } catch (e) {}
}

class PaymentService {
  constructor() {
    this.inventory = getLocalStoredInventory();
    this.inventoryListeners = [];
    this.inventoryOwner = null;
    this.orderGeneration = 0;
    this.debitPending = false;
    this.revenueCatConfigured = false;

    // Inicialização assíncrona da sessão e RevenueCat
    authService.onAuthStateChanged((user) => {
      if (user?.id === this.inventoryOwner) return;
      this.inventoryOwner = user?.id || null;
      this.fetchInventory().catch(() => {});
      this.unsubscribeOrder();
      if (user?.id && this.isNativePlatform()) {
        this.ensureRevenueCatConfigured(user.id).catch(err => console.warn('Falha ao configurar RevenueCat:', err));
      }
    });

    // Buscar inventário inicial
    setTimeout(() => {
      this.fetchInventory().catch(() => {});
    }, 100);
  }

  isNativePlatform() { return Capacitor.isNativePlatform(); }
  getInventory() { return { ...this.inventory }; }
  
  setInventory(inv) {
    const nextReroll = Math.max(0, Number(inv?.reroll ?? inv?.reroll_count) || 0);
    const nextLightning = Math.max(0, Number(inv?.lightning ?? inv?.lightning_count) || 0);
    this.inventory = { reroll: nextReroll, lightning: nextLightning };
    saveLocalStoredInventory(this.inventory);
    this.inventoryListeners.forEach(listener => listener(this.getInventory()));
  }

  async ensureRevenueCatConfigured(userId) {
    if (!this.isNativePlatform()) return;
    try {
      const apiKey = import.meta.env.VITE_REVENUECAT_GOOGLE_API_KEY || import.meta.env.VITE_REVENUECAT_PUBLIC_KEY;
      if (!apiKey) {
        console.warn('Chave pública do RevenueCat não configurada.');
        return;
      }
      if (!this.revenueCatConfigured) {
        await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
        await Purchases.configure({ apiKey, appUserID: userId });
        this.revenueCatConfigured = true;
      } else if (userId) {
        await Purchases.logIn({ appUserID: userId });
      }
    } catch (e) {
      console.warn('Erro ao configurar RevenueCat:', e);
    }
  }

  async fetchInventory() {
    if (!isSupabaseConfigured || !supabase) return this.getInventory();
    try {
      const session = await authService.ensureSession();
      const owner = session?.user?.id;
      if (!owner) return this.getInventory();
      this.inventoryOwner = owner;
      const { data, error } = await supabase.from('player_inventory')
        .select('reroll_count, lightning_count').eq('player_id', owner).maybeSingle();
      if (error) throw error;
      if (data && this.inventoryOwner === owner) {
        // Se o backend tem valores registrados maiores, sincroniza
        const serverReroll = Number(data.reroll_count) || 0;
        const serverLightning = Number(data.lightning_count) || 0;
        const current = this.getInventory();
        this.setInventory({
          reroll: Math.max(current.reroll, serverReroll),
          lightning: Math.max(current.lightning, serverLightning)
        });
      }
    } catch (error) {
      console.warn('Inventário online indisponível:', error.message);
    }
    return this.getInventory();
  }

  async consumePowerUp(type) {
    if (this.debitPending || !['reroll', 'lightning'].includes(type)) return false;
    const current = this.getInventory();
    if (current[type] <= 0) return false;

    this.debitPending = true;
    try {
      // 1. Tentar débito atômico no Supabase se houver conexão
      if (isSupabaseConfigured && supabase) {
        try {
          await authService.ensureSession();
          const { data, error } = await supabase.rpc('consume_powerup', { p_type: type });
          if (!error && data) {
            this.setInventory(data);
            return true;
          }
        } catch (rpcErr) {
          console.warn('RPC consume_powerup falhou, consumindo localmente:', rpcErr?.message || rpcErr);
        }
      }

      // 2. Fallback gracioso imediato para saldo local garantido
      if (current[type] > 0) {
        const next = { ...current, [type]: current[type] - 1 };
        this.setInventory(next);
        return true;
      }
      return false;
    } finally {
      this.debitPending = false;
    }
  }

  async purchaseNative(productId) {
    if (!this.isNativePlatform()) {
      throw new Error('Compras nativas estão disponíveis apenas no aplicativo Android.');
    }
    const session = await authService.ensureSession();
    const userId = session?.user?.id;
    await this.ensureRevenueCatConfigured(userId);

    // Mapeamento de identificadores de itens para pacotes oficiais
    let effectiveId = productId;
    if (productId === 'lightning') effectiveId = 'pack_lightning';
    if (productId === 'reroll') effectiveId = 'pack_reroll';

    let purchaseResult = null;

    // 1. Tentar localizar o pacote pela Offering configurada no RevenueCat
    try {
      const offerings = await Purchases.getOfferings();
      const currentOffering = offerings?.current;
      let targetPackage = null;

      if (currentOffering && currentOffering.availablePackages) {
        targetPackage = currentOffering.availablePackages.find(p => 
          p.product?.identifier === effectiveId ||
          p.identifier === effectiveId ||
          (effectiveId === 'pack_lightning' && (p.product?.identifier?.includes('lightning') || p.identifier?.includes('lightning'))) ||
          (effectiveId === 'pack_reroll' && (p.product?.identifier?.includes('reroll') || p.identifier?.includes('reroll'))) ||
          (effectiveId === 'combo_pack' && (p.product?.identifier?.includes('combo') || p.identifier?.includes('combo')))
        );
      }

      if (targetPackage) {
        purchaseResult = await Purchases.purchasePackage({ aPackage: targetPackage });
      } else {
        // 2. Fallback direto buscando os produtos não-assinatura
        const productsRes = await Purchases.getProducts({
          productIdentifiers: [effectiveId, 'pack_lightning', 'pack_reroll', 'combo_pack'],
          type: 'NON_SUBSCRIPTION'
        });

        const matchedProduct = productsRes?.products?.find(p => 
          p.identifier === effectiveId ||
          (effectiveId === 'pack_lightning' && p.identifier.includes('lightning')) ||
          (effectiveId === 'pack_reroll' && p.identifier.includes('reroll')) ||
          (effectiveId === 'combo_pack' && p.identifier.includes('combo'))
        ) || productsRes?.products?.[0];

        if (matchedProduct) {
          purchaseResult = await Purchases.purchaseStoreProduct({ product: matchedProduct });
        }
      }
    } catch (purchaseError) {
      console.error('Erro na compra RevenueCat:', purchaseError);
      throw purchaseError;
    }

    if (!purchaseResult) {
      throw new Error(`Produto "${productId}" não disponível na loja.`);
    }

    // 3. Crédito Otimista Imediato no Inventário Local
    const delta = { reroll: 0, lightning: 0 };
    if (effectiveId === 'pack_lightning' || effectiveId.includes('lightning')) {
      delta.lightning = 4;
    } else if (effectiveId === 'pack_reroll' || effectiveId.includes('reroll')) {
      delta.reroll = 4;
    } else if (effectiveId === 'combo_pack' || effectiveId.includes('combo')) {
      delta.reroll = 4;
      delta.lightning = 4;
    }

    const cur = this.getInventory();
    this.setInventory({
      reroll: cur.reroll + delta.reroll,
      lightning: cur.lightning + delta.lightning
    });

    // 4. Polling assíncrono para sincronizar saldo quando o webhook do RevenueCat processar
    [1500, 3500, 6000].forEach((delay) => {
      setTimeout(() => { void this.fetchInventory(); }, delay);
    });

    return purchaseResult;
  }

  async request(functionName, body) {
    const session = await authService.ensureSession();
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(body)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Serviço indisponível. Tente novamente.');
    return data;
  }

  createPixOrder(itemType, forceNew = false) { return this.request('create-pix-order', { itemType, forceNew }); }
  createStripeCheckout(itemType) {
    const returnUrl = typeof window !== 'undefined' ? window.location.origin : null;
    return this.request('create-stripe-session', { itemType, returnUrl });
  }

  subscribeToOrder(orderId, onPaidCallback) {
    this.unsubscribeOrder();
    if (!supabase) return;
    const generation = this.orderGeneration;
    let checking = false;
    const check = async () => {
      if (checking || generation !== this.orderGeneration) return;
      checking = true;
      try {
        const { data, error } = await supabase.from('payment_orders').select('status').eq('id', orderId).single();
        if (error) throw error;
        if (generation !== this.orderGeneration) return;
        if (data.status === 'paid') {
          this.unsubscribeOrder();
          const deliveryGeneration = this.orderGeneration;
          await this.fetchInventory();
          if (deliveryGeneration === this.orderGeneration) await onPaidCallback(data);
        } else if (['expired', 'refunded'].includes(data.status)) {
          this.unsubscribeOrder();
          window.dispatchEvent(new CustomEvent('payment-status', { detail: data.status }));
        }
      } catch (error) { console.warn('Aguardando conexão para consultar pagamento:', error.message); }
      finally { checking = false; }
    };
    this.activeOrderSubscription = supabase.channel(`order_${orderId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'payment_orders', filter: `id=eq.${orderId}` }, check).subscribe();
    this.orderTimer = setInterval(check, 5000);
    check();
  }

  unsubscribeOrder() {
    this.orderGeneration++;
    clearInterval(this.orderTimer);
    if (this.activeOrderSubscription && supabase) supabase.removeChannel(this.activeOrderSubscription);
    this.activeOrderSubscription = null;
  }

  onInventoryChange(callback) {
    this.inventoryListeners.push(callback);
    callback(this.getInventory());
    return () => { this.inventoryListeners = this.inventoryListeners.filter(cb => cb !== callback); };
  }
}
export const paymentService = new PaymentService();

