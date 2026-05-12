import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../supabaseClient.js";
import { collectionConfigs } from "./mappers.js";

// Per-(user, collection) localStorage keys for offline cache + pending writes.
const cacheKey = (userId, name) => `pt_cache_${name}_${userId}`;
const queueKey = (userId, name) => `pt_queue_${name}_${userId}`;

const readJSON = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeJSON = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode — ignore */
  }
};

// Diff two arrays of {id, ...} by id, returning {inserts, updates, deletes}.
function diff(prev, next) {
  const prevById = new Map(prev.map((it) => [it.id, it]));
  const nextById = new Map(next.map((it) => [it.id, it]));

  const inserts = [];
  const updates = [];
  const deletes = [];

  for (const item of next) {
    const before = prevById.get(item.id);
    if (!before) {
      inserts.push(item);
    } else if (!shallowEqual(before, item)) {
      updates.push(item);
    }
  }
  for (const item of prev) {
    if (!nextById.has(item.id)) deletes.push(item);
  }
  return { inserts, updates, deletes };
}

function shallowEqual(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (const k of ak) if (a[k] !== b[k]) return false;
  return true;
}

/**
 * Hook that mirrors a Supabase table as a local React state array.
 * Drop-in replacement for the original useState + saveX(next) pattern:
 *
 *   const [trips, setTrips, { status, error }] = useCloudCollection('trips', user);
 *
 * Calling setTrips(nextArray) updates UI immediately, persists to the
 * localStorage cache, and pushes a diff to Supabase. Failed pushes (offline,
 * server error) are queued and retried when the browser regains connectivity
 * or when this hook next runs a flush.
 */
export function useCloudCollection(collectionName, user) {
  const config = collectionConfigs[collectionName];
  if (!config) {
    throw new Error(`Unknown collection: ${collectionName}`);
  }
  const userId = user?.id ?? null;

  const [items, setItemsState] = useState(() =>
    userId ? readJSON(cacheKey(userId, collectionName), []) : []
  );
  const [status, setStatus] = useState("idle"); // idle | loading | ready | error
  const [error, setError] = useState(null);

  const itemsRef = useRef(items);
  itemsRef.current = items;

  // ---- Pending-write queue --------------------------------------------------

  const queueRef = useRef(
    userId ? readJSON(queueKey(userId, collectionName), []) : []
  );

  const persistQueue = useCallback(() => {
    if (!userId) return;
    writeJSON(queueKey(userId, collectionName), queueRef.current);
  }, [userId, collectionName]);

  const enqueue = useCallback(
    (ops) => {
      queueRef.current = [...queueRef.current, ...ops];
      persistQueue();
    },
    [persistQueue]
  );

  const flushQueue = useCallback(async () => {
    if (!userId || queueRef.current.length === 0) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;

    const ops = queueRef.current;
    const stillPending = [];

    for (const op of ops) {
      try {
        if (op.type === "upsert") {
          const { error } = await supabase
            .from(config.table)
            .upsert(op.row, { onConflict: "id" });
          if (error) throw error;
        } else if (op.type === "delete") {
          const { error } = await supabase
            .from(config.table)
            .delete()
            .eq("id", op.id)
            .eq("user_id", userId);
          if (error) throw error;
        }
      } catch (err) {
        // Keep this op for the next retry. If we keep failing, the user will
        // still have the changes locally — they just won't sync until online.
        stillPending.push(op);
        console.warn(`[cloud:${collectionName}] queued op failed`, err);
      }
    }

    queueRef.current = stillPending;
    persistQueue();
  }, [userId, collectionName, config.table, persistQueue]);

  // ---- Initial load: hydrate from cache → fetch fresh ----------------------

  useEffect(() => {
    if (!userId) {
      setItemsState([]);
      setStatus("idle");
      return;
    }

    setItemsState(readJSON(cacheKey(userId, collectionName), []));
    queueRef.current = readJSON(queueKey(userId, collectionName), []);

    let cancelled = false;
    (async () => {
      setStatus("loading");
      setError(null);
      try {
        // Drain any queued offline writes first so the server reflects them.
        await flushQueue();

        const { data, error } = await supabase
          .from(config.table)
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: true });
        if (error) throw error;
        if (cancelled) return;

        const fresh = (data || []).map(config.fromRow);
        setItemsState(fresh);
        itemsRef.current = fresh;
        writeJSON(cacheKey(userId, collectionName), fresh);
        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        console.warn(`[cloud:${collectionName}] initial fetch failed`, err);
        setError(err);
        // Stay on cached data; mark ready so the UI isn't blocked.
        setStatus("ready");
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, collectionName]);

  // ---- Realtime subscription -----------------------------------------------

  useEffect(() => {
    if (!userId) return undefined;

    const channel = supabase
      .channel(`pt-${collectionName}-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: config.table,
          filter: `user_id=eq.${userId}`,
        },
          (payload) => {
            // Debug incoming realtime payloads so we can see why updates
            // from other devices might not be applied. Different
            // supabase-js / realtime versions expose the fields with
            // slightly different names (eventType / event / type, new /
            // record, old / record_old). Be defensive here.
            try {
              // Uncomment for verbose logging during debugging:
              // console.debug(`[cloud:${collectionName}] realtime payload`, payload);
            } catch (e) {
              /* ignore logging failures */
            }

            const eventType = payload.eventType ?? payload.event ?? payload.type;
            const newRow = payload.new ?? payload.record ?? payload.record_new ?? null;
            const oldRow = payload.old ?? payload.record_old ?? null;

            const current = itemsRef.current;
            let next = current;

            if (eventType === "INSERT" || eventType === "UPDATE") {
              if (!newRow) return; // malformed payload
              const incoming = config.fromRow(newRow);
              const idx = current.findIndex((it) => it.id === incoming.id);
              if (idx === -1) next = [...current, incoming];
              else {
                next = current.slice();
                next[idx] = incoming;
              }
            } else if (eventType === "DELETE") {
              if (!oldRow) return;
              next = current.filter((it) => it.id !== (oldRow.id ?? oldRow));
            }

            if (next !== current) {
              itemsRef.current = next;
              setItemsState(next);
              writeJSON(cacheKey(userId, collectionName), next);
            }
          }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, collectionName, config.table, config.fromRow]);

  // ---- Re-flush when the browser comes back online -------------------------

  useEffect(() => {
    if (!userId) return undefined;
    const onOnline = () => {
      flushQueue();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [userId, flushQueue]);

  // ---- The setter the UI calls ---------------------------------------------

  const setItems = useCallback(
    (updater) => {
      const prev = itemsRef.current;
      const next =
        typeof updater === "function" ? updater(prev) : updater;

      itemsRef.current = next;
      setItemsState(next);
      if (userId) writeJSON(cacheKey(userId, collectionName), next);

      if (!userId) return;

      const { inserts, updates, deletes } = diff(prev, next);
      const ops = [
        ...inserts.map((it) => ({ type: "upsert", row: config.toRow(it, userId) })),
        ...updates.map((it) => ({ type: "upsert", row: config.toRow(it, userId) })),
        ...deletes.map((it) => ({ type: "delete", id: it.id })),
      ];
      if (ops.length === 0) return;
      enqueue(ops);
      flushQueue();
    },
    [userId, collectionName, config, enqueue, flushQueue]
  );

  return [items, setItems, { status, error, flush: flushQueue }];
}
