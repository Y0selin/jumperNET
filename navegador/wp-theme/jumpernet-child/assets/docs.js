/* JumperNET Docs 2.0 · interacciones sin dependencias */
(function () {
	"use strict";

	var html = document.documentElement;
	var $ = function (sel, raiz) { return (raiz || document).querySelector(sel); };
	var $$ = function (sel, raiz) { return Array.prototype.slice.call((raiz || document).querySelectorAll(sel)); };

	/* ── modo claro / oscuro ─────────────────────────────────── */
	var botonModo = $("#jn-modo");
	function pintaModo() {
		var claro = html.dataset.modo === "claro";
		if (botonModo) {
			botonModo.setAttribute("aria-pressed", claro ? "true" : "false");
			botonModo.setAttribute("aria-label", claro ? "Cambiar a modo oscuro" : "Cambiar a modo claro");
			botonModo.firstElementChild.textContent = claro ? "☾" : "☀";
		}
	}
	if (botonModo) {
		pintaModo();
		botonModo.addEventListener("click", function () {
			html.dataset.modo = html.dataset.modo === "claro" ? "oscuro" : "claro";
			try { localStorage.setItem("jumpernet-docs-modo", html.dataset.modo); } catch (e) {}
			pintaModo();
		});
	}

	/* ── índice móvil ────────────────────────────────────────── */
	var lado = $("#jn-lado");
	var velo = $("#jn-velo");
	var menu = $("#jn-menu");
	function abreLado(abrir) {
		if (!lado || !menu) return;
		lado.classList.toggle("abierto", abrir);
		menu.setAttribute("aria-expanded", abrir ? "true" : "false");
		menu.setAttribute("aria-label", abrir ? "Cerrar el índice" : "Abrir el índice");
		if (velo) velo.hidden = !abrir;
		document.body.style.overflow = abrir ? "hidden" : "";
	}
	if (menu) menu.addEventListener("click", function () { abreLado(!lado.classList.contains("abierto")); });
	if (velo) velo.addEventListener("click", function () { abreLado(false); });
	if (lado) lado.addEventListener("click", function (e) { if (e.target.closest("a")) abreLado(false); });
	window.addEventListener("resize", function () { if (window.innerWidth > 1040) abreLado(false); });

	/* ── barra de progreso ───────────────────────────────────── */
	var progreso = $("#jn-progreso i");
	var articulo = $(".jn-articulo");
	function pintaProgreso() {
		if (!progreso || !articulo) return;
		var inicio = articulo.offsetTop - 100;
		var alto = articulo.offsetHeight - window.innerHeight + 180;
		var p = alto > 0 ? (window.scrollY - inicio) / alto : 0;
		p = Math.max(0, Math.min(1, p));
		progreso.style.width = (p * 100).toFixed(2) + "%";
	}
	if (progreso && articulo) {
		window.addEventListener("scroll", pintaProgreso, { passive: true });
		pintaProgreso();
	}

	/* ── tabla de contenidos ─────────────────────────────────── */
	var contenido = $("#jn-contenido");
	var tocNav = $("#jn-toc-nav");
	var titulos = [];
	if (contenido && tocNav) {
		titulos = $$("h2, h3", contenido);
		titulos.forEach(function (h, i) {
			if (!h.id) h.id = "jn-sec-" + (i + 1) + "-" + (h.textContent || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
			var a = document.createElement("a");
			a.href = "#" + h.id;
			a.textContent = h.textContent;
			if (h.tagName === "H3") a.className = "n3";
			a.addEventListener("click", function () { setTimeout(pintaActivo, 80); });
			tocNav.appendChild(a);
		});
		function pintaActivo() {
			var y = window.scrollY + 130;
			var activo = null;
			titulos.forEach(function (h) { if (h.offsetTop <= y) activo = h; });
			$$("a", tocNav).forEach(function (a) {
				a.classList.toggle("on", !!activo && a.getAttribute("href") === "#" + activo.id);
			});
			pintaProgreso();
		}
		if (titulos.length) {
			window.addEventListener("scroll", pintaActivo, { passive: true });
			pintaActivo();
		}
	}

	/* ── tablas desplazables en móvil ────────────────────────── */
	$$(".jn-contenido table").forEach(function (tabla) {
		if (tabla.parentNode && tabla.parentNode.classList.contains("jn-tabla")) return;
		var caja = document.createElement("div");
		caja.className = "jn-tabla";
		tabla.parentNode.insertBefore(caja, tabla);
		caja.appendChild(tabla);
	});

	/* ── copiar bloques de código ────────────────────────────── */
	$$(".jn-contenido pre, .jn-consola").forEach(function (pre) {
		if (pre.querySelector(".jn-copiar")) return;
		var b = document.createElement("button");
		b.type = "button";
		b.className = "jn-copiar";
		b.textContent = "copiar";
		b.addEventListener("click", function () {
			var texto = pre.innerText.replace(/^[^\n]*\n/, "");
			var listo = function () {
				b.textContent = "copiado";
				b.classList.add("ok");
				setTimeout(function () { b.textContent = "copiar"; b.classList.remove("ok"); }, 1600);
			};
			if (navigator.clipboard && navigator.clipboard.writeText) {
				navigator.clipboard.writeText(texto).then(listo, function () {});
			} else {
				var ta = document.createElement("textarea");
				ta.value = texto;
				document.body.appendChild(ta);
				ta.select();
				try { document.execCommand("copy"); listo(); } catch (e) {}
				document.body.removeChild(ta);
			}
		});
		pre.appendChild(b);
	});

	/* ── buscador ────────────────────────────────────────────── */
	var INDICE = window.JN_INDICE || [];
	var pal = $("#jn-palabra");
	var campo = $("#jn-busca");
	var lista = $("#jn-resultados");
	var cuenta = $("#jn-cuenta");
	var seleccion = 0;
	var ultimos = [];

	function normaliza(s) {
		return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
	}
	function escapa(s) {
		return (s || "").replace(/[&<>"']/g, function (c) {
			return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
		});
	}
	function marca(texto, q) {
		var t = escapa(texto);
		if (!q) return t;
		var i = normaliza(texto).indexOf(normaliza(q));
		if (i < 0) return t;
		var antes = escapa(texto.slice(0, i));
		var medio = escapa(texto.slice(i, i + q.length));
		var despues = escapa(texto.slice(i + q.length));
		return antes + "<mark>" + medio + "</mark>" + despues;
	}

	function busca(q) {
		var n = normaliza(q).trim();
		if (!n) return INDICE.slice(0, 7).map(function (d) { return { d: d, punto: 0 }; });
		var palabras = n.split(/\s+/);
		return INDICE.map(function (d) {
			var titulo = normaliza(d.t);
			var desc = normaliza(d.d);
			var cuerpo = normaliza(d.x);
			var puntos = 0;
			palabras.forEach(function (p) {
				if (titulo.indexOf(p) >= 0) puntos += 8;
				if (desc.indexOf(p) >= 0) puntos += 3;
				if (cuerpo.indexOf(p) >= 0) puntos += 1;
			});
			return { d: d, punto: puntos };
		}).filter(function (r) { return r.punto > 0; })
			.sort(function (a, b) { return b.punto - a.punto; })
			.slice(0, 9);
	}

	function pintaLista(q) {
		if (!lista) return;
		ultimos = busca(q);
		seleccion = 0;
		lista.innerHTML = "";
		if (!ultimos.length) {
			lista.innerHTML = '<li class="jn-res-vacio">Nada por aquí. Prueba con «cifrado», «API» o «nodos».</li>';
			if (cuenta) cuenta.textContent = "0 resultados";
			return;
		}
		ultimos.forEach(function (r, i) {
			var li = document.createElement("li");
			if (i === 0) li.className = "on";
			var a = document.createElement("a");
			a.href = r.d.u;
			a.innerHTML = '<span class="jn-res-n mono">' + String(r.d.n).padStart(2, "0") + "</span>" +
				"<b>" + marca(r.d.t, q) + "</b>" +
				"<span>" + marca(r.d.d, q) + "</span>";
			li.appendChild(a);
			lista.appendChild(li);
		});
		if (cuenta) cuenta.textContent = q ? ultimos.length + (ultimos.length === 1 ? " resultado" : " resultados") : INDICE.length + " guías · escribe para filtrar";
	}

	function mueve(delta) {
		var lis = $$("li", lista).filter(function (li) { return li.querySelector("a"); });
		if (!lis.length) return;
		seleccion = (seleccion + delta + lis.length) % lis.length;
		lis.forEach(function (li, i) { li.classList.toggle("on", i === seleccion); });
		lis[seleccion].scrollIntoView({ block: "nearest" });
	}

	function abrePalabra() {
		if (!pal || !campo) return;
		pal.hidden = false;
		campo.value = "";
		pintaLista("");
		campo.focus();
	}
	function cierraPalabra() {
		if (!pal) return;
		pal.hidden = true;
	}
	$$("[data-buscar]").forEach(function (b) { b.addEventListener("click", abrePalabra); });
	if (pal) {
		pal.addEventListener("click", function (e) { if (e.target === pal) cierraPalabra(); });
	}
	if (campo) {
		campo.addEventListener("input", function () { pintaLista(campo.value); });
		campo.addEventListener("keydown", function (e) {
			if (e.key === "ArrowDown") { e.preventDefault(); mueve(1); }
			else if (e.key === "ArrowUp") { e.preventDefault(); mueve(-1); }
			else if (e.key === "Enter") {
				var lis = $$("li", lista).filter(function (li) { return li.querySelector("a"); });
				if (lis[seleccion]) { e.preventDefault(); window.location.href = lis[seleccion].querySelector("a").href; }
			}
		});
	}

	document.addEventListener("keydown", function (e) {
		var escribiendo = /input|textarea|select/i.test((document.activeElement || {}).tagName || "");
		if ((e.key === "/" && !escribiendo) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) {
			e.preventDefault();
			abrePalabra();
		} else if (e.key === "Escape") {
			if (pal && !pal.hidden) cierraPalabra();
			if (lado && lado.classList.contains("abierto")) abreLado(false);
		}
	});
})();
