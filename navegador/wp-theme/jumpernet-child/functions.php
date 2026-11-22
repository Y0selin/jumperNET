<?php
/*
 * JumperNET · tema hijo de Twenty Twenty-Four.
 *
 * v3.0.0 — «la red se puede explorar»
 *  · Portada luminosa a dos columnas con el vídeo como protagonista y
 *    reproductor propio (sonido, progreso, pantalla completa).
 *  · Bienvenida interactiva de tres nodos, una vez por navegador y con
 *    opción de volver a verla.
 *  · Cabecera flotante con sección activa, menú móvil, tema y Navidad
 *    independientes, acceso y registro.
 *  · Simulador de tres saltos, viaje del paquete, comparador, topología,
 *    terminal educativa, centro de aprendizaje, estado real del sitio y FAQ.
 *  · Documental completo de 7:15 integrado en «Conoce JumperNET en profundidad».
 *  · Todo lo educativo ocurre en el navegador: no se abre ninguna conexión,
 *    no se ejecuta ningún comando y no se inventan métricas de red.
 */

if (!defined('JN_VERSION')) {
	define('JN_VERSION', '3.0.0');
}

/* ─── temporada navideña (solo define el valor inicial) ─── */
function jn_es_navidad() {
	$m = (int) date_i18n('n');
	$d = (int) date_i18n('j');
	return ($m === 11 && $d >= 15) || $m === 12 || ($m === 1 && $d <= 6);
}

function jn_saludo_navidad() {
	$m = (int) date_i18n('n');
	$d = (int) date_i18n('j');
	if ($m === 12 && $d === 24) return 'Feliz Nochebuena';
	if ($m === 12 && $d === 25) return 'Feliz Navidad';
	if ($m === 12 && $d === 31) return 'Feliz Nochevieja';
	if ($m === 1 && $d === 1) return 'Feliz Año Nuevo';
	return 'Felices fiestas';
}

add_filter('body_class', function ($clases) {
	if (is_front_page()) {
		$clases[] = 'jn-portada';
	}
	if (jn_es_navidad()) {
		$clases[] = 'jn-navidad';
	}
	return $clases;
});

/* el tema y la decoración se fijan antes de pintar para que no haya destello */
add_action('wp_head', function () {
	$navidad_inicial = jn_es_navidad() ? 'si' : 'no';
	?>
	<script>
	(function () {
		var raiz = document.documentElement;
		var tema = 'claro';
		var navidad = '<?php echo esc_js($navidad_inicial); ?>';
		try {
			var guardado = localStorage.getItem('jn-tema');
			if (guardado === 'claro' || guardado === 'oscuro') {
				tema = guardado;
			} else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
				tema = 'oscuro';
			}
			var nv = localStorage.getItem('jn-navidad');
			if (nv === '0') navidad = 'no';
			if (nv === '1') navidad = 'si';
		} catch (e) {}
		raiz.setAttribute('data-jn-tema', tema);
		raiz.setAttribute('data-jn-navidad', navidad);
		raiz.style.colorScheme = tema;
	})();
	</script>
	<?php
}, 1);

/* ─── utilidades de assets ─── */
function jn_asset_uri($ruta = '') {
	return get_stylesheet_directory_uri() . '/assets/' . ltrim($ruta, '/');
}
function jn_asset_path($ruta = '') {
	return get_stylesheet_directory() . '/assets/' . ltrim($ruta, '/');
}
function jn_hay_video() {
	return file_exists(jn_asset_path('el-viaje.mp4'));
}
function jn_poster_video() {
	return file_exists(jn_asset_path('el-viaje-poster.jpg')) ? jn_asset_uri('el-viaje-poster.jpg') : '';
}
function jn_url_acceso() {
	return is_user_logged_in() ? admin_url() : wp_login_url(home_url('/'));
}
function jn_url_registro() {
	return is_user_logged_in() ? admin_url() : wp_registration_url();
}

/* ─── símbolo de marca: tres saltos y una órbita ─── */
function jn_logo_svg($clase = '') {
	$clase = trim('jn-logo ' . $clase);
	return '<svg class="' . esc_attr($clase) . '" viewBox="0 0 44 44" width="44" height="44" aria-hidden="true" focusable="false">'
		. '<ellipse cx="22" cy="22" rx="19" ry="10.5" fill="none" stroke="currentColor" stroke-opacity=".18" stroke-width="1.2" transform="rotate(-24 22 22)"/>'
		. '<path d="M7 31 L15.5 21.5 L23 26.5 L37 10.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>'
		. '<circle cx="7" cy="31" r="3.4" fill="var(--jn-esmeralda)"/>'
		. '<circle cx="15.5" cy="21.5" r="2.4" fill="var(--jn-oro)"/>'
		. '<circle cx="23" cy="26.5" r="2.4" fill="var(--jn-coral)"/>'
		. '<circle cx="37" cy="10.5" r="3.8" fill="var(--jn-esmeralda)"/>'
		. '<circle cx="37" cy="10.5" r="7" fill="none" stroke="var(--jn-esmeralda)" stroke-opacity=".28"/>'
		. '</svg>';
}

/* mete el símbolo dentro del título del sitio del tema padre */
add_filter('render_block', function ($bloque, $instancia) {
	if (is_admin() || empty($instancia['blockName']) || $instancia['blockName'] !== 'core/site-title') {
		return $bloque;
	}
	if (strpos($bloque, 'jn-logo') !== false) {
		return $bloque;
	}
	return preg_replace('/(<a\b[^>]*>)/', '$1' . jn_logo_svg('jn-logo--cab'), $bloque, 1);
}, 10, 2);

add_action('wp_enqueue_scripts', function () {
	if (wp_get_theme()->parent()) {
		wp_enqueue_style(
			'twentytwentyfour-style',
			get_template_directory_uri() . '/style.css',
			array(),
			wp_get_theme()->parent()->get('Version')
		);
	}
	wp_enqueue_style('jumpernet-child', get_stylesheet_uri(), array('twentytwentyfour-style'), JN_VERSION);

	wp_enqueue_script('jumpernet-sitio', jn_asset_uri('jn-sitio.js'), array(), JN_VERSION, true);
	wp_add_inline_script(
		'jumpernet-sitio',
		'window.JN = ' . wp_json_encode(array(
			'video'    => jn_hay_video() ? jn_asset_uri('el-viaje.mp4') : '',
			'poster'   => jn_poster_video(),
			'portada'  => is_front_page(),
			'navidad'  => jn_es_navidad(),
			'version'  => JN_VERSION,
			'corte'    => 30,
			'acceso'   => jn_url_acceso(),
			'registro' => jn_url_registro(),
			'docs'     => home_url('/docs/'),
		)) . ';',
		'before'
	);
});

/* ─── acceso con la marca ─── */
add_filter('login_headerurl', function () { return home_url('/'); });
add_filter('login_headertext', function () { return 'JumperNET'; });

add_action('login_enqueue_scripts', function () {
	?>
	<style>
		body.login{
			background:#eff7ff !important;
			background-image:
				radial-gradient(760px 420px at 78% -10%, rgba(8,127,104,.16), transparent 62%),
				radial-gradient(620px 380px at 4% 104%, rgba(214,168,75,.18), transparent 64%),
				linear-gradient(rgba(20,40,62,.05) 1px, transparent 1px),
				linear-gradient(90deg, rgba(20,40,62,.05) 1px, transparent 1px) !important;
			background-size:auto,auto,56px 56px,56px 56px !important;
		}
		#login h1{display:none}
		#login::before{
			content:"JumperNET";
			display:block;text-align:center;
			font-family:ui-serif,Georgia,"Times New Roman",serif;font-weight:600;
			font-size:28px;letter-spacing:-.02em;margin-bottom:22px;color:#14283e;
		}
		#login::after{
			content:"documentación · acceso";
			display:block;text-align:center;margin:-16px 0 20px;
			font-family:ui-monospace,Consolas,monospace;font-size:10.5px;
			letter-spacing:.18em;text-transform:uppercase;color:#5d748a;
		}
		#login form,#loginform{
			background:#fff !important;border:1px solid rgba(20,40,62,.12) !important;border-radius:20px;
			box-shadow:0 30px 70px -46px rgba(20,40,62,.55) !important;padding:26px !important
		}
		#login label{color:#33506a;font-size:12.5px}
		#login input[type=text],#login input[type=password],#login input[type=email]{
			background:#f7fbff !important;color:#14283e !important;
			border:1px solid rgba(20,40,62,.16) !important;border-radius:11px !important;padding:11px 12px !important
		}
		#login input:focus{border-color:#087f68 !important;box-shadow:0 0 0 3px rgba(8,127,104,.16) !important}
		#wp-submit{
			background:linear-gradient(135deg,#0aa88a,#087f68) !important;border-color:transparent !important;border-radius:11px !important;
			color:#fff !important;font-weight:700;padding:10px 18px !important;
			box-shadow:0 16px 34px -18px rgba(8,127,104,.9)
		}
		#wp-submit:hover{background:linear-gradient(135deg,#12b798,#087f68) !important}
		#nav,#backtoblog a{color:#5d748a !important}
		#nav a:hover,#backtoblog a:hover{color:#087f68 !important}
		.jn-login-volver{text-align:center;margin:18px 0 0;font-family:ui-monospace,Consolas,monospace;font-size:11px;letter-spacing:.08em}
		.jn-login-volver a{color:#087f68 !important;text-decoration:none}
		.jn-login-volver a:hover{color:#0aa88a !important}
	</style>
	<?php
});

add_action('login_footer', function () {
	echo '<p class="jn-login-volver"><a href="' . esc_url(home_url('/')) . '">← volver a la web</a></p>';
});

/* ─── iconos del reproductor ─── */
function jn_icono_reproductor($nombre) {
	$svg = array(
		'play'       => '<svg class="jn-i jn-i-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10-6.5z" fill="currentColor"/></svg>',
		'pausa'      => '<svg class="jn-i jn-i-pausa" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5h3v14H8zM13 5h3v14h-3z" fill="currentColor"/></svg>',
		'sonido'     => '<svg class="jn-i jn-i-sonido" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8 8 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
		'mudo'       => '<svg class="jn-i jn-i-mudo" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 9l5 6M21 9l-5 6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
		'pantalla'   => '<svg class="jn-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
	);
	return isset($svg[$nombre]) ? $svg[$nombre] : '';
}

/* ─── reproductor reutilizable ─── */
function jn_reproductor($args = array()) {
	$def = array(
		'corte'    => 0,
		'id'       => '',
		'titulo'   => '',
		'sub'      => '',
		'aria'     => 'Vídeo de JumperNET',
		'clase'    => '',
		'cinta'    => '',
		'nota'     => '',
		'poster'   => jn_poster_video(),
	);
	$a = array_merge($def, $args);
	$url = jn_asset_uri('el-viaje.mp4');
	$corte = (int) $a['corte'];
	$attrs = ' data-jn-rep';
	if ($corte > 0) {
		$attrs .= ' data-jn-corte="' . esc_attr((string) $corte) . '"';
	}
	if ($a['id']) {
		$attrs .= ' id="' . esc_attr($a['id']) . '"';
	}
	$max = $corte > 0 ? $corte : 436;
	$duracion = $corte > 0 ? '0:30' : '7:16';

	$html = '<figure class="jn-rep ' . esc_attr($a['clase']) . '"' . $attrs . '>';
	if ($a['titulo']) {
		$html .= '<div class="jn-rep__cab">'
			. '<span class="jn-rep__kicker">' . ($corte > 0 ? 'corte de 30 segundos' : 'documental · 7 min') . '</span>'
			. '<h3 class="jn-rep__tit">' . wp_kses_post($a['titulo']) . '</h3>'
			. ($a['sub'] ? '<p class="jn-rep__sub">' . wp_kses_post($a['sub']) . '</p>' : '')
			. '</div>';
	}
	$html .= '<div class="jn-rep__marco">'
		. '<video class="jn-rep__video" src="' . esc_url($url) . '"' . ($a['poster'] ? ' poster="' . esc_url($a['poster']) . '"' : '') . ' preload="metadata" playsinline muted controls aria-label="' . esc_attr($a['aria']) . '"></video>'
		. '<button type="button" class="jn-rep__portada" data-jn-rep-portada aria-label="Reproducir con sonido">'
		. '<span class="jn-rep__lanzador" aria-hidden="true"><span class="jn-rep__lanzador-icono">' . jn_icono_reproductor('play') . '</span></span>'
		. '<span class="jn-rep__portada-txt"><b>Reproducir con sonido</b><small>' . ($corte > 0 ? 'así viaja tu tráfico · 30 s' : 'el documental completo · 7 min') . '</small></span>'
		. '</button>'
		. ($a['cinta'] ? '<span class="jn-rep__cinta">' . esc_html($a['cinta']) . '</span>' : '')
		. '<div class="jn-rep__barra">'
		. '<button type="button" class="jn-rep__btn" data-jn-rep-play aria-label="Reproducir">' . jn_icono_reproductor('play') . jn_icono_reproductor('pausa') . '</button>'
		. '<span class="jn-rep__tiempo" data-jn-rep-tiempo>0:00 / ' . esc_html($duracion) . '</span>'
		. '<input class="jn-rep__seek" data-jn-rep-seek type="range" min="0" max="' . esc_attr((string) $max) . '" step="0.1" value="0" aria-label="Posición del vídeo">'
		. '<button type="button" class="jn-rep__btn jn-rep__btn--mudo" data-jn-rep-mute aria-label="Activar sonido">' . jn_icono_reproductor('mudo') . jn_icono_reproductor('sonido') . '</button>'
		. '<input class="jn-rep__vol" data-jn-rep-vol type="range" min="0" max="1" step="0.05" value="0.85" aria-label="Volumen">'
		. '<button type="button" class="jn-rep__btn" data-jn-rep-full aria-label="Pantalla completa">' . jn_icono_reproductor('pantalla') . '</button>'
		. '</div>'
		. '</div>';
	if ($a['nota']) {
		$html .= '<figcaption class="jn-rep__nota">' . wp_kses_post($a['nota']) . '</figcaption>';
	}
	$html .= '</figure>';
	return $html;
}

/* ─── piezas de la portada ─── */
function jn_bloque_hero_video() {
	if (!jn_hay_video()) {
		return '';
	}
	return jn_reproductor(array(
		'corte'  => 30,
		'clase'  => 'jn-rep--hero',
		'id'     => 'jn-corte',
		'titulo' => 'Descubre JumperNET <em>en 30 segundos</em>',
		'sub'    => 'Así viaja tu tráfico, de principio a fin.',
		'aria'   => 'Corte de 30 segundos del documental El viaje',
		'cinta'  => '▷ 30 s · sonido',
		'nota'   => 'El documental completo, de 7 minutos, está en <a href="#videos">Vídeos</a>.',
	));
}

function jn_bloque_hero_cta() {
	$reg = jn_url_registro();
	return '<div class="jn-hero__cta">'
		. '<p class="jn-hero__lema">Tu conexión <em>no va sola</em>.</p>'
		. '<ul class="jn-ventajas">'
		. '<li><span class="jn-ventajas__icono" aria-hidden="true">↯</span><span><b>Tres saltos</b><small>El camino se reparte; ningún nodo lo ve todo.</small></span></li>'
		. '<li><span class="jn-ventajas__icono" aria-hidden="true">◈</span><span><b>Capas JENC</b><small>Cada salto abre solo la capa que le toca.</small></span></li>'
		. '<li><span class="jn-ventajas__icono" aria-hidden="true">◇</span><span><b>Para aprender</b><small>Simulador, terminal y documentación abierta.</small></span></li>'
		. '</ul>'
		. '<div class="jn-hero__acciones">'
		. '<a class="jn-btn jn-btn--pr" href="' . esc_url($reg) . '">Crear cuenta gratis</a>'
		. '<a class="jn-btn jn-btn--ghost" href="#proyecto">Explorar el proyecto</a>'
		. '</div>'
		. '<a class="jn-hero__cine" href="#videos"><span aria-hidden="true">▶</span> Ver el documental completo · 7 min</a>'
		. '</div>';
}

function jn_bloque_barra() {
	$enlaces = array(
		array('#inicio', 'Inicio'),
		array('#proyecto', 'Proyecto'),
		array('#como-funciona', 'Cómo funciona'),
		array('#laboratorio', 'Laboratorio'),
		array('#videos', 'Vídeos'),
		array('#recursos', 'Recursos'),
		array('#equipo', 'Equipo'),
		array('#preguntas', 'FAQ'),
	);
	$registrado = is_user_logged_in();
	$html = '<span id="inicio" class="jn-ancla-inicio" aria-hidden="true"></span><a class="jn-saltar" href="#inicio">Saltar al contenido</a>'
		. '<div class="jn-barra" data-jn-barra>'
		. '<div class="jn-barra__fila">'
		. '<a class="jn-barra__marca" href="#inicio" aria-label="JumperNET · inicio">'
		. jn_logo_svg('jn-logo--barra')
		. '<span class="jn-barra__nombre">Jumper<b>NET</b><small>red educativa</small></span>'
		. '</a>'
		. '<button type="button" class="jn-barra__burger" data-jn-menu aria-expanded="false" aria-controls="jn-menu-principal" aria-label="Abrir el menú">'
		. '<span aria-hidden="true"></span><span aria-hidden="true"></span><span aria-hidden="true"></span>'
		. '</button>'
		. '<nav class="jn-barra__menu" id="jn-menu-principal" aria-label="Secciones de JumperNET">';
	foreach ($enlaces as $e) {
		$html .= '<a href="' . esc_attr($e[0]) . '" data-jn-nav="' . esc_attr(ltrim($e[0], '#')) . '">' . esc_html($e[1]) . '</a>';
	}
	$html .= '<a class="jn-menu-movil" href="' . esc_url(wp_login_url(home_url('/'))) . '">Acceder</a>'
		. '<a class="jn-menu-movil jn-btn jn-btn--pr" href="' . esc_url(jn_url_registro()) . '">Crear cuenta gratis</a>'
		. '</nav>'
		. '<div class="jn-barra__acciones">'
		. '<button type="button" class="jn-icono-btn" data-jn-tema-btn aria-pressed="false" aria-label="Cambiar a modo oscuro" title="Tema claro / oscuro">'
		. '<span class="jn-icono-btn__tema" aria-hidden="true"></span><span class="jn-visually-hidden">Cambiar de tema</span>'
		. '</button>'
		. '<button type="button" class="jn-icono-btn jn-icono-btn--navidad" data-jn-navidad-btn aria-pressed="false" aria-label="Activar la decoración navideña" title="Decoración navideña">'
		. '<span aria-hidden="true">✦</span><span class="jn-visually-hidden">Decoración navideña</span>'
		. '</button>'
		. ($registrado
			? '<a class="jn-btn jn-btn--mini jn-btn--ghost" href="' . esc_url(admin_url()) . '">Mi panel</a>'
			: '<a class="jn-barra__acceso" href="' . esc_url(wp_login_url(home_url('/'))) . '">Acceder</a>')
		. '<a class="jn-btn jn-btn--mini jn-btn--pr jn-barra__registro" href="' . esc_url(jn_url_registro()) . '">' . ($registrado ? 'Ir al escritorio' : 'Crear cuenta gratis') . '</a>'
		. '</div>'
		. '</div>'
		. '<div class="jn-barra__progreso" aria-hidden="true"><i data-jn-progreso></i></div>'
		. '</div>';
	return $html;
}

function jn_insertar_fin_hero($html, $bloque) {
	$pos = strpos($html, 'jn-hero');
	if ($pos === false) {
		return $html . $bloque;
	}
	$ini = strrpos(substr($html, 0, $pos), '<div');
	if ($ini === false) {
		return $html . $bloque;
	}
	$i = $ini;
	$prof = 0;
	$largo = strlen($html);
	while ($i < $largo) {
		$abre = strpos($html, '<div', $i);
		$cierra = strpos($html, '</div', $i);
		if ($cierra === false) {
			return $html . $bloque;
		}
		if ($abre !== false && $abre < $cierra) {
			$prof++;
			$i = $abre + 4;
		} else {
			$prof--;
			$fin = $cierra;
			$i = $cierra + 6;
			if ($prof === 0) {
				return substr($html, 0, $fin) . $bloque . substr($html, $fin);
			}
		}
	}
	return $html . $bloque;
}

/* ─── inserción de bloques dentro del contenido de la portada ─── */
function jn_insertar_en_hero($html, $bloque) {
	$pos = strpos($html, 'jn-hero');
	if ($pos === false) {
		return $html;
	}
	$fin = strpos($html, '>', $pos);
	if ($fin === false) {
		return $html;
	}
	return substr($html, 0, $fin + 1) . $bloque . substr($html, $fin + 1);
}

function jn_insertar_tras_hero($html, $bloque) {
	$pos = strpos($html, 'jn-hero');
	if ($pos === false) {
		return $html . $bloque;
	}
	$ini = strrpos(substr($html, 0, $pos), '<div');
	if ($ini === false) {
		return $html . $bloque;
	}
	$i = $ini;
	$prof = 0;
	$largo = strlen($html);
	while ($i < $largo) {
		$abre = strpos($html, '<div', $i);
		$cierra = strpos($html, '</div', $i);
		if ($cierra === false) {
			return $html . $bloque;
		}
		if ($abre !== false && $abre < $cierra) {
			$prof++;
			$i = $abre + 4;
		} else {
			$prof--;
			$fin = $cierra + 6;
			$i = $fin;
			if ($prof === 0) {
				return substr($html, 0, $fin) . $bloque . substr($html, $fin);
			}
		}
	}
	return $html . $bloque;
}

/* ─── bienvenida interactiva ─── */
function jn_bloque_bienvenida() {
	if (!is_front_page()) {
		return;
	}
	?>
	<dialog class="jn-welcome" id="jn-bienvenida" data-jn-bienvenida aria-labelledby="jn-welcome-tit">
		<div class="jn-welcome__caja">
			<button type="button" class="jn-welcome__cerrar" data-jn-bienvenida-cerrar aria-label="Cerrar la bienvenida">
				<span aria-hidden="true">×</span>
			</button>
			<div class="jn-welcome__visual" aria-hidden="true">
				<span class="jn-welcome__chip">3 saltos · 1 circuito</span>
				<svg viewBox="0 0 380 320" class="jn-welcome__red" focusable="false">
					<defs>
						<linearGradient id="jn-wg" x1="0" y1="0" x2="1" y2="1">
							<stop offset="0" stop-color="#087f68"/>
							<stop offset=".55" stop-color="#0aa88a"/>
							<stop offset="1" stop-color="#d6a84b"/>
						</linearGradient>
					</defs>
					<g class="jn-welcome__orbita" fill="none" stroke="currentColor" stroke-opacity=".16">
						<ellipse cx="190" cy="164" rx="146" ry="94" transform="rotate(-16 190 164)"/>
						<ellipse cx="190" cy="164" rx="96" ry="132" transform="rotate(34 190 164)"/>
					</g>
					<g class="jn-welcome__trazos" fill="none" stroke="url(#jn-wg)" stroke-width="2.4" stroke-linecap="round">
						<path d="M70 214 C 120 214 120 118 190 118"/>
						<path d="M190 118 C 258 118 250 214 306 214"/>
						<path d="M70 214 C 150 268 258 268 306 214" class="jn-welcome__trazo-suave" stroke-dasharray="4 9"/>
					</g>
					<g class="jn-welcome__nodos">
						<g>
							<circle cx="70" cy="214" r="26" fill="#087f68" fill-opacity=".10"/>
							<circle cx="70" cy="214" r="12" fill="#087f68"/>
							<text x="70" y="252" text-anchor="middle">tú</text>
						</g>
						<g>
							<circle cx="190" cy="118" r="32" fill="#d6a84b" fill-opacity=".14"/>
							<circle cx="190" cy="118" r="15" fill="#d6a84b"/>
							<text x="190" y="88" text-anchor="middle">salto 2</text>
						</g>
						<g>
							<circle cx="306" cy="214" r="26" fill="#ff6347" fill-opacity=".12"/>
							<circle cx="306" cy="214" r="12" fill="#ff6347"/>
							<text x="306" y="252" text-anchor="middle">destino</text>
						</g>
					</g>
					<circle class="jn-welcome__chispa" r="4" fill="#ffffff">
						<animateMotion dur="5.2s" repeatCount="indefinite" path="M70 214 C 120 214 120 118 190 118 C 258 118 250 214 306 214"/>
					</circle>
				</svg>
				<p class="jn-welcome__visual-pie">El paquete no salta solo: recorre un circuito.</p>
			</div>
			<div class="jn-welcome__texto">
				<span class="jn-kicker">bienvenida · primera visita</span>
				<h2 class="jn-welcome__tit" id="jn-welcome-tit">Bienvenido a <em>JumperNET</em></h2>
				<p class="jn-welcome__sub">Tu conexión no va sola. Descubre cómo viajan tus datos a través de tres saltos.</p>
				<ul class="jn-welcome__puntos">
					<li><b>01</b> Un circuito de tres saltos, explicado paso a paso.</li>
					<li><b>02</b> Un paquete que viaja contigo y un simulador interactivo.</li>
					<li><b>03</b> Documentación y terminal educativa, sin ejecutar nada real.</li>
				</ul>
				<div class="jn-welcome__acciones">
					<button type="button" class="jn-btn jn-btn--pr" data-jn-bienvenida-explorar>Explorar JumperNET</button>
					<button type="button" class="jn-btn jn-btn--ghost" data-jn-bienvenida-demo><span aria-hidden="true">▶</span> Ver demostración de 30 segundos</button>
				</div>
				<label class="jn-welcome__check">
					<input type="checkbox" data-jn-bienvenida-off checked>
					<span>No volver a mostrarla</span>
				</label>
				<p class="jn-welcome__pista">Puedes cerrarla con <kbd>Esc</kbd> y recuperarla desde el pie de página.</p>
			</div>
		</div>
	</dialog>
	<?php
}
add_action('wp_footer', 'jn_bloque_bienvenida', 5);

/* ─── controles flotantes fuera de la portada ─── */
add_action('wp_footer', function () {
	if (is_front_page()) {
		return;
	}
	?>
	<div class="jn-fabs" role="group" aria-label="Preferencias del sitio">
		<button type="button" class="jn-fab" data-jn-tema-btn aria-pressed="false" aria-label="Cambiar a modo oscuro">
			<span class="jn-icono-btn__tema" aria-hidden="true"></span><span class="jn-fab__txt">tema</span>
		</button>
		<button type="button" class="jn-fab" data-jn-navidad-btn aria-pressed="false" aria-label="Activar la decoración navideña">
			<span aria-hidden="true">✦</span><span class="jn-fab__txt">navidad</span>
		</button>
	</div>
	<?php
}, 6);

/* ─── progreso de lectura y copiar código ─── */
add_action('wp_footer', function () {
	if (!is_singular()) return;
	?>
	<div id="jn-progreso-lectura" aria-hidden="true"></div>
	<script>
	(function () {
		var barra = document.getElementById('jn-progreso-lectura');
		function pinta() {
			var h = document.documentElement;
			var max = h.scrollHeight - h.clientHeight;
			if (barra) barra.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, h.scrollTop / max) : 0) + ')';
		}
		addEventListener('scroll', pinta, { passive: true });
		pinta();

		document.querySelectorAll('.entry-content pre').forEach(function (pre) {
			if (pre.querySelector('.jn-copiar')) return;
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

/* ─── montaje de la portada ─── */
add_filter('the_content', function ($contenido) {
	static $hecho = false;
	if ($hecho || is_admin() || !is_front_page()) {
		return $contenido;
	}
	$hecho = true;

	$experiencia = jn_bloque_experiencia();

	if (jn_hay_video()) {
		$contenido = jn_insertar_en_hero($contenido, jn_bloque_hero_video());
	}
	$contenido = jn_insertar_fin_hero($contenido, jn_bloque_hero_cta());
	$contenido = jn_insertar_tras_hero($contenido, $experiencia);
	return jn_bloque_barra() . $contenido;
}, 8);

/* ═══════════════════════════════════════════════════════════════════
   EXPERIENCIAS DE LA PORTADA
   Todo es educativo y comprobable: el mapa no afirma ser la topología
   real, la latencia va etiquetada como demostración y el estado remoto
   se declara «sin monitorizar».
   ═══════════════════════════════════════════════════════════════════ */

function jn_simulador($args = array()) {
	$def = array(
		'clase'  => '',
		'nombre' => 'circuito',
		'boton'  => 'Iniciar recorrido',
		'aviso'  => 'Simulación educativa: no se abre ninguna conexión ni se envía tráfico. La latencia es una referencia de demostración, no una medición.',
	);
	$a = array_merge($def, $args);
	$uid = 'jn-sim-' . preg_replace('/[^a-z0-9-]/', '', strtolower($a['nombre']));
	$nodos = array(
		array('Usuario', 'origen', 'Aquí empieza todo: tu navegador elige el destino y entrega la petición al primer salto.', 'el destino y el contenido antes de cifrarse', 'la ruta interna que tomará el paquete', '0 ms'),
		array('Entrada', 'salto 1', 'Recibe el paquete, retira su capa y lo reenvía al nodo intermedio. No necesita saber qué lleva dentro.', 'tu IP, el nodo intermedio y que el paquete va cifrado', 'el destino final y el contenido', '9 ms'),
		array('Nodo intermedio', 'salto 2', 'El tramo que más separa el origen del destino: conoce a sus vecinos, no a los extremos.', 'la entrada y la salida; el paquete cifrado', 'tu IP, el destino y el contenido', '22 ms'),
		array('Salida', 'salto 3', 'Cierra el circuito: recibe del nodo intermedio y entrega en el destino.', 'el nodo intermedio, el destino y el paquete cifrado', 'tu IP y el contenido', '35 ms'),
		array('Internet', 'destino', 'El destino descifra la petición y responde. La respuesta vuelve por el mismo circuito.', 'la petición descifrada y la IP de salida', 'tu IP real y el camino completo', '39 ms'),
	);

	$html = '<div class="jn-sim ' . esc_attr($a['clase']) . '" data-jn-sim data-jn-sim-nombre="' . esc_attr($a['nombre']) . '">'
		. '<div class="jn-sim__tablero">'
		. '<div class="jn-sim__meta">'
		. '<span class="jn-chip jn-chip--estado" data-jn-sim-estado>en espera</span>'
		. '<span class="jn-chip jn-chip--demo" title="Valores ilustrativos, no medidos">latencia demo <b data-jn-sim-latencia>—</b></span>'
		. '<span class="jn-sim__cuenta" data-jn-sim-paso-txt>parada 1 de 5</span>'
		. '</div>'
		. '<div class="jn-sim__pista" data-jn-sim-pista>'
		. '<div class="jn-sim__riel" aria-hidden="true"><i data-jn-sim-progreso></i></div>'
		. '<ol class="jn-sim__nodos">';
	foreach ($nodos as $i => $n) {
		$html .= '<li>'
			. '<button type="button" class="jn-sim__nodo' . ($i === 0 ? ' is-actual' : '') . '" data-jn-salto="' . $i . '" aria-pressed="' . ($i === 0 ? 'true' : 'false') . '" aria-controls="' . esc_attr($uid . '-ficha-' . $i) . '">'
			. '<span class="jn-sim__punto" aria-hidden="true"><i></i></span>'
			. '<b>' . esc_html($n[0]) . '</b><small>' . esc_html($n[1]) . '</small>'
			. '</button></li>';
	}
	$html .= '</ol>'
		. '<span class="jn-sim__paquete" data-jn-sim-paquete aria-hidden="true"><i></i></span>'
		. '</div>'
		. '<div class="jn-sim__fichas" data-jn-sim-ficha aria-live="polite">';
	foreach ($nodos as $i => $n) {
		$html .= '<div class="jn-sim__ficha" id="' . esc_attr($uid . '-ficha-' . $i) . '" data-jn-ficha="' . $i . '"' . ($i === 0 ? '' : ' hidden') . '>'
			. '<span class="jn-sim__ficha-num">' . esc_html(sprintf('%02d', $i)) . '</span>'
			. '<div>'
			. '<h3>' . esc_html($n[0]) . ' <small>' . esc_html($n[1]) . '</small></h3>'
			. '<p>' . esc_html($n[2]) . '</p>'
			. '<dl class="jn-ficha__datos">'
			. '<div><dt>ve</dt><dd>' . esc_html($n[3]) . '</dd></div>'
			. '<div><dt>no ve</dt><dd>' . esc_html($n[4]) . '</dd></div>'
			. '<div><dt>latencia demo</dt><dd>' . esc_html($n[5]) . ' acumulados</dd></div>'
			. '</dl>'
			. '</div>'
			. '</div>';
	}
	$html .= '</div>'
		. '</div>'
		. '<div class="jn-sim__mandos">'
		. '<button type="button" class="jn-btn jn-btn--pr" data-jn-sim-play>' . esc_html($a['boton']) . '</button>'
		. '<button type="button" class="jn-btn" data-jn-sim-paso>siguiente salto</button>'
		. '<button type="button" class="jn-btn jn-btn--ghost" data-jn-sim-reset>reiniciar</button>'
		. '</div>'
		. '<p class="jn-aviso">' . esc_html($a['aviso']) . '</p>'
		. '</div>';
	return $html;
}

function jn_bloque_experiencia() {
	$post   = wp_count_posts('post');
	$page   = wp_count_posts('page');
	$datos  = array(
		'{{POSTS}}'    => esc_html((string) (isset($post->publish) ? (int) $post->publish : 0)),
		'{{PAGES}}'    => esc_html((string) (isset($page->publish) ? (int) $page->publish : 0)),
		'{{MEDIA}}'    => esc_html((string) jn_contar_adjuntos()),
		'{{COMMENTS}}' => esc_html((string) jn_contar_comentarios()),
		'{{TEMA}}'     => esc_html(JN_VERSION),
		'{{FECHA}}'    => esc_html(date_i18n('j M Y · H:i')),
		'{{VIDEO}}'    => jn_hay_video() ? '7:16 disponible' : 'no encontrado',
		'{{SALUDO}}'   => esc_html(jn_saludo_navidad()),
		'{{DOCS}}'     => esc_url(home_url('/docs/')),
		'{{GUIA}}'     => esc_url(home_url('/docs/guia-primeros-pasos/')),
		'{{ARQ}}'      => esc_url(home_url('/docs/arquitectura-completa/')),
		'{{REGISTRO}}' => esc_url(jn_url_registro()),
	);

	$simulador = jn_simulador(array(
		'clase'  => 'jn-sim--principal',
		'nombre' => 'recorrido',
		'boton'  => 'Iniciar recorrido',
	));
	$paquete = jn_simulador(array(
		'clase'  => 'jn-sim--paquete',
		'nombre' => 'paquete',
		'boton'  => 'Enviar paquete',
		'aviso'  => 'El paquete es una animación educativa. No sale de esta página y la latencia mostrada es una referencia de demostración.',
	));

	$videos = jn_hay_video()
		? jn_reproductor(array(
			'clase'  => 'jn-rep--documental',
			'id'     => 'jn-documental',
			'aria'   => 'Documental completo de JumperNET, siete minutos y dieciséis segundos',
			'cinta'  => '▷ documental · 7:16',
			'nota'   => 'Un único archivo, <code>assets/el-viaje.mp4</code>, de 7:15. El corte de 30 s de la portada es su primer tramo: no hay un segundo vídeo distinto.',
		))
		: '<p class="jn-aviso">No se encuentra <code>assets/el-viaje.mp4</code>. La sección de vídeo quedará disponible al subir el archivo.</p>';

	$html = <<<HTML
<div class="jn-exp" id="experiencia">

<section class="jn-sec jn-sec--proyecto" id="proyecto" aria-labelledby="proyecto-tit">
	<header class="jn-sec__cab">
		<span class="jn-kicker"><b>01</b> el proyecto</span>
		<h2 class="jn-sec__tit" id="proyecto-tit">Una red que <em>se puede entender</em></h2>
		<p class="jn-sec__intro">JumperNET es una red educativa de tres saltos. No promete invisibilidad: enseña qué ve cada nodo, qué se cifra y qué cuesta recorrer más camino. Esta web es su documentación viva y su laboratorio.</p>
	</header>
	<div class="jn-pilares">
		<article class="jn-pilar">
			<span class="jn-pilar__icono" aria-hidden="true">↯</span>
			<span class="jn-pilar__num">01</span>
			<h3>Tres saltos, no uno</h3>
			<p>La petición pasa por entrada, nodo intermedio y salida. Ningún intermediario conoce a la vez origen, destino y contenido.</p>
			<a href="#como-funciona">Ver el recorrido →</a>
		</article>
		<article class="jn-pilar">
			<span class="jn-pilar__icono" aria-hidden="true">◈</span>
			<span class="jn-pilar__num">02</span>
			<h3>Cifrado por capas</h3>
			<p>JENC envuelve el paquete por tramos. Cada salto abre su capa y reenvía el resto sin leer lo que transporta.</p>
			<a href="#cifrado">Abrir las capas →</a>
		</article>
		<article class="jn-pilar">
			<span class="jn-pilar__icono" aria-hidden="true">◇</span>
			<span class="jn-pilar__num">03</span>
			<h3>Educación abierta</h3>
			<p>Documentación, simulador, comparador y terminal educativa. Sin métricas inventadas: lo que es una demostración, se etiqueta como tal.</p>
			<a href="#recursos">Entrar al centro de aprendizaje →</a>
		</article>
	</div>
	<aside class="jn-cita">
		<p>«La privacidad no es que nadie vea nada. Es que <em>nadie lo ve todo</em>.»</p>
		<span>principio de diseño · JumperNET</span>
	</aside>
</section>

<section class="jn-sec jn-sec--sim" id="como-funciona" aria-labelledby="sim-tit">
	<header class="jn-sec__cab">
		<span class="jn-kicker"><b>02</b> cómo funciona</span>
		<h2 class="jn-sec__tit" id="sim-tit">Explora el recorrido <em>de tu conexión</em></h2>
		<p class="jn-sec__intro">Descubre qué sucede cuando tus datos atraviesan tres nodos antes de llegar a Internet. Toca un nodo para leer su ficha o inicia el recorrido y sigue el paquete.</p>
	</header>
	{$simulador}
</section>

<section class="jn-sec jn-sec--videos" id="videos" aria-labelledby="videos-tit">
	<span id="el-viaje" class="jn-ancla" aria-hidden="true"></span>
	<header class="jn-sec__cab">
		<span class="jn-kicker"><b>03</b> vídeos</span>
		<h2 class="jn-sec__tit" id="videos-tit">Conoce JumperNET <em>en profundidad</em></h2>
		<p class="jn-sec__intro">Una demostración completa de nuestro proyecto, su funcionamiento y su tecnología.</p>
	</header>
	<div class="jn-videos">
		{$videos}
		<div class="jn-videos__lado">
			<article class="jn-video-card">
				<span class="jn-video-card__tag">corte · 30 s</span>
				<h3>La versión corta</h3>
				<p>El primer tramo del documental resume el viaje: origen, tres saltos y respuesta. Es el vídeo de la portada.</p>
				<a class="jn-btn jn-btn--mini jn-btn--ghost" href="#inicio" data-jn-rep-ir><span aria-hidden="true">▶</span> Reproducir el corte</a>
			</article>
			<div class="jn-videos__nota">
				<b>Sin capítulos inventados</b>
				<p>Los capítulos del documental se añadirán cuando su contenido esté revisado. Preferimos no etiquetar tramos que no hemos podido verificar.</p>
			</div>
			<a class="jn-videos__siguiente" href="#laboratorio">Continuar en el laboratorio →</a>
		</div>
	</div>
</section>

<section class="jn-sec jn-sec--lab" id="laboratorio" aria-labelledby="lab-tit">
	<header class="jn-sec__cab">
		<span class="jn-kicker"><b>04</b> laboratorio</span>
		<h2 class="jn-sec__tit" id="lab-tit">Prueba, compara <em>y entiende</em></h2>
		<p class="jn-sec__intro">Cinco formas de mirar la misma red: un paquete que viaja, un comparador honesto, una topología abstracta, una terminal segura y el estado real de esta instalación.</p>
	</header>

	<div class="jn-lab">
		<article class="jn-lab__bloque" id="paquete" aria-labelledby="paquete-tit">
			<div class="jn-lab__cab">
				<span class="jn-lab__num">4.1</span>
				<div>
					<h3 id="paquete-tit">El viaje de un paquete</h3>
					<p>Pulsa «Enviar paquete» y sigue cada salto. Cada parada explica qué información tiene el nodo y cuál no.</p>
				</div>
			</div>
			{$paquete}
		</article>

		<article class="jn-lab__bloque" id="comparar" aria-labelledby="comparar-tit">
			<div class="jn-lab__cab">
				<span class="jn-lab__num">4.2</span>
				<div>
					<h3 id="comparar-tit">Comparador de conexiones</h3>
					<p>Directa, con proxy o con tres saltos. La diferencia no es solo privacidad: también cambia la latencia y en quién confías.</p>
				</div>
			</div>
			<div class="jn-comp" data-jn-comp data-activo="saltos">
				<div class="jn-comp__conmutador" role="group" aria-label="Resaltar una conexión">
					<button type="button" data-jn-comp-btn="directa" aria-pressed="false">conexión directa</button>
					<button type="button" data-jn-comp-btn="proxy" aria-pressed="false">proxy simple</button>
					<button type="button" data-jn-comp-btn="saltos" aria-pressed="true">tres saltos</button>
				</div>
				<div class="jn-comp__tarjetas">
					<article class="jn-comp__tarjeta" data-jn-comp-card="directa">
						<span class="jn-comp__tag">un solo tramo</span>
						<h4>Directa</h4>
						<svg viewBox="0 0 260 70" class="jn-comp__dibujo" aria-hidden="true"><path d="M18 48 H242" stroke="currentColor" stroke-width="2" stroke-dasharray="6 5"/><circle cx="18" cy="48" r="8" class="n-a"/><circle cx="242" cy="48" r="8" class="n-b"/></svg>
						<ul>
							<li>El destino ve tu IP real.</li>
							<li>Tu operador ve el destino.</li>
							<li>Menor latencia y ninguna confianza delegada.</li>
						</ul>
					</article>
					<article class="jn-comp__tarjeta" data-jn-comp-card="proxy">
						<span class="jn-comp__tag">un intermediario</span>
						<h4>Proxy</h4>
						<svg viewBox="0 0 260 70" class="jn-comp__dibujo" aria-hidden="true"><path d="M18 48 H120 M140 48 H242" stroke="currentColor" stroke-width="2"/><circle cx="18" cy="48" r="7" class="n-a"/><circle cx="130" cy="48" r="11" class="n-p"/><circle cx="242" cy="48" r="7" class="n-b"/></svg>
						<ul>
							<li>El destino ve la IP del proxy.</li>
							<li>El proxy ve a la vez origen y destino.</li>
							<li>Un único punto concentra la información.</li>
						</ul>
					</article>
					<article class="jn-comp__tarjeta" data-jn-comp-card="saltos">
						<span class="jn-comp__tag">circuito JumperNET</span>
						<h4>Tres saltos</h4>
						<svg viewBox="0 0 260 70" class="jn-comp__dibujo" aria-hidden="true"><path d="M18 48 L85 22 L160 52 L242 26" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="18" cy="48" r="7" class="n-a"/><circle cx="85" cy="22" r="6" class="n-b"/><circle cx="160" cy="52" r="6" class="n-c"/><circle cx="242" cy="26" r="8" class="n-p"/></svg>
						<ul>
							<li>El destino ve la IP de la salida.</li>
							<li>Ningún salto ve origen, destino y contenido a la vez.</li>
							<li>Más tramos: más latencia, confianza repartida.</li>
						</ul>
					</article>
				</div>
				<div class="jn-tabla-envoltura">
					<table class="jn-tabla">
						<caption class="jn-visually-hidden">Comparación cualitativa entre conexión directa, proxy simple y tres saltos</caption>
						<thead><tr><th scope="col">criterio</th><th scope="col">directa</th><th scope="col">proxy</th><th scope="col">tres saltos</th></tr></thead>
						<tbody>
							<tr><th scope="row">tu IP</th><td>la ve el destino</td><td>la ve el proxy</td><td>la ve la entrada</td></tr>
							<tr><th scope="row">destino</th><td>lo ve tu operador</td><td>lo ve el proxy</td><td>lo ve la salida</td></tr>
							<tr><th scope="row">contenido</th><td>según el cifrado de la web</td><td>según el cifrado de la web</td><td>por capas entre saltos (JENC)</td></tr>
							<tr><th scope="row">latencia</th><td>la menor</td><td>intermedia</td><td>la mayor</td></tr>
							<tr><th scope="row">confianza</th><td>en un solo camino</td><td>en un solo intermediario</td><td>repartida entre nodos</td></tr>
						</tbody>
					</table>
				</div>
				<p class="jn-aviso">Comparación cualitativa. No son medidas de rendimiento de esta instalación.</p>
			</div>
		</article>

		<article class="jn-lab__bloque" id="topologia" aria-labelledby="topo-tit">
			<div class="jn-lab__cab">
				<span class="jn-lab__num">4.3</span>
				<div>
					<h3 id="topo-tit">Topología de la red</h3>
					<p>Una arquitectura abstracta, no un mapa geográfico. Toca cada nodo para ver su papel; las ubicaciones no se inventan.</p>
				</div>
			</div>
			<div class="jn-topo" data-jn-topo>
				<div class="jn-topo__lienzo">
					<svg viewBox="0 0 760 400" role="group" aria-label="Topología abstracta de JumperNET">
						<g class="jn-topo__trama" aria-hidden="true">
							<path d="M40 70 Q 220 140 400 60 T 730 110"/>
							<path d="M30 340 Q 240 280 430 330 T 740 300"/>
							<circle cx="60" cy="120" r="2.5"/><circle cx="700" cy="340" r="2.5"/>
							<circle cx="380" cy="34" r="2.5"/><circle cx="470" cy="366" r="2.5"/>
						</g>
						<g class="jn-topo__enlaces" aria-hidden="true">
							<path d="M78 214 L196 116"/>
							<path d="M196 116 L330 222"/>
							<path d="M330 222 L470 108"/>
							<path d="M470 108 L588 218"/>
							<path d="M588 218 L700 124"/>
							<path class="jn-topo__vuelta" d="M700 124 Q 420 350 78 214"/>
						</g>
						<g class="jn-topo__flujos" aria-hidden="true">
							<path d="M78 214 L196 116"/><path d="M196 116 L330 222"/><path d="M330 222 L470 108"/><path d="M470 108 L588 218"/><path d="M588 218 L700 124"/>
						</g>
						<g class="jn-topo__nodo is-activo" data-jn-topo-nodo="tu" tabindex="0" role="button" aria-label="Tú, el origen" aria-pressed="true">
							<circle class="halo" cx="78" cy="214" r="34"/><circle class="punto" cx="78" cy="214" r="14"/><text x="78" y="264">tú</text>
						</g>
						<g class="jn-topo__nodo" data-jn-topo-nodo="entrada" tabindex="0" role="button" aria-label="Nodo de entrada" aria-pressed="false">
							<circle class="halo" cx="196" cy="116" r="32"/><circle class="punto" cx="196" cy="116" r="13"/><text x="196" y="80">entrada</text>
						</g>
						<g class="jn-topo__nodo" data-jn-topo-nodo="a" tabindex="0" role="button" aria-label="Nodo intermedio A" aria-pressed="false">
							<circle class="halo" cx="330" cy="222" r="32"/><circle class="punto" cx="330" cy="222" r="13"/><text x="330" y="272">nodo A</text>
						</g>
						<g class="jn-topo__nodo" data-jn-topo-nodo="b" tabindex="0" role="button" aria-label="Nodo intermedio B" aria-pressed="false">
							<circle class="halo" cx="470" cy="108" r="32"/><circle class="punto" cx="470" cy="108" r="13"/><text x="470" y="72">nodo B</text>
						</g>
						<g class="jn-topo__nodo" data-jn-topo-nodo="salida" tabindex="0" role="button" aria-label="Nodo de salida" aria-pressed="false">
							<circle class="halo" cx="588" cy="218" r="32"/><circle class="punto" cx="588" cy="218" r="13"/><text x="588" y="268">salida</text>
						</g>
						<g class="jn-topo__nodo" data-jn-topo-nodo="internet" tabindex="0" role="button" aria-label="Destino en Internet" aria-pressed="false">
							<circle class="halo" cx="700" cy="124" r="32"/><circle class="punto" cx="700" cy="124" r="13"/><text x="700" y="88">internet</text>
						</g>
					</svg>
				</div>
				<aside class="jn-topo__ficha" data-jn-topo-ficha aria-live="polite">
					<div data-jn-topo-vista="tu">
						<span class="jn-kicker">origen</span><h4>Tú</h4>
						<p>Entregas la petición al circuito. Conoces el destino y el contenido; desconoces la ruta interna.</p>
						<dl class="jn-ficha__datos"><div><dt>vecino</dt><dd>nodo de entrada</dd></div><div><dt>no ve</dt><dd>los nodos intermedios ni la salida</dd></div></dl>
					</div>
					<div data-jn-topo-vista="entrada" hidden>
						<span class="jn-kicker">salto 1</span><h4>Entrada</h4>
						<p>Primer punto del circuito. Recibe de ti y decide el siguiente tramo; no conoce el destino final.</p>
						<dl class="jn-ficha__datos"><div><dt>vecinos</dt><dd>tú y nodo A</dd></div><div><dt>no ve</dt><dd>destino y contenido</dd></div></dl>
					</div>
					<div data-jn-topo-vista="a" hidden>
						<span class="jn-kicker">salto 2</span><h4>Nodo A</h4>
						<p>Nodo intermedio de la topología de ejemplo. Solo conoce a sus dos vecinos directos.</p>
						<dl class="jn-ficha__datos"><div><dt>vecinos</dt><dd>entrada y nodo B</dd></div><div><dt>no ve</dt><dd>origen real y destino</dd></div></dl>
					</div>
					<div data-jn-topo-vista="b" hidden>
						<span class="jn-kicker">alternativa</span><h4>Nodo B</h4>
						<p>Ruta alternativa del mismo circuito. Su existencia ilustra que la red puede reconstruirse si un tramo falla.</p>
						<dl class="jn-ficha__datos"><div><dt>vecinos</dt><dd>nodo A y salida</dd></div><div><dt>no ve</dt><dd>tu IP y el contenido</dd></div></dl>
					</div>
					<div data-jn-topo-vista="salida" hidden>
						<span class="jn-kicker">salto 3</span><h4>Salida</h4>
						<p>Último punto del circuito antes del destino. Entrega el paquete y recibe la respuesta.</p>
						<dl class="jn-ficha__datos"><div><dt>vecinos</dt><dd>nodo B e internet</dd></div><div><dt>no ve</dt><dd>tu IP y el contenido</dd></div></dl>
					</div>
					<div data-jn-topo-vista="internet" hidden>
						<span class="jn-kicker">destino</span><h4>Internet</h4>
						<p>El sitio al que quieres llegar. Ve la petición y la IP de la salida, no la tuya.</p>
						<dl class="jn-ficha__datos"><div><dt>vecino</dt><dd>nodo de salida</dd></div><div><dt>no ve</dt><dd>tu origen ni el camino</dd></div></dl>
					</div>
				</aside>
			</div>
			<p class="jn-aviso">Topología abstracta de demostración. No representa ubicaciones geográficas ni el estado de nodos reales.</p>
		</article>

		<article class="jn-lab__bloque" id="terminal" aria-labelledby="terminal-tit">
			<div class="jn-lab__cab">
				<span class="jn-lab__num">4.4</span>
				<div>
					<h3 id="terminal-tit">Terminal educativa</h3>
					<p>Comandos reales de SOCKS5, explicados sin ejecutar nada en el servidor. Todo ocurre en tu navegador.</p>
				</div>
			</div>
			<div class="jn-term" data-jn-term>
				<div class="jn-term__barra" aria-hidden="true"><i></i><i></i><i></i><span>consola educativa · simulada</span></div>
				<div class="jn-term__salida" data-jn-term-salida aria-live="polite">
					<p class="jn-term__bienvenida">JumperNET · consola educativa
Escribe «help» para ver los comandos disponibles.
Nada de lo que escribas sale de tu navegador.</p>
				</div>
				<form class="jn-term__linea" data-jn-term-form>
					<label class="jn-visually-hidden" for="jn-term-input">Comando</label>
					<span aria-hidden="true">$</span>
					<input id="jn-term-input" data-jn-term-input type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="help">
					<button type="submit">ejecutar</button>
				</form>
				<div class="jn-term__sugerencias" data-jn-term-sugerencias>
					<span>prueba:</span>
					<button type="button" data-jn-term-chip="help">help</button>
					<button type="button" data-jn-term-chip="curl --socks5-hostname 127.0.0.1:1080 https://ejemplo.test">curl</button>
					<button type="button" data-jn-term-chip="ssh -D 1080 usuario@servidor.test">ssh -D</button>
					<button type="button" data-jn-term-chip="resolver ejemplo.test">resolver</button>
					<button type="button" data-jn-term-chip="jumpernet estado">estado</button>
					<button type="button" data-jn-term-chip="clear">clear</button>
				</div>
			</div>
			<p class="jn-aviso">La salida es ilustrativa: no se ejecuta un comando real ni se contacta con ningún servidor.</p>
		</article>

		<article class="jn-lab__bloque" id="estado" aria-labelledby="estado-tit">
			<div class="jn-lab__cab">
				<span class="jn-lab__num">4.5</span>
				<div>
					<h3 id="estado-tit">Estado del sistema</h3>
					<p>Datos reales de esta instalación de WordPress, separados de lo que es una demostración.</p>
				</div>
			</div>
			<div class="jn-estado" data-jn-estado>
				<div class="jn-estado__grupo">
					<h4><span class="jn-punto jn-punto--ok" aria-hidden="true"></span> Sitio · datos reales</h4>
					<div class="jn-estado__rejilla">
						<div class="jn-estado__dato"><span>entradas publicadas</span><b>{{POSTS}}</b></div>
						<div class="jn-estado__dato"><span>páginas</span><b>{{PAGES}}</b></div>
						<div class="jn-estado__dato"><span>archivos</span><b>{{MEDIA}}</b></div>
						<div class="jn-estado__dato"><span>comentarios</span><b>{{COMMENTS}}</b></div>
						<div class="jn-estado__dato"><span>tema activo</span><b>v{{TEMA}}</b></div>
						<div class="jn-estado__dato"><span>vídeo</span><b>{{VIDEO}}</b></div>
						<div class="jn-estado__dato"><span>modo</span><b data-jn-modo>claro</b></div>
						<div class="jn-estado__dato"><span>generado</span><b class="jn-estado__fecha">{{FECHA}}</b></div>
					</div>
				</div>
				<div class="jn-estado__grupo jn-estado__grupo--demo">
					<h4><span class="jn-punto jn-punto--demo" aria-hidden="true"></span> Red · demostración</h4>
					<ul class="jn-estado__lista">
						<li><span>circuito de tres saltos</span><b class="jn-chip jn-chip--demo">demo</b></li>
						<li><span>nodos disponibles</span><b>sin monitorizar</b></li>
						<li><span>latencia del circuito</span><b>no medida</b></li>
						<li><span>actividad del sistema</span><b>solo esta web</b></li>
					</ul>
					<p>No hay una fuente de datos de la red conectada. Por eso no mostramos nodos «en línea» ni latencias que no existen.</p>
				</div>
			</div>
			<p class="jn-aviso">Instantánea del sitio generada al cargar la página. La red descrita en la documentación no se monitoriza desde aquí.</p>
		</article>

		<article class="jn-lab__bloque" id="cifrado" aria-labelledby="cifrado-tit">
			<div class="jn-lab__cab">
				<span class="jn-lab__num">4.6</span>
				<div>
					<h3 id="cifrado-tit">Qué ve cada salto</h3>
					<p>El contenido y el camino se protegen por capas. Elige un punto del circuito y comprueba qué se ve desde ahí.</p>
				</div>
			</div>
			<div class="jn-cif" data-jn-cif data-vista="tu">
				<div class="jn-cif__tabs" role="tablist" aria-label="Punto de vista">
					<button type="button" role="tab" id="jn-cif-tab-tu" aria-controls="jn-cif-panel-tu" aria-selected="true" data-vista-btn="tu">tú</button>
					<button type="button" role="tab" id="jn-cif-tab-entrada" aria-controls="jn-cif-panel-entrada" aria-selected="false" tabindex="-1" data-vista-btn="entrada">entrada</button>
					<button type="button" role="tab" id="jn-cif-tab-intermedio" aria-controls="jn-cif-panel-intermedio" aria-selected="false" tabindex="-1" data-vista-btn="intermedio">intermedio</button>
					<button type="button" role="tab" id="jn-cif-tab-salida" aria-controls="jn-cif-panel-salida" aria-selected="false" tabindex="-1" data-vista-btn="salida">salida</button>
					<button type="button" role="tab" id="jn-cif-tab-destino" aria-controls="jn-cif-panel-destino" aria-selected="false" tabindex="-1" data-vista-btn="destino">destino</button>
				</div>
				<div class="jn-cif__panel">
					<div class="jn-cif__sobre" aria-hidden="true">
						<div class="jn-cif__capa jn-cif__capa--1"><span>destino</span></div>
						<div class="jn-cif__capa jn-cif__capa--2"><span>siguiente salto</span></div>
						<div class="jn-cif__capa jn-cif__capa--3"><span>contenido</span><b>JENC</b></div>
					</div>
					<div class="jn-cif__fichas">
						<div class="jn-cif__ficha" id="jn-cif-panel-tu" role="tabpanel" aria-labelledby="jn-cif-tab-tu" tabindex="0" data-vista="tu">
							<span class="jn-kicker">punto de vista · origen</span><h4>Tú</h4>
							<p>Conoces el destino y el contenido. Lo que no ves es el camino que tomará por dentro.</p>
							<dl class="jn-ficha__datos"><div><dt>visible</dt><dd>destino final; contenido sin cifrar</dd></div><div><dt>oculto</dt><dd>la ruta interna entre saltos</dd></div></dl>
						</div>
						<div class="jn-cif__ficha" id="jn-cif-panel-entrada" role="tabpanel" aria-labelledby="jn-cif-tab-entrada" tabindex="0" data-vista="entrada" hidden>
							<span class="jn-kicker">punto de vista · entrada</span><h4>Entrada</h4>
							<p>Tu dirección y el siguiente salto. El contenido sigue cerrado y el destino final no aparece.</p>
							<dl class="jn-ficha__datos"><div><dt>visible</dt><dd>tu IP; nodo intermedio; sobre cifrado</dd></div><div><dt>oculto</dt><dd>destino final; contenido</dd></div></dl>
						</div>
						<div class="jn-cif__ficha" id="jn-cif-panel-intermedio" role="tabpanel" aria-labelledby="jn-cif-tab-intermedio" tabindex="0" data-vista="intermedio" hidden>
							<span class="jn-kicker">punto de vista · intermedio</span><h4>Nodo intermedio</h4>
							<p>El tramo intermedio. Solo conoce a sus vecinos; no sabe quién empezó ni quién recibe.</p>
							<dl class="jn-ficha__datos"><div><dt>visible</dt><dd>entrada; salida; sobre cifrado</dd></div><div><dt>oculto</dt><dd>tu IP; destino; contenido</dd></div></dl>
						</div>
						<div class="jn-cif__ficha" id="jn-cif-panel-salida" role="tabpanel" aria-labelledby="jn-cif-tab-salida" tabindex="0" data-vista="salida" hidden>
							<span class="jn-kicker">punto de vista · salida</span><h4>Salida</h4>
							<p>El último tramo. Sabe a quién entregar y de dónde viene el paquete; el contenido no se abre aquí.</p>
							<dl class="jn-ficha__datos"><div><dt>visible</dt><dd>intermedio; destino; sobre cifrado</dd></div><div><dt>oculto</dt><dd>tu IP; contenido</dd></div></dl>
						</div>
						<div class="jn-cif__ficha" id="jn-cif-panel-destino" role="tabpanel" aria-labelledby="jn-cif-tab-destino" tabindex="0" data-vista="destino" hidden>
							<span class="jn-kicker">punto de vista · destino</span><h4>Destino</h4>
							<p>Recibe la petición descifrada. Ve la IP de la salida, no la tuya ni el camino completo.</p>
							<dl class="jn-ficha__datos"><div><dt>visible</dt><dd>contenido; IP de salida</dd></div><div><dt>oculto</dt><dd>tu IP real; la ruta completa</dd></div></dl>
						</div>
					</div>
				</div>
				<p class="jn-aviso">Modelo educativo simplificado de JENC, el cifrado por capas de JumperNET.</p>
			</div>
		</article>
	</div>
</section>

<section class="jn-sec jn-sec--recursos" id="recursos" aria-labelledby="recursos-tit">
	<header class="jn-sec__cab">
		<span class="jn-kicker"><b>05</b> recursos</span>
		<h2 class="jn-sec__tit" id="recursos-tit">Centro de <em>aprendizaje</em></h2>
		<p class="jn-sec__intro">Ocho ideas para leer la red sin humo: qué es un proxy, qué revela una IP, qué cuesta la latencia y en qué se diferencia esto de una VPN.</p>
	</header>

	<div class="jn-aprender">
		<details class="jn-tema" open>
			<summary><span class="jn-tema__icono" aria-hidden="true">⇄</span><b>Proxy SOCKS5</b><small>protocolo</small></summary>
			<div class="jn-tema__cuerpo">
				<p>Un proxy acepta la conexión de una aplicación y la reenvía al destino. SOCKS5 trabaja en la capa de transporte: puede transportar TCP y UDP sin interpretar el protocolo de aplicación.</p>
				<div class="jn-demo"><code>curl --socks5-hostname 127.0.0.1:1080 https://ejemplo.test</code><span>La resolución DNS la hace el proxy, no tu equipo.</span></div>
			</div>
		</details>
		<details class="jn-tema">
			<summary><span class="jn-tema__icono" aria-hidden="true">#</span><b>Direcciones IP</b><small>identidad de red</small></summary>
			<div class="jn-tema__cuerpo">
				<p>Una IP identifica una interfaz en una red. No es tu nombre, pero puede asociarse a un contrato o a una sesión. Cambiar de salida cambia la IP que ve el destino, no todas las demás señales.</p>
				<div class="jn-demo"><code>origen → salto 1 → salto 2 → salto 3 → destino</code><span>El destino ve la IP de salida.</span></div>
			</div>
		</details>
		<details class="jn-tema">
			<summary><span class="jn-tema__icono" aria-hidden="true">◉</span><b>Nodos y saltos</b><small>arquitectura</small></summary>
			<div class="jn-tema__cuerpo">
				<p>Un nodo es cualquier equipo que participa en el circuito. En JumperNET hay tres saltos por defecto: entrada, intermedio y salida. Cada uno conoce lo mínimo para reenviar.</p>
				<div class="jn-demo"><code>1 + 1 + 1 = tres tramos</code><span>Más saltos no siempre significa más privacidad: importa quién opera cada nodo.</span></div>
			</div>
		</details>
		<details class="jn-tema">
			<summary><span class="jn-tema__icono" aria-hidden="true">◈</span><b>Cifrado por capas</b><small>JENC</small></summary>
			<div class="jn-tema__cuerpo">
				<p>El paquete se envuelve en capas. Cada salto retira la suya y reenvía el resto. Nadie en el camino tiene a la vez el contenido y el mapa completo.</p>
				<div class="jn-demo"><code>capa 1 · capa 2 · contenido</code><span>Cada salto ve su capa, no el contenido final.</span></div>
			</div>
		</details>
		<details class="jn-tema">
			<summary><span class="jn-tema__icono" aria-hidden="true">◷</span><b>Latencia</b><small>tiempo de ida y vuelta</small></summary>
			<div class="jn-tema__cuerpo">
				<p>Es el tiempo que tarda una respuesta en volver. Más saltos suele añadir latencia, pero también influyen la distancia, la congestión y la calidad de cada tramo. No existe un valor universal.</p>
				<div class="jn-demo"><code>ida + proceso + vuelta</code><span>En el simulador, la latencia está marcada como demostración.</span></div>
			</div>
		</details>
		<details class="jn-tema">
			<summary><span class="jn-tema__icono" aria-hidden="true">◐</span><b>Privacidad</b><small>qué se reparte</small></summary>
			<div class="jn-tema__cuerpo">
				<p>La privacidad es reducir lo que una sola parte puede saber. Repartir el camino ayuda con la correlación, pero no borra los metadatos ni el hecho de que hay tráfico.</p>
				<div class="jn-demo"><code>nadie lo ve todo</code><span>No es lo mismo que invisibilidad.</span></div>
			</div>
		</details>
		<details class="jn-tema">
			<summary><span class="jn-tema__icono" aria-hidden="true">⛨</span><b>Proxy frente a VPN</b><small>diferencias</small></summary>
			<div class="jn-tema__cuerpo">
				<p>Un proxy suele cubrir una aplicación o una configuración concreta. Una VPN encapsula todo el tráfico del dispositivo. Ninguna de las dos es mágica: ambas desplazan en quién confías.</p>
				<div class="jn-demo"><code>proxy = aplicación / VPN = dispositivo</code><span>Simplificación útil para empezar.</span></div>
			</div>
		</details>
		<details class="jn-tema">
			<summary><span class="jn-tema__icono" aria-hidden="true">⌗</span><b>Arquitectura de red</b><small>de un vistazo</small></summary>
			<div class="jn-tema__cuerpo">
				<p>Origen, entrada, intermedio, salida y destino. La respuesta vuelve por el mismo circuito. La documentación técnica detalla cifrado, descubrimiento de nodos y recuperación ante fallos.</p>
				<a class="jn-tema__enlace" href="{{DOCS}}">Leer la arquitectura completa →</a>
			</div>
		</details>
	</div>

	<div class="jn-quiz" data-jn-quiz>
		<div class="jn-quiz__cab">
			<span class="jn-kicker">comprueba lo aprendido</span>
			<h3>Un cuestionario de tres preguntas</h3>
			<p>Sin registro y sin trampa. Si fallas, la explicación aparece al momento.</p>
		</div>
		<div class="jn-quiz__caja">
			<div class="jn-quiz__top">
				<span class="jn-quiz__paso" data-jn-quiz-paso>pregunta 1 de 3</span>
				<span class="jn-quiz__marcador" data-jn-quiz-marcador>0 aciertos</span>
			</div>
			<p class="jn-quiz__preg" data-jn-quiz-preg>¿Quién ve tu IP real en un circuito de tres saltos?</p>
			<div class="jn-quiz__opciones" data-jn-quiz-opciones></div>
			<p class="jn-quiz__fb" data-jn-quiz-fb aria-live="polite"></p>
			<div class="jn-quiz__mandos">
				<button type="button" class="jn-btn jn-btn--mini" data-jn-quiz-next disabled>siguiente</button>
				<button type="button" class="jn-btn jn-btn--mini jn-btn--ghost" data-jn-quiz-reset>volver a empezar</button>
			</div>
			<noscript><p class="jn-aviso">El cuestionario necesita JavaScript. Las tarjetas de aprendizaje de arriba funcionan sin él.</p></noscript>
		</div>
	</div>

	<div class="jn-glos" data-jn-glos>
		<div class="jn-glos__cab">
			<h3>Glosario de bolsillo</h3>
			<p>Diez palabras para seguir la documentación sin frenarte.</p>
		</div>
		<div class="jn-glos__filtro">
			<label class="jn-visually-hidden" for="jn-glos-buscar">Buscar un término</label>
			<input id="jn-glos-buscar" data-jn-glos-buscar type="search" placeholder="filtrar: cifrado, salto, DNS…">
			<span data-jn-glos-cuenta>10 términos</span>
		</div>
		<div class="jn-glos__lista">
			<details class="jn-glos__item"><summary><b>salto</b><span>relay</span></summary><p>Nodo que recibe un paquete y lo reenvía al siguiente punto del circuito. En JumperNET hay tres por defecto.</p></details>
			<details class="jn-glos__item"><summary><b>SOCKS5</b><span>protocolo</span></summary><p>Permite que una aplicación entregue su conexión a un proxy sin hablar directamente con el destino.</p></details>
			<details class="jn-glos__item"><summary><b>JENC</b><span>cifrado del proyecto</span></summary><p>Cifrado por capas: cada salto abre únicamente la capa que le corresponde y desconoce el resto.</p></details>
			<details class="jn-glos__item"><summary><b>paquete</b><span>unidad de datos</span></summary><p>Bloque pequeño de información que viaja por la red. Los paquetes no llevan el vídeo entero: se reparten.</p></details>
			<details class="jn-glos__item"><summary><b>nodo</b><span>punto del circuito</span></summary><p>Cualquier equipo que participa: tu origen, un salto o el destino. Cada nodo tiene un papel distinto.</p></details>
			<details class="jn-glos__item"><summary><b>metadatos</b><span>lo que rodea al contenido</span></summary><p>Origen, destino, hora o tamaño. Aunque el contenido vaya cifrado, parte de los metadatos sigue siendo visible.</p></details>
			<details class="jn-glos__item"><summary><b>DNS</b><span>nombres → direcciones</span></summary><p>Traduce un nombre como <code>ejemplo.test</code> a una dirección IP. Resolverlo por el proxy evita fugas.</p></details>
			<details class="jn-glos__item"><summary><b>túnel</b><span>conexión encapsulada</span></summary><p>Una conexión dentro de otra. El túnel transporta el tráfico sin que el camino intermedio lo interprete.</p></details>
			<details class="jn-glos__item"><summary><b>latencia</b><span>tiempo de ida y vuelta</span></summary><p>Lo que tarda una respuesta en volver. Más saltos suele significar más latencia, aunque depende de la ruta.</p></details>
			<details class="jn-glos__item"><summary><b>extremo a extremo</b><span>cifrado</span></summary><p>Solo el origen y el destino pueden abrir el contenido. Los intermediarios lo transportan sin leerlo.</p></details>
		</div>
	</div>

	<div class="jn-recursos__enlaces">
		<a class="jn-recurso-enlace" href="{{GUIA}}"><b>Guía de primeros pasos</b><span>Configura un cliente SOCKS5 sin perderte.</span><i aria-hidden="true">→</i></a>
		<a class="jn-recurso-enlace" href="{{DOCS}}"><b>Documentación completa</b><span>Arquitectura, seguridad, referencia y operación.</span><i aria-hidden="true">→</i></a>
	</div>
</section>

<section class="jn-sec jn-sec--equipo" id="equipo" aria-labelledby="equipo-tit">
	<header class="jn-sec__cab">
		<span class="jn-kicker"><b>06</b> equipo</span>
		<h2 class="jn-sec__tit" id="equipo-tit">Un proyecto <em>hecho por partes</em></h2>
		<p class="jn-sec__intro">JumperNET combina diseño de producto, desarrollo front-end y trabajo de red. Preferimos hablar de responsabilidades reales antes que inventar retratos y cargos.</p>
	</header>
	<div class="jn-equipo">
		<article class="jn-persona">
			<span class="jn-persona__avatar" aria-hidden="true">UX</span>
			<h3>Producto y experiencia</h3>
			<p>Estructura, accesibilidad, jerarquía visual y el recorrido de aprendizaje: que la red se entienda sin perder rigor.</p>
			<span class="jn-persona__rol">diseño · contenido</span>
		</article>
		<article class="jn-persona">
			<span class="jn-persona__avatar" aria-hidden="true">FE</span>
			<h3>Front-end y movimiento</h3>
			<p>Implementación del tema, simulador, reproductores, temas claro/oscuro y animaciones que respetan <code>prefers-reduced-motion</code>.</p>
			<span class="jn-persona__rol">desarrollo · rendimiento</span>
		</article>
		<article class="jn-persona">
			<span class="jn-persona__avatar" aria-hidden="true">NET</span>
			<h3>Redes y documentación</h3>
			<p>Modelo de tres saltos, cifrado JENC, protocolos y la documentación técnica que sostiene cada explicación.</p>
			<span class="jn-persona__rol">arquitectura · docs</span>
		</article>
	</div>
	<div class="jn-bitacora">
		<div class="jn-bitacora__cab">
			<h3>Novedades del proyecto</h3>
			<p>Lo que cambia en esta web, con nombre y fecha.</p>
		</div>
		<ol>
			<li><b>v{{TEMA}}</b><span>Portada luminosa con reproductor propio, bienvenida interactiva, cabecera flotante, simulador rediseñado, laboratorio y Navidad independiente.</span><em>esta versión</em></li>
			<li><b>v2.1.0</b><span>Fondo de red, cabecera compacta, índice de experiencias y reproductor con portada.</span></li>
			<li><b>v2.0.0</b><span>Modo claro/oscuro, portada editorial y primeras experiencias educativas.</span></li>
			<li><b>v1.2.0</b><span>Intro cinematográfica, vídeo «El viaje» y panel propio.</span></li>
		</ol>
	</div>
	<aside class="jn-equipo__cta">
		<div><b>¿Quieres seguir el proyecto?</b><span>La documentación es la fuente principal; el código y el contenido se mantienen abiertos.</span></div>
		<a class="jn-btn jn-btn--pr" href="{{REGISTRO}}">Crear cuenta gratis</a>
	</aside>
</section>

<section class="jn-sec jn-sec--faq" id="preguntas" aria-labelledby="faq-tit">
	<header class="jn-sec__cab">
		<span class="jn-kicker"><b>07</b> preguntas</span>
		<h2 class="jn-sec__tit" id="faq-tit">Lo que <em>suele preguntarse</em></h2>
		<p class="jn-sec__intro">Respuestas cortas. Si necesitas el detalle, la documentación está a un clic.</p>
	</header>
	<div class="jn-faq">
		<details class="jn-faq__item" open><summary>¿JumperNET guarda mi tráfico?</summary><p>Esta web es la documentación del proyecto: no opera la red ni recibe tu tráfico. Lo que hace el circuito real se describe en la documentación técnica.</p></details>
		<details class="jn-faq__item"><summary>¿Cuántos saltos usa el circuito?</summary><p>Tres por defecto. El origen conoce el primero, el primero al segundo y así hasta el destino; cada tramo sabe lo mínimo.</p></details>
		<details class="jn-faq__item"><summary>¿Puedo usar el navegador sin la extensión?</summary><p>Sí. La extensión facilita el día a día, pero un cliente SOCKS5 configurado a mano también puede usar el circuito.</p></details>
		<details class="jn-faq__item"><summary>¿Qué pasa si un salto falla?</summary><p>El circuito se reconstruye con otro nodo disponible. La guía de problemas y soluciones explica cómo detectarlo.</p></details>
		<details class="jn-faq__item"><summary>¿El cifrado oculta que me conecto?</summary><p>Oculta el contenido y reparte el camino, pero no vuelve invisible el hecho de que hay tráfico. Ningún sistema serio promete eso.</p></details>
		<details class="jn-faq__item"><summary>¿Por dónde empiezo?</summary><p>Por la guía de primeros pasos y, si quieres el contexto, por «Qué es JumperNET y por qué existe».</p></details>
	</div>
</section>

<section class="jn-sec jn-sec--navidad" id="navidad" aria-labelledby="navidad-tit">
	<div class="jn-nav">
		<div class="jn-nav__arbol" aria-hidden="true">
			<svg viewBox="0 0 320 320">
				<g class="jn-nav__ramas">
					<path d="M55 250 L80 205 M105 250 L80 205 M105 250 L130 205 M155 250 L130 205 M155 250 L180 205 M205 250 L180 205 M205 250 L230 205 M255 250 L230 205"/>
					<path d="M80 205 L105 160 M130 205 L105 160 M130 205 L155 160 M180 205 L155 160 M180 205 L205 160 M230 205 L205 160"/>
					<path d="M105 160 L130 115 M155 160 L130 115 M155 160 L180 115 M205 160 L180 115"/>
					<path d="M130 115 L155 78 M180 115 L155 78"/>
					<path class="jn-nav__tronco" d="M155 250 L155 300"/>
				</g>
				<g class="jn-nav__nodos">
					<circle cx="55" cy="250" r="6"/><circle cx="105" cy="250" r="6"/><circle cx="155" cy="250" r="6"/><circle cx="205" cy="250" r="6"/><circle cx="255" cy="250" r="6"/>
					<circle cx="80" cy="205" r="6"/><circle cx="130" cy="205" r="6"/><circle cx="180" cy="205" r="6"/><circle cx="230" cy="205" r="6"/>
					<circle cx="105" cy="160" r="6"/><circle cx="155" cy="160" r="6"/><circle cx="205" cy="160" r="6"/>
					<circle cx="130" cy="115" r="6"/><circle cx="180" cy="115" r="6"/>
					<circle class="jn-nav__corona" cx="155" cy="78" r="7"/>
				</g>
				<path class="jn-nav__estrella" d="M160 20 l6 15 16 2 -12 11 3 16 -13 -9 -13 9 3 -16 -12 -11 16 -2z"/>
			</svg>
		</div>
		<div class="jn-nav__texto">
			<span class="jn-kicker">temporada · luces y nodos</span>
			<h2 class="jn-sec__tit" id="navidad-tit">Un árbol hecho <em>de nodos</em></h2>
			<p>Cada luz es una conexión y cada rama un tramo. La red no se apaga en fiestas: solo cambia de ambiente. La nieve, las estrellas y las guirnaldas se pueden desactivar sin tocar el tema claro u oscuro.</p>
			<p class="jn-nav__saludo">{{SALUDO}}</p>
			<div class="jn-nav__acciones">
				<button type="button" class="jn-btn jn-btn--mini" data-jn-navidad-btn aria-pressed="false" aria-label="Activar la decoración navideña"><span aria-hidden="true">✦</span> Decoración navideña</button>
				<a class="jn-btn jn-btn--mini jn-btn--ghost" href="#inicio">Volver arriba</a>
			</div>
			<span class="jn-nav__firma">desde la documentación de JumperNET</span>
		</div>
	</div>
</section>

<section class="jn-pie-exp" aria-label="Cierre de la portada">
	<div class="jn-pie-exp__marca">
		<svg viewBox="0 0 44 44" width="40" height="40" aria-hidden="true"><path d="M7 31 L15.5 21.5 L23 26.5 L37 10.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="7" cy="31" r="3.4" fill="#087f68"/><circle cx="15.5" cy="21.5" r="2.4" fill="#d6a84b"/><circle cx="23" cy="26.5" r="2.4" fill="#ff6347"/><circle cx="37" cy="10.5" r="3.8" fill="#087f68"/></svg>
		<p><b>JumperNET</b><span>Una conexión no va sola. Tres saltos, tres capas, una explicación.</span></p>
	</div>
	<div class="jn-pie-exp__acciones">
		<button type="button" class="jn-btn jn-btn--mini jn-btn--ghost" data-jn-bienvenida-abrir>↺ Volver a ver la bienvenida</button>
		<a class="jn-pie-exp__docs" href="{{DOCS}}">documentación completa →</a>
	</div>
</section>

</div>
HTML;

	return str_replace(array_keys($datos), array_values($datos), $html);
}
/* ═══════════════════════════════════════════════════════════════════
   PANEL AL INICIAR SESIÓN
   ═══════════════════════════════════════════════════════════════════ */

function jn_contar_adjuntos() {
	$total = 0;
	foreach ((array) wp_count_attachments() as $estado) {
		if (isset($estado->count)) {
			$total += (int) $estado->count;
		}
	}
	return $total;
}

function jn_contar_comentarios() {
	$c = wp_count_comments();
	return (int) $c->approved + (int) $c->moderated + (int) $c->spam;
}

function jn_acciones_rapidas() {
	$acciones = array();
	if (current_user_can('edit_posts')) {
		$acciones[] = array('✎', 'Nueva entrada', admin_url('post-new.php'), 'Escribe un artículo de la documentación');
	}
	if (current_user_can('edit_pages')) {
		$acciones[] = array('▤', 'Nueva página', admin_url('post-new.php?post_type=page'), 'Añade una página nueva al sitio');
	}
	if (current_user_can('upload_files')) {
		$acciones[] = array('⇪', 'Subir archivo', admin_url('media-new.php'), 'Imágenes, capturas y vídeos');
	}
	if (current_user_can('moderate_comments')) {
		$acciones[] = array('✉', 'Comentarios', admin_url('edit-comments.php'), 'Revisa lo que llega');
	}
	if (current_user_can('edit_theme_options')) {
		$acciones[] = array('◈', 'Personalizar', admin_url('customize.php'), 'Colores, cabecera y menús');
		$acciones[] = array('≡', 'Menús', admin_url('nav-menus.php'), 'Estructura de navegación');
	}
	if (current_user_can('manage_options')) {
		$acciones[] = array('⚙', 'Ajustes', admin_url('options-general.php'), 'Opciones generales del sitio');
	}
	$acciones[] = array('▶', 'Ver el documental', home_url('/#videos'), 'La sección de vídeos');
	$acciones[] = array('⌂', 'Ver la web', home_url('/'), 'Abre el sitio publicado');
	return $acciones;
}

/* widget del escritorio */
add_action('wp_dashboard_setup', function () {
	if (!current_user_can('edit_posts')) return;
	wp_add_dashboard_widget('jn_panel', 'JumperNET · panel rápido', 'jn_panel_widget');
});

function jn_panel_widget() {
	$post     = wp_count_posts('post');
	$page     = wp_count_posts('page');
	$usuarios = count_users();
	$fichas   = array(
		array(isset($post->publish) ? (int) $post->publish : 0, 'entradas'),
		array(isset($page->publish) ? (int) $page->publish : 0, 'páginas'),
		array(jn_contar_adjuntos(), 'archivos'),
		array(jn_contar_comentarios(), 'comentarios'),
		array(current_user_can('list_users') ? (int) $usuarios['total_users'] : '—', 'usuarios'),
	);
	?>
	<div class="jn-panel">
		<div class="jn-panel__cab">
			<span class="jn-panel__logo" aria-hidden="true">↯</span>
			<div class="jn-panel__marca">
				<b>JumperNET</b>
				<span>documentación · v<?php echo esc_html(JN_VERSION); ?></span>
			</div>
			<span class="jn-panel__estado"><i></i>en línea</span>
		</div>

		<div class="jn-panel__stats">
			<?php foreach ($fichas as $ficha) : ?>
				<div class="jn-panel__stat">
					<b><?php echo esc_html((string) $ficha[0]); ?></b>
					<span><?php echo esc_html($ficha[1]); ?></span>
				</div>
			<?php endforeach; ?>
		</div>

		<h3 class="jn-panel__tit">Qué quieres hacer</h3>
		<div class="jn-panel__acciones">
			<?php foreach (jn_acciones_rapidas() as $accion) : ?>
				<a class="jn-panel__accion" href="<?php echo esc_url($accion[2]); ?>">
					<span class="jn-panel__icono" aria-hidden="true"><?php echo esc_html($accion[0]); ?></span>
					<b><?php echo esc_html($accion[1]); ?></b>
					<small><?php echo esc_html($accion[3]); ?></small>
				</a>
			<?php endforeach; ?>
		</div>

		<?php
		$recientes = get_posts(array(
			'numberposts' => 5,
			'post_type'   => 'post',
			'post_status' => array('publish', 'draft', 'pending', 'private'),
		));
		if ($recientes) :
			?>
			<h3 class="jn-panel__tit">Últimos documentos</h3>
			<ul class="jn-panel__lista">
				<?php foreach ($recientes as $doc) :
					$estado = ($doc->post_status === 'publish') ? 'publicado' : $doc->post_status;
					?>
					<li>
						<a href="<?php echo esc_url(get_edit_post_link($doc->ID)); ?>"><?php echo esc_html(get_the_title($doc) ?: '(sin título)'); ?></a>
						<span class="jn-panel__meta"><?php echo esc_html($estado); ?> · <?php echo esc_html(get_the_date('j M', $doc)); ?></span>
					</li>
				<?php endforeach; ?>
			</ul>
		<?php endif; ?>

		<p class="jn-panel__pie">
			<a href="<?php echo esc_url(admin_url('admin.php?page=jumpernet')); ?>">Abrir el panel completo →</a>
		</p>
	</div>
	<?php
}

/* menú propio */
add_action('admin_menu', function () {
	add_menu_page('JumperNET', 'JumperNET', 'edit_posts', 'jumpernet', 'jn_pagina_admin', 'dashicons-superhero', 3);
});

function jn_pagina_admin() {
	if (!current_user_can('edit_posts')) return;

	$post     = wp_count_posts('post');
	$page     = wp_count_posts('page');
	$usuarios = count_users();
	$documentos = get_posts(array(
		'numberposts' => 30,
		'post_type'   => 'post',
		'post_status' => array('publish', 'draft', 'pending', 'private'),
	));
	?>
	<div class="wrap jn-adm">
		<div class="jn-adm-cab">
			<span class="jn-adm-marca" aria-hidden="true">↯</span>
			<div>
				<h1>JumperNET · panel</h1>
				<p>Hola<?php echo esc_html(wp_get_current_user()->display_name ? ', ' . wp_get_current_user()->display_name : ''); ?>. Todo lo que puedes hacer desde aquí.</p>
			</div>
			<div class="jn-adm-cab__acciones">
				<a class="jn-btn jn-btn--prin" href="<?php echo esc_url(home_url('/')); ?>" target="_blank" rel="noopener">ver la web ↗</a>
				<a class="jn-btn jn-btn--fant" href="<?php echo esc_url(home_url('/#el-viaje')); ?>" target="_blank" rel="noopener">▶ el viaje</a>
			</div>
		</div>

		<div class="jn-adm-stats">
			<div class="jn-adm-stat"><b><?php echo esc_html((string) (isset($post->publish) ? $post->publish : 0)); ?></b><span>entradas publicadas</span></div>
			<div class="jn-adm-stat"><b><?php echo esc_html((string) (isset($page->publish) ? $page->publish : 0)); ?></b><span>páginas</span></div>
			<div class="jn-adm-stat"><b><?php echo esc_html((string) jn_contar_adjuntos()); ?></b><span>archivos</span></div>
			<div class="jn-adm-stat"><b><?php echo esc_html((string) jn_contar_comentarios()); ?></b><span>comentarios</span></div>
			<div class="jn-adm-stat"><b><?php echo esc_html(current_user_can('list_users') ? (string) $usuarios['total_users'] : '—'); ?></b><span>usuarios</span></div>
			<div class="jn-adm-stat jn-adm-stat--ver"><b>v<?php echo esc_html(JN_VERSION); ?></b><span>tema activo</span></div>
		</div>

		<h2 class="jn-adm-tit">Accesos rápidos</h2>
		<div class="jn-adm-grid">
			<?php foreach (jn_acciones_rapidas() as $accion) : ?>
				<a class="jn-adm-card" href="<?php echo esc_url($accion[2]); ?>">
					<span class="jn-adm-card__icono" aria-hidden="true"><?php echo esc_html($accion[0]); ?></span>
					<b><?php echo esc_html($accion[1]); ?></b>
					<small><?php echo esc_html($accion[3]); ?></small>
				</a>
			<?php endforeach; ?>
		</div>

		<div class="jn-adm-cols">
			<div class="jn-adm-caja">
				<h2 class="jn-adm-tit">Documentos</h2>
				<?php if ($documentos) : ?>
					<table class="jn-adm-tabla">
						<thead>
							<tr><th>Título</th><th>Estado</th><th>Fecha</th><th></th></tr>
						</thead>
						<tbody>
							<?php foreach ($documentos as $doc) : ?>
								<tr>
									<td><a href="<?php echo esc_url(get_edit_post_link($doc->ID)); ?>"><?php echo esc_html(get_the_title($doc) ?: '(sin título)'); ?></a></td>
									<td><span class="jn-adm-chip"><?php echo esc_html($doc->post_status === 'publish' ? 'publicado' : $doc->post_status); ?></span></td>
									<td><?php echo esc_html(get_the_date('j M Y', $doc)); ?></td>
									<td class="jn-adm-tabla__acc">
										<a href="<?php echo esc_url(get_edit_post_link($doc->ID)); ?>">editar</a>
										<a href="<?php echo esc_url(get_permalink($doc)); ?>" target="_blank" rel="noopener">ver ↗</a>
									</td>
								</tr>
							<?php endforeach; ?>
						</tbody>
					</table>
				<?php else : ?>
					<p class="jn-adm-vacio">Todavía no hay documentos. <a href="<?php echo esc_url(admin_url('post-new.php')); ?>">Escribe el primero</a>.</p>
				<?php endif; ?>
			</div>

			<div class="jn-adm-caja">
				<h2 class="jn-adm-tit">El viaje</h2>
				<?php if (jn_hay_video()) : ?>
					<video class="jn-adm-video" src="<?php echo esc_url(jn_asset_uri('el-viaje.mp4')); ?>" controls preload="metadata" playsinline></video>
					<p class="jn-adm-nota">7:16. La portada ofrece un corte de 30 s con sonido bajo demanda; el documental completo está en «Vídeos». Hay un único archivo de vídeo: el corte es su primer tramo.</p>
					<p class="jn-adm-nota"><a href="<?php echo esc_url(home_url('/#el-viaje')); ?>" target="_blank" rel="noopener">Abrir en la portada ↗</a></p>
				<?php else : ?>
					<p class="jn-adm-vacio">No se encuentra <code>assets/el-viaje.mp4</code>.</p>
				<?php endif; ?>

				<h2 class="jn-adm-tit">Notas de la versión</h2>
				<ul class="jn-adm-lista">
					<li><b>v3.0.0</b> · portada luminosa con reproductor propio, bienvenida interactiva, cabecera flotante, simulador rediseñado, laboratorio, centro de aprendizaje y Navidad independiente.</li>
					<li><b>v2.1.0</b> · fondo de red visible en ambos modos, cabecera compacta, índice de experiencias con sección activa, reproductor con portada y controles educativos en mapa, simulador y terminal.</li>
					<li><b>v2.0.0</b> · sistema claro/oscuro, fondo de red, portada editorial y experiencias interactivas (mapa, viaje del paquete, cifrado, comparador, terminal, glosario y FAQ).</li>
					<li><b>v1.3.0</b> · vídeo arriba a la derecha del título y película completa de 7 min en la portada, portada más ancha y renovada.</li>
					<li><b>v1.2.0</b> · vídeo «El viaje», portada cinematográfica, fondo animado, cabecera y logo nuevos, panel de inicio.</li>
					<li><b>v1.1.0</b> · paleta coral/violeta, lectura más cómoda y copia rápida de código.</li>
				</ul>
			</div>
		</div>
	</div>
	<?php
}

/* barra de administración */
add_action('admin_bar_menu', function ($bar) {
	if (!is_admin_bar_showing() && !is_admin()) return;

	$bar->add_node(array(
		'id'    => 'jn-crear',
		'title' => '＋ crear',
		'href'  => current_user_can('edit_posts') ? admin_url('post-new.php') : admin_url(),
		'meta'  => array('title' => 'Crear contenido'),
	));
	$hijos = array(
		'jn-crear-entrada' => array('edit_posts', 'Entrada', 'post-new.php'),
		'jn-crear-pagina'  => array('edit_pages', 'Página', 'post-new.php?post_type=page'),
		'jn-crear-medio'   => array('upload_files', 'Archivo', 'media-new.php'),
		'jn-crear-usuario' => array('create_users', 'Usuario', 'user-new.php'),
	);
	foreach ($hijos as $id => $hijo) {
		if (!current_user_can($hijo[0])) continue;
		$bar->add_node(array(
			'id'     => $id,
			'parent' => 'jn-crear',
			'title'  => $hijo[1],
			'href'   => admin_url($hijo[2]),
		));
	}
	if (current_user_can('edit_posts')) {
		$bar->add_node(array(
			'id'    => 'jn-panel',
			'title' => '↯ JumperNET',
			'href'  => admin_url('admin.php?page=jumpernet'),
		));
	}
	$bar->add_node(array(
		'id'    => 'jn-viaje',
		'title' => '▶ vídeos',
		'href'  => home_url('/#videos'),
	));
}, 40);

/* pie del panel */
add_filter('admin_footer_text', function () {
	return 'JumperNET · documentación interna · <span style="color:#7fe0c8">v' . esc_html(JN_VERSION) . '</span>';
});
add_filter('update_footer', function () {
	return 'hecho con ♥ para la red';
}, 11);

/* estilos del panel */
add_action('admin_head', function () {
	?>
	<style>
		#wpadminbar{background:#0d0a14!important}
		#wpadminbar .ab-item,#wpadminbar a.ab-item,#wpadminbar #wp-toolbar span.ab-label{color:#ece4f0!important}
		#wpadminbar .ab-top-menu>li:hover>.ab-item,#wpadminbar .ab-top-menu>li.hover>.ab-item{background:#1b1526!important;color:#fff!important}
		#wpadminbar #wp-admin-bar-jn-crear>.ab-item{background:linear-gradient(135deg,#ff8a63,#ff5a36)!important;color:#241007!important;font-weight:700}
		#wpadminbar #wp-admin-bar-jn-viaje>.ab-item{color:#ffb09a!important}

		.jn-panel{font-size:13px}
		.jn-panel__cab{display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:14px;background:radial-gradient(420px 160px at 92% -40%,rgba(255,90,54,.28),transparent 66%),linear-gradient(180deg,#191323,#0f0c15);border:1px solid #2b2436;margin:0 0 14px}
		.jn-panel__logo{display:grid;place-items:center;width:36px;height:36px;border-radius:11px;font-size:18px;font-weight:800;color:#1b0a04;background:linear-gradient(145deg,#ffb59a,#ff5a36 55%,#b06aff)}
		.jn-panel__marca b{display:block;color:#fff;font-size:15px;letter-spacing:.02em}
		.jn-panel__marca span{color:#a99fae;font-size:11px;font-family:ui-monospace,Consolas,monospace}
		.jn-panel__estado{margin-left:auto;display:inline-flex;align-items:center;gap:6px;font-family:ui-monospace,Consolas,monospace;font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:#9ff5df;border:1px solid rgba(51,214,192,.4);background:rgba(51,214,192,.1);border-radius:999px;padding:3px 10px}
		.jn-panel__estado i{width:6px;height:6px;border-radius:50%;background:#33d6c0;box-shadow:0 0 0 3px rgba(51,214,192,.18)}
		.jn-panel__stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(78px,1fr));gap:8px;margin-bottom:16px}
		.jn-panel__stat{border:1px solid #2b2436;border-radius:11px;padding:9px 11px;background:rgba(255,255,255,.02);text-align:center}
		.jn-panel__stat b{display:block;font-size:19px;color:#ffb09a;font-family:ui-monospace,Consolas,monospace;line-height:1.2}
		.jn-panel__stat span{font-size:10.5px;color:#a99fae}
		.jn-panel__tit{margin:16px 0 9px!important;font-size:11px!important;letter-spacing:.16em;text-transform:uppercase;color:#a99fae!important;font-family:ui-monospace,Consolas,monospace}
		.jn-panel__acciones{display:grid;grid-template-columns:repeat(auto-fit,minmax(148px,1fr));gap:8px}
		.jn-panel__accion{display:grid;gap:1px;padding:10px 12px;border:1px solid #2b2436;border-radius:11px;background:#0e0b13;text-decoration:none;transition:border-color .2s ease,transform .2s ease,background .2s ease}
		.jn-panel__accion:hover{transform:translateY(-2px);border-color:rgba(255,90,54,.55);background:#14101b}
		.jn-panel__icono{color:#ff8a63;font-size:13px;line-height:1}
		.jn-panel__accion b{color:#f7f1e8;font-size:12.5px;font-weight:600}
		.jn-panel__accion small{color:#8f8598;font-size:10.5px;line-height:1.35}
		.jn-panel__lista{margin:0;padding:0;list-style:none}
		.jn-panel__lista li{display:flex;justify-content:space-between;gap:10px;padding:7px 2px;border-bottom:1px solid #221b2c;font-size:12.5px}
		.jn-panel__lista li:last-child{border-bottom:0}
		.jn-panel__lista a{color:#ffb09a;text-decoration:none}
		.jn-panel__lista a:hover{color:#ffd0c0}
		.jn-panel__meta{color:#8f8598;font-family:ui-monospace,Consolas,monospace;font-size:10px;white-space:nowrap}
		.jn-panel__pie{margin:14px 0 0!important}
		.jn-panel__pie a{font-family:ui-monospace,Consolas,monospace;font-size:11.5px;color:#ff8a63;text-decoration:none}
		#jn_panel .inside{background:#0b0910;color:#d9d0dd}

		.jn-adm{max-width:1180px;color:#d9d0dd}
		.jn-adm-cab{display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin:18px 0 20px;padding:20px 22px;border-radius:18px;background:radial-gradient(620px 220px at 92% -40%,rgba(255,90,54,.26),transparent 66%),radial-gradient(420px 200px at 4% 120%,rgba(139,123,255,.22),transparent 60%),linear-gradient(180deg,#191323,#0f0c15);border:1px solid #2b2436;box-shadow:0 26px 60px -46px #000}
		.jn-adm-marca{display:grid;place-items:center;width:46px;height:46px;border-radius:14px;font-size:22px;font-weight:800;color:#1b0a04;background:linear-gradient(145deg,#ffb59a,#ff5a36 55%,#b06aff);box-shadow:0 14px 30px -14px rgba(255,90,54,.9)}
		.jn-adm-cab h1{margin:0;font-size:20px;color:#fff}
		.jn-adm-cab p{margin:2px 0 0;color:#a99fae;font-size:12.5px}
		.jn-adm-cab__acciones{margin-left:auto;display:flex;gap:8px;flex-wrap:wrap}
		.jn-btn{display:inline-flex;align-items:center;gap:6px;border-radius:10px;padding:9px 15px;font-size:12.5px;font-weight:600;text-decoration:none;border:1px solid transparent;transition:filter .2s ease,transform .2s ease}
		.jn-btn:hover{transform:translateY(-1px)}
		.jn-btn--prin{background:linear-gradient(135deg,#ffb59a,#ff5a36 60%,#e2491f);color:#241007!important}
		.jn-btn--fant{background:rgba(255,255,255,.05);border-color:#2b2436;color:#f0e8f2!important}
		.jn-adm-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:26px}
		.jn-adm-stat{padding:14px 16px;border:1px solid #2b2436;border-radius:14px;background:linear-gradient(180deg,#15111d,#0d0b12)}
		.jn-adm-stat b{display:block;font-size:24px;line-height:1.1;color:#ffb09a;font-family:ui-monospace,Consolas,monospace}
		.jn-adm-stat span{font-size:11px;color:#a99fae}
		.jn-adm-stat--ver b{color:#c9c2ff}
		.jn-adm-tit{margin:0 0 12px!important;font-size:12px!important;letter-spacing:.18em;text-transform:uppercase;color:#a99fae!important;font-family:ui-monospace,Consolas,monospace}
		.jn-adm-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px;margin-bottom:28px}
		.jn-adm-card{display:grid;gap:2px;padding:15px 17px;border:1px solid #2b2436;border-radius:14px;background:linear-gradient(180deg,#14101b,#0d0b12);text-decoration:none;transition:transform .2s ease,border-color .2s ease,box-shadow .2s ease}
		.jn-adm-card:hover{transform:translateY(-3px);border-color:rgba(255,90,54,.55);box-shadow:0 18px 40px -28px rgba(255,90,54,.6)}
		.jn-adm-card__icono{color:#ff8a63;font-size:15px;line-height:1.2}
		.jn-adm-card b{color:#f7f1e8;font-size:13.5px}
		.jn-adm-card small{color:#8f8598;font-size:11px;line-height:1.4}
		.jn-adm-cols{display:grid;grid-template-columns:1.6fr 1fr;gap:16px;align-items:start}
		.jn-adm-caja{padding:18px 20px;border:1px solid #2b2436;border-radius:16px;background:linear-gradient(180deg,#12101a,#0b0910)}
		.jn-adm-tabla{width:100%;border-collapse:collapse;font-size:12.5px}
		.jn-adm-tabla th{text-align:left;font-family:ui-monospace,Consolas,monospace;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#8f8598;padding:6px 8px;border-bottom:1px solid #2b2436}
		.jn-adm-tabla td{padding:9px 8px;border-bottom:1px solid #201a29;color:#d9d0dd;vertical-align:middle}
		.jn-adm-tabla tr:last-child td{border-bottom:0}
		.jn-adm-tabla a{color:#ffb09a;text-decoration:none}
		.jn-adm-tabla__acc{text-align:right;white-space:nowrap}
		.jn-adm-tabla__acc a{margin-left:10px;font-family:ui-monospace,Consolas,monospace;font-size:11px}
		.jn-adm-chip{display:inline-block;font-family:ui-monospace,Consolas,monospace;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#9ff5df;border:1px solid rgba(51,214,192,.35);background:rgba(51,214,192,.1);border-radius:999px;padding:2px 8px}
		.jn-adm-video{width:100%;border-radius:12px;border:1px solid #2b2436;display:block;margin-bottom:10px;background:#08060d}
		.jn-adm-nota{color:#a99fae;font-size:11.5px;margin:0 0 8px}
		.jn-adm-nota a{color:#ff8a63;text-decoration:none}
		.jn-adm-lista{margin:0;padding-left:16px;color:#b7acb8;font-size:12px;line-height:1.6}
		.jn-adm-lista b{color:#fff}
		.jn-adm-vacio{color:#8f8598;font-size:12.5px}
		@media (max-width:960px){.jn-adm-cols{grid-template-columns:1fr}}
	</style>
	<?php
});
