(function () {
  const Admin = window.Admin = window.Admin || {};

  function init(supabaseClient, ctx) {
    const sb = supabaseClient;
    const session = ctx.session;
    const role = ctx.role;
    const capabilities = ctx.capabilities || [];

    function can(cap) {
      if (capabilities.includes("*")) return true;
      if (capabilities.includes(cap)) return true;
      const ns = cap.split(".")[0] + ".*";
      return capabilities.includes(ns);
    }

    async function list(table, opts) {
      opts = opts || {};
      let q = sb.from(table).select(opts.select || "*", opts.count ? { count: opts.count } : undefined);
      (opts.eq || []).forEach(([col, val]) => { q = q.eq(col, val); });
      (opts.like || []).forEach(([col, val]) => { q = q.ilike(col, val); });
      (opts.in || []).forEach(([col, vals]) => { q = q.in(col, vals); });
      if (opts.gte) q = q.gte(opts.gte[0], opts.gte[1]);
      if (opts.lte) q = q.lte(opts.lte[0], opts.lte[1]);
      if (opts.order) q = q.order(opts.order.col, { ascending: opts.order.asc !== false });
      if (opts.limit) q = q.limit(opts.limit);
      if (opts.range) q = q.range(opts.range[0], opts.range[1]);
      const { data, error, count } = await q;
      if (error) throw error;
      return { data: data || [], count: count ?? null };
    }

    async function get(table, key, value, select) {
      const { data, error } = await sb.from(table).select(select || "*").eq(key, value).maybeSingle();
      if (error) throw error;
      return data;
    }

    async function rpc(name, args) {
      const { data, error } = await sb.rpc(name, args || {});
      if (error) throw error;
      return data;
    }

    async function upsert(table, row, keyCol) {
      const out = await rpc("admin_upsert", { p_table: table, p_row: row, p_key: keyCol || "id" });
      document.dispatchEvent(new CustomEvent("admin:audit", { detail: { table, op: "upsert", row: out } }));
      return out;
    }

    async function remove(table, keyCol, id) {
      const out = await rpc("admin_delete", { p_table: table, p_key: keyCol, p_id: String(id) });
      document.dispatchEvent(new CustomEvent("admin:audit", { detail: { table, op: "delete", id } }));
      return out;
    }

    async function setArticleStatus(idHash, status) {
      const out = await rpc("set_article_status", { p_id_hash: idHash, p_status: status });
      document.dispatchEvent(new CustomEvent("admin:audit", { detail: { table: "articles", op: "status", id: idHash } }));
      return out;
    }

    async function setAdminRole(userId, role, active) {
      const out = await rpc("set_admin_role", { p_user_id: userId, p_role: role, p_active: active !== false });
      document.dispatchEvent(new CustomEvent("admin:audit", { detail: { table: "admin_users", op: "role", id: userId } }));
      return out;
    }

    Admin.db = {
      sb, session, role, capabilities, can,
      list, get, rpc,
      upsert, remove,
      setArticleStatus, setAdminRole,
    };
    return Admin.db;
  }

  Admin.initDb = init;
})();
