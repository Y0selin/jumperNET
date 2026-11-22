/*
 * JumperNET · experiencias del sitio
 * v3.0.0
 *
 * Nada de lo que hay aquí abre conexiones, ejecuta comandos ni mide la red.
 * El mapa, el viaje, el cifrado, la terminal y la latencia son demostraciones
 * educativas. La preferencia de tema y la decoración navideña se guardan por
 * separado, para que se puedan combinar sin mezclarse.
 */
(function () {
	'use strict';

	var JN = window.JN || {};
	var raiz = document.documentElement;
	var reducido = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
	var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
	var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

	raiz.classList.add('jn-js');

	window.JNfront = { version: JN.version || '3.0.0', reducido: reducido };

	function guardar(clave, valor) {
		try { localStorage.setItem(clave, valor); } catch (e) {}
	}
	function leer(clave) {
		try { return localStorage.getItem(clave); } catch (e) { return null; }
	}
	function borrar(clave) {
		try { localStorage.removeItem(clave); } catch (e) {}
	}
	function guardarSesion(clave, valor) {
		try { sessionStorage.setItem(clave, valor); } catch (e) {}
	}
	function leerSesion(clave) {
		try { return sessionStorage.getItem(clave); } catch (e) { return null; }
	}
	function borrarSesion(clave) {
		try { sessionStorage.removeItem(clave); } catch (e) {}
	}

	/* ────────────────────────────────────────────────────────────────
	   PROGRESO DE APRENDIZAJE
	   Cuatro hitos reales, guardados solo en este navegador. No hay
	   cuentas ni servidores implicados.
	   ──────────────────────────────────────────────────────────────── */

	var HITOS = ['video', 'simulador', 'glosario', 'quiz'];
	var CLAVE_PROGRESO = 'jn-progreso-v31';

	function leerProgreso() {
		try {
			var datos = JSON.parse(leer(CLAVE_PROGRESO) || '{}');
			return datos && typeof datos === 'object' ? datos : {};
		} catch (e) {
			return {};
		}
	}

	function pintarProgreso() {
		var caja = $('[data-jn-aprender-progreso]');
		if (!caja) return;
		var datos = leerProgreso();
		var hechos = 0;
		HITOS.forEach(function (id) {
			var hecho = !!datos[id];
			if (hecho) hechos++;
			var li = $('[data-jn-hito="' + id + '"]', caja);
			if (li) {
				li.classList.toggle('is-hecho', hecho);
				li.setAttribute('aria-label', (li.textContent || '').trim() + (hecho ? ': completado' : ': pendiente'));
			}
		});
		var cuenta = $('[data-jn-progreso-cuenta]', caja);
		if (cuenta) cuenta.textContent = hechos + ' de ' + HITOS.length;
		var barra = $('[data-jn-progreso-barra]', caja);
		if (barra) barra.style.width = (hechos / HITOS.length * 100) + '%';
		var rol = $('[data-jn-progreso-barra-rol]', caja);
		if (rol) rol.setAttribute('aria-valuenow', String(hechos));
	}

	function marcarHito(id) {
		if (HITOS.indexOf(id) === -1) return;
		var datos = leerProgreso();
		if (datos[id]) return;
		datos[id] = true;
		guardar(CLAVE_PROGRESO, JSON.stringify(datos));
		pintarProgreso();
	}

	function iniciarProgreso() {
		pintarProgreso();
		var caja = $('[data-jn-aprender-progreso]');
		if (!caja) return;
		var reset = $('[data-jn-progreso-reset]', caja);
		if (reset) {
			reset.addEventListener('click', function () {
				borrar(CLAVE_PROGRESO);
				pintarProgreso();
				reset.textContent = 'progreso reiniciado';
				setTimeout(function () { reset.textContent = 'reiniciar progreso'; }, 1800);
			});
		}
		document.addEventListener('click', function (e) {
			if (e.target.closest('[data-jn-sim-play]')) marcarHito('simulador');
			if (e.target.closest('[data-jn-glos] summary')) marcarHito('glosario');
		});
	}

	/* ────────────────────────────────────────────────────────────────
	   TEMA CLARO / OSCURO
	   ──────────────────────────────────────────────────────────────── */

	function aplicarTema(modo, persistir) {
		var oscuro = modo === 'oscuro';
		raiz.setAttribute('data-jn-tema', oscuro ? 'oscuro' : 'claro');
		raiz.style.colorScheme = oscuro ? 'dark' : 'light';

		$$('[data-jn-tema-btn]').forEach(function (btn) {
			btn.setAttribute('aria-pressed', oscuro ? 'true' : 'false');
			btn.setAttribute('aria-label', oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
			var txt = btn.querySelector('.jn-fab__txt');
			if (txt) txt.textContent = oscuro ? 'claro' : 'oscuro';
		});
		$$('[data-jn-modo]').forEach(function (el) {
			el.textContent = oscuro ? 'oscuro' : 'claro';
		});
		if (persistir) guardar('jn-tema', oscuro ? 'oscuro' : 'claro');
		document.dispatchEvent(new CustomEvent('jn:tema', { detail: { oscuro: oscuro } }));
	}

	function iniciarTema() {
		var guardado = leer('jn-tema');
		var inicial = (guardado === 'claro' || guardado === 'oscuro')
			? guardado
			: (raiz.getAttribute('data-jn-tema') === 'oscuro' ? 'oscuro' : 'claro');
		aplicarTema(inicial, false);
		$$('[data-jn-tema-btn]').forEach(function (btn) {
			btn.addEventListener('click', function () {
				aplicarTema(raiz.getAttribute('data-jn-tema') === 'oscuro' ? 'claro' : 'oscuro', true);
			});
		});
		if (window.matchMedia) {
			var mq = window.matchMedia('(prefers-color-scheme: dark)');
			var alCambiar = function (e) {
				if (!leer('jn-tema')) aplicarTema(e.matches ? 'oscuro' : 'claro', false);
			};
			if (mq.addEventListener) mq.addEventListener('change', alCambiar);
			else if (mq.addListener) mq.addListener(alCambiar);
		}
	}

	/* ────────────────────────────────────────────────────────────────
	   NAVIDAD INDEPENDIENTE DEL TEMA
	   ──────────────────────────────────────────────────────────────── */

	var nieveActiva = false;

	function aplicarNavidad(activa, persistir) {
		raiz.setAttribute('data-jn-navidad', activa ? 'si' : 'no');
		$$('[data-jn-navidad-btn]').forEach(function (btn) {
			btn.setAttribute('aria-pressed', activa ? 'true' : 'false');
			btn.setAttribute('aria-label', activa ? 'Desactivar la decoración navideña' : 'Activar la decoración navideña');
		});
		if (activa) {
			iniciarNieve();
		} else {
			detenerNieve();
		}
		if (persistir) guardar('jn-navidad', activa ? '1' : '0');
	}

	function iniciarNavidad() {
		var guardado = leer('jn-navidad');
		var activa = guardado === '1' ? true : guardado === '0' ? false : raiz.getAttribute('data-jn-navidad') !== 'no';
		aplicarNavidad(activa, false);
		$$('[data-jn-navidad-btn]').forEach(function (btn) {
			btn.addEventListener('click', function () {
				aplicarNavidad(raiz.getAttribute('data-jn-navidad') !== 'si', true);
			});
		});
	}

	/* ────────────────────────────────────────────────────────────────
	   RED DE FONDO
	   Nodos discretos que reaccionan al ratón. Se pausa al ocultar la
	   pestaña y baja la densidad en pantallas pequeñas.
	   ──────────────────────────────────────────────────────────────── */

	function iniciarRed() {
		if (reducido) return;
		var lienzo = document.createElement('canvas');
		lienzo.id = 'jn-red';
		lienzo.setAttribute('aria-hidden', 'true');
		document.body.appendChild(lienzo);
		var ctx = lienzo.getContext('2d');
		if (!ctx) return;

		var ancho = 0, alto = 0, dpr = 1, vivo = true, frame = null, ultimo = 0;
		var nodos = [];
		var pulsos = [];
		var ultimoPulso = 0;
		var raton = { x: -999, y: -999 };

		function medir() {
			dpr = Math.min(window.devicePixelRatio || 1, 2);
			ancho = window.innerWidth;
			alto = window.innerHeight;
			lienzo.width = Math.floor(ancho * dpr);
			lienzo.height = Math.floor(alto * dpr);
			lienzo.style.width = ancho + 'px';
			lienzo.style.height = alto + 'px';
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		}

		function crear() {
			var total = Math.max(10, Math.min(38, Math.round((ancho * alto) / 46000)));
			nodos = [];
			pulsos = [];
			ultimoPulso = 0;
			for (var i = 0; i < total; i++) {
				nodos.push({
					x: Math.random() * ancho,
					y: Math.random() * alto,
					vx: (Math.random() - 0.5) * 0.26,
					vy: (Math.random() - 0.5) * 0.26,
					r: 1 + Math.random() * 1.5
				});
			}
		}

		function colorDe(variable, respaldo) {
			var v = getComputedStyle(raiz).getPropertyValue(variable).trim() || respaldo;
			var h = v.replace('#', '');
			if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
			var n = parseInt(h, 16);
			if (isNaN(n)) return '8,127,104';
			return ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255);
		}

		var verde = colorDe('--jn-esmeralda', '#087f68');
		var oro = colorDe('--jn-oro', '#d6a84b');
		document.addEventListener('jn:tema', function () {
			verde = colorDe('--jn-esmeralda', '#087f68');
			oro = colorDe('--jn-oro', '#d6a84b');
		});

		function pintar(t) {
			if (!vivo) return;
			frame = requestAnimationFrame(pintar);
			if (document.hidden) return;
			if (t - ultimo < 34) return;
			ultimo = t;

			ctx.clearRect(0, 0, ancho, alto);

			for (var i = 0; i < nodos.length; i++) {
				var n = nodos[i];
				n.x += n.vx;
				n.y += n.vy;
				if (n.x < -20) n.x = ancho + 20;
				if (n.x > ancho + 20) n.x = -20;
				if (n.y < -20) n.y = alto + 20;
				if (n.y > alto + 20) n.y = -20;

				var dx = raton.x - n.x;
				var dy = raton.y - n.y;
				var d2 = dx * dx + dy * dy;
				if (d2 < 24000 && d2 > 1) {
					n.x -= dx * 0.0016;
					n.y -= dy * 0.0016;
				}
			}

			for (var a = 0; a < nodos.length; a++) {
				for (var b = a + 1; b < nodos.length; b++) {
					var ddx = nodos[a].x - nodos[b].x;
					var ddy = nodos[a].y - nodos[b].y;
					var dist = Math.sqrt(ddx * ddx + ddy * ddy);
					if (dist < 132) {
						ctx.beginPath();
						ctx.moveTo(nodos[a].x, nodos[a].y);
						ctx.lineTo(nodos[b].x, nodos[b].y);
						ctx.strokeStyle = 'rgba(' + verde + ',' + (0.11 * (1 - dist / 132)).toFixed(3) + ')';
						ctx.lineWidth = 0.8;
						ctx.stroke();
					}
				}
			}

			for (var c = 0; c < nodos.length; c++) {
				var nodo = nodos[c];
				ctx.beginPath();
				ctx.arc(nodo.x, nodo.y, nodo.r, 0, Math.PI * 2);
				ctx.fillStyle = 'rgba(' + (c % 7 === 0 ? oro : verde) + ',.42)';
				ctx.fill();
			}

			/* paquetes discretos que recorren una conexión existente */
			if (t - ultimoPulso > 2400 && pulsos.length < 3) {
				ultimoPulso = t;
				for (var intento = 0; intento < 14; intento++) {
					var pa = nodos[Math.floor(Math.random() * nodos.length)];
					var pb = nodos[Math.floor(Math.random() * nodos.length)];
					if (!pa || !pb || pa === pb) continue;
					var px = pa.x - pb.x;
					var py = pa.y - pb.y;
					if (Math.sqrt(px * px + py * py) < 132) {
						pulsos.push({ a: pa, b: pb, prog: 0, vel: 0.006 + Math.random() * 0.006 });
						break;
					}
				}
			}
			for (var pu = pulsos.length - 1; pu >= 0; pu--) {
				var pulso = pulsos[pu];
				pulso.prog += pulso.vel;
				if (pulso.prog >= 1 || !pulso.a || !pulso.b) {
					pulsos.splice(pu, 1);
					continue;
				}
				var x = pulso.a.x + (pulso.b.x - pulso.a.x) * pulso.prog;
				var y = pulso.a.y + (pulso.b.y - pulso.a.y) * pulso.prog;
				ctx.beginPath();
				ctx.arc(x, y, 5.5, 0, Math.PI * 2);
				ctx.fillStyle = 'rgba(' + verde + ',.12)';
				ctx.fill();
				ctx.beginPath();
				ctx.arc(x, y, 1.7, 0, Math.PI * 2);
				ctx.fillStyle = 'rgba(' + verde + ',.85)';
				ctx.fill();
			}

			if (raton.x > 0) {
				for (var k = 0; k < nodos.length; k++) {
					var rx = nodos[k].x - raton.x;
					var ry = nodos[k].y - raton.y;
					var rd = Math.sqrt(rx * rx + ry * ry);
					if (rd < 170) {
						ctx.beginPath();
						ctx.moveTo(raton.x, raton.y);
						ctx.lineTo(nodos[k].x, nodos[k].y);
						ctx.strokeStyle = 'rgba(' + oro + ',' + (0.16 * (1 - rd / 170)).toFixed(3) + ')';
						ctx.lineWidth = 0.9;
						ctx.stroke();
					}
				}
			}
		}

		medir();
		crear();
		frame = requestAnimationFrame(pintar);

		window.addEventListener('resize', function () {
			medir();
			crear();
		}, { passive: true });
		window.addEventListener('mousemove', function (e) {
			raton.x = e.clientX;
			raton.y = e.clientY;
		}, { passive: true });
		document.addEventListener('mouseleave', function () { raton.x = -999; raton.y = -999; });
		document.addEventListener('visibilitychange', function () {
			if (!document.hidden && !frame) frame = requestAnimationFrame(pintar);
		});
	}

	/* ────────────────────────────────────────────────────────────────
	   NIEVE
	   ──────────────────────────────────────────────────────────────── */

	var nieve = { canvas: null, ctx: null, copos: [], frame: null };

	function iniciarNieve() {
		if (reducido || nieveActiva) return;
		var lienzo = document.getElementById('jn-nieve');
		if (!lienzo) {
			lienzo = document.createElement('canvas');
			lienzo.id = 'jn-nieve';
			lienzo.setAttribute('aria-hidden', 'true');
			document.body.appendChild(lienzo);
		}
		var ctx = lienzo.getContext('2d');
		if (!ctx) return;

		nieve.canvas = lienzo;
		nieve.ctx = ctx;
		nieveActiva = true;

		function medir() {
			var dpr = Math.min(window.devicePixelRatio || 1, 2);
			lienzo.width = Math.floor(window.innerWidth * dpr);
			lienzo.height = Math.floor(window.innerHeight * dpr);
			lienzo.style.width = window.innerWidth + 'px';
			lienzo.style.height = window.innerHeight + 'px';
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		}

		function crear() {
			var total = Math.min(62, Math.round(window.innerWidth / 26));
			nieve.copos = [];
			for (var i = 0; i < total; i++) {
				nieve.copos.push({
					x: Math.random() * window.innerWidth,
					y: Math.random() * window.innerHeight,
					r: 0.7 + Math.random() * 1.9,
					v: 0.25 + Math.random() * 0.75,
					vx: (Math.random() - 0.5) * 0.3,
					f: Math.random() * Math.PI * 2
				});
			}
		}

		var claro = function () {
			return raiz.getAttribute('data-jn-tema') === 'oscuro' ? '255,255,255' : '110,150,180';
		};

		function pintar(t) {
			if (!nieveActiva) return;
			nieve.frame = requestAnimationFrame(pintar);
			if (document.hidden) return;
			var ancho = window.innerWidth;
			var alto = window.innerHeight;
			ctx.clearRect(0, 0, ancho, alto);
			for (var i = 0; i < nieve.copos.length; i++) {
				var c = nieve.copos[i];
				c.f += 0.01;
				c.y += c.v;
				c.x += c.vx + Math.sin(c.f) * 0.35;
				if (c.y > alto + 8) { c.y = -8; c.x = Math.random() * ancho; }
				if (c.x > ancho + 8) c.x = -8;
				if (c.x < -8) c.x = ancho + 8;
				ctx.beginPath();
				ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
				ctx.fillStyle = 'rgba(' + claro() + ',' + (0.18 + c.r * 0.12).toFixed(2) + ')';
				ctx.fill();
			}
		}

		medir();
		crear();
		nieve.frame = requestAnimationFrame(pintar);
		window.addEventListener('resize', function () {
			medir();
			crear();
		}, { passive: true });
	}

	function detenerNieve() {
		nieveActiva = false;
		if (nieve.frame) cancelAnimationFrame(nieve.frame);
		nieve.frame = null;
		if (nieve.ctx && nieve.canvas) nieve.ctx.clearRect(0, 0, nieve.canvas.width, nieve.canvas.height);
	}

	/* ────────────────────────────────────────────────────────────────
	   REVELADO AL DESPLAZAR
	   ──────────────────────────────────────────────────────────────── */

	function iniciarReveal() {
		var piezas = $$('.jn-sec__cab, .jn-pilar, .jn-cita, .jn-sim, .jn-videos, .jn-lab__bloque, .jn-aprender, .jn-aprender__progreso, .jn-quiz, .jn-glos, .jn-ayuda, .jn-equipo, .jn-persona, .jn-bitacora, .jn-equipo__cta, .jn-faq__item, .jn-nav, .jn-cuenta');
		if (!piezas.length) return;
		if (reducido || !('IntersectionObserver' in window)) {
			piezas.forEach(function (el) { el.classList.add('jn-visible'); });
			return;
		}
		piezas.forEach(function (el) { el.classList.add('jn-reveal'); });
		var obs = new IntersectionObserver(function (entradas) {
			entradas.forEach(function (e) {
				if (e.isIntersecting) {
					e.target.classList.add('jn-visible');
					obs.unobserve(e.target);
				}
			});
		}, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
		piezas.forEach(function (el) { obs.observe(el); });
	}

	/* ────────────────────────────────────────────────────────────────
	   CABECERA, MENÚ Y SECCIÓN ACTIVA
	   ──────────────────────────────────────────────────────────────── */

	function iniciarNavegacion() {
		var barra = $('[data-jn-barra]');
		var menu = $('#jn-menu-principal');
		var burger = $('[data-jn-menu]');
		var enlaces = $$('[data-jn-nav]');
		var secciones = enlaces.map(function (a) {
			return document.getElementById(a.getAttribute('data-jn-nav'));
		}).filter(Boolean);

		if (burger && menu) {
			var cerrarMenu = function () {
				menu.classList.remove('is-abierto');
				burger.setAttribute('aria-expanded', 'false');
				burger.setAttribute('aria-label', 'Abrir el menú');
			};
			burger.addEventListener('click', function () {
				var abierto = menu.classList.toggle('is-abierto');
				burger.setAttribute('aria-expanded', abierto ? 'true' : 'false');
				burger.setAttribute('aria-label', abierto ? 'Cerrar el menú' : 'Abrir el menú');
			});
			menu.addEventListener('click', function (e) {
				if (e.target.closest('a')) cerrarMenu();
			});
			document.addEventListener('keydown', function (e) {
				if (e.key === 'Escape') {
					cerrarMenu();
					burger.focus();
				}
			});
			document.addEventListener('click', function (e) {
				if (!menu.contains(e.target) && !burger.contains(e.target)) cerrarMenu();
			});
			window.addEventListener('resize', function () {
				if (window.innerWidth > 1060) cerrarMenu();
			}, { passive: true });
		}

		var cabeceraPadre = $('.wp-site-blocks > header');
		var progreso = barra ? $('[data-jn-progreso]', barra) : null;
		var pendiente = false;

		function marcarActiva(id) {
			enlaces.forEach(function (a) {
				var activa = a.getAttribute('data-jn-nav') === id;
				a.classList.toggle('is-activa', activa);
				if (activa) a.setAttribute('aria-current', 'location');
				else a.removeAttribute('aria-current');
			});
		}

		function calcular() {
			pendiente = false;
			if (cabeceraPadre) cabeceraPadre.classList.toggle('jn-scrolled', window.scrollY > 8);
			if (barra) barra.classList.toggle('is-stuck', barra.getBoundingClientRect().top <= 16);
			if (progreso) {
				var max = document.documentElement.scrollHeight - window.innerHeight;
				var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
				progreso.style.transform = 'scaleX(' + p + ')';
			}
			if (!secciones.length) return;
			var actual = secciones[0].id;
			var limite = window.scrollY + 240;
			var mejor = -Infinity;
			secciones.forEach(function (sec) {
				var top = sec.getBoundingClientRect().top + window.scrollY;
				if (top <= limite && top > mejor) {
					mejor = top;
					actual = sec.id;
				}
			});
			if (window.scrollY < 120) actual = 'inicio';
			marcarActiva(actual);
		}

		function alDesplazar() {
			if (pendiente) return;
			pendiente = true;
			requestAnimationFrame(calcular);
		}

		window.addEventListener('scroll', alDesplazar, { passive: true });
		window.addEventListener('resize', alDesplazar, { passive: true });
		window.addEventListener('load', calcular);
		calcular();
	}

	/* ────────────────────────────────────────────────────────────────
	   REPRODUCTORES
	   ──────────────────────────────────────────────────────────────── */

	function tiempo(seg) {
		if (!isFinite(seg) || seg < 0) seg = 0;
		var m = Math.floor(seg / 60);
		var s = Math.floor(seg % 60);
		return m + ':' + (s < 10 ? '0' : '') + s;
	}

	function iniciarReproductores() {
		$$('[data-jn-rep]').forEach(function (bloque) {
			var video = $('video', bloque);
			if (!video) return;
			var corte = parseInt(bloque.getAttribute('data-jn-corte'), 10) || 0;
			var portada = $('[data-jn-rep-portada]', bloque);
			var btnPlay = $('[data-jn-rep-play]', bloque);
			var btnMute = $('[data-jn-rep-mute]', bloque);
			var btnFull = $('[data-jn-rep-full]', bloque);
			var seek = $('[data-jn-rep-seek]', bloque);
			var volumen = $('[data-jn-rep-vol]', bloque);
			var etiqueta = $('[data-jn-rep-tiempo]', bloque);
			var marco = $('.jn-rep__marco', bloque);
			var fin = $('[data-jn-rep-fin]', bloque);
			var btnFin = $('[data-jn-rep-fin-repetir]', bloque);

			if (video.hasAttribute('controls')) video.removeAttribute('controls');
			video.loop = false;
			video.volume = 0.85;
			bloque.classList.toggle('is-muted', video.muted);

			function duracion() {
				if (corte > 0) return corte;
				return isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
			}

			function pintaVolumen() {
				bloque.classList.toggle('is-muted', video.muted || video.volume === 0);
				if (volumen && document.activeElement !== volumen) volumen.value = video.muted ? 0 : video.volume;
			}

			function pinta() {
				var dur = duracion();
				if (seek) {
					if (dur > 0) seek.max = dur;
					if (!seeking) seek.value = Math.min(video.currentTime || 0, dur || 0);
				}
				if (etiqueta) {
					etiqueta.textContent = tiempo(Math.min(video.currentTime || 0, corte > 0 ? corte : Infinity)) + ' / ' + tiempo(dur);
				}
			}

			function pintaBoton() {
				bloque.classList.toggle('is-playing', !video.paused);
				if (btnPlay) {
					btnPlay.setAttribute('aria-label', video.paused ? 'Reproducir' : 'Pausar');
				}
			}

			function ocultarFin() {
				if (fin) fin.hidden = true;
				bloque.classList.remove('is-finished');
			}

			function mostrarFin() {
				if (!fin) return;
				fin.hidden = false;
				bloque.classList.add('is-finished', 'is-empezado');
				bloque.classList.remove('is-playing');
			}

			function reproducir() {
				if (corte > 0 && video.currentTime >= corte - 0.1) video.currentTime = 0;
				ocultarFin();
				var p = video.play();
				if (p && p.catch) p.catch(function () {});
			}

			function alternar() {
				if (video.paused) reproducir();
				else video.pause();
			}

			function conSonido() {
				video.muted = false;
				bloque.classList.remove('is-muted');
				bloque.classList.add('is-empezado');
				if (btnMute) btnMute.setAttribute('aria-label', 'Silenciar');
				reproducir();
			}

			bloque.__jnPlay = conSonido;
			bloque.__jnIr = function () {
				/* el play debe ocurrir en el mismo gesto: si se retrasa, el
				   navegador bloquea el audio y el vídeo queda en pausa. */
				conSonido();
				if (bloque.scrollIntoView) bloque.scrollIntoView({ behavior: reducido ? 'auto' : 'smooth', block: 'center' });
			};

			if (portada) portada.addEventListener('click', conSonido);
			if (btnPlay) btnPlay.addEventListener('click', alternar);
			video.addEventListener('click', alternar);

			if (volumen) {
				volumen.addEventListener('input', function () {
					var v = parseFloat(volumen.value);
					if (!isFinite(v)) v = 0.85;
					video.volume = v;
					video.muted = v === 0;
					pintaVolumen();
					if (v > 0 && video.paused) reproducir();
				});
			}
			video.addEventListener('volumechange', pintaVolumen);

			if (btnMute) {
				btnMute.addEventListener('click', function () {
					video.muted = !video.muted;
					bloque.classList.toggle('is-muted', video.muted);
					btnMute.setAttribute('aria-label', video.muted ? 'Activar sonido' : 'Silenciar');
					if (!video.muted) {
						video.volume = 0.85;
						if (video.paused) reproducir();
					}
				});
			}

			if (btnFull && marco) {
				btnFull.addEventListener('click', function () {
					if (document.fullscreenElement || document.webkitFullscreenElement) {
						(document.exitFullscreen || document.webkitExitFullscreen || function () {}).call(document);
						return;
					}
					var fn = marco.requestFullscreen || marco.webkitRequestFullscreen;
					if (fn) {
						var r = fn.call(marco);
						if (r && r.catch) r.catch(function () {});
					}
				});
			}

			var seeking = false;
			if (seek) {
				seek.addEventListener('input', function () {
					seeking = true;
					var v = parseFloat(seek.value);
					if (isFinite(v)) video.currentTime = v;
				});
				seek.addEventListener('change', function () { seeking = false; });
				seek.addEventListener('pointerup', function () { seeking = false; });
			}

			video.addEventListener('play', function () {
				bloque.classList.add('is-empezado');
				pintaBoton();
			});
			video.addEventListener('pause', pintaBoton);
			video.addEventListener('ended', function () {
				if (corte > 0 && fin) {
					mostrarFin();
					marcarHito('video');
				} else {
					bloque.classList.remove('is-playing', 'is-empezado');
				}
				pintaBoton();
				pinta();
			});
			if (btnFin) {
				btnFin.addEventListener('click', function () {
					video.currentTime = 0;
					reproducir();
				});
			}
			video.addEventListener('loadedmetadata', pinta);
			video.addEventListener('timeupdate', function () {
				if (corte > 0 && video.currentTime >= corte - 0.05) {
					if (!bloque.classList.contains('is-finished')) {
						video.pause();
						mostrarFin();
						marcarHito('video');
					}
					pinta();
					return;
				}
				pinta();
			});
			if (marco) {
				marco.addEventListener('keydown', function (e) {
					if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON')) return;
					if (e.code === 'Space' || e.key === 'k') {
						e.preventDefault();
						alternar();
					} else if (e.key === 'm' && btnMute) {
						btnMute.click();
					} else if (e.key === 'f' && btnFull) {
						btnFull.click();
					}
				});
			}

			pintaBoton();
			pinta();
			pintaVolumen();
		});

		$$('[data-jn-rep-ir]').forEach(function (a) {
			a.addEventListener('click', function (e) {
				var bloque = $('[data-jn-rep][data-jn-corte]');
				if (!bloque) return;
				e.preventDefault();
				if (bloque.__jnIr) bloque.__jnIr();
			});
		});
	}

	/* ────────────────────────────────────────────────────────────────
	   INTRO CINEMATOGRÁFICA
	   Una sola vez por navegador. Es una capa visual: el contenido ya
	   está cargado debajo y el botón de saltar siempre está disponible.
	   ──────────────────────────────────────────────────────────────── */

	var introActiva = false;

	function iniciarIntro() {
		var intro = $('[data-jn-intro]');
		if (!intro) return;
		if (leer('jn-intro-v31') || raiz.classList.contains('jn-intro-visto')) {
			intro.remove();
			return;
		}
		guardar('jn-intro-v31', '1');
		introActiva = true;
		raiz.classList.add('jn-intro-activa');
		document.body.classList.add('jn-intro-abierto');
		if (reducido) {
			$$('.jn-intro__chispa', intro).forEach(function (el) { el.remove(); });
		}

		var saltar = $('[data-jn-intro-saltar]', intro);
		var cerrada = false;
		var temporizador = null;

		function cerrar() {
			if (cerrada) return;
			cerrada = true;
			if (temporizador) clearTimeout(temporizador);
			intro.classList.add('is-saliendo');
			introActiva = false;
			document.body.classList.remove('jn-intro-abierto');
			raiz.classList.remove('jn-intro-activa');
			setTimeout(function () {
				if (intro.parentNode) intro.parentNode.removeChild(intro);
			}, reducido ? 60 : 520);
			document.dispatchEvent(new CustomEvent('jn:intro-fin'));
		}

		if (saltar) {
			saltar.addEventListener('click', cerrar);
			setTimeout(function () { saltar.focus({ preventScroll: true }); }, 60);
		}
		document.addEventListener('keydown', function (e) {
			if (e.key === 'Escape' && !cerrada) {
				cerrar();
				return;
			}
			if (e.key === 'Tab' && saltar && document.activeElement !== saltar) {
				e.preventDefault();
				saltar.focus({ preventScroll: true });
			}
		});
		temporizador = setTimeout(cerrar, reducido ? 1100 : 4200);
	}

	/* ────────────────────────────────────────────────────────────────
	   VISITA GUIADA
	   Seis paradas contextuales. La tarjeta es la única zona
	   interactiva; el foco se mantiene dentro de ella.
	   ──────────────────────────────────────────────────────────────── */

	var tour = { activo: false, indice: 0, previo: null };

	function pasosTour() {
		var existeCuenta = !!document.getElementById('cuenta');
		return [
			{
				sel: '.jn-hero h1, .jn-hero .wp-block-post-title',
				kicker: 'la red',
				tit: 'Una red educativa, no una caja negra',
				txt: 'JumperNET enseña cómo viaja una conexión por tres saltos: qué ve cada nodo, qué se cifra y qué cuesta recorrer más camino. Nada de promesas de invisibilidad.'
			},
			{
				sel: '#jn-corte',
				kicker: 'el vídeo',
				tit: 'Tu tráfico, de principio a fin',
				txt: 'El corte de 30 segundos resume el viaje del paquete. Puedes verlo con sonido y, al terminar, saltar directo al simulador de los tres saltos.'
			},
			{
				sel: '#como-funciona',
				kicker: 'el simulador',
				tit: 'Tres saltos, paso a paso',
				txt: 'Toca cada nodo para leer su ficha o inicia el recorrido y sigue el paquete por la pista. La latencia que aparece está marcada como demostración.'
			},
			{
				sel: '#laboratorio',
				kicker: 'el laboratorio',
				tit: 'Prueba sin abrir conexiones',
				txt: 'El paquete que viaja, el comparador de conexiones, la topología, la terminal educativa y el estado real de la instalación. Todo ocurre en esta página.'
			},
			{
				sel: '#recursos',
				kicker: 'aprender',
				tit: 'Redes y privacidad sin humo',
				txt: 'Ocho ideas clave, un glosario filtrable, un cuestionario breve y tu progreso guardado en este navegador. Puedes parar y volver cuando quieras.'
			},
			{
				sel: existeCuenta ? '#cuenta' : '.jn-barra__acciones',
				kicker: 'tu panel',
				tit: existeCuenta ? 'Todo lo tuyo, en un sitio' : 'Acceso y cuenta',
				txt: existeCuenta
					? 'Tu panel reúne el saludo, los accesos rápidos, el estado honesto del circuito, los datos de tu cuenta y las preferencias de tema y Navidad.'
					: 'En la cabecera —o en su menú si estás en el móvil— tienes Acceder y Crear cuenta. Al entrar, el sitio te saluda con tu nombre y te muestra un panel personalizado.'
			}
		];
	}

	function cerrarTour(motivo) {
		var caja = $('[data-jn-tour]');
		if (!caja || !tour.activo) return;
		tour.activo = false;
		caja.hidden = true;
		caja.setAttribute('aria-hidden', 'true');
		document.body.classList.remove('jn-tour-abierto');
		setTimeout(function () {
			var foco = $('[data-jn-tour-foco]', caja);
			if (foco) foco.removeAttribute('style');
		}, 220);
		if (motivo === 'completado') guardar('jn-tour-v31', 'completado');
		else if (motivo === 'omitido') guardar('jn-tour-v31', 'omitido');
		if (tour.previo && tour.previo.focus) {
			try { tour.previo.focus({ preventScroll: true }); } catch (e) {}
		}
	}

	function abrirTour(indice) {
		var caja = $('[data-jn-tour]');
		if (!caja) return;
		var pasos = pasosTour();
		if (!pasos.length) return;
		tour.previo = document.activeElement;
		tour.activo = true;
		tour.indice = Math.max(0, Math.min(indice || 0, pasos.length - 1));
		document.body.classList.add('jn-tour-abierto');
		caja.hidden = false;
		caja.setAttribute('aria-hidden', 'false');

		var puntos = $('[data-jn-tour-puntos]', caja);
		if (puntos && !puntos.children.length) {
			pasos.forEach(function (_, i) {
				var p = document.createElement('i');
				p.setAttribute('data-jn-tour-punto', String(i));
				puntos.appendChild(p);
			});
		}

		var tarjeta = $('[data-jn-tour-tarjeta]', caja);
		var foco = $('[data-jn-tour-foco]', caja);
		var elPaso = $('[data-jn-tour-paso]', caja);
		var elKicker = $('[data-jn-tour-kicker]', caja);
		var elTit = $('[data-jn-tour-tit]', caja);
		var elTxt = $('[data-jn-tour-txt]', caja);
		var btnPrev = $('[data-jn-tour-prev]', caja);
		var btnNext = $('[data-jn-tour-next]', caja);

		function pintarFoco(objetivo) {
			if (!foco) return;
			if (!objetivo) {
				foco.style.opacity = '0';
				return;
			}
			var r = objetivo.getBoundingClientRect();
			var pad = 8;
			var top = Math.max(6, r.top - pad);
			var left = Math.max(6, r.left - pad);
			var derecha = Math.min(window.innerWidth - 6, r.right + pad);
			var abajo = Math.min(window.innerHeight - 6, r.bottom + pad);
			if (abajo - top < 24) {
				foco.style.opacity = '0';
				return;
			}
			foco.style.opacity = '1';
			foco.style.top = top + 'px';
			foco.style.left = left + 'px';
			foco.style.width = Math.max(20, derecha - left) + 'px';
			foco.style.height = Math.max(20, abajo - top) + 'px';
		}

		function targetActual() {
			var paso = pasos[tour.indice];
			return paso && paso.sel ? $(paso.sel) : null;
		}

		function repintar() {
			if (!tour.activo) return;
			pintarFoco(targetActual());
		}

		function ir(i) {
			if (i < 0) return;
			if (i >= pasos.length) {
				cerrarTour('completado');
				return;
			}
			tour.indice = i;
			var paso = pasos[i];
			if (elPaso) elPaso.textContent = 'parada ' + (i + 1) + ' de ' + pasos.length;
			if (elKicker) elKicker.textContent = paso.kicker;
			if (elTit) elTit.textContent = paso.tit;
			if (elTxt) elTxt.textContent = paso.txt;
			if (btnPrev) btnPrev.disabled = i === 0;
			if (btnNext) btnNext.textContent = i === pasos.length - 1 ? 'Terminar' : 'Siguiente';
			$$('[data-jn-tour-punto]', caja).forEach(function (p, idx) {
				p.classList.toggle('is-activo', idx === i);
				p.classList.toggle('is-hecho', idx < i);
			});
			var objetivo = targetActual();
			if (objetivo) {
				objetivo.scrollIntoView({ behavior: reducido ? 'auto' : 'smooth', block: 'center' });
				setTimeout(repintar, reducido ? 20 : 420);
			}
			if (tarjeta) {
				try { tarjeta.focus({ preventScroll: true }); } catch (e) {}
			}
		}

		if (!caja.__jnTourListo) {
			caja.__jnTourListo = true;
			$('[data-jn-tour-cerrar]', caja).addEventListener('click', function () { cerrarTour('omitido'); });
			$('[data-jn-tour-prev]', caja).addEventListener('click', function () {
				if (tour.indice > 0) ir(tour.indice - 1);
			});
			$('[data-jn-tour-next]', caja).addEventListener('click', function () {
				ir(tour.indice + 1);
			});
			document.addEventListener('keydown', function (e) {
				if (!tour.activo) return;
				if (e.key === 'Escape') { e.preventDefault(); cerrarTour('omitido'); }
				else if (e.key === 'ArrowRight') { e.preventDefault(); ir(tour.indice + 1); }
				else if (e.key === 'ArrowLeft' && tour.indice > 0) { e.preventDefault(); ir(tour.indice - 1); }
				else if (e.key === 'Tab') {
					var enfocables = $$('button:not([disabled]), a[href]', tarjeta);
					if (!enfocables.length) return;
					var primero = enfocables[0];
					var ultimo = enfocables[enfocables.length - 1];
					if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
					else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
				}
			});
			window.addEventListener('scroll', repintar, { passive: true });
			window.addEventListener('resize', repintar, { passive: true });
		}

		ir(tour.indice);
		setTimeout(repintar, reducido ? 30 : 480);
	}

	/* ────────────────────────────────────────────────────────────────
	   BIENVENIDA
	   ──────────────────────────────────────────────────────────────── */

	function iniciarBienvenida() {
		var dialogo = $('[data-jn-bienvenida]');
		if (!dialogo) return;
		if (reducido) {
			$$('.jn-welcome__chispa', dialogo).forEach(function (el) { el.remove(); });
		}

		var btnTour = $('[data-jn-bienvenida-tour]', dialogo);
		var btnExplorar = $('[data-jn-bienvenida-explorar]', dialogo);
		var btnCerrar = $('[data-jn-bienvenida-cerrar]', dialogo);
		var abierta = false;
		var clave = 'jn-bienvenida-v31';

		function recordar() {
			guardar(clave, '1');
		}

		function abrir() {
			if (abierta) return;
			abierta = true;
			$$('video').forEach(function (v) { v.pause(); });
			document.body.classList.add('jn-modal-abierto');
			if (typeof dialogo.showModal === 'function') {
				try { dialogo.showModal(); } catch (e) { dialogo.setAttribute('open', ''); }
			} else {
				dialogo.setAttribute('open', '');
			}
			setTimeout(function () {
				if (btnTour) btnTour.focus({ preventScroll: true });
			}, 80);
		}

		function cerrar(accion) {
			if (!abierta) return;
			recordar();
			abierta = false;
			document.body.classList.remove('jn-modal-abierto');
			if (typeof dialogo.close === 'function') {
				try { dialogo.close(); } catch (e) { dialogo.removeAttribute('open'); }
			} else {
				dialogo.removeAttribute('open');
			}
			if (accion === 'tour') {
				setTimeout(function () { abrirTour(0); }, 180);
			} else if (accion === 'explorar') {
				var destino = document.getElementById('proyecto');
				if (destino) {
					setTimeout(function () {
						destino.scrollIntoView({ behavior: reducido ? 'auto' : 'smooth', block: 'start' });
					}, 120);
				}
			}
		}

		if (btnTour) btnTour.addEventListener('click', function () { cerrar('tour'); });
		if (btnExplorar) btnExplorar.addEventListener('click', function () { cerrar('explorar'); });
		if (btnCerrar) btnCerrar.addEventListener('click', function () { cerrar('cerrar'); });
		dialogo.addEventListener('click', function (e) {
			if (e.target === dialogo) cerrar('cerrar');
		});
		dialogo.addEventListener('cancel', function (e) {
			e.preventDefault();
			cerrar('cerrar');
		});
		dialogo.addEventListener('close', function () {
			abierta = false;
			document.body.classList.remove('jn-modal-abierto');
		});

		$$('[data-jn-bienvenida-abrir]').forEach(function (btn) {
			btn.addEventListener('click', function () {
				borrar(clave);
				abrir();
			});
		});

		var lanzar = function () {
			if (!leer(clave)) setTimeout(abrir, introActiva ? 350 : 650);
		};
		if (introActiva) {
			document.addEventListener('jn:intro-fin', lanzar, { once: true });
		} else {
			lanzar();
		}

		$$('[data-jn-tour-abrir]').forEach(function (btn) {
			btn.addEventListener('click', function () { abrirTour(0); });
		});
	}

	/* ────────────────────────────────────────────────────────────────
	   SALUDO DESPUÉS DE INICIAR SESIÓN
	   Solo se muestra si el servidor ha añadido el parámetro al
	   volver del formulario de acceso. El nombre viene de la cuenta.
	   ──────────────────────────────────────────────────────────────── */

	function iniciarSaludo() {
		var saludo = $('[data-jn-saludo]');
		if (!saludo) return;
		try {
			var url = new URL(window.location.href);
			if (url.searchParams.has('jn-saludo')) {
				url.searchParams.delete('jn-saludo');
				history.replaceState({}, '', url.pathname + (url.search ? url.search : '') + url.hash);
			}
		} catch (e) {}
		var cerrar = function () {
			saludo.classList.add('is-fuera');
			setTimeout(function () { if (saludo.parentNode) saludo.parentNode.removeChild(saludo); }, 320);
		};
		var btn = $('[data-jn-saludo-cerrar]', saludo);
		if (btn) btn.addEventListener('click', cerrar);
		setTimeout(cerrar, 11000);
	}

	/* ────────────────────────────────────────────────────────────────
	   BUSCADOR DEL CENTRO DE AYUDA
	   Filtra preguntas reales del proyecto. No genera respuestas.
	   ──────────────────────────────────────────────────────────────── */

	function iniciarAyuda() {
		var caja = $('[data-jn-ayuda]');
		if (!caja) return;
		var input = $('[data-jn-ayuda-buscar]', caja);
		var estado = $('[data-jn-ayuda-estado]', caja);
		var items = $$('.jn-faq__item');
		if (!input || !items.length) return;

		function normalizar(t) {
			return (t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
		}

		function filtrar() {
			var q = normalizar(input.value.trim());
			var visibles = 0;
			items.forEach(function (item) {
				var coincide = !q || normalizar(item.textContent).indexOf(q) !== -1;
				item.hidden = !coincide;
				if (coincide) visibles++;
				if (coincide && q) item.open = true;
			});
			if (estado) {
				estado.textContent = !q
					? items.length + ' preguntas disponibles.'
					: visibles
						? visibles + (visibles === 1 ? ' pregunta coincide con «' : ' preguntas coinciden con «') + input.value.trim() + '».'
						: 'Sin coincidencias. Prueba con otra palabra o abre la documentación completa.';
			}
		}

		input.addEventListener('input', filtrar);
		filtrar();
	}

	/* ────────────────────────────────────────────────────────────────
	   SIMULADOR DE TRES SALTOS (y viaje del paquete)
	   ──────────────────────────────────────────────────────────────── */

	function iniciarSimuladores() {
		$$('[data-jn-sim]').forEach(function (root) {
			var nodos = $$('[data-jn-salto]', root);
			if (!nodos.length) return;
			var fichas = $$('[data-jn-ficha]', root);
			var pista = $('[data-jn-sim-pista]', root);
			var paquete = $('[data-jn-sim-paquete]', root);
			var estado = $('[data-jn-sim-estado]', root);
			var latencia = $('[data-jn-sim-latencia]', root);
			var pasoText = $('[data-jn-sim-paso-txt]', root);
			var progreso = $('[data-jn-sim-progreso]', root);
			var btnPlay = $('[data-jn-sim-play]', root);
			var btnPaso = $('[data-jn-sim-paso]', root);
			var btnReset = $('[data-jn-sim-reset]', root);

			var actual = 0;
			var timer = null;
			var recorriendo = false;
			var LATENCIAS = ['0 ms', '9 ms', '22 ms', '35 ms', '39 ms'];
			var ETIQUETAS = ['en espera', 'enviando paquete', 'cruzando el nodo intermedio', 'último salto', 'respuesta recibida'];

			function total() { return nodos.length; }

			function nombrar(i) {
				var b = nodos[i] ? nodos[i].querySelector('b') : null;
				return b ? b.textContent : 'nodo ' + (i + 1);
			}

			function colocarPaquete(i) {
				if (!pista || !paquete) return;
				var punto = nodos[i].querySelector('.jn-sim__punto');
				if (!punto) return;
				var c = punto.getBoundingClientRect();
				var p = pista.getBoundingClientRect();
				var x = c.left - p.left + c.width / 2;
				var y = c.top - p.top + c.height / 2;
				paquete.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
			}

			function pintar(i, mover) {
				actual = Math.max(0, Math.min(total() - 1, i));
				nodos.forEach(function (btn, idx) {
					btn.classList.toggle('is-actual', idx === actual);
					btn.classList.toggle('is-hecho', idx < actual);
					btn.setAttribute('aria-pressed', idx === actual ? 'true' : 'false');
				});
				fichas.forEach(function (f) {
					f.hidden = parseInt(f.getAttribute('data-jn-ficha'), 10) !== actual;
				});
				if (pasoText) pasoText.textContent = 'parada ' + (actual + 1) + ' de ' + total();
				if (latencia) latencia.textContent = LATENCIAS[actual] || '—';
				if (progreso) progreso.style.width = (actual / (total() - 1) * 100) + '%';
				if (estado) estado.textContent = ETIQUETAS[Math.min(actual, ETIQUETAS.length - 1)] || 'en el circuito';
				if (mover) colocarPaquete(actual);
			}

			function detener(auto) {
				recorriendo = false;
				root.classList.remove('is-recorriendo');
				if (timer) {
					clearTimeout(timer);
					timer = null;
				}
				if (auto && btnPlay) btnPlay.textContent = 'Reanudar recorrido';
			}

			function avanzar(auto) {
				if (actual >= total() - 1) {
					detener(false);
					if (estado) estado.textContent = 'recorrido completo';
					if (btnPlay) btnPlay.textContent = 'Volver a empezar';
					return false;
				}
				pintar(actual + 1, true);
				return true;
			}

			function pasoAutomático() {
				if (!recorriendo) return;
				var sigue = avanzar(true);
				if (!sigue) return;
				timer = setTimeout(pasoAutomático, reducido ? 900 : 1700);
			}

			if (btnPlay) {
				btnPlay.addEventListener('click', function () {
					if (recorriendo) {
						detener(true);
						if (estado) estado.textContent = 'en pausa';
						return;
					}
					if (actual >= total() - 1) pintar(0, true);
					recorriendo = true;
					root.classList.add('is-recorriendo');
					btnPlay.textContent = 'Pausar recorrido';
					if (estado) estado.textContent = 'enviando paquete';
					colocarPaquete(actual);
					timer = setTimeout(pasoAutomático, reducido ? 500 : 900);
				});
			}

			if (btnPaso) {
				btnPaso.addEventListener('click', function () {
					detener(false);
					if (actual >= total() - 1) {
						pintar(0, true);
						if (btnPlay) btnPlay.textContent = 'Iniciar recorrido';
						return;
					}
					root.classList.add('is-recorriendo');
					avanzar(false);
					if (btnPlay) btnPlay.textContent = actual >= total() - 1 ? 'Volver a empezar' : 'Continuar recorrido';
				});
			}

			if (btnReset) {
				btnReset.addEventListener('click', function () {
					detener(false);
					pintar(0, true);
					root.classList.remove('is-recorriendo');
					if (estado) estado.textContent = 'en espera';
					if (latencia) latencia.textContent = '—';
					if (progreso) progreso.style.width = '0%';
					if (btnPlay) btnPlay.textContent = 'Iniciar recorrido';
					if (paquete) paquete.style.opacity = '';
					colocarPaquete(0);
				});
			}

			nodos.forEach(function (btn, idx) {
				btn.addEventListener('click', function () {
					detener(false);
					pintar(idx, true);
					if (btnPlay) btnPlay.textContent = idx >= total() - 1 ? 'Volver a empezar' : 'Continuar recorrido';
				});
			});

			window.addEventListener('resize', function () {
				colocarPaquete(actual);
			}, { passive: true });

			pintar(0, false);
			requestAnimationFrame(function () { colocarPaquete(0); });
		});
	}

	/* ────────────────────────────────────────────────────────────────
	   COMPARADOR
	   ──────────────────────────────────────────────────────────────── */

	function iniciarComparador() {
		$$('[data-jn-comp]').forEach(function (root) {
			var botones = $$('[data-jn-comp-btn]', root);
			var tarjetas = $$('[data-jn-comp-card]', root);

			function activar(modo) {
				root.setAttribute('data-activo', modo);
				botones.forEach(function (b) {
					b.setAttribute('aria-pressed', b.getAttribute('data-jn-comp-btn') === modo ? 'true' : 'false');
				});
				tarjetas.forEach(function (t) {
					t.classList.toggle('is-destacada', t.getAttribute('data-jn-comp-card') === modo);
				});
			}

			botones.forEach(function (b) {
				b.addEventListener('click', function () {
					activar(b.getAttribute('data-jn-comp-btn'));
				});
			});
			activar(root.getAttribute('data-activo') || 'saltos');
		});
	}

	/* ────────────────────────────────────────────────────────────────
	   TOPOLOGÍA
	   ──────────────────────────────────────────────────────────────── */

	function iniciarTopologia() {
		$$('[data-jn-topo]').forEach(function (root) {
			var nodos = $$('[data-jn-topo-nodo]', root);
			var vistas = $$('[data-jn-topo-vista]', root);

			function activar(id) {
				nodos.forEach(function (n) {
					var activo = n.getAttribute('data-jn-topo-nodo') === id;
					n.classList.toggle('is-activo', activo);
					n.setAttribute('aria-pressed', activo ? 'true' : 'false');
				});
				vistas.forEach(function (v) {
					v.hidden = v.getAttribute('data-jn-topo-vista') !== id;
				});
			}

			nodos.forEach(function (n) {
				var id = n.getAttribute('data-jn-topo-nodo');
				n.addEventListener('click', function () { activar(id); });
				n.addEventListener('keydown', function (e) {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						activar(id);
					}
				});
			});
		});
	}

	/* ────────────────────────────────────────────────────────────────
	   TERMINAL EDUCATIVA
	   Solo existe una lista cerrada de respuestas: no se ejecuta nada.
	   ──────────────────────────────────────────────────────────────── */

	function iniciarTerminal() {
		var term = $('[data-jn-term]');
		if (!term) return;
		var salida = $('[data-jn-term-salida]', term);
		var form = $('[data-jn-term-form]', term);
		var input = $('[data-jn-term-input]', term);

		function linea(texto, clase) {
			var p = document.createElement('p');
			if (clase) p.className = clase;
			p.textContent = texto;
			salida.appendChild(p);
			salida.scrollTop = salida.scrollHeight;
		}

		function ecosistema(cmd) {
			if (cmd === 'help' || cmd === '?') {
				linea('Comandos disponibles:', 'jn-term__apunte');
				linea('  help                                  esta ayuda');
				linea('  curl --socks5-hostname host:puerto URL  petición a través de SOCKS5 (DNS en el proxy)');
				linea('  curl --socks5 host:puerto URL           variante con resolución DNS local');
				linea('  ssh -D 1080 usuario@servidor            túnel dinámico SOCKS local');
				linea('  resolver dominio                       ejemplo de resolución DNS');
				linea('  jumpernet estado                       estado del laboratorio');
				linea('  clear                                  limpiar la consola');
				linea('Nada se ejecuta en un servidor: la salida es didáctica.', 'jn-term__apunte');
				return;
			}
			if (cmd === 'clear') {
				salida.textContent = '';
				linea('consola limpia. escribe «help» para empezar.', 'jn-term__ok');
				return;
			}
			if (cmd.indexOf('curl --socks5-hostname') === 0) {
				linea('$ ' + cmd);
				linea('SOCKS5 recibe la conexión y resuelve el nombre del destino. Tu equipo no consulta el DNS local: reduce una fuga habitual.', 'jn-term__ok');
				linea('salida de ejemplo:  example.test → 192.0.2.42 · conexión establecida · 200 OK', 'jn-term__apunte');
				return;
			}
			if (cmd.indexOf('curl --socks5 ') === 0) {
				linea('$ ' + cmd);
				linea('Atención: con --socks5 la resolución DNS ocurre en tu equipo antes de abrir el túnel. El proxy transporta la conexión, pero tu resolver ya vio el destino.', 'jn-term__error');
				linea('Para que el DNS viaje por el proxy: --socks5-hostname.', 'jn-term__apunte');
				return;
			}
			if (cmd.indexOf('ssh -D') === 0) {
				linea('$ ' + cmd);
				linea('ssh -D abre un proxy SOCKS dinámico en local (por defecto en 127.0.0.1:1080) y encapsula el tráfico dentro de SSH.', 'jn-term__ok');
				linea('Útil para probar un túnel; no sustituye por sí solo un circuito de tres saltos.', 'jn-term__apunte');
				return;
			}
			if (cmd.indexOf('resolver') === 0) {
				var dominio = cmd.replace('resolver', '').trim() || 'ejemplo.test';
				linea('$ ' + cmd);
				linea(dominio + ' → 192.0.2.42  (dirección de ejemplo, rango reservado para documentación)', 'jn-term__ok');
				linea('La resolución por el proxy evita que tu DNS local vea el destino.', 'jn-term__apunte');
				return;
			}
			if (cmd === 'jumpernet estado' || cmd === 'jumpernet') {
				linea('JumperNET · laboratorio educativo', 'jn-term__ok');
				linea('  circuito            tres saltos (demostración)');
				linea('  cifrado             JENC por capas (modelo simplificado)');
				linea('  nodos remotos       sin monitorizar');
				linea('  latencia            no medida');
				linea('  ejecución           ninguna: todo ocurre en tu navegador', 'jn-term__apunte');
				return;
			}
			if (cmd === '') return;
			linea('Comando no reconocido: ' + cmd, 'jn-term__error');
			linea('Escribe «help» para ver la lista. Ningún comando se ejecuta de verdad.', 'jn-term__apunte');
		}

		form.addEventListener('submit', function (e) {
			e.preventDefault();
			var cmd = (input.value || '').trim();
			if (!cmd) return;
			linea('$ ' + cmd);
			ecosistema(cmd);
			input.value = '';
			input.focus();
		});

		$$('[data-jn-term-chip]', term).forEach(function (chip) {
			chip.addEventListener('click', function () {
				var cmd = chip.getAttribute('data-jn-term-chip') || '';
				linea('$ ' + cmd);
				ecosistema(cmd);
				if (input) input.focus();
			});
		});
	}

	/* ────────────────────────────────────────────────────────────────
	   GLOSARIO
	   ──────────────────────────────────────────────────────────────── */

	function iniciarGlosario() {
		var glos = $('[data-jn-glos]');
		if (!glos) return;
		var input = $('[data-jn-glos-buscar]', glos);
		var cuenta = $('[data-jn-glos-cuenta]', glos);
		var items = $$('.jn-glos__item', glos);
		if (!input) return;

		var normalizar = function (t) {
			return (t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
		};

		function filtrar() {
			var q = normalizar(input.value.trim());
			var visibles = 0;
			items.forEach(function (item) {
				var coincide = !q || normalizar(item.textContent).indexOf(q) !== -1;
				item.classList.toggle('is-oculto', !coincide);
				if (coincide) visibles++;
			});
			if (cuenta) cuenta.textContent = visibles === 1 ? '1 término' : visibles + ' términos';
		}
		input.addEventListener('input', filtrar);
		filtrar();
	}

	/* ────────────────────────────────────────────────────────────────
	   CUESTIONARIO
	   ──────────────────────────────────────────────────────────────── */

	function iniciarQuiz() {
		var quiz = $('[data-jn-quiz]');
		if (!quiz) return;

		var preguntas = [
			{
				p: '¿Quién ve tu IP real en un circuito de tres saltos?',
				o: ['Solo el nodo de entrada', 'El destino final', 'Todos los nodos del circuito'],
				c: 0,
				e: 'La entrada ve tu IP. El destino ve la IP de la salida y el nodo intermedio no ve ninguna de las dos.'
			},
			{
				p: '¿Qué hace JENC con el paquete?',
				o: ['Lo comprime para que ocupe menos', 'Lo envuelve en capas que cada salto abre por separado', 'Lo guarda en el nodo de salida'],
				c: 1,
				e: 'JENC es cifrado por capas: cada salto retira la suya y reenvía el resto sin leer el contenido.'
			},
			{
				p: '¿Qué añade un salto extra, en general?',
				o: ['Más latencia y confianza repartida', 'Anonimato absoluto', 'Una IP fija para siempre'],
				c: 0,
				e: 'Un tramo más suele añadir latencia y reparte lo que sabe cada intermediario. No garantiza invisibilidad.'
			}
		];

		var indice = 0;
		var aciertos = 0;
		var respondida = false;
		var term = false;

		var elPaso = $('[data-jn-quiz-paso]', quiz);
		var elMarcador = $('[data-jn-quiz-marcador]', quiz);
		var elPreg = $('[data-jn-quiz-preg]', quiz);
		var elOpciones = $('[data-jn-quiz-opciones]', quiz);
		var elFb = $('[data-jn-quiz-fb]', quiz);
		var btnNext = $('[data-jn-quiz-next]', quiz);
		var btnReset = $('[data-jn-quiz-reset]', quiz);

		function pintar() {
			respondida = false;
			var q = preguntas[indice];
			if (elPaso) elPaso.textContent = 'pregunta ' + (indice + 1) + ' de ' + preguntas.length;
			if (elMarcador) elMarcador.textContent = aciertos + (aciertos === 1 ? ' acierto' : ' aciertos');
			if (elPreg) elPreg.textContent = q.p;
			if (elFb) {
				elFb.textContent = '';
				elFb.className = 'jn-quiz__fb';
			}
			if (btnNext) {
				btnNext.disabled = true;
				btnNext.textContent = indice === preguntas.length - 1 ? 'ver resultado' : 'siguiente';
			}
			if (!elOpciones) return;
			elOpciones.textContent = '';
			q.o.forEach(function (texto, i) {
				var b = document.createElement('button');
				b.type = 'button';
				b.className = 'jn-quiz__opcion';
				b.textContent = texto;
				b.addEventListener('click', function () { responder(i, b); });
				elOpciones.appendChild(b);
			});
		}

		function responder(i, boton) {
			if (respondida) return;
			respondida = true;
			var q = preguntas[indice];
			var correcta = i === q.c;
			if (correcta) aciertos++;
			$$('.jn-quiz__opcion', elOpciones).forEach(function (b, idx) {
				b.disabled = true;
				if (idx === q.c) b.classList.add('is-ok');
			});
			if (!correcta) boton.classList.add('is-mal');
			if (elFb) {
				elFb.textContent = (correcta ? 'Correcto. ' : 'Casi. ') + q.e;
				elFb.classList.add(correcta ? 'is-ok' : 'is-mal');
			}
			if (elMarcador) elMarcador.textContent = aciertos + (aciertos === 1 ? ' acierto' : ' aciertos');
			if (btnNext) btnNext.disabled = false;
		}

		if (btnNext) {
			btnNext.addEventListener('click', function () {
				if (indice < preguntas.length - 1) {
					indice++;
					pintar();
					return;
				}
				terminar();
			});
		}

		function terminar() {
			term = true;
			marcarHito('quiz');
			if (elPaso) elPaso.textContent = 'cuestionario completado';
			if (elPreg) elPreg.textContent = 'Has acertado ' + aciertos + ' de ' + preguntas.length + '.';
			if (elOpciones) elOpciones.textContent = '';
			if (elFb) {
				elFb.textContent = aciertos === preguntas.length
					? 'Perfecto: ya puedes explicar el circuito sin humo.'
					: 'Repasa las tarjetas de aprendizaje y vuelve a intentarlo cuando quieras.';
				elFb.className = 'jn-quiz__fb ' + (aciertos === preguntas.length ? 'is-ok' : '');
			}
			if (btnNext) btnNext.disabled = true;
			if (elMarcador) elMarcador.textContent = aciertos + ' de ' + preguntas.length + ' aciertos';
		}

		if (btnReset) {
			btnReset.addEventListener('click', function () {
				indice = 0;
				aciertos = 0;
				term = false;
				pintar();
			});
		}

		pintar();
	}

	/* ────────────────────────────────────────────────────────────────
	   ARRANQUE
	   ──────────────────────────────────────────────────────────────── */

	function iniciar() {
		iniciarTema();
		iniciarNavidad();
		iniciarRed();
		iniciarReveal();
		iniciarNavegacion();
		iniciarReproductores();
		iniciarProgreso();
		iniciarAyuda();
		iniciarSaludo();
		iniciarIntro();
		iniciarBienvenida();
		iniciarSimuladores();
		iniciarComparador();
		iniciarTopologia();
		iniciarTerminal();
		iniciarGlosario();
		iniciarQuiz();
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', iniciar);
	} else {
		iniciar();
	}
})();
