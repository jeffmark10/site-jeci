window.JeciUI = (function () {
  "use strict";

  const WHATSAPP_NUMBER = "5586981247491";

  function escapeHtml(value) {
    if (value === null || value === undefined) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function waLink(message) {
    return "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(message);
  }

  function buildWhatsappLinks(root) {
    const scope = root || document;
    scope.querySelectorAll(".js-whatsapp").forEach(function (link) {
      const msg = link.getAttribute("data-msg") || "Olá! Vim pelo site da Jeci Store e quero saber mais.";
      link.setAttribute("href", waLink(msg));
    });
  }

  let toastTimer = null;

  function ensureToastHost() {
    let host = document.getElementById("jeciToastHost");
    if (!host) {
      host = document.createElement("div");
      host.id = "jeciToastHost";
      host.className = "jeci-toast-host";
      document.body.appendChild(host);
    }
    return host;
  }

  function toast(message, options) {
    const opts = options || {};
    const host = ensureToastHost();
    host.innerHTML = "";

    const el = document.createElement("div");
    el.className = "jeci-toast" + (opts.type === "error" ? " jeci-toast-error" : "");

    const icon = document.createElement("span");
    icon.className = "jeci-toast-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = opts.type === "error" ? "⚠️" : "🦋";

    const text = document.createElement("span");
    text.className = "jeci-toast-text";
    text.textContent = message;

    el.appendChild(icon);
    el.appendChild(text);
    host.appendChild(el);

    requestAnimationFrame(function () {
      el.classList.add("show");
    });

    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.remove("show");
      setTimeout(function () {
        el.remove();
      }, 250);
    }, opts.duration || 3200);
  }

  function confirmDialog(message, options) {
    const opts = options || {};
    return new Promise(function (resolve) {
      const overlay = document.createElement("div");
      overlay.className = "jeci-modal-overlay open";

      const card = document.createElement("div");
      card.className = "jeci-modal-card";

      const msgEl = document.createElement("p");
      msgEl.className = "jeci-modal-msg";
      msgEl.textContent = message;

      const actions = document.createElement("div");
      actions.className = "jeci-modal-actions";

      const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.className = "btn btn-outline jeci-modal-cancel";
      cancelBtn.textContent = opts.cancelLabel || "Cancelar";

      const okBtn = document.createElement("button");
      okBtn.type = "button";
      okBtn.className = "btn btn-whatsapp jeci-modal-ok";
      okBtn.textContent = opts.okLabel || "Confirmar";

      actions.appendChild(cancelBtn);
      actions.appendChild(okBtn);
      card.appendChild(msgEl);
      card.appendChild(actions);
      overlay.appendChild(card);
      document.body.appendChild(overlay);

      function close(result) {
        overlay.classList.remove("open");
        setTimeout(function () {
          overlay.remove();
        }, 200);
        resolve(result);
      }

      cancelBtn.addEventListener("click", function () { close(false); });
      okBtn.addEventListener("click", function () { close(true); });
      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) close(false);
      });
      document.addEventListener(
        "keydown",
        function esc(e) {
          if (e.key === "Escape") {
            document.removeEventListener("keydown", esc);
            close(false);
          }
        }
      );

      okBtn.focus();
    });
  }

  return {
    WHATSAPP_NUMBER: WHATSAPP_NUMBER,
    escapeHtml: escapeHtml,
    waLink: waLink,
    buildWhatsappLinks: buildWhatsappLinks,
    toast: toast,
    confirmDialog: confirmDialog
  };
})();