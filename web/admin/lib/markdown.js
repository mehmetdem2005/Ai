(function () {
  const Admin = window.Admin = window.Admin || {};

  // Minimal güvenli Markdown render — başlık, paragraf, list, link, kod, bold/italic.
  // XSS koruması: HTML escape önce, sonra inline + block pattern dönüşümü.
  function render(md) {
    if (!md) return "";
    let s = String(md).replace(/[&<>"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
    // code blocks
    s = s.replace(/```([\s\S]*?)```/g, (_, c) => `<pre><code>${c}</code></pre>`);
    // headings
    s = s.replace(/^###### (.+)$/gm, "<h6>$1</h6>")
         .replace(/^##### (.+)$/gm, "<h5>$1</h5>")
         .replace(/^#### (.+)$/gm, "<h4>$1</h4>")
         .replace(/^### (.+)$/gm, "<h3>$1</h3>")
         .replace(/^## (.+)$/gm, "<h2>$1</h2>")
         .replace(/^# (.+)$/gm, "<h1>$1</h1>");
    // inline
    s = s.replace(/`([^`]+)`/g, "<code>$1</code>")
         .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
         .replace(/_([^_]+)_/g, "<em>$1</em>")
         .replace(/\[([^\]]+)\]\((https?:[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    // list
    s = s.replace(/(?:^|\n)((?:- .+(?:\n|$))+)/g, (_, blk) => {
      const items = blk.trim().split(/\n/).map((l) => "<li>" + l.replace(/^- /, "") + "</li>").join("");
      return "\n<ul>" + items + "</ul>";
    });
    // paragraphs (boş satır ayırır)
    s = s.split(/\n{2,}/).map((p) => /^<(h\d|ul|ol|pre|blockquote)/.test(p.trim()) ? p : `<p>${p.replace(/\n/g, "<br>")}</p>`).join("\n");
    return s;
  }

  function enhance(textarea, row) {
    row.classList.add("form-md");
    const split = document.createElement("div");
    split.className = "md-split";
    const editor = document.createElement("div");
    editor.className = "md-editor";
    const preview = document.createElement("div");
    preview.className = "md-preview";
    textarea.parentNode.insertBefore(split, textarea);
    editor.appendChild(textarea);
    split.appendChild(editor);
    split.appendChild(preview);
    function refresh() { preview.innerHTML = render(textarea.value); }
    textarea.addEventListener("input", refresh);
    refresh();
  }

  Admin.markdown = { render, enhance };
})();
