"use client";

import { api } from "@/lib/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/lib/toast-context";

const electricityTypes = [
  { value: "NO_ELECTRICITY", label: "No Electricity" },
  { value: "PREPAID", label: "Prepaid" },
  { value: "METER_BASED", label: "Meter Based" }
];

const billingCycles = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "CUSTOM", label: "Custom" }
];

const splitModes = [
  { value: "EQUAL", label: "Equal" },
  { value: "STAY_DURATION", label: "Stay Duration" }
];

type ElectricitySettings = {
  hostelId: string;
  electricityType: "NO_ELECTRICITY" | "PREPAID" | "METER_BASED";
  electricityRatePerUnit: string | null;
  billingCycle: "MONTHLY" | "CUSTOM";
  electricitySplitMode: "EQUAL" | "STAY_DURATION";
};

export default function ElectricitySettingsClient() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const settingsQuery = useQuery({
    queryKey: ["electricity-settings"],
    queryFn: () => api<ElectricitySettings>("/api/electricity/settings")
  });

  const mutation = useMutation({
    mutationFn: (payload: Partial<ElectricitySettings>) =>
      api<ElectricitySettings>("/api/electricity/settings", "PUT", payload),
    onSuccess: (data) => {
      queryClient.setQueryData(["electricity-settings"], data);
    }
  });

  async function submitSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload: Partial<ElectricitySettings> = {
      electricityType: String(formData.get("electricityType")) as ElectricitySettings["electricityType"],
      billingCycle: String(formData.get("billingCycle")) as ElectricitySettings["billingCycle"],
      electricitySplitMode: String(formData.get("electricitySplitMode")) as ElectricitySettings["electricitySplitMode"],
      electricityRatePerUnit: String(formData.get("electricityRatePerUnit") || "")
    };

    if (!payload.electricityRatePerUnit) {
      payload.electricityRatePerUnit = null;
    }

    try {
      await mutation.mutateAsync(payload);
      showToast("Electricity settings updated", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update settings";
      showToast(message, "error");
    }
  }

  if (settingsQuery.isLoading) {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <div className="glass-panel p-6">Loading electricity settings...</div>
      </main>
    );
  }

  const settings = settingsQuery.data;
  if (!settings) {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <div className="glass-panel p-6">No hostel configured yet.</div>
      </main>
    );
  }

  return (
    <main className="page-enter mx-auto max-w-5xl space-y-6 p-6">
      <header className="section-enter section-delay-1">
        <h1 className="text-2xl font-semibold">Electricity Settings</h1>
        <p className="text-sm text-slate-600">
          Configure electricity type, rate, billing cycle, and split mode.
        </p>
      </header>

      <section className="glass-panel section-enter section-delay-2 p-4">
        <form className="grid gap-3 md:grid-cols-2" onSubmit={submitSettings}>
          <Select name="electricityType" defaultValue={settings.electricityType}>
            {electricityTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </Select>

          <Input
            name="electricityRatePerUnit"
            placeholder="Rate per unit"
            defaultValue={settings.electricityRatePerUnit ?? ""}
          />

          <Select name="billingCycle" defaultValue={settings.billingCycle}>
            {billingCycles.map((cycle) => (
              <option key={cycle.value} value={cycle.value}>
                {cycle.label}
              </option>
            ))}
          </Select>

          <Select name="electricitySplitMode" defaultValue={settings.electricitySplitMode}>
            {splitModes.map((mode) => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </Select>

          <button className="glass-btn-primary h-11 rounded-xl px-4 py-2 text-sm" type="submit">
            Save Settings
          </button>
        </form>
      </section>

      {settings.electricityType === "PREPAID" ? (
        <section className="glass-panel section-enter section-delay-3 p-4">
          <p className="text-sm text-slate-600">
            Electricity is prepaid. Meter readings and billing are disabled.
          </p>
        </section>
      ) : null}
    </main>
  );
}
