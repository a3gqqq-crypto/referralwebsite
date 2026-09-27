import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

import Icon from "./Icon";
import { supabase } from "../lib/supabaseClient";
import { useCopy } from "../hooks/useCopy";

import "../styles/checkout.css";

const PAY_OPTIONS = [
  { network: "bsc", token: "USDT", netName: "BNB Smart Chain", netShort: "BEP20", hint: "Most popular" },
  { network: "bsc", token: "USDC", netName: "BNB Smart Chain", netShort: "BEP20" },
  { network: "polygon", token: "USDT", netName: "Polygon", netShort: "Polygon" },
  { network: "polygon", token: "USDC", netName: "Polygon", netShort: "Polygon" },
];

const RETRY_MS = 10000;

function formatLeft(ms) {
  if (ms <= 0) return "expired";
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

// Pay for a shop item in USDT/USDC. The order has a unique amount; after
// paying, the buyer pastes the transaction ID and the server checks the chain.
function CryptoCheckout({ item, onClose, onPaid }) {
  const [option, setOption] = useState(null);
  const [order, setOrder] = useState(null);
  const [qr, setQr] = useState("");
  const [txHash, setTxHash] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);
  const [paid, setPaid] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [copiedAmount, copyAmount] = useCopy();
  const [copiedAddress, copyAddress] = useCopy();

  const dialogRef = useRef(null);
  const retryRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
      clearTimeout(retryRef.current);
    };
  }, []);

  useEffect(() => {
    if (!order || paid) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [order, paid]);

  useEffect(() => {
    if (!order) return;
    QRCode.toDataURL(order.pay_to, { margin: 1, width: 240, color: { dark: "#140d16", light: "#ffffff" } })
      .then(setQr)
      .catch(() => setQr(""));
  }, [order]);

  const start = async (choice) => {
    setOption(choice);
    setBusy(true);
    setStatus(null);

    const { data, error } = await supabase.rpc("create_crypto_order", {
      p_cosmetic: item.id,
      p_network: choice.network,
      p_token: choice.token,
    });

    setBusy(false);

    if (error) {
      setOption(null);
      setStatus({ type: "error", text: error.message || "Couldn't start checkout." });
      return;
    }

    setOrder(data);
  };

  const check = async (auto = false) => {
    clearTimeout(retryRef.current);

    if (!/^0x[0-9a-fA-F]{64}$/.test(txHash.trim())) {
      setStatus({ type: "error", text: "Paste the transaction ID. It starts with 0x and is 66 characters long." });
      return;
    }

    if (!auto) setBusy(true);

    const { data, error } = await supabase.functions.invoke("verify-crypto-payment", {
      body: { order_id: order.id, tx_hash: txHash.trim() },
    });

    setBusy(false);

    if (error || !data) {
      setStatus({ type: "error", text: "Couldn't check right now. Try again in a moment." });
      return;
    }

    if (data.status === "paid") {
      setPaid(true);
      setStatus(null);
      onPaid?.();
      return;
    }

    if (data.status === "waiting") {
      setStatus({ type: "gold", text: data.message });
      // Keep checking on our own while they wait for confirmations.
      retryRef.current = setTimeout(() => check(true), RETRY_MS);
      return;
    }

    setStatus({ type: "error", text: data.message || "That didn't work." });
  };

  const left = order ? new Date(order.expires_at).getTime() - now : 0;
  const amount = order ? Number(order.amount).toFixed(4) : "";

  return (
    <dialog
      ref={dialogRef}
      className="report-modal checkout-modal"
      onClose={(event) => !event.currentTarget.open && onClose()}
    >
      <div className="report-modal-body">
        <div className="checkout-head">
          <div>
            <span className="eyebrow">Checkout</span>
            <h2>{item.name}</h2>
          </div>
          <button type="button" className="checkout-close" onClick={onClose} aria-label="Close">
            <Icon name="close" size={16} strokeWidth={2.6} />
          </button>
        </div>

        {paid ? (
          <div className="checkout-done">
            <span className="checkout-done-icon" aria-hidden="true">
              <Icon name="check" size={28} strokeWidth={2.8} />
            </span>
            <strong>Paid! {item.name} is yours.</strong>
            <p>Close this and tap Equip to wear it. Thanks for supporting Suffrova 💛</p>
            <button type="button" className="btn btn-primary btn-block" onClick={onClose}>
              Done
            </button>
          </div>
        ) : !order ? (
          <>
            <p>Pay with a stablecoin (1 coin = $1). Pick what you have in your wallet:</p>

            <div className="checkout-options">
              {PAY_OPTIONS.map((choice) => (
                <button
                  key={`${choice.network}-${choice.token}`}
                  type="button"
                  className={`checkout-option ${option === choice ? "is-busy" : ""}`}
                  onClick={() => start(choice)}
                  disabled={busy}
                >
                  <strong>{choice.token}</strong>
                  <span>{choice.netName}</span>
                  {choice.hint && <em>{choice.hint}</em>}
                </button>
              ))}
            </div>

            {status && <div className={`notice notice-${status.type}`}>{status.text}</div>}
          </>
        ) : (
          <>
            <div className="checkout-warning">
              <Icon name="shield" size={15} />
              <span>
                Send <b>{option.token}</b> on <b>{option.netName}</b> only. Other coins or networks can be lost.
              </span>
            </div>

            <div className="checkout-pay">
              {qr && <img src={qr} alt="Wallet address QR code" className="checkout-qr" width="160" height="160" />}

              <div className="checkout-fields">
                <span className="checkout-label">Send exactly</span>
                <button type="button" className="checkout-copy" onClick={() => copyAmount(amount)}>
                  <span className="mono checkout-amount">
                    {amount} <small>{option.token}</small>
                  </span>
                  <Icon name={copiedAmount ? "check" : "copy"} size={15} />
                </button>
                <span className="checkout-hint">Include every digit. The last ones identify your order.</span>

                <span className="checkout-label">To this address</span>
                <button type="button" className="checkout-copy" onClick={() => copyAddress(order.pay_to)}>
                  <span className="mono checkout-address">{order.pay_to}</span>
                  <Icon name={copiedAddress ? "check" : "copy"} size={15} />
                </button>
              </div>
            </div>

            <p className={`checkout-timer mono ${left <= 0 ? "is-late" : ""}`}>
              {left > 0 ? `Pay within ${formatLeft(left)}` : "Time's up. If you already paid, still paste the ID below."}
            </p>

            <div className="field">
              <label htmlFor="tx-hash">After paying, paste the transaction ID</label>
              <input
                id="tx-hash"
                value={txHash}
                onChange={(event) => setTxHash(event.target.value)}
                placeholder="0x…"
                autoComplete="off"
                spellCheck="false"
                disabled={busy}
              />
              <span className="checkout-hint">
                In Trust Wallet: tap the payment in your history → copy the Transaction ID (or open it on the explorer and copy the hash).
              </span>
            </div>

            {status && <div className={`notice notice-${status.type}`}>{status.text}</div>}

            <button type="button" className="btn btn-primary btn-block" onClick={() => check(false)} disabled={busy || !txHash.trim()}>
              {busy ? "Checking…" : "I paid, check it"}
            </button>
          </>
        )}
      </div>
    </dialog>
  );
}

export default CryptoCheckout;
