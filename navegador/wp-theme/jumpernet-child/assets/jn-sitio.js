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
			var total = Math.min(90, Math.round(window.innerWidth / 16));
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
				ctx.fillStyle = 'rgba(' + claro() + ',' + (0.25 + c.r * 0.16).toFixed(2) + ')';
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
		var piezas = $$('.jn-sec__cab, .jn-pilar, .jn-cita, .jn-sim, .jn-videos, .jn-lab__bloque, .jn-aprender, .jn-quiz, .jn-glos, .jn-equipo, .jn-persona, .jn-bitacora, .jn-equipo__cta, .jn-faq__item, .jn-nav');
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

			function reproducir() {
				if (corte > 0 && video.currentTime >= corte - 0.1) video.currentTime = 0;
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
				bloque.classList.remove('is-playing', 'is-empezado');
				pintaBoton();
				pinta();
			});
			video.addEventListener('loadedmetadata', pinta);
			video.addEventListener('timeupdate', function () {
				if (corte > 0 && video.currentTime >= corte - 0.05) {
					video.currentTime = 0;
					if (!video.paused) reproducir();
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
	   BIENVENIDA
	   ──────────────────────────────────────────────────────────────── */

	function iniciarBienvenida() {
		var dialogo = $('[data-jn-bienvenida]');
		if (!dialogo) return;
		if (reducido) {
			$$('.jn-welcome__chispa', dialogo).forEach(function (el) { el.remove(); });
		}

		var btnExplorar = $('[data-jn-bienvenida-explorar]', dialogo);
		var btnDemo = $('[data-jn-bienvenida-demo]', dialogo);
		var btnCerrar = $('[data-jn-bienvenida-cerrar]', dialogo);
		var check = $('[data-jn-bienvenida-off]', dialogo);
		var abierta = false;

		function recordar() {
			if (check && check.checked) {
				guardar('jn-bienvenida-v3', '1');
			} else {
				guardarSesion('jn-bienvenida-sesion', '1');
			}
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
				if (btnExplorar) btnExplorar.focus({ preventScroll: true });
			}, 80);
		}

		function cerrar(accion) {
			if (!abierta) return;
			if (accion === 'demo') {
				var previo = $('[data-jn-rep][data-jn-corte]');
				if (previo && previo.__jnPlay) previo.__jnPlay();
			}
			recordar();
			abierta = false;
			document.body.classList.remove('jn-modal-abierto');
			if (typeof dialogo.close === 'function') {
				try { dialogo.close(); } catch (e) { dialogo.removeAttribute('open'); }
			} else {
				dialogo.removeAttribute('open');
			}
			if (accion === 'demo') {
				var bloque = $('[data-jn-rep][data-jn-corte]');
				if (bloque && bloque.__jnIr) {
					bloque.__jnIr();
				}
			} else if (accion === 'explorar') {
				var destino = document.getElementById('proyecto');
				if (destino) {
					setTimeout(function () {
						destino.scrollIntoView({ behavior: reducido ? 'auto' : 'smooth', block: 'start' });
					}, 120);
				}
			}
		}

		if (btnExplorar) btnExplorar.addEventListener('click', function () { cerrar('explorar'); });
		if (btnDemo) btnDemo.addEventListener('click', function () { cerrar('demo'); });
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
				borrar('jn-bienvenida-v3');
				borrarSesion('jn-bienvenida-sesion');
				abrir();
			});
		});

		if (!leer('jn-bienvenida-v3') && !leerSesion('jn-bienvenida-sesion')) {
			setTimeout(abrir, 700);
		}
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
