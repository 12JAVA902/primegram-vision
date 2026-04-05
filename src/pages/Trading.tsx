import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, RefreshCw, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

const DEMO_STOCKS: Stock[] = [
  { symbol: "AAPL", name: "Apple Inc.", price: 198.45, change: 3.21, changePercent: 1.64 },
  { symbol: "GOOGL", name: "Alphabet Inc.", price: 178.92, change: -1.45, changePercent: -0.80 },
  { symbol: "TSLA", name: "Tesla Inc.", price: 248.30, change: 8.72, changePercent: 3.64 },
  { symbol: "AMZN", name: "Amazon.com", price: 205.18, change: 2.15, changePercent: 1.06 },
  { symbol: "MSFT", name: "Microsoft Corp.", price: 445.67, change: -3.88, changePercent: -0.86 },
  { symbol: "NVDA", name: "NVIDIA Corp.", price: 135.22, change: 6.43, changePercent: 4.99 },
  { symbol: "META", name: "Meta Platforms", price: 595.30, change: 12.10, changePercent: 2.08 },
  { symbol: "NFLX", name: "Netflix Inc.", price: 845.90, change: -5.30, changePercent: -0.62 },
  { symbol: "BTC", name: "Bitcoin", price: 68452.30, change: 1230.50, changePercent: 1.83 },
  { symbol: "ETH", name: "Ethereum", price: 3845.20, change: -89.40, changePercent: -2.27 },
];

const Trading = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [balance, setBalance] = useState<number>(10000);
  const [stocks, setStocks] = useState<Stock[]>(DEMO_STOCKS);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [tradeAmount, setTradeAmount] = useState("");
  const [portfolio, setPortfolio] = useState<Record<string, { qty: number; avgPrice: number }>>({});

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    const fetchWallet = async () => {
      const { data } = await supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle();
      if (data) setBalance(Number(data.balance));
      else {
        await supabase.from("wallets").insert({ user_id: user.id, balance: 10000 });
        setBalance(10000);
      }
    };
    fetchWallet();
    const stored = localStorage.getItem(`portfolio_${user.id}`);
    if (stored) setPortfolio(JSON.parse(stored));
  }, [user]);

  const savePortfolio = (p: Record<string, { qty: number; avgPrice: number }>) => {
    setPortfolio(p);
    if (user) localStorage.setItem(`portfolio_${user.id}`, JSON.stringify(p));
  };

  const simulatePriceChange = useCallback(() => {
    setStocks(prev => prev.map(s => {
      const changePct = (Math.random() - 0.48) * 4;
      const newPrice = Math.max(0.01, s.price * (1 + changePct / 100));
      const change = newPrice - s.price;
      return { ...s, price: Number(newPrice.toFixed(2)), change: Number(change.toFixed(2)), changePercent: Number(changePct.toFixed(2)) };
    }));
  }, []);

  useEffect(() => {
    const interval = setInterval(simulatePriceChange, 5000);
    return () => clearInterval(interval);
  }, [simulatePriceChange]);

  const handleBuy = async () => {
    if (!selectedStock || !tradeAmount || !user) return;
    const qty = parseInt(tradeAmount);
    if (isNaN(qty) || qty <= 0) { toast.error("Invalid quantity"); return; }
    const cost = qty * selectedStock.price;
    if (cost > balance) { toast.error("Insufficient balance"); return; }
    const newBalance = Number((balance - cost).toFixed(2));
    setBalance(newBalance);
    await supabase.from("wallets").update({ balance: newBalance }).eq("user_id", user.id);
    const existing = portfolio[selectedStock.symbol];
    const newQty = (existing?.qty || 0) + qty;
    const newAvg = ((existing?.qty || 0) * (existing?.avgPrice || 0) + cost) / newQty;
    savePortfolio({ ...portfolio, [selectedStock.symbol]: { qty: newQty, avgPrice: Number(newAvg.toFixed(2)) } });
    toast.success(`Bought ${qty} ${selectedStock.symbol} @ $${selectedStock.price.toLocaleString()}`);
    setTradeAmount("");
  };

  const handleSell = async () => {
    if (!selectedStock || !tradeAmount || !user) return;
    const qty = parseInt(tradeAmount);
    if (isNaN(qty) || qty <= 0) { toast.error("Invalid quantity"); return; }
    const holding = portfolio[selectedStock.symbol];
    if (!holding || holding.qty < qty) { toast.error("Not enough shares"); return; }
    const proceeds = qty * selectedStock.price;
    const newBalance = Number((balance + proceeds).toFixed(2));
    setBalance(newBalance);
    await supabase.from("wallets").update({ balance: newBalance }).eq("user_id", user.id);
    const newQty = holding.qty - qty;
    const updated = { ...portfolio };
    if (newQty === 0) delete updated[selectedStock.symbol];
    else updated[selectedStock.symbol] = { qty: newQty, avgPrice: holding.avgPrice };
    savePortfolio(updated);
    toast.success(`Sold ${qty} ${selectedStock.symbol} @ $${selectedStock.price.toLocaleString()}`);
    setTradeAmount("");
  };

  const portfolioValue = Object.entries(portfolio).reduce((sum, [sym, h]) => {
    const stock = stocks.find(s => s.symbol === sym);
    return sum + (stock ? stock.price * h.qty : 0);
  }, 0);

  if (!user) return null;

  return (
    <div className="min-h-screen pb-20 relative z-10">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <TrendingUp className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold">Demo Trading</h1>
          <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full ml-auto">DEMO</span>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Wallet className="h-3.5 w-3.5" /> Cash Balance
              </div>
              <p className="text-lg font-bold text-foreground">${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <DollarSign className="h-3.5 w-3.5" /> Portfolio
              </div>
              <p className="text-lg font-bold text-foreground">${portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </CardContent>
          </Card>
        </div>

        {/* Trade Panel */}
        {selectedStock && (
          <Card className="mb-6 border-primary/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-bold">{selectedStock.symbol}</p>
                  <p className="text-xs text-muted-foreground">{selectedStock.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">${selectedStock.price.toLocaleString()}</p>
                  <p className={`text-xs ${selectedStock.change >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {selectedStock.change >= 0 ? "+" : ""}{selectedStock.changePercent.toFixed(2)}%
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Input type="number" placeholder="Qty" value={tradeAmount} onChange={e => setTradeAmount(e.target.value)} className="w-24" />
                <Button onClick={handleBuy} className="flex-1 bg-green-600 hover:bg-green-700">
                  <ArrowUpRight className="h-4 w-4 mr-1" /> Buy
                </Button>
                <Button onClick={handleSell} variant="destructive" className="flex-1">
                  <ArrowDownRight className="h-4 w-4 mr-1" /> Sell
                </Button>
              </div>
              {tradeAmount && !isNaN(parseInt(tradeAmount)) && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Total: ${(parseInt(tradeAmount) * selectedStock.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Portfolio Holdings */}
        {Object.keys(portfolio).length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-muted-foreground mb-2">Your Holdings</h2>
            <div className="space-y-2">
              {Object.entries(portfolio).map(([sym, h]) => {
                const stock = stocks.find(s => s.symbol === sym);
                const currentVal = stock ? stock.price * h.qty : 0;
                const costBasis = h.avgPrice * h.qty;
                const pnl = currentVal - costBasis;
                return (
                  <Card key={sym} className="cursor-pointer hover:bg-accent/10" onClick={() => setSelectedStock(stock || null)}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm">{sym}</p>
                        <p className="text-xs text-muted-foreground">{h.qty} shares @ ${h.avgPrice}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">${currentVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        <p className={`text-xs ${pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                          {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Market */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Market</h2>
          <Button variant="ghost" size="sm" onClick={simulatePriceChange}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
          </Button>
        </div>
        <div className="space-y-2">
          {stocks.map(stock => (
            <Card key={stock.symbol} className={`cursor-pointer transition-all hover:bg-accent/10 ${selectedStock?.symbol === stock.symbol ? "ring-1 ring-primary" : ""}`}
              onClick={() => setSelectedStock(stock)}>
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">{stock.symbol}</p>
                  <p className="text-xs text-muted-foreground">{stock.name}</p>
                </div>
                <div className="text-right flex items-center gap-2">
                  <div>
                    <p className="text-sm font-medium">${stock.price.toLocaleString()}</p>
                    <p className={`text-xs flex items-center gap-0.5 justify-end ${stock.change >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {stock.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {stock.changePercent >= 0 ? "+" : ""}{stock.changePercent.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default Trading;
