(function () {
  "use strict";

  const WHATSAPP_NUMBER = "5586981247491";

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

  function getWhatsappLink(message) {
    return "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(message);
  }

  function renderStars(rating) {
    const full = Math.round(rating);
    return "★".repeat(full) + "☆".repeat(5 - full);
  }

  /* RENDERIZAÇÃO DOS DESTAQUES */
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
          <a href="produto.html?id=${prod.id}" class="product-rating-bar" title="Ver avaliações">
            <span class="stars-val">${renderStars(avg)}</span>
            <span class="rating-count">(${totalRatings}) Ver detalhes →</span>
          </a>
        `;
      } else {
        ratingMarkup = `
          <a href="produto.html?id=${prod.id}" class="product-rating-bar">
            <span class="rating-count" style="color:var(--body-gray); font-weight:600;">✨ Novo Modelo &middot; Avaliar</span>
          </a>
        `;
      }

      const msg = `Olá! Tenho interesse na sandália:\n\n` +
        `* Código: ${prod.codigo}\n` +
        `* Modelo: ${prod.nome}\n` +
        `* Preço: R$ ${Number(prod.preco).toFixed(2)}\n` +
        `* Foto: ${prod.imagem}\n\n` +
        `Gostaria de saber a disponibilidade no meu número.`;

      article.innerHTML = `
        <div class="product-art-wrapper">
          <a href="produto.html?id=${prod.id}">
            <img src="${prod.imagem}" alt="${prod.nome}" class="product-img" loading="lazy">
          </a>
        </div>
        <div class="swing-tag product-tag">
          <span class="tag-price">R$${price.inteiro}<sup>,${price.centavos}</sup></span>
        </div>
        
        ${ratingMarkup}

        <span class="product-code-badge">${prod.codigo}</span>
        <h3><a href="produto.html?id=${prod.id}">${prod.nome}</a></h3>
        <p class="product-desc">${prod.descricao || ""}</p>
        <p class="product-sizes-badge">Numerações: ${(Array.isArray(prod.tamanhos) ? prod.tamanhos : []).join(", ") || "34 ao 39"}</p>
        
        <div style="display:flex; gap:8px; margin-top:auto;">
          <a class="btn btn-whatsapp btn-block js-whatsapp" href="${getWhatsappLink(msg)}" target="_blank" rel="noopener">Comprar</a>
          <a class="btn btn-outline" href="produto.html?id=${prod.id}" style="padding:10px 14px;" title="Ver detalhes">🔍</a>
        </div>
      `;

      grid.appendChild(article);
    });

    setupScrollReveal();
  }

  /* RENDERIZAÇÃO DOS FEEDBACKS REAIS */
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
          <strong>${r.nome}</strong> ${r.cidade ? `&middot; ${r.cidade}` : ''}
          ${r.tag ? `<span class="review-verified">🌸 ${r.tag}</span>` : ""}
        </footer>
      `;
      grid.appendChild(card);
    });
  }

  async function loadInitialData() {
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
      alert("Obrigada pelo feedback! Sua avaliação foi publicada com sucesso.");
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
    loadInitialData();
    const yr = document.getElementById("year");
    if (yr) yr.textContent = new Date().getFullYear();
  });
})();