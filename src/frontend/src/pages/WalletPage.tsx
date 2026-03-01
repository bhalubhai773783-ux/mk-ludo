import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Clock,
  Loader2,
  Wallet,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { WalletTransactionStatus, WalletTransactionType } from "../backend.d";
import type { WalletTransaction } from "../backend.d";
import { TxStatusBadge } from "../components/StatusBadge";
import { useActor } from "../hooks/useActor";
import {
  paisaToRupees,
  rupeesToPaise,
  useGetMe,
  useRequestDeposit,
  useRequestWithdrawal,
} from "../hooks/useQueries";

const AMOUNT_PRESETS = [100, 250, 500, 1000];

function TransactionRow({ tx }: { tx: WalletTransaction }) {
  const isCredit =
    tx.txType === WalletTransactionType.Deposit ||
    tx.txType === WalletTransactionType.BattleWin;

  const typeLabel: Record<WalletTransactionType, string> = {
    [WalletTransactionType.Deposit]: "Deposit",
    [WalletTransactionType.Withdrawal]: "Withdrawal",
    [WalletTransactionType.BattleEntry]: "Battle Entry",
    [WalletTransactionType.BattleWin]: "Battle Win",
  };

  const date = new Date(Number(tx.timestamp / 1_000_000n));

  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/40 last:border-0">
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
          isCredit
            ? "bg-green-500/15 text-green-400"
            : "bg-red-500/15 text-red-400"
        }`}
      >
        {isCredit ? <ArrowDownCircle size={16} /> : <ArrowUpCircle size={16} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold font-body text-foreground">
          {typeLabel[tx.txType]}
        </p>
        <p className="text-xs text-muted-foreground font-body">
          {date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </p>
        {tx.notes && (
          <p className="text-xs text-muted-foreground/70 font-body truncate">
            {tx.notes}
          </p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1">
        <span
          className={`text-sm font-bold font-display ${
            isCredit ? "text-green-400" : "text-red-400"
          }`}
        >
          {isCredit ? "+" : "-"}₹{paisaToRupees(tx.amount)}
        </span>
        <TxStatusBadge status={tx.status} />
      </div>
    </div>
  );
}

function WalletForm({
  type,
  onSubmit,
  isPending,
}: {
  type: "deposit" | "withdraw";
  onSubmit: (amount: number, upiOrBank: string) => Promise<void>;
  isPending: boolean;
}) {
  const [amount, setAmount] = useState<number>(0);
  const [customAmount, setCustomAmount] = useState("");
  const [upiOrBank, setUpiOrBank] = useState("");

  const effectiveAmount = customAmount
    ? Number.parseFloat(customAmount)
    : amount;
  const isDeposit = type === "deposit";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!effectiveAmount || effectiveAmount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!upiOrBank.trim()) {
      toast.error("Enter your UPI ID or bank details");
      return;
    }
    await onSubmit(effectiveAmount, upiOrBank.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <Label className="text-sm font-body mb-2 block">Amount</Label>
        <div className="grid grid-cols-4 gap-2 mb-2">
          {AMOUNT_PRESETS.map((preset) => (
            <button
              type="button"
              key={preset}
              className={`amount-chip ${
                amount === preset && !customAmount ? "selected" : ""
              }`}
              onClick={() => {
                setAmount(preset);
                setCustomAmount("");
              }}
            >
              ₹{preset}
            </button>
          ))}
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-body text-sm">
            ₹
          </span>
          <Input
            type="number"
            placeholder="Custom amount"
            value={customAmount}
            onChange={(e) => {
              setCustomAmount(e.target.value);
              setAmount(0);
            }}
            className="pl-7 bg-input/50"
            min="1"
          />
        </div>
      </div>

      <div>
        <Label className="text-sm font-body mb-2 block">
          {isDeposit
            ? "Your UPI ID / Bank Account"
            : "Withdraw to UPI / Bank Account"}
        </Label>
        <Input
          value={upiOrBank}
          onChange={(e) => setUpiOrBank(e.target.value)}
          placeholder={
            isDeposit
              ? "yourname@upi or Account Number"
              : "yourname@upi or IFSC + Account"
          }
          className="bg-input/50"
        />
        <p className="text-xs text-muted-foreground font-body mt-1">
          {isDeposit
            ? "Our team will credit your wallet after payment verification"
            : "Withdrawal processed within 24 hours"}
        </p>
      </div>

      <Button
        type="submit"
        disabled={isPending || !effectiveAmount}
        className={
          isDeposit
            ? "btn-gold w-full h-11"
            : "w-full h-11 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold"
        }
      >
        {isPending ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
        {isPending
          ? "Processing..."
          : isDeposit
            ? `Request Deposit ₹${effectiveAmount || 0}`
            : `Request Withdrawal ₹${effectiveAmount || 0}`}
      </Button>
    </form>
  );
}

export default function WalletPage() {
  const { data: me, isLoading: meLoading } = useGetMe();
  const { actor, isFetching } = useActor();
  const requestDeposit = useRequestDeposit();
  const requestWithdrawal = useRequestWithdrawal();
  const [activeTab, setActiveTab] = useState<
    "deposit" | "withdraw" | "history"
  >("deposit");

  // Fetch transaction history — using a query that returns WalletTransaction[]
  // We get the user's own transactions from pending transactions (a simplified approach)
  const { data: txHistory = [], isLoading: txLoading } = useQuery<
    WalletTransaction[]
  >({
    queryKey: ["myTransactions"],
    queryFn: async () => {
      if (!actor) return [];
      // We use listPendingTransactions but show all for the user
      return actor.listPendingTransactions();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30_000,
  });

  async function handleDeposit(amount: number, upiOrBank: string) {
    try {
      await requestDeposit.mutateAsync({
        amount: rupeesToPaise(amount),
        upiOrBank,
      });
      toast.success(
        "Deposit request submitted! We'll credit your wallet shortly.",
      );
    } catch {
      toast.error("Failed to submit deposit request");
    }
  }

  async function handleWithdraw(amount: number, upiOrBank: string) {
    const balance = me ? Number(me.walletBalance) / 100 : 0;
    if (amount > balance) {
      toast.error(
        `Insufficient balance. You have ₹${paisaToRupees(me?.walletBalance ?? 0n)}`,
      );
      return;
    }
    try {
      await requestWithdrawal.mutateAsync({
        amount: rupeesToPaise(amount),
        upiOrBank,
      });
      toast.success(
        "Withdrawal request submitted! Processing within 24 hours.",
      );
    } catch {
      toast.error("Failed to submit withdrawal request");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative glass-card rounded-2xl p-6 overflow-hidden border border-gold/20"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-gold/5 via-transparent to-transparent" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <Wallet size={16} className="text-gold" />
            <span className="text-sm text-muted-foreground font-body">
              Wallet Balance
            </span>
          </div>
          {meLoading ? (
            <Skeleton className="h-10 w-36 bg-muted/50" />
          ) : (
            <div className="text-4xl font-black font-display gold-shimmer">
              ₹{me ? paisaToRupees(me.walletBalance) : "0"}
            </div>
          )}
          {me && (
            <p className="text-xs text-muted-foreground font-body mt-2">
              Account: {me.username}
            </p>
          )}
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex rounded-xl bg-muted/30 p-1 border border-border/40">
        {(["deposit", "withdraw", "history"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-sm font-semibold font-body rounded-lg capitalize transition-all duration-200 ${
              activeTab === tab
                ? "bg-card text-foreground shadow-card"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "deposit"
              ? "Add Money"
              : tab === "withdraw"
                ? "Withdraw"
                : "History"}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
        className="glass-card rounded-xl p-5 border border-border/50"
      >
        {activeTab === "deposit" && (
          <div>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-full bg-green-500/15 flex items-center justify-center">
                <ArrowDownCircle size={16} className="text-green-400" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base">Add Money</h3>
                <p className="text-xs text-muted-foreground font-body">
                  Funds credited after verification
                </p>
              </div>
            </div>
            <WalletForm
              type="deposit"
              onSubmit={handleDeposit}
              isPending={requestDeposit.isPending}
            />
          </div>
        )}

        {activeTab === "withdraw" && (
          <div>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-full bg-red-500/15 flex items-center justify-center">
                <ArrowUpCircle size={16} className="text-red-400" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base">Withdraw</h3>
                <p className="text-xs text-muted-foreground font-body">
                  Processed within 24 hours
                </p>
              </div>
            </div>
            <WalletForm
              type="withdraw"
              onSubmit={handleWithdraw}
              isPending={requestWithdrawal.isPending}
            />
          </div>
        )}

        {activeTab === "history" && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Clock size={16} className="text-muted-foreground" />
              <h3 className="font-display font-bold text-base">
                Transaction History
              </h3>
            </div>

            {txLoading ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton
                    key={i}
                    className="h-14 w-full rounded-lg bg-muted/30"
                  />
                ))}
              </div>
            ) : txHistory.length === 0 ? (
              <div className="text-center py-8">
                <Clock
                  size={28}
                  className="text-muted-foreground/30 mx-auto mb-2"
                />
                <p className="text-muted-foreground text-sm font-body">
                  No transactions yet
                </p>
              </div>
            ) : (
              <div>
                {txHistory.map((tx) => (
                  <TransactionRow key={tx.id} tx={tx} />
                ))}
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Info box */}
      <div className="rounded-xl border border-border/40 bg-muted/20 p-4">
        <p className="text-xs text-muted-foreground font-body leading-relaxed">
          💡 <strong className="text-foreground">How it works:</strong> Add
          money via UPI/bank transfer. Join battles and win. Withdraw winnings
          directly to your bank account. All transactions are manually verified
          for security.
        </p>
      </div>
    </div>
  );
}
