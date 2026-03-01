"use client";

import { motion } from "framer-motion";

type DashboardStats = {
  occupancy: {
    totalBeds: number;
    occupiedBeds: number;
    vacantBeds: number;
    occupiedPct: number;
    vacantPct: number;
  };
  revenue: {
    invoiced: number;
    collected: number;
    dues: number;
  };
  activeComplaints: number;
  pendingDuesCount: number;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(value);
}

function StatCard({
  title,
  value,
  subtitle,
  delay = 0
}: {
  title: string;
  value: string;
  subtitle?: string;
  delay?: number;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="glass-card p-4"
    >
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
    </motion.article>
  );
}

export default function DashboardCards({ stats }: { stats: DashboardStats }) {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="mb-3 text-lg font-semibold">Occupancy Summary</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <StatCard
            title="Total Beds"
            value={String(stats.occupancy.totalBeds)}
            subtitle="Configured beds"
            delay={0}
          />
          <StatCard
            title="Occupied Beds"
            value={String(stats.occupancy.occupiedBeds)}
            subtitle={`${stats.occupancy.occupiedPct.toFixed(1)}% occupancy`}
            delay={0.05}
          />
          <StatCard
            title="Vacant Beds"
            value={String(stats.occupancy.vacantBeds)}
            subtitle={`${stats.occupancy.vacantPct.toFixed(1)}% vacant`}
            delay={0.1}
          />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Revenue Summary</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <StatCard
            title="Invoiced"
            value={formatCurrency(stats.revenue.invoiced)}
            delay={0.15}
          />
          <StatCard
            title="Collected"
            value={formatCurrency(stats.revenue.collected)}
            delay={0.2}
          />
          <StatCard
            title="Dues"
            value={formatCurrency(stats.revenue.dues)}
            delay={0.25}
          />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Operations Snapshot</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <StatCard
            title="Active Complaints"
            value={String(stats.activeComplaints)}
            subtitle="Open + In Progress"
            delay={0.3}
          />
          <StatCard
            title="Pending Dues"
            value={String(stats.pendingDuesCount)}
            subtitle="Invoices not fully paid"
            delay={0.35}
          />
        </div>
      </div>
    </section>
  );
}
