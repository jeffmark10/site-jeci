(function () {
  "use strict";

  /* =====================================================
     CONFIGURAÇÃO — número da Jeci Store
     Formato: código do país + DDD + número, sem espaços/símbolos.
     O número informado (+55 86 98124-7491) tem 9 dígitos após o DDD.
     Se for um celular, confirme se falta o 9º dígito
     (ex.: 55 86 9 8124-7491) antes de publicar o site.
     ===================================================== */
  const WHATSAPP_NUMBER = "5586981247491";

  /* =====================================================
     Monta os links do WhatsApp com mensagem pré-preenchida
     ===================================================== */
  function buildWhatsappLinks() {
    const links = document.querySelectorAll(".js-whatsapp");
    links.forEach(function (link) {
      const customMsg = link.getAttribute("data-msg");
      const message = customMsg || "Olá! Vim pelo site da Jeci Store e quero saber mais.";
      const url =
        "https://wa.me/" +
        WHATSAPP_NUMBER +
        "?text=" +
        encodeURIComponent(message);
      link.setAttribute("href", url);
    });
  }

  /* =====================================================
     Menu mobile
     ===================================================== */
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

  /* =====================================================
     FAQ accordion
     ===================================================== */
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

  /* =====================================================
     Header com sombra ao rolar a página
     ===================================================== */
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

  /* =====================================================
     Revelação suave ao rolar (scroll reveal)
     ===================================================== */
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

  /* =====================================================
     Ano dinâmico no rodapé
     ===================================================== */
  function setupYear() {
    const el = document.getElementById("year");
    if (el) el.textContent = new Date().getFullYear();
  }

  document.addEventListener("DOMContentLoaded", function () {
    buildWhatsappLinks();
    setupMobileNav();
    setupFaq();
    setupHeaderShadow();
    setupScrollReveal();
    setupYear();
  });
})();
