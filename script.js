(function () {
  "use strict";

  const DEFAULT_REVIEWS = [
    {
      nome: "xdecora.paper",
      cidade: "Picos - PI",
      estrelas: 5,
      comentario: "Tão perfeitaaa 😍 Sacola + adesivo + mimo! Eu amei amiga ❤️",
      tag: "Instagram Feedback"
    }
  ];

  let products = [];
  let reviews = [];

  function formatPrice(val) {
    const parts = Number(val).toFixed(2).split(".");
    return { inteiro: parts[0], centavos: parts[1] };
  }

  function renderStars(rating) {
    const full = Math.round(rating);
    return "★".repeat(full) + "☆".repeat(5 - full);
  }

  function updateCartBadge() {
    const cart = JSON.parse(localStorage.getItem("jeci_cart") || "[]");
    const count = cart.reduce((s, i) => s + i.qtd, 0);
    const badge = document.getElementById("headerCartBadge");
    if (badge) badge.textContent = count;
  }

  function setupMobileMenu() {
    const toggle = document.getElementById("navToggle");
    const nav = document.getElementById("mainNav");
    if (!toggle || !nav) return;

    toggle.addEventListener("click", function(e) {
      e.stopPropagation();
      nav.classList.toggle("open");
      toggle.classList.toggle("active");
    });

    document.querySelectorAll(".main-nav a").forEach(link => {
      link.addEventListener("click", () => {
        nav.classList.remove("open");
        toggle.classList.remove("active");
      });
    });

    document.addEventListener("click", function(e) {
      if (!nav.contains(e.target) && !toggle.contains(e.target)) {
        nav.classList.remove("open");
        toggle.classList.remove("active");
      }
    });
  }

  function renderProducts(list) {
    const grid = document.getElementById("productGrid");
    if (!grid) return;

    grid.innerHTML = "";
    const activeProducts = list.filter(p => p.ativo && p.destaque);

    activeProducts.forEach(prod => {
      const price = formatPrice(prod.preco);
      const article = document.createElement("article");
      article.className = "product-card reveal";

      const evals = prod.avaliacoes_produtos || [];
      const totalRatings = evals.length;
      
      let ratingMarkup = "";
      if (totalRatings > 0) {
        const avg = evals.reduce((sum, e) => sum + e.estrelas, 0) / totalRatings;
        ratingMarkup = `
          <a href="produto.html?id=${encodeURIComponent(prod.id)}" class="product-rating-bar" title="Ver avaliações">
            <span class="stars-val">${renderStars(avg)}</span>
            <span class="rating-count">(${totalRatings}) Ver detalhes →</span>
          </a>
        `;
      } else {
        ratingMarkup = `
          <a href="produto.html?id=${encodeURIComponent(prod.id)}" class="product-rating-bar">
            <span class="rating-count" style="color:var(--body-gray); font-weight:600;">✨ Novo Modelo &middot; Avaliar</span>
          </a>
        `;
      }

      article.innerHTML = `
        <div class="product-art-wrapper">
          <a href="produto.html?id=${encodeURIComponent(prod.id)}">
            <img src="${JeciUI.escapeHtml(prod.imagem)}" alt="${JeciUI.escapeHtml(prod.nome)}" class="product-img" loading="lazy">
          </a>
        </div>
        <div class="swing-tag product-tag">
          <span class="tag-price">R$${price.inteiro}<sup>,${price.centavos}</sup></span>
        </div>
        
        ${ratingMarkup}

        <span class="product-code-badge">${JeciUI.escapeHtml(prod.codigo)}</span>
        <h3><a href="produto.html?id=${encodeURIComponent(prod.id)}">${JeciUI.escapeHtml(prod.nome)}</a></h3>
        <p class="product-desc">${JeciUI.escapeHtml(prod.descricao || "")}</p>
        <p class="product-sizes-badge">Numerações: ${(Array.isArray(prod.tamanhos) ? prod.tamanhos : []).join(", ") || "30 ao 45"}</p>
        
        <div style="display:flex; gap:8px; margin-top:auto;">
          <a class="btn btn-whatsapp btn-block" href="produto.html?id=${encodeURIComponent(prod.id)}">Comprar / Detalhes</a>
          <a class="btn btn-outline" href="produto.html?id=${encodeURIComponent(prod.id)}" style="padding:10px 14px;" title="Ver detalhes">🔍</a>
        </div>
      `;

      grid.appendChild(article);
    });

    setupScrollReveal();
  }

  function renderReviews() {
    const grid = document.getElementById("testiGrid");
    if (!grid) return;
    grid.innerHTML = "";

    reviews.forEach(r => {
      const card = document.createElement("blockquote");
      card.className = "testi-card polaroid";
      card.innerHTML = `
        <div class="stars">${"★".repeat(r.estrelas || 5)}</div>
        <p>&ldquo;${JeciUI.escapeHtml(r.comentario)}&rdquo;</p>
        <footer>
          <strong>${JeciUI.escapeHtml(r.nome)}</strong> ${r.cidade ? `&middot; ${JeciUI.escapeHtml(r.cidade)}` : ''}
          ${r.tag ? `<span class="review-verified">🌸 ${JeciUI.escapeHtml(r.tag)}</span>` : ""}
        </footer>
      `;
      grid.appendChild(card);
    });
  }

  async function loadInitialData() {
    setupMobileMenu();

    if (db) {
      const { data } = await db.from("depoimentos_loja").select("*").order("created_at", { ascending: false });
      reviews = (data && data.length) ? data : DEFAULT_REVIEWS;
    } else {
      reviews = JSON.parse(localStorage.getItem("jeci_reviews") || JSON.stringify(DEFAULT_REVIEWS));
    }
    renderReviews();

    if (db) {
      const { data } = await db.from("produtos").select("*, avaliacoes_produtos(estrelas)").order("created_at", { ascending: false });
      if (data && data.length) {
        products = data;
        localStorage.setItem("jeci_produtos", JSON.stringify(products));
        renderProducts(products);
        return;
      }
    }

    const cached = localStorage.getItem("jeci_produtos");
    if (cached) {
      products = JSON.parse(cached);
      renderProducts(products);
      return;
    }

    try {
      const res = await fetch("produtos.json");
      products = await res.json();
      renderProducts(products);
    } catch (e) {}
  }

  let storeStars = 5;
  const starBtns = document.querySelectorAll("#starSelector span");
  function updateStars(val) {
    storeStars = val;
    starBtns.forEach(btn => {
      const sVal = parseInt(btn.getAttribute("data-star"));
      btn.classList.toggle("active", sVal <= val);
    });
  }

  starBtns.forEach(btn => {
    btn.addEventListener("click", () => updateStars(parseInt(btn.getAttribute("data-star"))));
  });
  updateStars(5);

  const storeForm = document.getElementById("storeReviewForm");
  if (storeForm) {
    storeForm.addEventListener("submit", async function(e) {
      e.preventDefault();
      const newRev = {
        nome: document.getElementById("revName").value.trim(),
        cidade: document.getElementById("revCity").value.trim(),
        estrelas: storeStars,
        comentario: document.getElementById("revComment").value.trim(),
        tag: "Cliente Verificada"
      };

      if (db) {
        await db.from("depoimentos_loja").insert([newRev]);
      }

      reviews.unshift(newRev);
      localStorage.setItem("jeci_reviews", JSON.stringify(reviews));
      renderReviews();
      storeForm.reset();
      updateStars(5);
      JeciUI.toast("Obrigada pelo feedback! 🦋");
    });
  }

  function setupScrollReveal() {
    const targets = document.querySelectorAll(".cat-card, .product-card, .testi-card, .about-card");
    if (!("IntersectionObserver" in window)) {
      targets.forEach(el => el.classList.add("in-view"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    targets.forEach(el => {
      el.classList.add("reveal");
      observer.observe(el);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    JeciUI.buildWhatsappLinks();
    updateCartBadge();
    loadInitialData();
    const yr = document.getElementById("year");
    if (yr) yr.textContent = new Date().getFullYear();
  });
})();