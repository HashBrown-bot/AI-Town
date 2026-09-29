import React, { useState } from 'react';
import { 
  Coins, 
  Store, 
  TrendingUp, 
  TrendingDown, 
  ShoppingBag, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  AlertTriangle, 
  Sparkles, 
  Layers, 
  Receipt, 
  Landmark, 
  RefreshCw, 
  ChevronRight, 
  CheckCircle2, 
  Package, 
  ShieldAlert,
  Flame,
  HelpCircle
} from 'lucide-react';
import { 
  Agent, 
  Building, 
  TownShop, 
  ProductItem, 
  ProductId, 
  TownEconomyState, 
  EconomicTransaction,
  TownEvent 
} from '../types/town';
import { 
  executeResidentPurchase, 
  processResidentWork, 
  triggerEconomicCrisisOrBoom,
  getEconomicStatusLabel 
} from '../systems/EconomySystem';
import { soundEngine } from '../utils/audioSystem';

interface TownEconomyPanelProps {
  economyState: TownEconomyState;
  agents: Agent[];
  buildings: Building[];
  simDay: number;
  simHour: number;
  simMinute: number;
  simTime: string;
  onUpdateEconomy: (updatedEconomy: TownEconomyState, updatedAgents: Agent[], newTransaction?: EconomicTransaction) => void;
  onAddTownEvent?: (event: TownEvent) => void;
}

export const TownEconomyPanel: React.FC<TownEconomyPanelProps> = ({
  economyState,
  agents,
  buildings,
  simDay,
  simHour,
  simMinute,
  simTime,
  onUpdateEconomy,
  onAddTownEvent
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'residents' | 'shops' | 'products' | 'transactions'>('overview');
  const [selectedAgentId, setSelectedAgentId] = useState<string>(agents[0]?.id || '');
  const [selectedProductId, setSelectedProductId] = useState<ProductId>('bread');
  const [actionNotice, setActionNotice] = useState<{ text: string; type: 'success' | 'warn' | 'info' } | null>(null);

  const selectedAgent = agents.find(a => a.id === selectedAgentId) || agents[0];
  const selectedProduct = economyState.products.find(p => p.id === selectedProductId) || economyState.products[0];
  const targetShop = economyState.shops.find(s => s.productIds.includes(selectedProductId)) || economyState.shops[0];

  // Helper notification
  const showNotice = (text: string, type: 'success' | 'warn' | 'info' = 'info') => {
    setActionNotice({ text, type });
    setTimeout(() => {
      setActionNotice(null);
    }, 4500);
  };

  // 1. 手动触发居民购买指定商品
  const handleManualPurchase = () => {
    if (!selectedAgent || !targetShop || !selectedProduct) return;

    soundEngine.playChime();
    const result = executeResidentPurchase(
      selectedAgent,
      targetShop,
      selectedProduct.id,
      economyState.products,
      simDay,
      simTime,
      selectedAgent.relationships
    );

    if (result.success && result.updatedShop && result.transaction) {
      const updatedAgents = agents.map(a => a.id === result.updatedAgent.id ? result.updatedAgent : a);
      const updatedShops = economyState.shops.map(s => s.id === result.updatedShop!.id ? result.updatedShop! : s);
      const updatedEconomy: TownEconomyState = {
        ...economyState,
        shops: updatedShops,
        recentTransactions: [result.transaction, ...economyState.recentTransactions].slice(0, 60),
        totalTransactions: economyState.totalTransactions + result.transaction.amount,
        totalShopRevenue: economyState.totalShopRevenue + result.transaction.amount,
        totalResidentWealth: updatedAgents.reduce((sum, a) => sum + (a.money || 0), 0)
      };

      onUpdateEconomy(updatedEconomy, updatedAgents, result.transaction);
      showNotice(`🎉 ${result.reason} (支出 ${result.transaction.amount} 🌟)`, 'success');
    } else {
      showNotice(`⚠️ 购买受阻：${result.reason}`, 'warn');
    }
  };

  // 2. 手动发放工作酬劳
  const handleWorkReward = (agentId: string) => {
    const target = agents.find(a => a.id === agentId);
    if (!target) return;

    soundEngine.playClick();
    const { updatedAgent, transaction } = processResidentWork(target, simDay, simTime, 1.25);
    const updatedAgents = agents.map(a => a.id === target.id ? updatedAgent : a);
    const updatedEconomy: TownEconomyState = {
      ...economyState,
      recentTransactions: [transaction, ...economyState.recentTransactions].slice(0, 60),
      totalTransactions: economyState.totalTransactions + transaction.amount,
      totalResidentWealth: updatedAgents.reduce((sum, a) => sum + (a.money || 0), 0)
    };

    onUpdateEconomy(updatedEconomy, updatedAgents, transaction);
    showNotice(`💼 ${updatedAgent.name} 获得工位劳动嘉奖津贴 ${transaction.amount} 🌟`, 'success');
  };

  // 3. 宏观经济事件触发器
  const handleTriggerEvent = (type: 'flour_shortage' | 'coffee_boom' | 'subsidy_stimulus' | 'gear_scarcity') => {
    soundEngine.playEventFanfare();
    const { updatedEconomy, updatedAgents, townEvent, transaction } = triggerEconomicCrisisOrBoom(
      type,
      economyState,
      agents,
      simDay,
      simTime
    );

    onUpdateEconomy(updatedEconomy, updatedAgents, transaction);
    if (onAddTownEvent) {
      onAddTownEvent(townEvent);
    }
    showNotice(`⚡ 已触发宏观事件【${townEvent.title}】！${townEvent.impactSummary}`, 'info');
  };

  return (
    <div className="flex-1 bg-slate-950 text-slate-100 flex flex-col h-full overflow-hidden select-none">
      {/* Top Banner / Navigation */}
      <div className="border-b border-slate-800 bg-slate-900/90 px-5 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-600/30 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-900/20">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide">小镇经济系统中心</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30">
                双轨驱动引擎 (Emotion + Resource)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              监控资金流通、居民财富、商铺营利、物价供需波动与宏观民生调控
            </p>
          </div>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 text-xs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'overview' 
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/20' 
                : 'text-slate-300 hover:text-white'
            }`}
          >
            宏观总览
          </button>
          <button
            onClick={() => setActiveTab('residents')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'residents' 
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/20' 
                : 'text-slate-300 hover:text-white'
            }`}
          >
            居民财富榜 ({agents.length})
          </button>
          <button
            onClick={() => setActiveTab('shops')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'shops' 
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/20' 
                : 'text-slate-300 hover:text-white'
            }`}
          >
            商铺与营收 ({economyState.shops.length})
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'products' 
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/20' 
                : 'text-slate-300 hover:text-white'
            }`}
          >
            商品行情 ({economyState.products.length})
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'transactions' 
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/20' 
                : 'text-slate-300 hover:text-white'
            }`}
          >
            交易流水 ({economyState.recentTransactions.length})
          </button>
        </div>
      </div>

      {/* Floating Notice Bar */}
      {actionNotice && (
        <div className={`px-4 py-2 border-b text-xs flex items-center justify-between transition-all ${
          actionNotice.type === 'success' 
            ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200' 
            : actionNotice.type === 'warn'
            ? 'bg-rose-950/80 border-rose-500/40 text-rose-200'
            : 'bg-amber-950/80 border-amber-500/40 text-amber-200'
        }`}>
          <span>{actionNotice.text}</span>
          <button 
            onClick={() => setActionNotice(null)} 
            className="text-slate-400 hover:text-white ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Top 5 Key Macro Indicators */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
          {/* Card 1: Total Money Supply */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>小镇资金流通量 (M1)</span>
              <Coins className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-amber-300">
                {economyState.totalMoneySupply.toLocaleString()}
              </span>
              <span className="text-[11px] text-amber-500/80">🌟 银星币</span>
            </div>
            <div className="mt-1.5 text-[11px] text-slate-400 flex items-center gap-1">
              <span>居民储蓄 + 商铺储备 + 市政金</span>
            </div>
          </div>

          {/* Card 2: Resident Wealth */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>居民总储蓄财富</span>
              <Wallet className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-emerald-300">
                {economyState.totalResidentWealth.toLocaleString()}
              </span>
              <span className="text-[11px] text-emerald-500/80">🌟</span>
            </div>
            <div className="mt-1.5 text-[11px] text-slate-400">
              人均约 {Math.round(economyState.totalResidentWealth / Math.max(1, agents.length))} 🌟
            </div>
          </div>

          {/* Card 3: Commercial Revenue */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>商业总累计营业额</span>
              <Store className="w-4 h-4 text-sky-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-sky-300">
                {economyState.totalShopRevenue.toLocaleString()}
              </span>
              <span className="text-[11px] text-sky-500/80">🌟</span>
            </div>
            <div className="mt-1.5 text-[11px] text-slate-400">
              共 {economyState.shops.length} 家社区商铺
            </div>
          </div>

          {/* Card 4: Price Index */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>综合物价指数 (CPI)</span>
              {economyState.averagePriceIndex > 100 ? (
                <TrendingUp className="w-4 h-4 text-rose-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-emerald-400" />
              )}
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className={`text-2xl font-bold font-mono ${
                economyState.averagePriceIndex > 110 
                  ? 'text-rose-400' 
                  : economyState.averagePriceIndex < 90 
                  ? 'text-emerald-400' 
                  : 'text-amber-300'
              }`}>
                {economyState.averagePriceIndex}%
              </span>
              <span className="text-[10px] text-slate-500">基准 100%</span>
            </div>
            <div className="mt-1.5 text-[11px] text-slate-400">
              {economyState.averagePriceIndex > 105 
                ? '物价上涨，部分生活成本增加' 
                : economyState.averagePriceIndex < 95 
                ? '供需平稳，商品特惠折扣中' 
                : '供求均衡，物价平稳'}
            </div>
          </div>

          {/* Card 5: Municipal Reserve */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>市政财政储备金</span>
              <Landmark className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-indigo-300">
                {economyState.municipalFund.toLocaleString()}
              </span>
              <span className="text-[11px] text-indigo-400/80">🌟</span>
            </div>
            <div className="mt-1.5 text-[11px] text-slate-400">
              用于平抑物价与设施维护
            </div>
          </div>
        </div>

        {/* TAB 1: OVERVIEW & MACRO POLICY CONTROLLER */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            {/* Macro Interventions & Scenarios */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <h3 className="font-semibold text-sm text-slate-200">市政宏观政策干预与情景推演</h3>
                </div>
                <span className="text-[11px] text-slate-400">
                  点击按钮即可即时模拟现实经济波动及居民情绪与连锁反应
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {/* 1. Flour Shortage */}
                <div className="bg-slate-950/60 border border-slate-800/80 hover:border-rose-500/40 p-3.5 rounded-xl transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-xs text-rose-300 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                        面粉供应短缺
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        通胀危机
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2 line-clamp-3">
                      面粉断供导致烘焙坊面包库存锐减至3个，面包暴涨至18🌟，居民因早餐缺粮压力上升、心情低落。
                    </p>
                  </div>
                  <button
                    onClick={() => handleTriggerEvent('flour_shortage')}
                    className="mt-3 w-full py-1.5 px-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-medium transition-all"
                  >
                    推演面粉危机
                  </button>
                </div>

                {/* 2. Coffee Boom */}
                <div className="bg-slate-950/60 border border-slate-800/80 hover:border-emerald-500/40 p-3.5 rounded-xl transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-xs text-emerald-300 flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-emerald-400" />
                        咖啡豆大丰收
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        原料充足
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2 line-clamp-3">
                      新批次水洗咖啡豆大批到货，星光咖啡馆库存翻倍，咖啡单价降至9🌟，居民精神提振、舒适度大增。
                    </p>
                  </div>
                  <button
                    onClick={() => handleTriggerEvent('coffee_boom')}
                    className="mt-3 w-full py-1.5 px-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-medium transition-all"
                  >
                    推演咖啡丰收
                  </button>
                </div>

                {/* 3. Gear Scarcity */}
                <div className="bg-slate-950/60 border border-slate-800/80 hover:border-amber-500/40 p-3.5 rounded-xl transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-xs text-amber-300 flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-amber-400" />
                        精密黄铜件短缺
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        工业瓶颈
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2 line-clamp-3">
                      观星台发条星盘机调试工程受阻，特种齿轮售价翻倍，发明家顾微澜与学者陆行川焦虑度显著上升。
                    </p>
                  </div>
                  <button
                    onClick={() => handleTriggerEvent('gear_scarcity')}
                    className="mt-3 w-full py-1.5 px-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-medium transition-all"
                  >
                    推演齿轮告急
                  </button>
                </div>

                {/* 4. Municipal Subsidy Stimulus */}
                <div className="bg-slate-950/60 border border-slate-800/80 hover:border-indigo-500/40 p-3.5 rounded-xl transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-xs text-indigo-300 flex items-center gap-1.5">
                        <Landmark className="w-3.5 h-3.5 text-indigo-400" />
                        民生平抑消费券
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        财政刺激
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2 line-clamp-3">
                      陈默紧急划拨市政公积金，向全镇居民每人发放40🌟民生消费券，提振消费信心，有效化解居民不满。
                    </p>
                  </div>
                  <button
                    onClick={() => handleTriggerEvent('subsidy_stimulus')}
                    className="mt-3 w-full py-1.5 px-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 rounded-lg text-xs font-medium transition-all"
                  >
                    发放全员补贴 (+40🌟)
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Interactive Sandbox: Test Resident Buying from Shop */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Box 1: Interactive Transaction Simulation */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-emerald-400" />
                      <h4 className="font-semibold text-sm text-slate-200">交互试验台：居民采买行为演练</h4>
                    </div>
                    <span className="text-[10px] text-slate-400">实时观察库存、扣费与情绪需求反馈</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-slate-400 block mb-1">选择发起消费的居民:</label>
                      <select
                        value={selectedAgentId}
                        onChange={(e) => setSelectedAgentId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-amber-500"
                      >
                        {agents.map(a => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.role}) - 持有 {a.money ?? 0} 🌟
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">选择意向购买商品:</label>
                      <select
                        value={selectedProductId}
                        onChange={(e) => setSelectedProductId(e.target.value as ProductId)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-amber-500"
                      >
                        {economyState.products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} - 现价 {p.currentPrice} 🌟 ({p.unit})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Transaction Details Preview */}
                  <div className="mt-3.5 bg-slate-950/80 rounded-xl p-3 border border-slate-800 text-xs space-y-1.5">
                    <div className="flex justify-between text-slate-400">
                      <span>目标商铺:</span>
                      <span className="text-slate-200 font-medium">{targetShop.name} (店主: {targetShop.keeperName})</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>商铺实时库存:</span>
                      <span className={targetShop.inventory[selectedProduct.id] > 0 ? 'text-emerald-400 font-mono' : 'text-rose-400 font-mono font-bold'}>
                        {targetShop.inventory[selectedProduct.id] ?? 0} {selectedProduct.unit}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>居民资金充裕度:</span>
                      <span className={(selectedAgent.money ?? 0) >= selectedProduct.currentPrice ? 'text-emerald-400 font-mono' : 'text-rose-400 font-mono'}>
                        持币 {selectedAgent.money ?? 0} 🌟 / 需支付 {selectedProduct.currentPrice} 🌟
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={handleManualPurchase}
                    className="flex-1 py-2 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-semibold rounded-xl text-xs shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    模拟发起采买 (扣减资金+减库存+恢复Needs)
                  </button>
                  <button
                    onClick={() => handleWorkReward(selectedAgent.id)}
                    className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-xl text-xs border border-slate-700 transition-all flex items-center gap-1.5"
                  >
                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                    结算工位薪酬 (+{selectedAgent.salary || 35}🌟)
                  </button>
                </div>
              </div>

              {/* Box 2: Recent Transactions Mini Log */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-sky-400" />
                      <h4 className="font-semibold text-sm text-slate-200">最新小镇交易实况流</h4>
                    </div>
                    <span className="text-[11px] text-slate-400">实时循环记录</span>
                  </div>

                  <div className="space-y-2 mt-2 max-h-[175px] overflow-y-auto pr-1">
                    {economyState.recentTransactions.slice(0, 5).map((tx, idx) => (
                      <div key={tx.id || idx} className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5 text-xs flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            tx.type === 'purchase' ? 'bg-amber-400' : tx.type === 'salary' ? 'bg-emerald-400' : 'bg-indigo-400'
                          }`} />
                          <div>
                            <p className="text-slate-200 line-clamp-1 font-medium">{tx.description}</p>
                            <span className="text-[10px] text-slate-500 font-mono">第{tx.simDay}天 {tx.simTime}</span>
                          </div>
                        </div>
                        <span className={`font-mono font-semibold whitespace-nowrap ${
                          tx.type === 'purchase' ? 'text-amber-400' : tx.type === 'salary' ? 'text-emerald-400' : 'text-indigo-400'
                        }`}>
                          {tx.type === 'purchase' ? '-' : '+'}{tx.amount} 🌟
                        </span>
                      </div>
                    ))}
                    {economyState.recentTransactions.length === 0 && (
                      <div className="text-center py-6 text-xs text-slate-500">
                        暂无交易记录，随时间流逝或居民消费将自动生成流水。
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
                  <span>累计成交笔数: {economyState.recentTransactions.length}</span>
                  <button 
                    onClick={() => setActiveTab('transactions')}
                    className="text-amber-400 hover:underline flex items-center gap-1"
                  >
                    查看全部完整明细 <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: RESIDENTS WEALTH & STATS */}
        {activeTab === 'residents' && (
          <div className="space-y-4">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-sm text-slate-200">居民个人财富与职业收支档案</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    工作行为驱动收入，商品消费扣减储蓄；储蓄不足时主动减少开支，储蓄丰厚时积极改善生活品质。
                  </p>
                </div>
                <span className="text-xs text-slate-400">
                  共计 {agents.length} 名居民
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {agents.map(agent => {
                  const statusInfo = getEconomicStatusLabel(agent.economicStatus);
                  return (
                    <div 
                      key={agent.id}
                      className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 hover:border-slate-700 transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* Top: Name & Role */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: agent.spriteColor || '#f59e0b' }}
                            />
                            <span className="font-semibold text-sm text-white">{agent.name}</span>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </div>

                        {/* Occupation & Salary */}
                        <div className="mt-2 text-xs text-slate-400">
                          <p className="line-clamp-1">岗位: <span className="text-slate-200">{agent.occupation || agent.role}</span></p>
                          <p className="mt-0.5">工位基准薪资: <span className="text-amber-400 font-mono font-medium">{agent.salary || 30} 🌟</span> /任务</p>
                        </div>

                        {/* Money, Income, Expenses */}
                        <div className="mt-3 grid grid-cols-3 gap-2 bg-slate-900/80 p-2 rounded-lg text-center border border-slate-800/80">
                          <div>
                            <span className="text-[10px] text-slate-400 block">当前资金</span>
                            <span className="text-sm font-bold font-mono text-amber-300">
                              {agent.money ?? 0} 🌟
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">累计收入</span>
                            <span className="text-xs font-semibold font-mono text-emerald-400">
                              +{agent.income ?? 0}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">累计消费</span>
                            <span className="text-xs font-semibold font-mono text-rose-400">
                              -{agent.expenses ?? 0}
                            </span>
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-500 mt-2.5 leading-relaxed line-clamp-2">
                          {statusInfo.desc}
                        </p>
                      </div>

                      {/* Action: Work Grant */}
                      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">
                          压力负荷: {agent.needs?.stress || agent.state.stress}%
                        </span>
                        <button
                          onClick={() => handleWorkReward(agent.id)}
                          className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-medium transition-all"
                        >
                          发放工薪 (+{agent.salary || 30}🌟)
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SHOPS & BUSINESSES */}
        {activeTab === 'shops' && (
          <div className="space-y-4">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-sm text-slate-200">小镇特色商铺与经营账本</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    商铺提供居民恢复饥饿、精力、健康与科研工具的关键补给，库存不足时商品涨价，库存充裕时适度打折。
                  </p>
                </div>
                <span className="text-xs text-slate-400">共 {economyState.shops.length} 家社区商业体</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {economyState.shops.map(shop => {
                  const building = buildings.find(b => b.id === shop.buildingId);
                  const keeper = agents.find(a => a.id === shop.keeperAgentId);

                  return (
                    <div 
                      key={shop.id}
                      className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                              <span>{building?.icon || '🏪'}</span>
                              {shop.name}
                            </h4>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              归属地: {shop.buildingName} | 主理人: <span className="text-slate-200 font-medium">{shop.keeperName}</span>
                            </p>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono">
                            日销 {shop.dailySalesCount} 件
                          </span>
                        </div>

                        {/* Financial Ledger */}
                        <div className="mt-3.5 grid grid-cols-3 gap-2 bg-slate-900/80 p-2.5 rounded-lg text-center border border-slate-800">
                          <div>
                            <span className="text-[10px] text-slate-400 block">累计营业额</span>
                            <span className="text-xs font-bold font-mono text-emerald-400">
                              {shop.revenue} 🌟
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">进货与运维</span>
                            <span className="text-xs font-bold font-mono text-rose-400">
                              {shop.expenses} 🌟
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">商铺公账储备</span>
                            <span className="text-xs font-bold font-mono text-amber-300">
                              {shop.cashReserve} 🌟
                            </span>
                          </div>
                        </div>

                        {/* Product Stock Breakdown */}
                        <div className="mt-3 space-y-1.5">
                          <span className="text-[11px] font-medium text-slate-300 block">售卖商品与实时库存:</span>
                          {shop.productIds.map(pid => {
                            const prod = economyState.products.find(p => p.id === pid);
                            const stock = shop.inventory[pid] ?? 0;
                            const price = shop.prices[pid] ?? prod?.currentPrice ?? 10;
                            return (
                              <div key={pid} className="flex items-center justify-between text-xs bg-slate-900/50 px-2 py-1.5 rounded border border-slate-800/60">
                                <span className="text-slate-200">{prod?.name || pid}</span>
                                <div className="flex items-center gap-3">
                                  <span className={stock > 5 ? 'text-emerald-400 font-mono' : 'text-rose-400 font-mono font-bold'}>
                                    库存: {stock} {prod?.unit}
                                  </span>
                                  <span className="text-amber-400 font-mono font-semibold">
                                    {price} 🌟
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Footer Info */}
                      <div className="mt-3.5 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                        <span>日运营维护费: {building?.operatingCost || 15} 🌟/日</span>
                        <span className="text-emerald-400">经营状态健康</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PRODUCTS & DYNAMIC PRICING */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-sm text-slate-200">商品供需行情与动态定价监视表</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    基于供求关系的自动动态定价：库存短缺时自动上涨溢价，库存过剩时下调促销；满足居民不同的身心需求。
                  </p>
                </div>
                <span className="text-xs text-slate-400">收录 {economyState.products.length} 款核心商品</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {economyState.products.map(prod => {
                  const shop = economyState.shops.find(s => s.productIds.includes(prod.id));
                  const stock = shop?.inventory[prod.id] ?? 0;
                  const deltaPercent = Math.round(((prod.currentPrice - prod.basePrice) / prod.basePrice) * 100);

                  return (
                    <div 
                      key={prod.id}
                      className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* Title and Category */}
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-bold text-sm text-white">{prod.name}</h4>
                            <span className="text-[10px] text-slate-400">
                              售卖处: {shop?.name || '社区商店'}
                            </span>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                            每{prod.unit}
                          </span>
                        </div>

                        {/* Price & Inflation Comparison */}
                        <div className="mt-3 flex items-baseline justify-between bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                          <div>
                            <span className="text-[10px] text-slate-400 block">实时市场价</span>
                            <div className="flex items-baseline gap-1 mt-0.5">
                              <span className="text-xl font-bold font-mono text-amber-300">
                                {prod.currentPrice}
                              </span>
                              <span className="text-[10px] text-amber-500">🌟</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block">基准单价: {prod.basePrice} 🌟</span>
                            <div className="flex items-center justify-end gap-1 mt-0.5">
                              {deltaPercent > 0 ? (
                                <span className="text-xs font-semibold text-rose-400 flex items-center font-mono">
                                  +{deltaPercent}% 紧俏上涨
                                </span>
                              ) : deltaPercent < 0 ? (
                                <span className="text-xs font-semibold text-emerald-400 flex items-center font-mono">
                                  {deltaPercent}% 促销折扣
                                </span>
                              ) : (
                                <span className="text-xs font-medium text-slate-400 font-mono">
                                  基准持平
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <p className="text-xs text-slate-400 mt-2.5 leading-relaxed line-clamp-2">
                          {prod.description}
                        </p>

                        {/* Effects Breakdown */}
                        <div className="mt-3 space-y-1">
                          <span className="text-[10px] text-slate-500 block">消费后身心满足效应:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {prod.satisfactionEffect.map((eff, i) => (
                              <span key={i} className="text-[10px] px-2 py-0.5 bg-slate-900 text-slate-300 rounded border border-slate-800">
                                {eff.needType === 'hunger' ? '饥饿' :
                                 eff.needType === 'energy' ? '精力' :
                                 eff.needType === 'stress' ? '压力' :
                                 eff.needType === 'comfort' ? '舒适' :
                                 eff.needType === 'curiosity' ? '好奇' :
                                 eff.needType === 'achievement' ? '成就' : eff.needType}: {eff.value > 0 ? `+${eff.value}` : eff.value}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Stock Status Bar */}
                      <div className="mt-3.5 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                        <span className="text-slate-400">当前可售库存:</span>
                        <span className={`font-mono font-bold ${
                          stock <= 0 ? 'text-rose-400' : stock < 6 ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                          {stock} {prod.unit} ({stock <= 0 ? '已售罄' : stock < 6 ? '告急' : '充沛'})
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: TRANSACTION LOGS */}
        {activeTab === 'transactions' && (
          <div className="space-y-4">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-sm text-slate-200">小镇全量经济交易与收支流水日志</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    记录居民消费、工薪结算、采购补货与市政公积金补贴支出。
                  </p>
                </div>
                <span className="text-xs text-slate-400">共 {economyState.recentTransactions.length} 条记录</span>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/80">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/80 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">模拟时间</th>
                      <th className="px-4 py-3">交易性质</th>
                      <th className="px-4 py-3">明细描述</th>
                      <th className="px-4 py-3 text-right">金额 (🌟)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {economyState.recentTransactions.map((tx, idx) => (
                      <tr key={tx.id || idx} className="hover:bg-slate-900/40 transition-colors">
                        <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">
                          第{tx.simDay}天 {tx.simTime}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-sans font-medium border ${
                            tx.type === 'purchase'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : tx.type === 'salary'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : tx.type === 'subsidy'
                              ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          }`}>
                            {tx.type === 'purchase' ? '居民商品消费' :
                             tx.type === 'salary' ? '工位薪酬发放' :
                             tx.type === 'subsidy' ? '市政财政补贴' : '运营采购消耗'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-sans text-slate-200">
                          {tx.description}
                        </td>
                        <td className={`px-4 py-2.5 text-right font-bold whitespace-nowrap ${
                          tx.type === 'purchase' ? 'text-amber-400' :
                          tx.type === 'salary' ? 'text-emerald-400' :
                          tx.type === 'subsidy' ? 'text-indigo-400' : 'text-rose-400'
                        }`}>
                          {tx.type === 'purchase' ? '-' : '+'}{tx.amount} 🌟
                        </td>
                      </tr>
                    ))}
                    {economyState.recentTransactions.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-500 font-sans">
                          暂无交易流水记录。
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
