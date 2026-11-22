<?php
/* Arnés temporal: genera una portada estática para revisar el tema en Chromium.
   Uso: php .jn-preview.php claro|oscuro [salida.html] [navidad|sin-navidad] */

define('ABSPATH', __DIR__ . '/');

function add_action(...$a) {}
function add_filter(...$a) {}
function get_stylesheet_directory_uri() { return '.'; }
function get_stylesheet_directory() { return __DIR__; }
function get_stylesheet_uri() { return 'style.css'; }
function home_url($r = '') { return '#'; }
function admin_url($r = '') { return '#'; }
function wp_login_url($r = '') { return '#acceso'; }
function wp_registration_url() { return '#registro'; }
function is_user_logged_in() { return false; }
function is_front_page() { return true; }
function is_admin() { return false; }
function is_singular($t = '') { return false; }
function esc_url($s) { return htmlspecialchars((string) $s, ENT_QUOTES); }
function esc_html($s) { return htmlspecialchars((string) $s, ENT_QUOTES); }
function esc_attr($s) { return htmlspecialchars((string) $s, ENT_QUOTES); }
function esc_js($s) { return addslashes((string) $s); }
function wp_kses_post($s) { return $s; }
function wp_json_encode($s) { return json_encode($s); }
function date_i18n($f) { return date($f); }
function wp_count_posts($t = 'post') { $o = new stdClass(); $o->publish = $t === 'page' ? 9 : 24; return $o; }
function wp_count_attachments() { $o = new stdClass(); $o->count = 18; return array($o); }
function wp_count_comments() { $o = new stdClass(); $o->approved = 6; $o->moderated = 1; $o->spam = 0; return $o; }

require __DIR__ . '/functions.php';

$tema = isset($argv[1]) && $argv[1] === 'oscuro' ? 'oscuro' : 'claro';
$salida = isset($argv[2]) ? $argv[2] : '.jn-preview.html';
$navidad = isset($argv[3]) && $argv[3] === 'sin-navidad' ? 'no' : 'si';

$hero = '<div class="jn-hero">'
	. jn_bloque_hero_video()
	. '<span class="jn-badge">red educativa · v3.0</span>'
	. '<h1 class="wp-block-post-title jn-titulo">Jumper<span>NET</span></h1>'
	. '<p class="jn-sub">Documentación abierta de una red educativa de tres saltos: cómo viaja tu tráfico, qué ve cada nodo y por qué el camino importa.</p>'
	. '<div class="jn-stats">'
	. '<div><b>3</b><span>saltos por defecto</span></div>'
	. '<div><b>JENC</b><span>cifrado por capas</span></div>'
	. '<div><b>7:16</b><span>el documental</span></div>'
	. '</div>'
	. jn_bloque_hero_cta()
	. '</div>';

ob_start();
jn_bloque_bienvenida();
$bienvenida = ob_get_clean();

$html = '<!doctype html><html lang="es" data-jn-tema="' . $tema . '" data-jn-navidad="' . $navidad . '"><head><meta charset="utf-8">'
	. '<meta name="viewport" content="width=device-width,initial-scale=1">'
	. '<title>JumperNET · vista de prueba v3</title>'
	. '<meta name="description" content="JumperNET 3.0 · red educativa de tres saltos">'
	. '<link rel="stylesheet" href="style.css"></head><body class="home jn-portada' . ($navidad === 'si' ? ' jn-navidad' : '') . ($tema === 'oscuro' ? ' oscuro' : '') . '">'
	. '<div class="wp-site-blocks"><header class="wp-block-group">'
	. '<div class="wp-block-group"><h1 class="wp-block-site-title"><a href="#inicio">JumperNET</a></h1>'
	. '<nav class="wp-block-navigation"><ul><li><a href="#">Inicio</a></li><li><a href="#">Documentación</a></li><li><a href="#">Arquitectura</a></li></ul></nav></div>'
	. '</header><main class="wp-block-group"><article><div class="wp-block-post-content-is-layout-flow wp-block-post-content">'
	. jn_bloque_barra()
	. $hero
	. jn_bloque_experiencia()
	. '</div></article></main>'
	. '<footer class="wp-block-group"><p>JumperNET · documentación abierta · hecho para aprender cómo viaja una conexión.</p></footer></div>'
	. $bienvenida
	. '<script>window.JN={video:"assets/el-viaje.mp4",poster:"assets/el-viaje-poster.jpg",portada:true,navidad:' . ($navidad === 'si' ? 'true' : 'false') . ',version:"3.0.0",corte:30,acceso:"#acceso",registro:"#registro",docs:"#docs"};</script>'
	. '<script src="assets/jn-sitio.js"></script>'
	. '</body></html>';

file_put_contents(__DIR__ . '/' . $salida, $html);
echo "generado $salida (" . strlen($html) . " bytes)\n";
