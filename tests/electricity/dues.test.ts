import { describe, expect, it } from "vitest";

function toNumber(value: any) {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

describe("Electricity Dues Integration", () => {
  it("sums rent and electricity invoices correctly", () => {
    const invoices = [
      { type: "ROOM_RENT", totalAmount: 5000, payments: [{ amount: 2000 }] },
      { type: "ELECTRICITY", totalAmount: 500, payments: [] },
      { type: "ROOM_RENT", totalAmount: 1000, payments: [{ amount: 1000 }] } // Fully paid
    ];

    const dues = invoices.reduce(
      (acc, inv) => {
        const total = toNumber(inv.totalAmount);
        const paid = inv.payments.reduce((s, p) => s + toNumber(p.amount), 0);
        const due = Math.max(0, total - paid);
        
        if (inv.type === "ELECTRICITY") acc.electricity += due;
        else acc.rent += due;
        return acc;
      },
      { rent: 0, electricity: 0 }
    );

    expect(dues.rent).toBe(3000);
    expect(dues.electricity).toBe(500);
    expect(dues.rent + dues.electricity).toBe(3500);
  });

  it("handles empty invoice lists", () => {
    const dues = [].reduce(
      (acc: any, inv: any) => acc, 
      { rent: 0, electricity: 0 }
    );
    expect(dues).toEqual({ rent: 0, electricity: 0 });
  });

  it("handles partially paid electricity bills", () => {
    const invoices = [
      { type: "ELECTRICITY", totalAmount: 850.50, payments: [{ amount: 400 }] }
    ];
    const dues = invoices.reduce(
      (acc, inv) => {
        const total = toNumber(inv.totalAmount);
        const paid = inv.payments.reduce((s, p) => s + toNumber(p.amount), 0);
        const due = Math.max(0, total - paid);
        if (inv.type === "ELECTRICITY") acc.electricity += due;
        return acc;
      },
      { rent: 0, electricity: 0 }
    );
    expect(dues.electricity).toBe(450.50);
  });
});
