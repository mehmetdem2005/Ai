(function () {
  const Admin = window.Admin = window.Admin || {};

  function createTable(opts) {
    const cols = opts.columns;
    const wrap = document.createElement("div");
    wrap.className = "tbl-wrap";

    const bar = document.createElement("div");
    bar.className = "tbl-bar";
    bar.hidden = true;
    wrap.appendChild(bar);

    const tbl = document.createElement("table");
    tbl.className = "tbl" + (opts.dense === false ? "" : " tbl-dense");
    const thead = document.createElement("thead");
    const trh = document.createElement("tr");
    if (opts.selectable) {
      const th = document.createElement("th");
      th.className = "col-select";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.setAttribute("aria-label", "Hepsini seç");
      cb.onchange = () => {
        tbody.querySelectorAll("input.row-select").forEach((c) => { c.checked = cb.checked; });
        refreshSelection();
      };
      th.appendChild(cb);
      trh.appendChild(th);
    }
    cols.forEach((c) => {
      const th = document.createElement("th");
      th.textContent = c.label;
      if (c.width) th.style.width = c.width;
      if (c.align) th.style.textAlign = c.align;
      if (c.sortable && opts.onSort) {
        th.classList.add("sortable");
        th.onclick = () => opts.onSort(c.key);
      }
      trh.appendChild(th);
    });
    thead.appendChild(trh);
    tbl.appendChild(thead);

    const tbody = document.createElement("tbody");
    tbl.appendChild(tbody);
    wrap.appendChild(tbl);

    function refreshSelection() {
      const selected = Array.from(tbody.querySelectorAll("input.row-select:checked"))
        .map((c) => c.dataset.id);
      if (selected.length === 0) {
        bar.hidden = true;
        bar.innerHTML = "";
      } else {
        bar.hidden = false;
        bar.innerHTML = "";
        const label = document.createElement("span");
        label.textContent = `${selected.length} seçili`;
        bar.appendChild(label);
        (opts.bulkActions || []).forEach((a) => {
          const btn = document.createElement("button");
          btn.className = "btn " + (a.tone || "");
          btn.textContent = a.label;
          btn.onclick = () => a.onClick(selected);
          bar.appendChild(btn);
        });
      }
    }

    function render(rows) {
      tbody.innerHTML = "";
      if (!rows || rows.length === 0) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = cols.length + (opts.selectable ? 1 : 0);
        td.className = "tbl-empty";
        td.textContent = opts.emptyText || "Kayıt yok";
        tr.appendChild(td);
        tbody.appendChild(tr);
        bar.hidden = true;
        return;
      }
      rows.forEach((row) => {
        const tr = document.createElement("tr");
        if (opts.rowClick) {
          tr.classList.add("clickable");
          tr.onclick = (e) => {
            if (e.target.matches("input.row-select, button, a")) return;
            opts.rowClick(row);
          };
        }
        if (opts.selectable) {
          const td = document.createElement("td");
          td.className = "col-select";
          const cb = document.createElement("input");
          cb.type = "checkbox";
          cb.className = "row-select";
          cb.dataset.id = String(row[opts.idKey || "id"]);
          cb.onchange = refreshSelection;
          td.appendChild(cb);
          tr.appendChild(td);
        }
        cols.forEach((c) => {
          const td = document.createElement("td");
          if (c.align) td.style.textAlign = c.align;
          if (c.cls) td.className = c.cls;
          if (c.render) {
            const out = c.render(row);
            if (out instanceof Node) td.appendChild(out);
            else td.innerHTML = out == null ? "" : String(out);
          } else {
            td.textContent = row[c.key] == null ? "" : String(row[c.key]);
          }
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
    }

    return { el: wrap, render, refreshSelection };
  }

  Admin.table = createTable;
})();
