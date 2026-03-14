"use client";

import { useState, useEffect } from "react";

export default function BackOfficePage() {
  const [hostels, setHostels] = useState<any[]>([]);
  const [owners, setOwners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingHostel, setIsAddingHostel] = useState(false);
  const [isAddingOwner, setIsAddingOwner] = useState(false);

  // Form states
  const [hostelForm, setHostelForm] = useState({ name: "", address: "", ownerId: "" });
  const [ownerForm, setOwnerForm] = useState({ name: "", email: "", username: "", password: "" });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [hRes, oRes] = await Promise.all([
        fetch("/api/admin/hostels"),
        fetch("/api/admin/owners")
      ]);
      const hData = await hRes.json();
      const oData = await oRes.json();
      setHostels(hData.data || []);
      setOwners(oData.data || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddHostel(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/hostels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hostelForm)
      });
      if (res.ok) {
        setIsAddingHostel(false);
        setHostelForm({ name: "", address: "", ownerId: "" });
        fetchData();
      }
    } catch (error) {
      console.error("Failed to add hostel:", error);
    }
  }

  async function handleAddOwner(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/owners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ownerForm)
      });
      if (res.ok) {
        setIsAddingOwner(false);
        setOwnerForm({ name: "", email: "", username: "", password: "" });
        fetchData();
      }
    } catch (error) {
      console.error("Failed to add owner:", error);
    }
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-600" />
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-7xl space-y-8 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">Back Office</h1>
          <p className="text-slate-500">System-wide management of hostels and owners.</p>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Hostels Section */}
        <section className="glass-panel space-y-6 p-6">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-700">
              🏢 Hostels
            </h2>
            <button
              onClick={() => setIsAddingHostel(!isAddingHostel)}
              className="glass-btn-primary flex items-center gap-2 px-4 py-2 text-sm"
            >
              + Add Hostel
            </button>
          </div>

          {isAddingHostel && (
            <form onSubmit={handleAddHostel} className="glass-card space-y-4 p-4 animate-in fade-in slide-in-from-top-4">
              <input
                placeholder="Hostel Name"
                className="glass-input w-full"
                value={hostelForm.name}
                onChange={(e) => setHostelForm({ ...hostelForm, name: e.target.value })}
                required
              />
              <input
                placeholder="Address"
                className="glass-input w-full"
                value={hostelForm.address}
                onChange={(e) => setHostelForm({ ...hostelForm, address: e.target.value })}
                required
              />
              <select
                className="glass-input w-full"
                value={hostelForm.ownerId}
                onChange={(e) => setHostelForm({ ...hostelForm, ownerId: e.target.value })}
              >
                <option value="">Link an Owner (Optional)</option>
                {owners.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.name} ({owner.email})
                  </option>
                ))}
              </select>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingHostel(false)}
                  className="glass-btn px-4 py-2 text-sm"
                >
                  Cancel
                </button>
                <button type="submit" className="glass-btn-primary px-4 py-2 text-sm">
                  Save Hostel
                </button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {hostels.map((hostel) => (
              <div key={hostel.id} className="glass-card flex items-center justify-between p-4">
                <div>
                  <h3 className="font-medium text-slate-800">{hostel.name}</h3>
                  <p className="text-xs text-slate-500">{hostel.address}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    👥 {hostel.admins?.length || 0} Admins
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Owners Section */}
        <section className="glass-panel space-y-6 p-6">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-700">
              👤 Owner Accounts
            </h2>
            <button
              onClick={() => setIsAddingOwner(!isAddingOwner)}
              className="glass-btn-primary flex items-center gap-2 px-4 py-2 text-sm"
            >
              + Add Owner
            </button>
          </div>

          {isAddingOwner && (
            <form onSubmit={handleAddOwner} className="glass-card space-y-4 p-4 animate-in fade-in slide-in-from-top-4">
              <input
                placeholder="Full Name"
                className="glass-input w-full"
                value={ownerForm.name}
                onChange={(e) => setOwnerForm({ ...ownerForm, name: e.target.value })}
                required
              />
              <input
                type="email"
                placeholder="Email Address"
                className="glass-input w-full"
                value={ownerForm.email}
                onChange={(e) => setOwnerForm({ ...ownerForm, email: e.target.value })}
                required
              />
              <input
                placeholder="Username (Optional)"
                className="glass-input w-full"
                value={ownerForm.username}
                onChange={(e) => setOwnerForm({ ...ownerForm, username: e.target.value })}
              />
              <input
                type="password"
                placeholder="Password"
                className="glass-input w-full"
                value={ownerForm.password}
                onChange={(e) => setOwnerForm({ ...ownerForm, password: e.target.value })}
                required
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingOwner(false)}
                  className="glass-btn px-4 py-2 text-sm"
                >
                  Cancel
                </button>
                <button type="submit" className="glass-btn-primary px-4 py-2 text-sm">
                  Create Owner
                </button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {owners.map((owner) => (
              <div key={owner.id} className="glass-card flex items-center justify-between p-4">
                <div>
                  <h3 className="font-medium text-slate-800">{owner.name}</h3>
                  <p className="text-xs text-slate-500">{owner.email}</p>
                </div>
                <div className="text-right">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 uppercase tracking-wider">
                    {owner.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
