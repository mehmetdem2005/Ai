(function () {
  const Admin = window.Admin = window.Admin || {};

  function createFilterBar(opts) {
    const wrap = document.createElement("div");
    wrap.className = "filter-bar";
    const state = Object.assign({}, opts.initial || {});

    const fields = opts.fields || [];
    fields.forEach((f) => {
      const cell = document.createElement("label");
      cell.className = "filter-cell";
      cell.innerHTML = `<span class="filter-label">${f.label}</span>`;
      let input;
      if (f.type === "select") {
        input = document.createElement("select");
        (f.options || []).forEach((o) => {
          const opt = document.createElement("option");
          opt.value = o.value;
          opt.textContent = o.label;
          if (state[f.name] === o.value) opt.selected = true;
          input.appendChild(opt);
        });
        input.onchange = () => emit(f.name, input.value);
      } else if (f.type === "toggle") {
        input = document.createElement("input");
        input.type = "checkbox";
        input.checked = !!state[f.name];
        input.onchange = () => emit(f.name, input.checked);
      } else {
        input = document.createElement("input");
        input.type = f.type === "date" ? "date" : "search";
        input.placeholder = f.placeholder || "";
        if (state[f.name] != null) input.value = state[f.name];
        let timer;
        input.oninput = () => {
          clearTimeout(timer);
          timer = setTimeout(() => emit(f.name, input.value), 250);
        };
      }
      cell.appendChild(input);
      wrap.appendChild(cell);
    });

    if (opts.reset !== false) {
      const reset = document.createElement("button");
      reset.className = "btn ghost filter-reset";
      reset.textContent = "Sıfırla";
      reset.onclick = () => {
        Object.keys(state).forEach((k) => delete state[k]);
        wrap.querySelectorAll("input, select").forEach((el) => {
          if (el.type === "checkbox") el.checked = false;
          else el.value = "";
        });
        if (opts.onChange) opts.onChange({});
      };
      wrap.appendChild(reset);
    }

    function emit(name, value) {
      if (value === "" || value == null || value === false) delete state[name];
      else state[name] = value;
      if (opts.onChange) opts.onChange({ ...state });
    }

    return { el: wrap, get: () => ({ ...state }) };
  }

  Admin.filter = createFilterBar;
})();
