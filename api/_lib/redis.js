// Minimal Upstash Redis client over its REST API (works in Node functions and Edge middleware).
// Env: KV_REST_API_URL + KV_REST_API_TOKEN (Vercel Marketplace) or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN.
// With INFOELEV_MEMORY_DB=1 (local dev only) data lives in process memory.

const memory = new Map();

function memoryCommand([cmd, key, ...args]) {
  const now = Date.now();
  const entry = memory.get(key);
  if (entry && entry.exp && entry.exp < now) memory.delete(key);
  switch (cmd.toUpperCase()) {
    case "GET": return memory.get(key)?.value ?? null;
    case "SET": {
      const nx = args.includes("NX");
      if (nx && memory.has(key)) return null;
      const ex = args.indexOf("EX");
      memory.set(key, { value: args[0], exp: ex >= 0 ? now + Number(args[ex + 1]) * 1000 : 0 });
      return "OK";
    }
    case "DEL": return memory.delete(key) ? 1 : 0;
    case "SADD": {
      const set = memory.get(key)?.value || new Set();
      args.forEach((m) => set.add(m));
      memory.set(key, { value: set });
      return args.length;
    }
    case "SMEMBERS": return [...(memory.get(key)?.value || [])];
    case "INCR": {
      const next = Number(memory.get(key)?.value || 0) + 1;
      memory.set(key, { value: String(next), exp: memory.get(key)?.exp || 0 });
      return next;
    }
    case "EXPIRE": {
      if (!memory.has(key)) return 0;
      memory.get(key).exp = now + Number(args[0]) * 1000;
      return 1;
    }
    default: throw new Error("memory db: unsupported command " + cmd);
  }
}

export async function redis(...command) {
  const env = globalThis.process?.env || {};
  if (env.INFOELEV_MEMORY_DB === "1") return memoryCommand(command.map(String));
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("Redis is not configured (KV_REST_API_URL / KV_REST_API_TOKEN)");
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify(command.map(String)),
  });
  const json = await res.json();
  if (json.error) throw new Error("redis: " + json.error);
  return json.result;
}
