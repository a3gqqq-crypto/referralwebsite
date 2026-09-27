// Checks a stablecoin payment on chain and unlocks the shop item or donation.
//
// The buyer sends { order_id } (and optionally tx_hash). Without a hash we
// search recent Transfer logs to the order's address for the order's unique
// amount. Either way we accept a transaction only if it has an ERC-20
// Transfer of the order's token, to the order's address, for the exact
// amount, mined while the order was open, with enough confirmations. The
// database makes each tx hash usable once.

import { createClient } from "npm:@supabase/supabase-js@2";

const SITES = ["https://www.suffrova.com", "https://suffrova.com", "http://localhost:5173"];

const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

type LogNode = { url: string; maxRange: number };

const NETWORKS: Record<string, { rpcs: string[]; logNodes: LogNode[]; secondsPerBlock: number; confirmations: number; tokens: Record<string, { address: string; decimals: number }> }> = {
  bsc: {
    rpcs: [
      "https://bsc-dataseed.bnbchain.org",
      "https://bsc-dataseed2.bnbchain.org",
      "https://bsc-dataseed1.defibit.io",
      "https://bsc-dataseed1.ninicoin.io",
      "https://bsc.drpc.org",
    ],
    // Most public nodes refuse log searches; these allow them.
    logNodes: [{ url: "https://bsc-rpc.publicnode.com", maxRange: 5000 }],
    // A bit under the real ~0.45s so the search reaches back far enough.
    secondsPerBlock: 0.4,
    confirmations: 15,
    tokens: {
      USDT: { address: "0x55d398326f99059ff775485246999027b3197955", decimals: 18 },
      USDC: { address: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d", decimals: 18 },
    },
  },
  polygon: {
    rpcs: ["https://polygon-bor-rpc.publicnode.com", "https://polygon.drpc.org", "https://1rpc.io/matic"],
    logNodes: [
      { url: "https://polygon-bor-rpc.publicnode.com", maxRange: 5000 },
      { url: "https://polygon.drpc.org", maxRange: 100 },
    ],
    secondsPerBlock: 1.2,
    confirmations: 30,
    tokens: {
      USDT: { address: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f", decimals: 6 },
      USDC: { address: "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359", decimals: 6 },
    },
  },
};

function corsFor(origin: string) {
  return {
    "Access-Control-Allow-Origin": SITES.includes(origin) ? origin : SITES[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

// Tries each node in turn so one being down doesn't break checkout.
async function rpc(urls: string[], method: string, params: unknown[]) {
  let lastError: unknown = null;

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        signal: AbortSignal.timeout(8000),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message || "RPC error");
      return json.result;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("No RPC node answered");
}

// Transfer logs to `payTo` between two blocks, split into ranges each node allows.
async function findTransfers(nodes: LogNode[], token: string, payTo: string, from: number, to: number) {
  let lastError: unknown = null;

  for (const node of nodes) {
    try {
      const logs = [];

      for (let start = from; start <= to; start += node.maxRange) {
        const end = Math.min(to, start + node.maxRange - 1);
        // Nodes can be a few blocks apart; asking past a node's head is an error, so the last chunk ends at "latest".
        const toBlock = end >= to ? "latest" : "0x" + end.toString(16);
        logs.push(
          ...(await rpc([node.url], "eth_getLogs", [
            { fromBlock: "0x" + start.toString(16), toBlock, address: token, topics: [TRANSFER_TOPIC, null, payTo] },
          ]))
        );
      }

      return logs;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("No node could search logs");
}

// "1.4940" with 6 decimals -> 1494000n, without floating point.
function toUnits(amount: string, decimals: number): bigint {
  const [whole, fraction = ""] = amount.split(".");
  return BigInt(whole + fraction.padEnd(decimals, "0").slice(0, decimals));
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";
  const headers = { ...corsFor(origin), "Content-Type": "application/json" };
  const reply = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), { status, headers });

  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return reply({ error: "POST only" }, 405);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: auth } = await admin.auth.getUser(jwt);
  const userId = auth?.user?.id;

  if (!userId) return reply({ status: "error", message: "Please log in again." }, 401);

  let orderId = "";
  let txHash = "";

  try {
    const body = await req.json();
    orderId = String(body?.order_id ?? "");
    txHash = String(body?.tx_hash ?? "").trim().toLowerCase();
  } catch {
    return reply({ status: "error", message: "Bad request." }, 400);
  }

  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return reply({ status: "error", message: "Order not found." });

  if (txHash && !/^0x[0-9a-f]{64}$/.test(txHash)) {
    return reply({ status: "error", message: "That doesn't look like a transaction ID. It starts with 0x and is 66 characters long." });
  }

  const { data: order } = await admin.from("crypto_orders").select("*").eq("id", orderId).maybeSingle();

  if (!order || order.user_id !== userId) return reply({ status: "error", message: "Order not found." });
  if (order.status === "paid") return reply({ status: "paid" });

  const network = NETWORKS[order.network];
  const token = network?.tokens[order.token];
  if (!network || !token) return reply({ status: "error", message: "Unknown network." });

  const netName = order.network === "bsc" ? "BNB Smart Chain" : "Polygon";
  const payTo = "0x" + order.pay_to.slice(2).toLowerCase().padStart(64, "0");
  const expected = toUnits(String(order.amount), token.decimals);
  // Accept up to 0.00009 over, in case a wallet rounds up; the next order's tail is 0.0001 away.
  const tolerance = toUnits("0.00009", token.decimals);

  // No hash given: look for a transfer of this exact amount since the order opened.
  if (!txHash) {
    let candidates: { transactionHash: string }[] = [];

    try {
      const latestBlock = await rpc(network.rpcs, "eth_getBlockByNumber", ["latest", false]);
      const latestNumber = Number(BigInt(latestBlock.number));
      const chainNow = Number(BigInt(latestBlock.timestamp));
      const secondsBack = chainNow - new Date(order.created_at).getTime() / 1000 + 180;
      const blocksBack = Math.min(15000, Math.ceil(Math.max(secondsBack, 60) / network.secondsPerBlock));

      const logs = await findTransfers(network.logNodes, token.address, payTo, Math.max(0, latestNumber - blocksBack), latestNumber);

      candidates = logs.filter((log: { data: string }) => {
        const value = BigInt(log.data);
        return value >= expected && value <= expected + tolerance;
      });
    } catch (error) {
      console.error("Log search failed:", error);
      return reply({ status: "waiting", message: "Couldn't reach the blockchain. Trying again…" });
    }

    if (!candidates.length) {
      return reply({
        status: "waiting",
        message: `Looking for your payment of ${order.amount} ${order.token} on ${netName}…`,
      });
    }

    const hashes = candidates.map((log) => log.transactionHash.toLowerCase());
    const { data: taken } = await admin.from("crypto_orders").select("tx_hash").in("tx_hash", hashes);
    const takenSet = new Set((taken ?? []).map((row: { tx_hash: string }) => row.tx_hash));
    const free = hashes.find((hash) => !takenSet.has(hash));

    if (!free) {
      return reply({ status: "waiting", message: `Looking for your payment of ${order.amount} ${order.token} on ${netName}…` });
    }

    txHash = free;
  }

  const { data: used } = await admin.from("crypto_orders").select("id").eq("tx_hash", txHash).maybeSingle();
  if (used) return reply({ status: "error", message: "That transaction was already used for another order." });

  let receipt;
  let latest;

  try {
    [receipt, latest] = await Promise.all([
      rpc(network.rpcs, "eth_getTransactionReceipt", [txHash]),
      rpc(network.rpcs, "eth_blockNumber", []),
    ]);
  } catch (error) {
    console.error("RPC failed:", error);
    return reply({ status: "waiting", message: "Couldn't reach the blockchain. Trying again…" });
  }

  if (!receipt) {
    return reply({
      status: "waiting",
      message: `Not found on ${netName} yet. If you just sent it, give it a minute. Make sure you sent on ${netName}.`,
    });
  }

  if (receipt.status !== "0x1") return reply({ status: "error", message: "That transaction failed on the blockchain." });

  const transfer = (receipt.logs ?? []).find((log: { address: string; topics: string[]; data: string }) =>
    log.address?.toLowerCase() === token.address &&
    log.topics?.[0] === TRANSFER_TOPIC &&
    log.topics?.[2]?.toLowerCase() === payTo
  );

  if (!transfer) {
    return reply({
      status: "error",
      message: `That transaction isn't a ${order.token} payment to the Suffrova wallet on ${netName}.`,
    });
  }

  const value = BigInt(transfer.data);

  if (value < expected || value > expected + tolerance) {
    return reply({
      status: "error",
      message: `That payment was for a different amount. This order needs exactly ${order.amount} ${order.token}.`,
    });
  }

  let block;

  try {
    block = await rpc(network.rpcs, "eth_getBlockByNumber", [receipt.blockNumber, false]);
  } catch (error) {
    console.error("RPC failed:", error);
    return reply({ status: "waiting", message: "Couldn't reach the blockchain. Trying again…" });
  }

  const minedAt = Number(BigInt(block.timestamp)) * 1000;
  const createdAt = new Date(order.created_at).getTime();
  const expiresAt = new Date(order.expires_at).getTime();

  // A little slack either side for clock differences and slow wallets.
  if (minedAt < createdAt - 5 * 60_000 || minedAt > expiresAt + 30 * 60_000) {
    return reply({ status: "error", message: "That payment wasn't made while this order was open." });
  }

  const confirmations = Number(BigInt(latest) - BigInt(receipt.blockNumber)) + 1;

  if (confirmations < network.confirmations) {
    return reply({
      status: "waiting",
      message: `Payment found! Waiting for confirmations (${confirmations}/${network.confirmations})…`,
    });
  }

  const { data: completed, error } = await admin.rpc("complete_crypto_order", { p_order: order.id, p_tx: txHash });

  if (error) {
    console.error("complete_crypto_order failed:", error);
    return reply({
      status: "error",
      message: error.code === "23505" ? "That transaction was already used for another order." : "Couldn't finish the order. Try again.",
    });
  }

  return reply({ status: completed ? "paid" : "error", message: completed ? undefined : "This order is already closed." });
});
