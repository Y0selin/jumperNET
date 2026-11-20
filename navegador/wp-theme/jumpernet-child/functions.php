<?php
/*
 * JumperNET Docs — tema hijo de Twenty Twenty-Four.
 * Carga el estilo del tema padre + el nuestro, decora el login y añade la
 * caja de serie (índice de la documentación) al final de cada artículo.
 */

add_action('wp_enqueue_scripts', function () {
	if (wp_get_theme()->parent()) {
		wp_enqueue_style(
			'twentytwentyfour-style',
			get_template_directory_uri() . '/style.css',
			array(),
			wp_get_theme()->parent()->get('Version')
		);
	}
	wp_enqueue_style('jumpernet-child', get_stylesheet_uri(), array('twentytwentyfour-style'), '1.1.0');
});

/* ─── login con la marca ─── */
add_action('login_enqueue_scripts', function () {
	?>
	<style>
		body.login{
			background:#090710 !important;
			background-image:
				radial-gradient(900px 420px at 60% -10%, rgba(255,90,54,.18), transparent 60%),
				radial-gradient(700px 360px at 0% 100%, rgba(139,123,255,.14), transparent 62%),
				linear-gradient(rgba(255,255,255,.02) 1px, transparent 1px),
				linear-gradient(90deg, rgba(255,255,255,.02) 1px, transparent 1px) !important;
			background-size:auto,auto,44px 44px,44px 44px !important;
		}
		#login h1{display:none}
		#login::before{
			content:"≋  JumperNET · Documentación";
			display:block;text-align:center;color:#e8e8ea;font-weight:700;
			font-size:19px;letter-spacing:.02em;margin-bottom:18px;
			font-family:ui-monospace,Consolas,monospace;
		}
		#login form,#loginform{
			background:#14141c !important;border:1px solid #262631 !important;border-radius:14px;
			box-shadow:0 18px 50px rgba(0,0,0,.55) !important;padding:26px !important
		}
		#login label{color:#9a9aa2}
		#login input[type=text],#login input[type=password]{
			background:#0e0e13 !important;color:#e8e8ea !important;
			border:1px solid #262631 !important;border-radius:9px !important;padding:9px 10px !important
		}
		#login input:focus{border-color:#6c5ce7 !important}
		#wp-submit{
			background:linear-gradient(135deg,#ff7a4f,#ff5a36 60%,#e2491f) !important;border-color:transparent !important;border-radius:9px !important;
			color:#261006 !important;font-weight:700;padding:8px 16px !important
		}
		#wp-submit:hover{background:linear-gradient(135deg,#ff9a6f,#ff6a3d) !important}
		#nav,#backtoblog a{color:#9a9aa2 !important}
	</style>
	<?php
});

/* ─── lectura y código: progreso + copiar ─── */
add_action('wp_footer', function () {
	if (!is_singular()) return;
	?>
	<div id="jn-progreso" aria-hidden="true"></div>
	<script>
	(function () {
		var barra = document.getElementById('jn-progreso');
		function pinta() {
			var h = document.documentElement;
			var max = h.scrollHeight - h.clientHeight;
			if (barra) barra.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, h.scrollTop / max) : 0) + ')';
		}
		addEventListener('scroll', pinta, { passive: true });
		pinta();

		document.querySelectorAll('.entry-content pre').forEach(function (pre) {
			var boton = document.createElement('button');
			boton.type = 'button';
			boton.className = 'jn-copiar';
			boton.textContent = 'copiar';
			boton.setAttribute('aria-label', 'Copiar el bloque de código');
			boton.addEventListener('click', function () {
				var code = pre.querySelector('code');
				var texto = (code || pre).innerText;
				navigator.clipboard.writeText(texto).then(function () {
					boton.textContent = 'copiado ✓';
					boton.classList.add('hecho');
					setTimeout(function () { boton.textContent = 'copiar'; boton.classList.remove('hecho'); }, 1800);
				});
			});
			pre.appendChild(boton);
		});
	})();
	</script>
	<?php
});

/* ─── caja de serie al final de los artículos ─── */
add_filter('the_content', function ($contenido) {
	if (is_singular('post') && in_the_loop() && is_main_query()) {
		$articulos = array(
			'que-es-jumpernet'           => 'Qué es JumperNET y por qué existe',
			'arquitectura-completa'      => 'Arquitectura completa de la red',
			'seguridad'                  => 'Seguridad',
			'cifrado-de-los-saltos-jenc' => 'El cifrado de los saltos (JENC)',
			'guia-primeros-pasos'        => 'Guía: primeros pasos',
			'navegador-jumpernet'        => 'El navegador JumperNET',
			'extension-del-navegador'    => 'La extensión del navegador',
			'problemas-y-soluciones'     => 'Problemas y soluciones',
			'referencia-api'             => 'Referencia de la API',
			'despliegue-y-operacion'     => 'Despliegue y operación',
		);
		$items = '';
		foreach ($articulos as $slug => $titulo) {
			$items .= '<li><a href="/docs/' . $slug . '/">' . $titulo . '</a></li>';
		}
		$caja = '<aside class="jn-serie"><h2>Índice de la documentación</h2><ol>' . $items . '</ol>'
		      . '<a class="jn-volver" href="/docs/">⌂ volver al índice general</a></aside>';
		return $contenido . $caja;
	}
	return $contenido;
}, 20);
