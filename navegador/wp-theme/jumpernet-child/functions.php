<?php
/*
 * JumperNET Docs 2.0 — tema hijo de Twenty Twenty-Four.
 *
 * El WordPress de /docs/ es la documentación, no la portada del producto:
 * un índice lateral con las 13 guías, buscador instantáneo, tabla de
 * contenidos, progreso de lectura, modo claro/oscuro y navegación anterior
 * / siguiente. Todo el contenido sigue viviendo en las entradas de WordPress.
 */

/* ─────────────────────────── catálogo ─────────────────────────── */

function jn_docs_catalogo() {
	return array(
		'que-es-jumpernet' => array(
			'bloque' => 'fundamentos',
			'desc'   => 'La idea, las tres caras de la red y la filosofía «IP a la vista, no promesas».',
		),
		'arquitectura-completa' => array(
			'bloque' => 'fundamentos',
			'desc'   => 'Cada contenedor, cada puerto y el flujo byte a byte de una petición real.',
		),
		'seguridad' => array(
			'bloque' => 'fundamentos',
			'desc'   => 'Qué se guarda, qué se cifra, qué se bloquea, límites, rate limiting y roles.',
		),
		'cifrado-de-los-saltos-jenc' => array(
			'bloque' => 'fundamentos',
			'desc'   => 'ChaCha20-Poly1305 en capas, negociación automática y HTTP plano.',
		),
		'guia-primeros-pasos' => array(
			'bloque' => 'practica',
			'desc'   => 'Cuenta, panel, SOCKS5/HTTP, extensión y navegador, paso a paso.',
		),
		'navegador-jumpernet' => array(
			'bloque' => 'practica',
			'desc'   => 'Chromium dedicado, chip PROXY, self-heal y el fix del «corte a medias».',
		),
		'extension-del-navegador' => array(
			'bloque' => 'practica',
			'desc'   => 'El vigía anti-secuestro, sus bugs y su solución.',
		),
		'nodos-externos-fase9' => array(
			'bloque' => 'practica',
			'desc'   => 'Tu equipo como salto real: peer_u*, sondeo TCP y modo «externos».',
		),
		'agente-binario-y-tunel-9008' => array(
			'bloque' => 'practica',
			'desc'   => 'JumperNET-Agent.exe: TOKEN, frames TUNNEL/DIAL/OPEN/DATA y tu equipo como exit.',
		),
		'problemas-y-soluciones' => array(
			'bloque' => 'operacion',
			'desc'   => 'El diario de incidencias reales, con causa de raíz y remedio.',
		),
		'referencia-api' => array(
			'bloque' => 'operacion',
			'desc'   => 'Todos los endpoints, parámetros, códigos y ejemplos curl.',
		),
		'despliegue-y-operacion' => array(
			'bloque' => 'operacion',
			'desc'   => 'docker-compose, Caddy, el WordPress de docs, artefactos y backups.',
		),
		'changelog' => array(
			'bloque' => 'operacion',
			'desc'   => 'Qué se cambió, cuándo y qué prueba lo demuestra.',
		),
	);
}

function jn_docs_bloques() {
	return array(
		'fundamentos' => array( '01', 'Fundamentos', 'La red, por dentro y sin adornos.' ),
		'practica'    => array( '02', 'Manos a la obra', 'De cero a navegar por el circuito.' ),
		'operacion'   => array( '03', 'Operación', 'API, despliegue y lo que falló de verdad.' ),
	);
}

/* Devuelve las guías publicadas en el orden del catálogo. */
function jn_docs_guias() {
	static $guias = null;
	if ( null !== $guias ) {
		return $guias;
	}

	$catalogo = jn_docs_catalogo();
	$consulta = new WP_Query( array(
		'post_type'           => 'post',
		'post_status'         => 'publish',
		'posts_per_page'      => 100,
		'orderby'             => 'date',
		'order'               => 'ASC',
		'no_found_rows'       => true,
		'ignore_sticky_posts' => true,
	) );

	$por_slug = array();
	foreach ( $consulta->posts as $entrada ) {
		$por_slug[ $entrada->post_name ] = $entrada;
	}

	$guias = array();
	$n     = 0;
	foreach ( $catalogo as $slug => $meta ) {
		if ( ! isset( $por_slug[ $slug ] ) ) {
			continue;
		}
		$entrada = $por_slug[ $slug ];
		$n++;
		$guias[] = array(
			'n'       => $n,
			'slug'    => $slug,
			'titulo'  => get_the_title( $entrada ),
			'desc'    => $meta['desc'],
			'bloque'  => $meta['bloque'],
			'url'     => get_permalink( $entrada ),
			'id'      => $entrada->ID,
			'fecha'   => get_the_date( 'j \d\e F \d\e Y', $entrada ),
			'minutos' => jn_docs_minutos( $entrada->post_content ),
		);
	}

	/* cualquier entrada nueva que no esté en el catálogo, al final */
	foreach ( $consulta->posts as $entrada ) {
		if ( isset( $catalogo[ $entrada->post_name ] ) ) {
			continue;
		}
		$n++;
		$guias[] = array(
			'n'       => $n,
			'slug'    => $entrada->post_name,
			'titulo'  => get_the_title( $entrada ),
			'desc'    => wp_trim_words( wp_strip_all_tags( $entrada->post_content ), 18 ),
			'bloque'  => 'operacion',
			'url'     => get_permalink( $entrada ),
			'id'      => $entrada->ID,
			'fecha'   => get_the_date( 'j \d\e F \d\e Y', $entrada ),
			'minutos' => jn_docs_minutos( $entrada->post_content ),
		);
	}

	return $guias;
}

function jn_docs_minutos( $html ) {
	$palabras = str_word_count( wp_strip_all_tags( $html ) );
	return max( 1, (int) ceil( $palabras / 220 ) );
}

function jn_docs_guia( $slug ) {
	foreach ( jn_docs_guias() as $guia ) {
		if ( $guia['slug'] === $slug ) {
			return $guia;
		}
	}
	return null;
}

/* ─────────────────────────── assets ─────────────────────────── */

add_action( 'after_setup_theme', function () {
	add_theme_support( 'title-tag' );
	add_theme_support( 'html5', array( 'search-form', 'gallery', 'caption', 'style', 'script' ) );
} );

add_action( 'wp_enqueue_scripts', function () {
	if ( is_admin() ) {
		return;
	}
	$version = wp_get_theme()->get( 'Version' );
	wp_enqueue_style( 'jumpernet-docs', get_stylesheet_uri(), array(), $version );
	wp_enqueue_script( 'jumpernet-docs', get_stylesheet_directory_uri() . '/assets/docs.js', array(), $version, true );

	$indice = array();
	foreach ( jn_docs_guias() as $guia ) {
		$entrada = get_post( $guia['id'] );
		$texto   = $entrada ? preg_replace( '/\s+/u', ' ', wp_strip_all_tags( strip_shortcodes( $entrada->post_content ) ) ) : '';
		$texto   = function_exists( 'mb_substr' ) ? mb_substr( $texto, 0, 3200 ) : substr( $texto, 0, 3200 );
		$indice[] = array(
			't' => $guia['titulo'],
			'd' => $guia['desc'],
			'u' => $guia['url'],
			'n' => $guia['n'],
			'x' => $texto,
		);
	}
	wp_add_inline_script( 'jumpernet-docs', 'window.JN_INDICE=' . wp_json_encode( $indice, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP ) . ';', 'before' );
} );

/* El tema controla todo el aspecto: fuera los estilos globales del tema padre. */
add_action( 'wp_enqueue_scripts', function () {
	wp_dequeue_style( 'global-styles' );
	wp_dequeue_style( 'classic-theme-styles' );
	wp_dequeue_style( 'wp-block-library' );
	wp_dequeue_style( 'wp-block-library-theme' );
}, 20 );

/* ─────────────────────────── plantilla ─────────────────────────── */

add_filter( 'template_include', function ( $plantilla ) {
	if ( is_admin() ) {
		return $plantilla;
	}
	if ( is_front_page() || is_home() || is_singular( 'post' ) || is_category() || is_search() || is_404() ) {
		$propia = get_stylesheet_directory() . '/template-docs.php';
		if ( file_exists( $propia ) ) {
			return $propia;
		}
	}
	return $plantilla;
} );

/* ─────────────────────────── ayudas de plantilla ─────────────────────────── */

function jn_docs_url( $ruta = '' ) {
	return home_url( '/' . ltrim( $ruta, '/' ) );
}

function jn_docs_activa( $slug ) {
	if ( is_singular( 'post' ) ) {
		return get_post_field( 'post_name', get_queried_object_id() ) === $slug;
	}
	return false;
}

function jn_docs_panel_url() {
	return 'https://y0selin.github.io/jumperNET/';
}

/* ─────────────────────────── login con la marca ─────────────────────────── */

add_action( 'login_enqueue_scripts', function () {
	?>
	<style>
		body.login{
			background:#08111a !important;
			background-image:
				radial-gradient(900px 420px at 62% -10%, rgba(51,214,192,.14), transparent 60%),
				radial-gradient(700px 380px at 8% 110%, rgba(255,99,71,.10), transparent 62%),
				linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px),
				linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px) !important;
			background-size:auto,auto,44px 44px,44px 44px !important;
		}
		#login h1{display:none}
		#login::before{
			content:"≋  JumperNET · Documentación";
			display:block;text-align:center;color:#e8f1f8;font-weight:700;
			font-size:19px;letter-spacing:.02em;margin-bottom:18px;
			font-family:ui-monospace,Consolas,monospace;
		}
		#login form,#loginform{
			background:#0e1a25 !important;border:1px solid #21313f !important;border-radius:16px;
			box-shadow:0 18px 50px rgba(0,0,0,.6) !important;padding:26px !important
		}
		#login label{color:#9db0bf}
		#login input[type=text],#login input[type=password]{
			background:#09131b !important;color:#e8f1f8 !important;
			border:1px solid #21313f !important;border-radius:9px !important;padding:9px 10px !important
		}
		#login input:focus{border-color:#33d6c0 !important;box-shadow:0 0 0 2px rgba(51,214,192,.18)!important}
		#wp-submit{
			background:#167d68 !important;border-color:transparent !important;border-radius:9px !important;
			font-weight:700;padding:8px 16px !important
		}
		#wp-submit:hover{background:#1a947b !important}
		#nav,#backtoblog a{color:#9db0bf !important}
	</style>
	<?php
} );

add_filter( 'login_headerurl', function () {
	return home_url( '/' );
} );

/* ─────────────────────────── detalles ─────────────────────────── */

/* Fuera el emoji y el bloque de comentarios: es documentación, no un blog. */
add_action( 'wp', function () {
	if ( is_singular( 'post' ) ) {
		add_filter( 'comments_open', '__return_false' );
	}
} );

add_filter( 'document_title_separator', function () {
	return '·';
} );

/* Limpia la marca de WordPress del <title> cuando no es una guía. */
add_filter( 'pre_get_document_title', function ( $titulo ) {
	if ( is_front_page() ) {
		return 'Documentación de JumperNET · la red de 3 saltos, pieza a pieza';
	}
	if ( is_singular( 'post' ) ) {
		return get_the_title() . ' · Documentación de JumperNET';
	}
	return $titulo;
} );
