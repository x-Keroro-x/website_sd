/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { 
  LayoutDashboard, 
  Package, 
  TrendingUp, 
  Plus, 
  Minus, 
  PlusCircle, 
  Save, 
  CheckCircle2,
  Calendar,
  Mail
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type View = 'Overview' | 'Sales' | 'Inventory';

interface Product {
  name: string;
  price: number;
  category: string;
}

interface CartItem extends Product {
  quantity: number;
}

interface SavedTransaction {
  id: string;
  items: CartItem[];
  total: number;
  timestamp: string;
}

interface DailyLog {
  date: string;
  totalRevenue: number;
  transactionsCount: number;
  itemsSold: Record<string, number>;
}

const INVENTORY_DATA: Record<string, Product[]> = {
  'Beverages': [
    { name: 'Coke', price: 20, category: 'Beverages' },
    { name: 'Sprite', price: 20, category: 'Beverages' },
    { name: 'Iced Coffee', price: 40, category: 'Beverages' },
    { name: 'Bottled Water', price: 15, category: 'Beverages' }
  ],
  'Snacks': [
    { name: 'Chips', price: 25, category: 'Snacks' },
    { name: 'Waffle Dog', price: 30, category: 'Snacks' },
    { name: 'Fried Noodles', price: 35, category: 'Snacks' },
    { name: 'Biscuits', price: 10, category: 'Snacks' }
  ],
  'Essentials': [
    { name: 'Rice', price: 50, category: 'Essentials' },
    { name: 'Cooking Oil', price: 60, category: 'Essentials' },
    { name: 'Soy Sauce', price: 20, category: 'Essentials' },
    { name: 'Salt', price: 10, category: 'Essentials' }
  ]
};

export default function App() {
  const [currentView, setCurrentView] = useState<View>('Overview');
  const [activeCategory, setActiveCategory] = useState('Beverages');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [transactions, setTransactions] = useState<SavedTransaction[]>(() => {
    const saved = localStorage.getItem('dashboard_transactions');
    return saved ? JSON.parse(saved) : [];
  });
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>(() => {
    const saved = localStorage.getItem('dashboard_daily_logs');
    return saved ? JSON.parse(saved) : [];
  });
  const [showSavedMsg, setShowSavedMsg] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Persistence for transactions and reports
  useEffect(() => {
    localStorage.setItem('dashboard_transactions', JSON.stringify(transactions));
    localStorage.setItem('dashboard_daily_logs', JSON.stringify(dailyLogs));
  }, [transactions, dailyLogs]);

  const totalCartValue = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [cart]);

  const addToCart = (product: Product, quantity: number) => {
    setCart(prev => {
      const existing = prev.find(item => item.name === product.name);
      if (existing) {
        return prev.map(item => 
          item.name === product.name ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [...prev, { ...product, quantity }];
    });
  };

  const updateCartQuantity = (name: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.name === name) {
          const newQty = Math.max(0, item.quantity + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter(item => item.quantity > 0);
    });
  };

  const saveTransaction = () => {
    if (cart.length === 0) return;
    
    const newTransaction: SavedTransaction = {
      id: Math.random().toString(36).substring(2, 9),
      items: [...cart],
      total: totalCartValue,
      timestamp: new Date().toISOString()
    };
    
    setTransactions(prev => [newTransaction, ...prev]);
    setCart([]);
    setShowSavedMsg(true);
    setTimeout(() => setShowSavedMsg(false), 3000);
  };

  const commitDailySales = () => {
    if (transactions.length === 0) return;
    
    setIsSyncing(true);
    
    // Aggregate data
    const today = new Date().toISOString().split('T')[0];
    const totalRevenue = transactions.reduce((sum, t) => sum + t.total, 0);
    const itemsSold: Record<string, number> = {};
    
    transactions.forEach(t => {
      t.items.forEach(item => {
        itemsSold[item.name] = (itemsSold[item.name] || 0) + item.quantity;
      });
    });

    const newLog: DailyLog = {
      date: today,
      totalRevenue,
      transactionsCount: transactions.length,
      itemsSold
    };

    setTimeout(() => {
      setDailyLogs(prev => {
        // Check if report for today already exists to avoid duplicates
        const existingIndex = prev.findIndex(l => l.date === today);
        if (existingIndex > -1) {
          const updated = [...prev];
          updated[existingIndex] = newLog;
          return updated;
        }
        return [newLog, ...prev];
      });
      // Optionally clear transactions after committing
      // setTransactions([]); 
      setIsSyncing(false);
    }, 800);
  };

  const stats = {
    netIncome: transactions.reduce((sum, t) => sum + t.total, 0),
    totalTransactions: transactions.length,
    lifetimeRevenue: dailyLogs.reduce((sum, log) => sum + log.totalRevenue, 0)
  };

  const productsRanked = useMemo(() => {
    const counts: Record<string, number> = {};
    dailyLogs.forEach(log => {
      Object.entries(log.itemsSold).forEach(([name, qty]) => {
        counts[name] = (counts[name] || 0) + (qty as number);
      });
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [dailyLogs]);

  const sendEmailReport = () => {
    if (dailyLogs.length === 0) {
      alert("No data to report yet. Commit some sales first!");
      return;
    }
    
    const reportTitle = `Revenue Report - Generated ${new Date().toLocaleDateString()}`;
    let body = "REVENUE STREAM REPORT\n\n";
    
    // Sort logs by date descending for the report
    [...dailyLogs].sort((a, b) => b.date.localeCompare(a.date)).forEach(log => {
      body += `Date: ${log.date}\n`;
      body += `Revenue: ₱${log.totalRevenue.toFixed(2)}\n`;
      body += `Transactions: ${log.transactionsCount}\n`;
      body += "Items Sold:\n";
      Object.entries(log.itemsSold).forEach(([name, qty]) => {
        body += `- ${name}: ${qty}\n`;
      });
      body += "--------------------------\n\n";
    });

    const mailtoUrl = `mailto:?subject=${encodeURIComponent(reportTitle)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
  };

  const chartData = useMemo(() => {
    return [...dailyLogs]
      .reverse() // Chronological order
      .slice(-7) // Last 7 logs
      .map(log => ({
        name: new Date(log.date).toLocaleDateString(undefined, { weekday: 'short' }),
        revenue: log.totalRevenue,
        fullDate: log.date
      }));
  }, [dailyLogs]);

  return (
    <div className="flex h-screen w-full dashboard-gradient">
      {/* Sidebar */}
      <aside className="w-72 sidebar-navy flex flex-col p-8 text-white shadow-2xl">
        <h1 className="text-4xl font-bold italic tracking-tighter mb-16 px-4">Menu</h1>
        
        <nav className="flex flex-col gap-4">
          <SidebarLink 
            icon={<LayoutDashboard size={24} />} 
            label="Overview" 
            active={currentView === 'Overview'} 
            onClick={() => setCurrentView('Overview')} 
          />
          <SidebarLink 
            icon={<TrendingUp size={24} />} 
            label="Sales" 
            active={currentView === 'Sales'} 
            onClick={() => setCurrentView('Sales')} 
          />
          <SidebarLink 
            icon={<Package size={24} />} 
            label="Inventory" 
            active={currentView === 'Inventory'} 
            onClick={() => setCurrentView('Inventory')} 
          />
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-12">
        <AnimatePresence mode="wait">
          {currentView === 'Overview' && (
            <motion.div 
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-10"
            >
              <header className="flex justify-end">
                <div className="pill-container flex items-center gap-2">
                  <Calendar size={18} className="text-neutral-400" />
                  <span>{new Date().toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}</span>
                </div>
              </header>

              <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="card-container">
                  <h2 className="text-2xl font-bold text-navy mb-4">Net Income</h2>
                  <div className="text-5xl font-black text-neutral-800 tracking-tight">
                    ₱{stats.netIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="card-container">
                  <h2 className="text-2xl font-bold text-navy mb-4">Transactions</h2>
                  <div className="text-5xl font-black text-neutral-800 tracking-tight">
                    {stats.totalTransactions}
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="card-container min-h-[400px]">
                  <h2 className="text-2xl font-bold text-navy mb-6">Recent Activity</h2>
                  <div className="space-y-4">
                    {transactions.length === 0 ? (
                      <p className="text-neutral-400 italic text-center mt-20">Transaction history will appear here.</p>
                    ) : (
                      transactions.slice(0, 5).map(t => (
                        <div key={t.id} className="flex items-center justify-between p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                          <div>
                            <p className="font-bold text-sm">{t.items.length} items</p>
                            <p className="text-[10px] text-neutral-400">{new Date(t.timestamp).toLocaleTimeString()}</p>
                          </div>
                          <p className="font-black text-navy">₱{t.total.toFixed(2)}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div className="card-container min-h-[400px] relative">
                  <div className="flex justify-between items-start mb-6">
                    <h2 className="text-2xl font-bold text-navy">Sales & Revenue</h2>
                    <button 
                      onClick={commitDailySales}
                      disabled={isSyncing || transactions.length === 0}
                      className="p-3 bg-navy text-white rounded-2xl hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 shadow-lg flex items-center gap-2 group"
                      title="Save today's sales to history"
                    >
                      {isSyncing ? (
                         <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      ) : (
                        <Save size={18} className="group-hover:scale-110 transition-transform" />
                      )}
                      <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">Commit</span>
                    </button>
                  </div>
                  <div className="flex flex-col gap-6 h-full pb-12">
                    <div className="flex items-center justify-between p-6 bg-navy text-white rounded-[30px] border-[4px] border-border-gray/20">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Pending Deposit</p>
                        <p className="text-3xl font-black italic tracking-tighter">₱{stats.netIncome.toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Active Queue</p>
                        <p className="text-xl font-black italic tracking-tighter">{stats.totalTransactions} Sold</p>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 mb-4">Historical Growth</p>
                      {dailyLogs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 opacity-20">
                          <TrendingUp size={32} />
                          <p className="text-[10px] font-bold mt-2 uppercase tracking-widest">No history synced</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {dailyLogs.slice(0, 3).map(log => (
                            <div key={log.date} className="flex justify-between items-center text-sm">
                              <span className="text-neutral-500 font-bold">{new Date(log.date).toLocaleDateString()}</span>
                              <span className="font-black text-navy">₱{log.totalRevenue.toFixed(0)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </motion.div>
          )}

          {currentView === 'Sales' && (
            <motion.div 
              key="sales"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-10"
            >
              <header className="flex justify-between items-center">
                <div className="flex items-center gap-6">
                  <div className="pill-container flex items-center gap-2 px-10 py-4 text-xl">
                    Monthly Performance
                  </div>
                  <button 
                    onClick={sendEmailReport}
                    className="p-4 bg-white border-[3px] border-border-gray text-navy rounded-full hover:border-navy transition-all active:scale-95 shadow-sm flex items-center gap-2"
                    title="Send report via Email"
                  >
                    <Mail size={20} />
                    <span className="text-xs font-bold uppercase tracking-widest">Send Report</span>
                  </button>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Total Lifecycle Sales</p>
                  <p className="text-3xl font-black italic text-navy">₱{stats.lifetimeRevenue.toLocaleString()}</p>
                </div>
              </header>

              <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="inline-block bg-white border-[3px] border-border-gray rounded-2xl px-6 py-1 font-bold text-sm ml-6 mb-[-20px] relative z-10">
                    Products Sold
                  </div>
                  <div className="card-container min-h-[500px] bg-neutral-50">
                    {productsRanked.length === 0 ? (
                      <p className="text-neutral-400 italic text-center mt-40">List of products will appear here after syncing.</p>
                    ) : (
                      <div className="space-y-4 pt-4">
                        {productsRanked.map(([name, qty]) => (
                          <div key={name} className="flex items-center justify-between p-5 bg-white rounded-3xl border border-neutral-200 shadow-sm transition-all hover:scale-[1.02]">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-navy text-white rounded-xl flex items-center justify-center font-black text-xs italic">
                                #{productsRanked.findIndex(x => x[0] === name) + 1}
                              </div>
                              <span className="font-bold text-navy uppercase tracking-tight">{name}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-black text-xl italic text-neutral-800">{qty}</span>
                              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Units Sold</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-4">
                   <div className="inline-block bg-white border-[3px] border-border-gray rounded-2xl px-6 py-1 font-bold text-sm ml-6 mb-[-20px] relative z-10">
                    Revenue Stream
                  </div>
                  <div className="card-container min-h-[500px] bg-neutral-50 flex flex-col">
                    {dailyLogs.length === 0 ? (
                      <p className="text-neutral-400 italic text-center mt-40">Sales data or charts will appear here.</p>
                    ) : (
                      <>
                        <div className="h-[250px] mb-8 w-full pt-4">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                              <XAxis 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 10, fontWeight: 700, fill: '#A3A3A3' }}
                              />
                              <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 10, fontWeight: 700, fill: '#A3A3A3' }}
                                tickFormatter={(val) => `₱${val}`}
                              />
                              <Tooltip 
                                contentStyle={{ borderRadius: '20px', border: '3px solid #d1d8dd', fontWeight: 'bold' }}
                                formatter={(value: number) => [`₱${value.toFixed(2)}`, 'Revenue']}
                              />
                              <Bar 
                                dataKey="revenue" 
                                radius={[10, 10, 0, 0]}
                                barSize={40}
                              >
                                {chartData.map((_entry, index) => (
                                  <Cell key={`cell-${index}`} fill={index === chartData.length - 1 ? '#1a262b' : '#d1d8dd'} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>

                        <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                          {dailyLogs.map(log => (
                            <div key={log.date} className="flex items-center justify-between p-5 bg-white rounded-3xl border border-neutral-200 shadow-sm">
                               <div>
                                  <p className="font-bold text-navy">{new Date(log.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">{log.transactionsCount} Transactions</p>
                               </div>
                               <div className="text-right">
                                  <p className="font-black text-xl text-neutral-800">₱{log.totalRevenue.toFixed(2)}</p>
                               </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </section>
            </motion.div>
          )}

          {currentView === 'Inventory' && (
            <motion.div 
              key="inventory"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col h-full gap-8"
            >
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 flex-1">
                {/* Product Catalog */}
                <div className="lg:col-span-3 card-container flex flex-col h-full">
                  <h2 className="text-2xl font-bold text-navy mb-6">Catalog</h2>
                  
                  <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
                    {Object.keys(INVENTORY_DATA).map(cat => (
                      <button 
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`px-6 py-2 rounded-full font-bold text-sm border-[3px] transition-all whitespace-nowrap ${
                          activeCategory === cat 
                            ? 'bg-navy text-white border-navy shadow-lg' 
                            : 'bg-white text-neutral-500 border-neutral-200 hover:border-navy'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <div className="flex-1 bg-neutral-50 rounded-[30px] border-[2px] border-neutral-200 p-6 overflow-y-auto">
                    <div className="space-y-3">
                      {INVENTORY_DATA[activeCategory].map(prod => (
                        <div key={prod.name} className="flex items-center justify-between p-4 bg-white border border-neutral-100 rounded-2xl group hover:shadow-md transition-all">
                          <div>
                            <p className="font-bold text-neutral-800 uppercase tracking-tight">{prod.name}</p>
                            <p className="text-xs text-neutral-400 font-bold">₱{prod.price.toFixed(2)}</p>
                          </div>
                          <button 
                            onClick={() => addToCart(prod, 1)}
                            className="p-2 bg-navy text-white rounded-xl hover:bg-neutral-800 active:scale-95 transition-all shadow-md"
                          >
                            <PlusCircle size={20} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Selected Items / Cart */}
                <div className="lg:col-span-2 card-container flex flex-col bg-neutral-50">
                  <h2 className="text-2xl font-bold text-navy mb-6">Cart</h2>
                  <div className="flex-1 overflow-y-auto space-y-3">
                    {cart.length === 0 ? (
                      <div className="flex flex-col items-center justify-center mt-24 text-neutral-300">
                        <Package size={48} strokeWidth={1} />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] mt-4">Empty Queue</p>
                      </div>
                    ) : (
                      cart.map(item => (
                        <div key={item.name} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-neutral-200">
                          <div className="flex-1">
                            <p className="font-bold text-sm text-navy uppercase tracking-tight">{item.name}</p>
                            <p className="text-[10px] text-neutral-400 font-bold">₱{(item.price * item.quantity).toFixed(2)}</p>
                          </div>
                          <div className="flex items-center gap-3 bg-neutral-50 px-3 py-1.5 rounded-xl border border-neutral-200">
                            <button 
                              onClick={() => updateCartQuantity(item.name, -1)}
                              className="text-neutral-400 hover:text-navy transition-colors"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="font-black text-xs w-6 text-center">{item.quantity}</span>
                            <button 
                              onClick={() => updateCartQuantity(item.name, 1)}
                              className="text-neutral-400 hover:text-navy transition-colors"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <footer className="flex items-center justify-between">
                <div className="pill-container text-2xl px-12 py-4">
                  Total: <span className="text-navy font-black ml-2 tracking-tighter">₱{totalCartValue.toFixed(2)}</span>
                </div>
                
                <div className="flex items-center gap-6">
                  <AnimatePresence>
                    {showSavedMsg && (
                      <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="flex items-center gap-2 text-navy font-black uppercase tracking-widest text-xs"
                      >
                        <CheckCircle2 size={20} className="text-green-500" />
                        <span>Transaction Logged</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <button 
                    onClick={saveTransaction}
                    disabled={cart.length === 0}
                    className="bg-white border-[4px] border-border-gray hover:border-navy hover:text-navy px-16 py-4 rounded-[30px] font-black text-xl tracking-widest disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 shadow-lg group italic"
                  >
                    SAVE
                  </button>
                </div>
              </footer>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function SidebarLink({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`group flex items-center gap-4 px-6 py-5 rounded-[20px] transition-all relative overflow-hidden ${
        active 
          ? 'bg-neutral-700/50 text-white shadow-inner' 
          : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
      }`}
    >
      <span className={`${active ? 'text-white' : 'text-neutral-500 group-hover:text-white'} transition-colors`}>
        {icon}
      </span>
      <span className="text-xl font-bold">{label}</span>
      {active && (
        <motion.div 
          layoutId="active-nav"
          className="absolute left-0 top-0 bottom-0 w-2 bg-white rounded-r-full" 
        />
      )}
    </button>
  );
}
