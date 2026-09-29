import { 
  Agent, 
  Building, 
  ProductId, 
  ProductItem, 
  TownShop, 
  EconomicTransaction, 
  EconomyEventRecord, 
  TownEconomyState, 
  TownEvent,
  Relationship 
} from '../types/town';
import { clampNeed } from './NeedsSystem';

// ==========================================
// 1. 基准商品与初始店铺配置
// ==========================================

export const INITIAL_PRODUCTS: ProductItem[] = [
  {
    id: 'coffee',
    name: '星光手冲咖啡',
    category: 'drink',
    description: '苏清禾亲调的埃塞俄比亚水洗豆手冲咖啡，香气醇厚，提神醒脑。',
    basePrice: 12,
    currentPrice: 12,
    costPrice: 5,
    unit: '杯',
    targetBuildingId: 'cafe',
    satisfactionEffect: [
      { needType: 'hunger', value: -15 },
      { needType: 'energy', value: 28 },
      { needType: 'comfort', value: 20 },
      { needType: 'stress', value: -12 }
    ]
  },
  {
    id: 'bread',
    name: '暖阳蜂蜜欧包',
    category: 'food',
    description: '林小满清晨起早烘焙的金黄软欧包，麦香浓郁，抚平腹中饥渴。',
    basePrice: 10,
    currentPrice: 10,
    costPrice: 4,
    unit: '个',
    targetBuildingId: 'bakery',
    satisfactionEffect: [
      { needType: 'hunger', value: -55 },
      { needType: 'fun', value: 15 },
      { needType: 'energy', value: 20 },
      { needType: 'comfort', value: 18 }
    ]
  },
  {
    id: 'medicine',
    name: '百草宁神精油',
    category: 'health',
    description: '周景明采摘迷迭香与薄荷低温萃取的舒缓精油，安神固元。',
    basePrice: 26,
    currentPrice: 26,
    costPrice: 11,
    unit: '瓶',
    targetBuildingId: 'clinic',
    satisfactionEffect: [
      { needType: 'stress', value: -28 },
      { needType: 'comfort', value: 25 },
      { needType: 'health', value: 35 }
    ]
  },
  {
    id: 'books',
    name: '珍本文献抄本',
    category: 'culture',
    description: '陆行川精校整理的先民星图与博物图志抄本，学术价值极高。',
    basePrice: 32,
    currentPrice: 32,
    costPrice: 14,
    unit: '册',
    targetBuildingId: 'library',
    satisfactionEffect: [
      { needType: 'curiosity', value: 40 },
      { needType: 'achievement', value: 25 },
      { needType: 'comfort', value: 10 }
    ]
  },
  {
    id: 'materials',
    name: '特种黄铜齿轮',
    category: 'craft',
    description: '顾微澜手工车制的发条星仪核心传动齿轮组，高耐磨耐腐蚀。',
    basePrice: 42,
    currentPrice: 42,
    costPrice: 18,
    unit: '组',
    targetBuildingId: 'observatory',
    satisfactionEffect: [
      { needType: 'curiosity', value: 32 },
      { needType: 'achievement', value: 35 },
      { needType: 'safety', value: 15 }
    ]
  },
  {
    id: 'tools',
    name: '精密修理工具箱',
    category: 'craft',
    description: '包括高精度游标卡尺、螺丝刀与润滑油的随身工具套装。',
    basePrice: 48,
    currentPrice: 48,
    costPrice: 22,
    unit: '套',
    targetBuildingId: 'observatory',
    satisfactionEffect: [
      { needType: 'achievement', value: 30 },
      { needType: 'safety', value: 25 }
    ]
  }
];

export const INITIAL_SHOPS: TownShop[] = [
  {
    id: 'cafe_shop',
    name: '星光慢调咖啡馆',
    buildingId: 'cafe',
    buildingName: '星光像素咖啡馆',
    keeperAgentId: 'agent-1',
    keeperName: '苏清禾',
    productIds: ['coffee'],
    inventory: { coffee: 24 },
    prices: { coffee: 12 },
    revenue: 140,
    expenses: 50,
    cashReserve: 280,
    dailySalesCount: 12
  },
  {
    id: 'bakery_shop',
    name: '暖阳工坊烘焙屋',
    buildingId: 'bakery',
    buildingName: '暖阳工坊烘焙房',
    keeperAgentId: 'agent-3',
    keeperName: '林小满',
    productIds: ['bread'],
    inventory: { bread: 28 },
    prices: { bread: 10 },
    revenue: 160,
    expenses: 65,
    cashReserve: 310,
    dailySalesCount: 16
  },
  {
    id: 'clinic_shop',
    name: '青木本草堂',
    buildingId: 'clinic',
    buildingName: '康养诊所与草药堂',
    keeperAgentId: 'agent-4',
    keeperName: '周景明',
    productIds: ['medicine'],
    inventory: { medicine: 18 },
    prices: { medicine: 26 },
    revenue: 130,
    expenses: 45,
    cashReserve: 250,
    dailySalesCount: 5
  },
  {
    id: 'library_shop',
    name: '文津藏书轩',
    buildingId: 'library',
    buildingName: '典籍档案馆',
    keeperAgentId: 'agent-2',
    keeperName: '陆行川',
    productIds: ['books'],
    inventory: { books: 15 },
    prices: { books: 32 },
    revenue: 96,
    expenses: 40,
    cashReserve: 220,
    dailySalesCount: 3
  },
  {
    id: 'workshop_shop',
    name: '天枢精密机件局',
    buildingId: 'observatory',
    buildingName: '观星台与精密工坊',
    keeperAgentId: 'agent-5',
    keeperName: '顾微澜',
    productIds: ['materials', 'tools'],
    inventory: { materials: 14, tools: 8 },
    prices: { materials: 42, tools: 48 },
    revenue: 180,
    expenses: 85,
    cashReserve: 290,
    dailySalesCount: 4
  }
];

// ==========================================
// 2. 财富等级与数值上下限钳位
// ==========================================

export const MIN_MONEY = 0;
export const MAX_MONEY = 9999;
export const MIN_PRICE = 2;
export const MAX_PRICE = 300;
export const MIN_INVENTORY = 0;
export const MAX_INVENTORY = 120;

export function clampMoney(amount: number): number {
  if (isNaN(amount)) return 50;
  return Math.max(MIN_MONEY, Math.min(MAX_MONEY, Math.round(amount * 10) / 10));
}

export function clampPrice(price: number): number {
  if (isNaN(price)) return 10;
  return Math.max(MIN_PRICE, Math.min(MAX_PRICE, Math.round(price * 10) / 10));
}

export function clampInventory(qty: number): number {
  if (isNaN(qty)) return 0;
  return Math.max(MIN_INVENTORY, Math.min(MAX_INVENTORY, Math.floor(qty)));
}

/**
 * 根据持有货币评估经济阶层状态
 */
export function evaluateEconomicStatus(money: number): 'wealthy' | 'comfortable' | 'frugal' | 'destitute' {
  if (money >= 260) return 'wealthy';
  if (money >= 120) return 'comfortable';
  if (money >= 45) return 'frugal';
  return 'destitute';
}

/**
 * 经济状况中文描述与提示
 */
export function getEconomicStatusLabel(status?: 'wealthy' | 'comfortable' | 'frugal' | 'destitute'): { label: string; color: string; desc: string } {
  switch (status) {
    case 'wealthy':
      return { label: '小康富足', color: 'text-amber-400 bg-amber-400/10 border-amber-400/30', desc: '储蓄丰厚，消费随性，更热衷体验与社交分享' };
    case 'comfortable':
      return { label: '自给自足', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30', desc: '收支平衡，能满足日常高品质需求' };
    case 'frugal':
      return { label: '精打细算', color: 'text-sky-400 bg-sky-400/10 border-sky-400/30', desc: '注重储蓄，非生活必需品消费意愿收敛' };
    case 'destitute':
    default:
      return { label: '手头拮据', color: 'text-rose-400 bg-rose-400/10 border-rose-400/30', desc: '资金紧缺，产生经济焦虑，亟需工作获得薪资' };
  }
}

// ==========================================
// 3. 经济系统状态初始化
// ==========================================

export function initializeTownEconomy(savedState?: Partial<TownEconomyState>): TownEconomyState {
  const products = savedState?.products && savedState.products.length > 0 
    ? savedState.products 
    : INITIAL_PRODUCTS;

  const shops = savedState?.shops && savedState.shops.length > 0 
    ? savedState.shops 
    : INITIAL_SHOPS;

  const municipalFund = typeof savedState?.municipalFund === 'number' 
    ? savedState.municipalFund 
    : 850;

  const recentTransactions = savedState?.recentTransactions || [];
  const activeEconomicEvents = savedState?.activeEconomicEvents || [];

  const totalShopRevenue = shops.reduce((sum, s) => sum + s.revenue, 0);

  return {
    totalMoneySupply: 2450,
    totalResidentWealth: 1320,
    totalShopRevenue,
    totalTransactions: recentTransactions.reduce((acc, t) => acc + t.amount, 0),
    averagePriceIndex: 100,
    municipalFund,
    shops,
    products,
    recentTransactions,
    activeEconomicEvents
  };
}

// ==========================================
// 4. 居民劳动与薪水发放 (Work & Salary System)
// ==========================================

export function processResidentWork(
  agent: Agent,
  simDay: number,
  simTime: string,
  bonusMultiplier: number = 1.0
): { updatedAgent: Agent; transaction: EconomicTransaction } {
  const baseSalary = agent.salary || 32;
  const earned = Math.round(baseSalary * bonusMultiplier);
  const newMoney = clampMoney((agent.money || 0) + earned);
  const newIncome = clampMoney((agent.income || 0) + earned);
  const newStatus = evaluateEconomicStatus(newMoney);

  const updatedAgent: Agent = {
    ...agent,
    money: newMoney,
    income: newIncome,
    economicStatus: newStatus,
    needs: {
      ...agent.needs,
      achievement: clampNeed((agent.needs?.achievement || 60) + 15),
      stress: clampNeed((agent.needs?.stress || 20) - 5),
    }
  };

  const transaction: EconomicTransaction = {
    id: `tx-sal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
    simDay,
    simTime,
    type: 'salary',
    agentId: agent.id,
    agentName: agent.name,
    amount: earned,
    description: `${agent.name} 完成【${agent.occupation || agent.role}】专业工位任务，领取薪资 ${earned} 银星币`
  };

  return { updatedAgent, transaction };
}

// ==========================================
// 5. 居民采买消费与交易结算 (Purchase System)
// ==========================================

export interface PurchaseResult {
  success: boolean;
  reason: string;
  updatedAgent: Agent;
  updatedShop?: TownShop;
  transaction?: EconomicTransaction;
  discountApplied?: number;
}

export function executeResidentPurchase(
  agent: Agent,
  shop: TownShop,
  productId: ProductId,
  products: ProductItem[],
  simDay: number,
  simTime: string,
  relationships?: Record<string, Relationship>
): PurchaseResult {
  const product = products.find(p => p.id === productId);
  if (!product) {
    return {
      success: false,
      reason: '未找到指定商品信息',
      updatedAgent: agent
    };
  }

  const currentStock = shop.inventory[productId] ?? 0;
  if (currentStock <= 0) {
    // 缺货！引发居民购买受阻情绪 (stress +4, mood -5)
    return {
      success: false,
      reason: `【${shop.name}】的《${product.name}》已告售罄！`,
      updatedAgent: {
        ...agent,
        state: {
          ...agent.state,
          mood: Math.max(0, agent.state.mood - 6),
          stress: Math.min(100, agent.state.stress + 5)
        }
      }
    };
  }

  const currentPrice = shop.prices[productId] ?? product.currentPrice;

  // 关系网优惠判定 (Friendship Discount: 若与店主是好友/挚友，享受友情折扣)
  let discountRate = 0;
  const rel = relationships?.[shop.keeperAgentId] || agent.relationships?.[shop.keeperAgentId];
  if (rel) {
    if (rel.relationshipStage === 'close_friend' || rel.relationshipStage === 'partner') {
      discountRate = 0.20; // 挚友八折
    } else if (rel.relationshipStage === 'friend' || (rel.affection > 40)) {
      discountRate = 0.10; // 朋友九折
    }
  }

  const finalPrice = Math.max(1, Math.round(currentPrice * (1 - discountRate)));

  // 居民资金充裕度检查
  const agentMoney = agent.money ?? 0;
  if (agentMoney < finalPrice) {
    // 资金不足：进入拮据抑制状态
    return {
      success: false,
      reason: `资金不足 (持有: ${agentMoney} 🌟, 单价: ${finalPrice} 🌟)，居民被迫放弃消费`,
      updatedAgent: {
        ...agent,
        economicStatus: 'destitute',
        state: {
          ...agent.state,
          mood: Math.max(0, agent.state.mood - 8),
          stress: Math.min(100, agent.state.stress + 10)
        }
      }
    };
  }

  // 扣减资金与商品库存，增加商铺收益
  const newAgentMoney = clampMoney(agentMoney - finalPrice);
  const newExpenses = clampMoney((agent.expenses ?? 0) + finalPrice);
  const newStatus = evaluateEconomicStatus(newAgentMoney);

  // 满足度效应应用到居民需求
  let newNeeds = { ...agent.needs };
  let moodDelta = 8;
  let stressDelta = -6;

  product.satisfactionEffect.forEach(eff => {
    if (eff.needType in newNeeds) {
      newNeeds[eff.needType] = clampNeed((newNeeds[eff.needType] || 50) + eff.value);
    }
  });

  const updatedAgent: Agent = {
    ...agent,
    money: newAgentMoney,
    expenses: newExpenses,
    economicStatus: newStatus,
    needs: newNeeds,
    state: {
      ...agent.state,
      mood: Math.min(100, agent.state.mood + moodDelta),
      stress: Math.max(0, agent.state.stress + stressDelta)
    }
  };

  const updatedShop: TownShop = {
    ...shop,
    inventory: {
      ...shop.inventory,
      [productId]: clampInventory(currentStock - 1)
    },
    revenue: clampMoney(shop.revenue + finalPrice),
    cashReserve: clampMoney(shop.cashReserve + finalPrice),
    dailySalesCount: shop.dailySalesCount + 1
  };

  const discountNote = discountRate > 0 ? ` (熟人优享 ${Math.round((1 - discountRate) * 10)} 折)` : '';
  const transaction: EconomicTransaction = {
    id: `tx-buy-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
    simDay,
    simTime,
    type: 'purchase',
    agentId: agent.id,
    agentName: agent.name,
    shopId: shop.id,
    shopName: shop.name,
    productId,
    productName: product.name,
    amount: finalPrice,
    description: `${agent.name} 在【${shop.name}】选购了《${product.name}》花费 ${finalPrice} 银星币${discountNote}`
  };

  return {
    success: true,
    reason: `成功购买 ${product.name}`,
    updatedAgent,
    updatedShop,
    transaction,
    discountApplied: discountRate
  };
}

// ==========================================
// 6. 宏观供需演化与动态物价演算 (Economy Simulation Tick)
// ==========================================

export function tickTownEconomy(
  economyState: TownEconomyState,
  agents: Agent[],
  buildings: Building[],
  simHour: number,
  simMinute: number,
  simDay: number,
  simTime: string
): {
  updatedEconomy: TownEconomyState;
  updatedAgents: Agent[];
  newTransactions: EconomicTransaction[];
  newEvents: EconomyEventRecord[];
} {
  const newTransactions: EconomicTransaction[] = [];
  const newEvents: EconomyEventRecord[] = [];

  let shops = economyState.shops.map(s => ({ ...s }));
  let products = economyState.products.map(p => ({ ...p }));
  let municipalFund = economyState.municipalFund;
  let activeEvents = [...economyState.activeEconomicEvents];

  // 1. 动态物价演化机制 (供需法则: 缺货涨价，过剩打折)
  shops = shops.map(shop => {
    const updatedPrices = { ...shop.prices };
    const updatedInventory = { ...shop.inventory };

    shop.productIds.forEach(prodId => {
      const prod = products.find(p => p.id === prodId);
      if (!prod) return;

      const stock = updatedInventory[prodId] ?? 0;
      const basePrice = prod.basePrice;

      // 活跃事件的物价乘数修正
      const eventOnProduct = activeEvents.find(e => e.active && e.targetProductId === prodId);
      const eventMultiplier = eventOnProduct ? eventOnProduct.priceMultiplier : 1.0;

      let targetPrice = basePrice * eventMultiplier;

      // 供需法则
      if (stock === 0) {
        // 完全断货：价格翻倍甚至更高
        targetPrice = basePrice * 1.8 * eventMultiplier;
      } else if (stock < 6) {
        // 供应紧张：上浮 30% - 60%
        targetPrice = basePrice * 1.45 * eventMultiplier;
      } else if (stock > 35) {
        // 库存过剩：降价促销 15% - 25%
        targetPrice = basePrice * 0.85 * eventMultiplier;
      }

      // 平滑移动价格，避免跳变失控
      const current = updatedPrices[prodId] ?? basePrice;
      const smoothed = current * 0.85 + targetPrice * 0.15;
      updatedPrices[prodId] = clampPrice(smoothed);
    });

    return {
      ...shop,
      prices: updatedPrices
    };
  });

  // 同步更新全局 products 表的价格展示
  products = products.map(prod => {
    const relatedShop = shops.find(s => s.productIds.includes(prod.id));
    const marketPrice = relatedShop?.prices[prod.id] ?? prod.basePrice;
    return {
      ...prod,
      currentPrice: marketPrice
    };
  });

  // 2. 周期性商户自动补货机制 (凌晨 05:00 或库存耗尽且有资金时)
  if (simMinute === 0 && (simHour === 5 || simHour === 14)) {
    shops = shops.map(shop => {
      let cash = shop.cashReserve;
      const newInventory = { ...shop.inventory };
      let restockTotalCost = 0;

      shop.productIds.forEach(prodId => {
        const prod = products.find(p => p.id === prodId);
        if (!prod) return;
        const currentStock = newInventory[prodId] ?? 0;

        // 如果库存低于 12，且店铺资金允许，进货补到 25 件
        if (currentStock < 12 && cash > prod.costPrice * 5) {
          const needed = 25 - currentStock;
          const maxAffordable = Math.floor(cash / prod.costPrice);
          const buyQty = Math.min(needed, maxAffordable, 15);

          if (buyQty > 0) {
            const cost = buyQty * prod.costPrice;
            cash -= cost;
            newInventory[prodId] = currentStock + buyQty;
            restockTotalCost += cost;
          }
        }
      });

      if (restockTotalCost > 0) {
        newTransactions.push({
          id: `tx-restock-${Date.now()}-${shop.id}`,
          timestamp: Date.now(),
          simDay,
          simTime,
          type: 'operating_cost',
          shopId: shop.id,
          shopName: shop.name,
          amount: restockTotalCost,
          description: `【${shop.name}】采购补充批次原料库存，支出成本 ${restockTotalCost} 银星币`
        });
      }

      return {
        ...shop,
        inventory: newInventory,
        cashReserve: clampMoney(cash),
        expenses: clampMoney(shop.expenses + restockTotalCost)
      };
    });
  }

  // 3. 建筑与公共设施日维护费结算 (每日早晨 06:00 扣除)
  if (simHour === 6 && simMinute === 0) {
    const totalMaintenance = buildings.reduce((sum, b) => sum + (b.operatingCost || 15), 0);
    municipalFund = Math.max(100, municipalFund - totalMaintenance);

    newTransactions.push({
      id: `tx-maint-${simDay}-${Date.now()}`,
      timestamp: Date.now(),
      simDay,
      simTime,
      type: 'operating_cost',
      amount: totalMaintenance,
      description: `小镇清晨基础设施综合维护与路灯能源结算，市政公积金支出 ${totalMaintenance} 银星币`
    });
  }

  // 4. 统计小镇居民总财富与更新阶层
  let updatedAgents = agents.map(a => {
    const money = clampMoney(a.money ?? 100);
    const economicStatus = evaluateEconomicStatus(money);
    return {
      ...a,
      money,
      economicStatus
    };
  });

  const totalResidentWealth = updatedAgents.reduce((sum, a) => sum + a.money, 0);
  const totalShopRevenue = shops.reduce((sum, s) => sum + s.revenue, 0);
  const totalShopReserves = shops.reduce((sum, s) => sum + s.cashReserve, 0);
  const totalMoneySupply = clampMoney(totalResidentWealth + totalShopReserves + municipalFund);

  // 计算物价指数
  const avgPrice = products.reduce((sum, p) => sum + p.currentPrice, 0) / Math.max(1, products.length);
  const baseAvgPrice = products.reduce((sum, p) => sum + p.basePrice, 0) / Math.max(1, products.length);
  const averagePriceIndex = Math.round((avgPrice / Math.max(1, baseAvgPrice)) * 100);

  // 合并近50条历史流水
  const combinedTransactions = [...newTransactions, ...economyState.recentTransactions].slice(0, 60);

  const updatedEconomy: TownEconomyState = {
    totalMoneySupply,
    totalResidentWealth,
    totalShopRevenue,
    totalTransactions: combinedTransactions.reduce((acc, t) => acc + t.amount, 0),
    averagePriceIndex,
    municipalFund,
    shops,
    products,
    recentTransactions: combinedTransactions,
    activeEconomicEvents: activeEvents
  };

  return {
    updatedEconomy,
    updatedAgents,
    newTransactions,
    newEvents
  };
}

// ==========================================
// 7. 经济事件触发与市政干预 (Economic Events & Macro Policy)
// ==========================================

export function triggerEconomicCrisisOrBoom(
  type: 'flour_shortage' | 'coffee_boom' | 'subsidy_stimulus' | 'gear_scarcity',
  currentState: TownEconomyState,
  agents: Agent[],
  simDay: number,
  simTime: string
): {
  updatedEconomy: TownEconomyState;
  updatedAgents: Agent[];
  townEvent: TownEvent;
  transaction?: EconomicTransaction;
} {
  let shops = currentState.shops.map(s => ({ ...s }));
  let products = currentState.products.map(p => ({ ...p }));
  let updatedAgents = [...agents];
  let municipalFund = currentState.municipalFund;
  let transaction: EconomicTransaction | undefined;

  let eventTitle = '';
  let eventDesc = '';
  let impactSummary = '';

  switch (type) {
    case 'flour_shortage': {
      eventTitle = '小镇谷物面粉供应链短缺';
      eventDesc = '由于近郊运输货道临时封闭，烘焙坊面粉原料储备告急，面包产出骤降！';
      impactSummary = '烘焙房面包库存缩减至极低，单价飙升 +60%，全镇早餐焦虑上升。';

      // 烘焙坊库存腰斩，价格上调
      shops = shops.map(s => {
        if (s.id === 'bakery_shop') {
          return {
            ...s,
            inventory: { ...s.inventory, bread: 3 },
            prices: { ...s.prices, bread: 18 }
          };
        }
        return s;
      });

      // 居民心理反应：物价飙升产生不安全感
      updatedAgents = updatedAgents.map(a => ({
        ...a,
        state: {
          ...a.state,
          mood: Math.max(0, a.state.mood - 10),
          stress: Math.min(100, a.state.stress + 14)
        }
      }));
      break;
    }

    case 'coffee_boom': {
      eventTitle = '高原优质咖啡豆丰收直供';
      eventDesc = '咖啡产地送来一大批高山水洗咖啡豆，星光咖啡馆香气弥漫，供应充盈！';
      impactSummary = '手冲咖啡库存充沛，单价优惠下调，居民社交热情与精力大幅提振。';

      shops = shops.map(s => {
        if (s.id === 'cafe_shop') {
          return {
            ...s,
            inventory: { ...s.inventory, coffee: 45 },
            prices: { ...s.prices, coffee: 9 }
          };
        }
        return s;
      });

      updatedAgents = updatedAgents.map(a => ({
        ...a,
        state: {
          ...a.state,
          mood: Math.min(100, a.state.mood + 12),
          stress: Math.max(0, a.state.stress - 8)
        },
        needs: {
          ...a.needs,
          energy: clampNeed((a.needs?.energy || 60) + 15),
          comfort: clampNeed((a.needs?.comfort || 60) + 12)
        }
      }));
      break;
    }

    case 'gear_scarcity': {
      eventTitle = '观星台特种黄铜齿轮紧缺';
      eventDesc = '精锻黄铜矿料匮乏，观星台与发条星盘机调试工程被迫延缓。';
      impactSummary = '机械零件价格翻倍，发明家顾微澜与学者陆行川焦虑度显著攀升。';

      shops = shops.map(s => {
        if (s.id === 'workshop_shop') {
          return {
            ...s,
            inventory: { ...s.inventory, materials: 2 },
            prices: { ...s.prices, materials: 75 }
          };
        }
        return s;
      });

      updatedAgents = updatedAgents.map(a => {
        if (a.id === 'agent-5' || a.id === 'agent-2') {
          return {
            ...a,
            state: {
              ...a.state,
              stress: Math.min(100, a.state.stress + 22),
              mood: Math.max(0, a.state.mood - 15)
            }
          };
        }
        return a;
      });
      break;
    }

    case 'subsidy_stimulus': {
      eventTitle = '市政厅批准发放民生平抑消费券';
      eventDesc = '为化解生活成本上升，陈默秘书长召开紧急议事，划拨财政公积金向全体居民与商户发放专项津贴。';
      impactSummary = '每位居民账户直接注入 40 银星币补贴，商铺获得应急储备金，全镇消费信心提振。';

      const perResidentSubsidy = 40;
      const totalCost = perResidentSubsidy * updatedAgents.length;
      municipalFund = Math.max(0, municipalFund - totalCost);

      updatedAgents = updatedAgents.map(a => {
        const money = clampMoney(a.money + perResidentSubsidy);
        return {
          ...a,
          money,
          income: clampMoney((a.income || 0) + perResidentSubsidy),
          economicStatus: evaluateEconomicStatus(money),
          state: {
            ...a.state,
            mood: Math.min(100, a.state.mood + 14),
            stress: Math.max(0, a.state.stress - 12)
          }
        };
      });

      transaction = {
        id: `tx-subsidy-${Date.now()}`,
        timestamp: Date.now(),
        simDay,
        simTime,
        type: 'subsidy',
        amount: totalCost,
        description: `市政厅划拨专项公积金 ${totalCost} 银星币，全镇居民每人获得 ${perResidentSubsidy} 银星币惠民津贴`
      };
      break;
    }
  }

  const townEvent: TownEvent = {
    id: `econ-event-${Date.now()}`,
    title: eventTitle,
    description: eventDesc,
    type: 'policy',
    impactSummary,
    timestamp: Date.now(),
    simTime,
    active: true
  };

  const updatedEconomy: TownEconomyState = {
    ...currentState,
    municipalFund,
    shops,
    products,
    recentTransactions: transaction 
      ? [transaction, ...currentState.recentTransactions].slice(0, 60)
      : currentState.recentTransactions
  };

  return {
    updatedEconomy,
    updatedAgents,
    townEvent,
    transaction
  };
}
