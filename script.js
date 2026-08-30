(function () {
  "use strict";

  const WHATSAPP_NUMBER = "5586981247491";

  // Depoimentos Padrão (incluindo os prints reais do Instagram)
  const DEFAULT_REVIEWS = [
    {
      nome: "xdecora.paper",
      cidade: "Picos - PI",
      estrelas: 5,
      comentario: "Tão perfeitaaa 😍 Sacola + adesivo + mimo! Eu amei amiga ❤️",
      tag: "Instagram Feedback"
    },
    {
      nome: "Larissa M.",
      cidade: "Teresina - PI",
      estrelas: 5,
      comentario: "A sandália é super confortável, a palmilha é macia e não machuca nada o pé. Atendimento 10 no WhatsApp!",
      tag: "Cliente Verificada"
    },
    {
      nome: "Bruna S.",
      cidade: "Brasília - DF",
      estrelas: 5,
      comentario: "Chegou super rápido aqui em casa, muito bem embalada e com um cheirinho maravilhoso. Com certeza comprarei mais!",
      tag: "Cliente Verificada"
    }
  ];

  let products = [];
  let reviews = [];

  function formatPrice(val) {
    const parts = Number(val).toFixed(2).split(".");
    return { inteiro: parts[0], centavos: parts[1] };
  }

  function getWhatsappLink(message) {
    return "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(message);
  }

  function renderStars(rating) {
    const full = Math.round(rating || 5);
    return "★".repeat(full) + "☆".repeat(5 - full);
  }

  /* =====================================================
     PRODUTOS EM DESTAQUE
     ===================================================== */
  function renderProducts(list) {
    const grid = document.getElementById("productGrid");
    if (!grid) return;

    grid.innerHTML = "";
    const activeProducts = list.filter(p => p.ativo && p.destaque);

    activeProducts.forEach(prod => {
      const realIndex = list.findIndex(i => i.id === prod.id);
      const price = formatPrice(prod.preco);
      const article = document.createElement("article");
      article.className = "product-card reveal";

      const msg = `Olá! Tenho interesse na sandália:\n\n` +
        `* Código: ${prod.codigo}\n` +
        `* Modelo: ${prod.nome}\n` +
        `* Preço: R$ ${Number(prod.preco).toFixed(2)}\n` +
        `* Tamanhos: ${prod.tamanhos && prod.tamanhos.length > 0 ? prod.tamanhos.join(", ") : "Consulte"}\n` +
        `* Foto: ${prod.imagem.startsWith("data:") ? "[Foto do catálogo]" : prod.imagem}\n\n` +
        `Gostaria de confirmar a disponibilidade no meu número.`;

      article.innerHTML = `
        <div class="product-art-wrapper">
          <img src="${prod.imagem}" alt="${prod.nome}" class="product-img" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 130%22><rect fill=%22%23FBDCEA%22 width=%22200%22 height=%22130%22/><text x=%2250%%22 y=%2250%%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23E24E8A%22 font-family=%22sans-serif%22 font-size=%2214%22>${prod.codigo}</text></svg>'">
        </div>
        <div class="swing-tag product-tag">
          <span class="tag-price">R$${price.inteiro}<sup>,${price.centavos}</sup></span>
        </div>
        
        <div class="product-rating-bar" onclick="window.openProductEval(${realIndex})" title="Clique para avaliar este calçado">
          <span class="stars-val">${renderStars(prod.avaliacao)}</span>
          <span class="rating-count">(${prod.totalAvaliacoes || 1}) Avaliar</span>
        </div>

        <span class="product-code-badge">${prod.codigo}</span>
        <h3>${prod.nome}</h3>
        <p class="product-desc">${prod.descricao || ""}</p>
        <p class="product-sizes-badge">Numerações: ${(prod.tamanhos || []).join(", ") || "34 ao 39"}</p>
        <a class="btn btn-whatsapp btn-block js-whatsapp" href="${getWhatsappLink(msg)}" target="_blank" rel="noopener">Comprar no WhatsApp</a>
      `;

      grid.appendChild(article);
    });

    setupScrollReveal();
  }

  /* =====================================================
     DEPOIMENTOS & AVALIAÇÕES DA LOJA
     ===================================================== */
  function renderReviews() {
    const grid = document.getElementById("testiGrid");
    if (!grid) return;
    grid.innerHTML = "";

    reviews.forEach(r => {
      const card = document.createElement("blockquote");
      card.className = "testi-card";
      card.innerHTML = `
        <div class="stars">${"★".repeat(r.estrelas || 5)}</div>
        <p>&ldquo;${r.comentario}&rdquo;</p>
        <footer>
          <strong>${r.nome}</strong> &middot; ${r.cidade}
          ${r.tag ? `<span class="review-verified">${r.tag}</span>` : ""}
        </footer>
      `;
      grid.appendChild(card);
    });
  }

  function setupReviewForms() {
    // Seletor de estrelas da loja
    let selectedStars = 5;
    const starSpans = document.querySelectorAll("#starSelector span");
    starSpans.forEach(span => {
      span.addEventListener("click", function() {
        selectedStars = parseInt(this.getAttribute("data-star"));
        starSpans.forEach(s => {
          const val = parseInt(s.getAttribute("data-star"));
          s.classList.toggle("active", val <= selectedStars);
        });
      });
    });

    // Envio do formulário da loja
    const storeForm = document.getElementById("storeReviewForm");
    if (storeForm) {
      storeForm.addEventListener("submit", function(e) {
        e.preventDefault();
        const newRev = {
          nome: document.getElementById("revName").value.trim(),
          cidade: document.getElementById("revCity").value.trim(),
          estrelas: selectedStars,
          comentario: document.getElementById("revComment").value.trim(),
          tag: "Nova Avaliação"
        };
        reviews.unshift(newRev);
        localStorage.setItem("jeci_reviews", JSON.stringify(reviews));
        renderReviews();
        storeForm.reset();
        alert("Obrigada pelo seu feedback! Sua avaliação foi adicionada.");
      });
    }

    // Modal de avaliação de produto
    let prodSelectedStars = 5;
    const prodStarSpans = document.querySelectorAll("#prodStarSelector span");
    prodStarSpans.forEach(span => {
      span.addEventListener("click", function() {
        prodSelectedStars = parseInt(this.getAttribute("data-star"));
        prodStarSpans.forEach(s => {
          const val = parseInt(s.getAttribute("data-star"));
          s.classList.toggle("active", val <= prodSelectedStars);
        });
      });
    });

    window.openProductEval = function(index) {
      const modal = document.getElementById("productReviewModal");
      const title = document.getElementById("modalProdTitle");
      const idxInput = document.getElementById("evalProdIndex");
      if (!modal || !products[index]) return;

      title.textContent = "Avaliar " + products[index].nome;
      idxInput.value = index;
      modal.classList.add("open");
    };

    const closeBtn = document.getElementById("closeProdModal");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        document.getElementById("productReviewModal").classList.remove("open");
      });
    }

    const prodEvalForm = document.getElementById("productEvalForm");
    if (prodEvalForm) {
      prodEvalForm.addEventListener("submit", function(e) {
        e.preventDefault();
        const idx = parseInt(document.getElementById("evalProdIndex").value);
        if (!isNaN(idx) && products[idx]) {
          const currentTotal = products[idx].totalAvaliacoes || 1;
          const currentRating = products[idx].avaliacao || 5.0;
          
          // Média ponderada
          const newRating = ((currentRating * currentTotal) + prodSelectedStars) / (currentTotal + 1);
          products[idx].avaliacao = Number(newRating.toFixed(1));
          products[idx].totalAvaliacoes = currentTotal + 1;

          localStorage.setItem("jeci_produtos", JSON.stringify(products));
          renderProducts(products);
          document.getElementById("productReviewModal").classList.remove("open");
          alert("Nota registrada com sucesso! Obrigada por avaliar.");
        }
      });
    }
  }

  /* =====================================================
     CARREGAMENTO INICIAL
     ===================================================== */
  async function loadInitialData() {
    // Avaliações
    const cachedReviews = localStorage.getItem("jeci_reviews");
    reviews = cachedReviews ? JSON.parse(cachedReviews) : DEFAULT_REVIEWS;
    renderReviews();
    setupReviewForms();

    // Catálogo
    const storedProds = localStorage.getItem("jeci_produtos");
    if (storedProds) {
      try {
        products = JSON.parse(storedProds);
        renderProducts(products);
        return;
      } catch (e) {}
    }

    try {
      const res = await fetch("produtos.json");
      products = await res.json();
      localStorage.setItem("jeci_produtos", JSON.stringify(products));
      renderProducts(products);
    } catch (err) {
      console.warn("Carregando itens padrão.");
    }
  }

  function setupMobileNav() {
    const toggle = document.getElementById("navToggle");
    const nav = document.getElementById("mainNav");
    if (!toggle || !nav) return;

    toggle.addEventListener("click", function () {
      const isOpen = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(isOpen));
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", () => nav.classList.remove("open"));
    });
  }

  function setupFaq() {
    const items = document.querySelectorAll(".faq-item");
    items.forEach(function (item) {
      const button = item.querySelector(".faq-question");
      if (!button) return;
      button.addEventListener("click", function () {
        const isOpen = item.classList.contains("open");
        items.forEach(other => other.classList.remove("open"));
        if (!isOpen) item.classList.add("open");
      });
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
    setupMobileNav();
    setupFaq();
    loadInitialData();
    const yr = document.getElementById("year");
    if (yr) yr.textContent = new Date().getFullYear();
  });
})();