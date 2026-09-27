import { useCallback, useEffect, useState } from "react";

import { supabase } from "../../lib/supabaseClient";
import { cosmeticById } from "../../data/cosmetics";
import { adminCall, formatDateTime } from "./adminApi";

const EXPLORER = {
  bsc: "https://bscscan.com/tx/",
  polygon: "https://polygonscan.com/tx/",
};

const NET_NAME = { bsc: "BNB Chain", polygon: "Polygon" };

// Owners only: the wallet shop payments go to, and recent crypto orders.
function AdminPayments() {
  const [address, setAddress] = useState("");
  const [saved, setSaved] = useState("");
  const [orders, setOrders] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    const [{ data: setting }, result] = await Promise.all([
      supabase.from("app_settings").select("value").eq("key", "crypto_address").maybeSingle(),
      adminCall("owner_crypto_orders"),
    ]);

    setAddress(setting?.value || "");
    setSaved(setting?.value || "");
    setOrders(result.ok ? result.data : []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setNotice(null);

    const result = await adminCall("owner_set_crypto_address", { p_address: address.trim() || null });

    setBusy(false);
    setNotice(
      result.ok
        ? { type: "success", text: address.trim() ? "Saved. The shop's Buy buttons now open crypto checkout." : "Crypto checkout turned off." }
        : { type: "error", text: result.error }
    );
    if (result.ok) load();
  };

  const paid = (orders || []).filter((order) => order.status === "paid");
  const total = paid.reduce((sum, order) => sum + Number(order.amount), 0);

  return (
    <div className="admin-section">
      <form className="admin-event-form card" onSubmit={save}>
        <h3>Crypto wallet</h3>
        <p className="muted">
          Shop payments (USDT/USDC on BNB Smart Chain or Polygon) go straight to this address.
          Use your Trust Wallet BNB Smart Chain address. The same one works for Polygon.
          Leave it empty to turn checkout off.
        </p>

        <div className="field">
          <label htmlFor="crypto-address">Receive address</label>
          <input
            id="crypto-address"
            className="mono"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="0x…"
            spellCheck="false"
            autoComplete="off"
            disabled={busy}
          />
        </div>

        {notice && <div className={`notice notice-${notice.type}`}>{notice.text}</div>}

        <button type="submit" className="btn btn-primary" disabled={busy || address.trim() === saved}>
          {busy ? "Saving…" : "Save address"}
        </button>
      </form>

      <div className="card admin-orders">
        <div className="admin-orders-head">
          <h3>Orders</h3>
          <span className="muted">
            {paid.length} paid · <span className="mono">{total.toFixed(2)}</span> USD in stablecoins
          </span>
        </div>

        {orders === null ? (
          <p className="muted">Loading…</p>
        ) : orders.length === 0 ? (
          <p className="muted">No orders yet.</p>
        ) : (
          <ul>
            {orders.map((order) => (
              <li key={order.id} className={order.status === "paid" ? "is-paid" : ""}>
                <span>
                  <strong>{order.username}</strong> · {order.kind === "donation" ? "💛 Donation" : cosmeticById(order.cosmetic_id)?.name || order.cosmetic_id}
                </span>
                <span className="mono">
                  {Number(order.amount).toFixed(4)} {order.token} · {NET_NAME[order.network]}
                </span>
                <span className="muted">{formatDateTime(order.paid_at || order.created_at)}</span>
                {order.status === "paid" ? (
                  <a href={EXPLORER[order.network] + order.tx_hash} target="_blank" rel="noreferrer">
                    Paid ↗
                  </a>
                ) : (
                  <span className="muted">Unpaid</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default AdminPayments;
