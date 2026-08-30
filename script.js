(function () {
  "use strict";

  const WHATSAPP_NUMBER = "5586981247491";

  function formatPrice(val) {
    const parts = Number(val).toFixed(2).split(".");
    return {
      inteiro: parts[0],
      centavos: parts[1]
    };
  }

  function getWhatsappLink(message) {
    return "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(message);
  }

  function renderProducts(products) {
    const grid = document.getElementById("productGrid");
    if (!grid) return;

    grid.innerHTML = "";
    const activeProducts = products.filter(p => p.ativo && p.destaque);

    activeProducts.forEach(prod => {
      const price = formatPrice(prod.preco);
      const article = document.createElement("article");
      article.className = "product-card reveal";

      const msg = `Olá! Tenho interesse no produto:
\u{1F4CC} Código: ${prod.codigo}
\u{1F457} Item: ${prod.nome}
\u{1F4B0} Preço: R$ ${Number(prod.preco).toFixed(2)}
\u{1F4CF} Tamanhos: ${prod.tamanhos && prod.tamanhos.length > 0 ? prod.tamanhos.join(", ") : "Consulte"}
\u{1F517} Foto: ${prod.imagem.startsWith("data:") ? "[Foto enviada via catálogo online]" : prod.imagem}

Gostaria de confirmar a disponibilidade.`;

      article.innerHTML = `
        <div class="product-art-wrapper">
          <img src="${prod.imagem}" alt="${prod.nome}" class="product-img" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 130%22><rect fill=%22%23FBDCEA%22 width=%22200%22 height=%22130%22/><text x=%2250%%22 y=%2250%%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23E24E8A%22 font-family=%22sans-serif%22 font-size=%2214%22>${prod.codigo}</text></svg>'">
        </div>
        <div class="swing-tag product-tag">
          <span class="tag-price">R$${price.inteiro}<sup>,${price.centavos}</sup></span>
        </div>
        <span class="product-code-badge">${prod.codigo}</span>
        <h3>${prod.nome}</h3>
        <p class="product-desc">${prod.descricao || ""}</p>
        <a class="btn btn-whatsapp btn-block js-whatsapp" href="${getWhatsappLink(msg)}" target="_blank" rel="noopener">Comprar no WhatsApp</a>
      `;

      grid.appendChild(article);
    });

    setupScrollReveal();
  }

  async function loadCatalog() {
    const stored = localStorage.getItem("jeci_produtos");
    if (stored) {
      try {
        renderProducts(JSON.parse(stored));
        return;
      } catch (e) {
        console.error("Erro ao carregar do cache", e);
      }
    }

    try {
      const res = await fetch("produtos.json");
      if (!res.ok) throw new Error("Falha ao carregar produtos.json");
      const data = await res.json();
      localStorage.setItem("jeci_produtos", JSON.stringify(data));
      renderProducts(data);
    } catch (err) {
      console.warn("Utilizando carregamento de fallback padrão.");
    }
  }

  function buildWhatsappLinks() {
    const links = document.querySelectorAll(".js-whatsapp:not(.product-card .js-whatsapp)");
    links.forEach(function (link) {
      const customMsg = link.getAttribute("data-msg");
      const message = customMsg || "Olá! Vim pelo site da Jeci Store e quero saber mais.";
      link.setAttribute("href", getWhatsappLink(message));
    });
  }

  function setupMobileNav() {
    const toggle = document.getElementById("navToggle");
    const nav = document.getElementById("mainNav");
    if (!toggle || !nav) return;

    toggle.addEventListener("click", function () {
      const isOpen = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(isOpen));
      toggle.setAttribute("aria-label", isOpen ? "Fechar menu" : "Abrir menu");
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  function setupFaq() {
    const items = document.querySelectorAll(".faq-item");
    items.forEach(function (item) {
      const button = item.querySelector(".faq-question");
      if (!button) return;
      button.addEventListener("click", function () {
        const isOpen = item.classList.contains("open");

        items.forEach(function (other) {
          other.classList.remove("open");
          const otherBtn = other.querySelector(".faq-question");
          if (otherBtn) otherBtn.setAttribute("aria-expanded", "false");
        });

        if (!isOpen) {
          item.classList.add("open");
          button.setAttribute("aria-expanded", "true");
        }
      });
    });
  }

  function setupHeaderShadow() {
    const header = document.querySelector(".site-header");
    if (!header) return;
    const onScroll = function () {
      if (window.scrollY > 8) {
        header.style.boxShadow = "0 8px 20px -14px rgba(46,49,66,0.35)";
      } else {
        header.style.boxShadow = "none";
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  function setupScrollReveal() {
    const targets = document.querySelectorAll(
      ".cat-card, .product-card, .dif-card, .testi-card, .about-card"
    );
    if (!targets.length) return;

    targets.forEach(function (el) {
      el.classList.add("reveal");
    });

    if (!("IntersectionObserver" in window)) {
      targets.forEach(function (el) {
        el.classList.add("in-view");
      });
      return;
    }

    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    targets.forEach(function (el) {
      observer.observe(el);
    });
  }

  function setupAdminShortcuts() {
    // Atalho: Ctrl + Shift + A
    window.addEventListener("keydown", function (e) {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "a") {
        window.location.href = "admin.html";
      }
    });

    // Atalho: 3 cliques rápidos no logo
    const brand = document.querySelector(".brand");
    if (brand) {
      let clicks = 0;
      let timer;
      brand.addEventListener("click", function (e) {
        clicks++;
        clearTimeout(timer);
        if (clicks >= 3) {
          e.preventDefault();
          window.location.href = "admin.html";
        }
        timer = setTimeout(() => { clicks = 0; }, 600);
      });
    }
  }

  function setupYear() {
    const el = document.getElementById("year");
    if (el) el.textContent = new Date().getFullYear();
  }

  document.addEventListener("DOMContentLoaded", function () {
    buildWhatsappLinks();
    setupMobileNav();
    setupFaq();
    setupHeaderShadow();
    setupYear();
    setupAdminShortcuts();
    loadCatalog();
  });
})();