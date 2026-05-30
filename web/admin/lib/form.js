(function () {
  const Admin = window.Admin = window.Admin || {};

  function createForm(opts) {
    const form = document.createElement("form");
    form.className = "form";
    const values = Object.assign({}, opts.initial || {});
    const inputs = {};

    (opts.fields || []).forEach((f) => {
      const row = document.createElement("div");
      row.className = "form-row";
      const label = document.createElement("label");
      label.textContent = f.label || f.name;
      label.htmlFor = "f_" + f.name;
      row.appendChild(label);

      let input;
      if (f.type === "textarea" || f.type === "markdown") {
        input = document.createElement("textarea");
        input.rows = f.rows || 6;
      } else if (f.type === "select") {
        input = document.createElement("select");
        (f.options || []).forEach((o) => {
          const opt = document.createElement("option");
          opt.value = o.value;
          opt.textContent = o.label;
          input.appendChild(opt);
        });
      } else if (f.type === "toggle") {
        input = document.createElement("input");
        input.type = "checkbox";
      } else {
        input = document.createElement("input");
        input.type = f.type || "text";
      }
      input.id = "f_" + f.name;
      input.name = f.name;
      if (values[f.name] != null) {
        if (input.type === "checkbox") input.checked = !!values[f.name];
        else input.value = values[f.name];
      }
      if (f.placeholder) input.placeholder = f.placeholder;
      if (f.required) input.required = true;
      if (f.help) {
        const help = document.createElement("div");
        help.className = "form-help";
        help.textContent = f.help;
        row.appendChild(help);
      }
      row.appendChild(input);
      inputs[f.name] = { input, field: f };
      form.appendChild(row);

      if (f.type === "markdown" && Admin.markdown) {
        Admin.markdown.enhance(input, row);
      }
    });

    const err = document.createElement("div");
    err.className = "form-err";
    err.hidden = true;
    form.appendChild(err);

    const foot = document.createElement("div");
    foot.className = "form-foot";
    const submit = document.createElement("button");
    submit.type = "submit";
    submit.className = "btn primary";
    submit.textContent = opts.submitLabel || "Kaydet";
    foot.appendChild(submit);
    if (opts.onCancel) {
      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.className = "btn";
      cancel.textContent = opts.cancelLabel || "İptal";
      cancel.onclick = opts.onCancel;
      foot.appendChild(cancel);
    }
    form.appendChild(foot);

    form.onsubmit = async (ev) => {
      ev.preventDefault();
      err.hidden = true;
      err.textContent = "";
      const out = {};
      for (const [name, { input, field }] of Object.entries(inputs)) {
        out[name] = input.type === "checkbox" ? input.checked : input.value;
        if (field.validate) {
          const v = field.validate(out[name], out);
          if (v) { err.hidden = false; err.textContent = v; return; }
        }
      }
      submit.disabled = true;
      const orig = submit.textContent;
      submit.textContent = "Kaydediliyor…";
      try {
        await opts.onSubmit(out);
      } catch (e) {
        err.hidden = false;
        err.textContent = e.message || String(e);
      } finally {
        submit.disabled = false;
        submit.textContent = orig;
      }
    };

    return { el: form, values: () => {
      const out = {};
      for (const [n, { input }] of Object.entries(inputs)) {
        out[n] = input.type === "checkbox" ? input.checked : input.value;
      }
      return out;
    }};
  }

  Admin.form = createForm;
})();
