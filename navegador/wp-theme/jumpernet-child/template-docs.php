<?php
/*
 * Plantilla del sitio de documentación. Se sirve para la portada, cada guía,
 * las categorías, la búsqueda y el 404. El WordPress de /docs/ deja de ser
 * una landing y vuelve a ser lo que era: documentación.
 */

$guias        = jn_docs_guias();
$bloques      = jn_docs_bloques();
$es_guia      = is_singular( 'post' );
$slug_actual  = $es_guia ? get_post_field( 'post_name', get_queried_object_id() ) : '';
$guia_actual  = $slug_actual ? jn_docs_guia( $slug_actual ) : null;
$primera      = $guias ? $guias[0] : null;
$total        = count( $guias );
$es_portada   = is_front_page() || is_home();
$es_archivo   = is_category() || is_search();
$indice       = 0;

if ( $guia_actual ) {
	foreach ( $guias as $i => $g ) {
		if ( $g['slug'] === $guia_actual['slug'] ) {
			$indice = $i;
			break;
		}
	}
}
$anterior = $guia_actual && $indice > 0 ? $guias[ $indice - 1 ] : null;
$siguiente = $guia_actual && $indice < $total - 1 ? $guias[ $indice + 1 ] : null;

$titulo_doc = $es_guia ? get_the_title() : ( $es_archivo ? wp_get_document_title() : 'Documentación de JumperNET' );
?><!doctype html>
<html <?php language_attributes(); ?> data-modo="oscuro">
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 44 44'%3E%3Crect width='44' height='44' rx='12' fill='%23167d68'/%3E%3Cpath d='M9 17h26M9 24h18M9 31h10' stroke='%23eafff9' stroke-width='3' stroke-linecap='round'/%3E%3Ccircle cx='33' cy='31' r='4' fill='%23ff6347'/%3E%3C/svg%3E">
	<script>
		try {
			var m = localStorage.getItem( "jumpernet-docs-modo" );
			if ( m === "claro" || m === "oscuro" ) document.documentElement.dataset.modo = m;
		} catch ( e ) {}
	</script>
	<?php wp_head(); ?>
</head>
<body <?php body_class( 'jn-docs' ); ?>>
<?php wp_body_open(); ?>

<a class="jn-salto" href="#jn-principal">Saltar al contenido</a>
<div class="jn-progreso" id="jn-progreso" aria-hidden="true"><i></i></div>

<header class="jn-cab">
	<a class="jn-marca" href="<?php echo esc_url( home_url( '/' ) ); ?>" aria-label="JumperNET, documentación">
		<span class="jn-marca-logo" aria-hidden="true">≋</span>
		<span class="jn-marca-txt"><b>JumperNET</b><i>documentación</i></span>
	</a>

	<nav class="jn-cab-nav" aria-label="Navegación principal">
		<a href="<?php echo esc_url( home_url( '/' ) ); ?>"<?php echo $es_portada ? ' aria-current="page"' : ''; ?>>Guías</a>
		<a href="https://github.com/y0selin/jumperNET" target="_blank" rel="noreferrer">GitHub <span aria-hidden="true">→</span></a>
	</nav>

	<div class="jn-cab-acc">
		<a class="jn-volver-web" href="<?php echo esc_url( jn_docs_panel_url() ); ?>" aria-label="Volver a la web principal de JumperNET">
			<span class="jn-volver-ico" aria-hidden="true">←</span>
			<span class="jn-volver-larga">Volver a la web</span>
			<span class="jn-volver-corta">Web</span>
		</a>
		<button type="button" class="jn-buscar-btn" data-buscar aria-label="Buscar en la documentación">
			<span class="jn-buscar-ico" aria-hidden="true">⌕</span>
			<span class="jn-buscar-txt">Buscar</span>
			<kbd>/</kbd>
		</button>
		<button type="button" class="jn-modo" id="jn-modo" aria-label="Cambiar entre modo claro y oscuro" aria-pressed="false">
			<span aria-hidden="true">☀</span>
		</button>
		<button type="button" class="jn-menu" id="jn-menu" aria-label="Abrir el índice" aria-expanded="false" aria-controls="jn-lado">
			<span aria-hidden="true">☰</span>
		</button>
	</div>
</header>

<div class="jn-cascara">
	<div class="jn-velo" id="jn-velo" hidden></div>

	<aside class="jn-lado" id="jn-lado" aria-label="Índice de la documentación">
		<div class="jn-lado-cab">
			<span class="jn-lado-t">Índice</span>
			<span class="jn-lado-n mono"><?php echo (int) $total; ?> guías</span>
		</div>

		<a class="jn-lado-inicio<?php echo $es_portada ? ' on' : ''; ?>" href="<?php echo esc_url( home_url( '/' ) ); ?>">
			<span aria-hidden="true">⌂</span>
			<span>Portada de la documentación</span>
		</a>

		<?php foreach ( $bloques as $clave => $bloque ) : ?>
			<?php
			$del_bloque = array_values( array_filter( $guias, function ( $g ) use ( $clave ) {
				return $g['bloque'] === $clave;
			} ) );
			if ( ! $del_bloque ) {
				continue;
			}
			?>
			<div class="jn-lado-grupo">
				<span class="jn-lado-grupo-t mono"><?php echo esc_html( $bloque[0] . ' · ' . $bloque[1] ); ?></span>
				<ol class="jn-lado-lista">
					<?php foreach ( $del_bloque as $g ) : ?>
						<li>
							<a href="<?php echo esc_url( $g['url'] ); ?>"<?php echo jn_docs_activa( $g['slug'] ) ? ' class="on" aria-current="page"' : ''; ?>>
								<span class="jn-lado-num mono"><?php echo esc_html( str_pad( (string) $g['n'], 2, '0', STR_PAD_LEFT ) ); ?></span>
								<span class="jn-lado-nombre"><?php echo esc_html( $g['titulo'] ); ?></span>
							</a>
						</li>
					<?php endforeach; ?>
				</ol>
			</div>
		<?php endforeach; ?>

		<a class="jn-lado-panel" href="<?php echo esc_url( jn_docs_panel_url() ); ?>">
			<span class="jn-lado-panel-t mono">web principal</span>
			<span class="jn-lado-panel-b">Volver a JumperNET <span aria-hidden="true">→</span></span>
		</a>
	</aside>

	<main class="jn-principal" id="jn-principal">
		<?php if ( $es_guia && $guia_actual ) : ?>

			<?php while ( have_posts() ) : the_post(); ?>
				<div class="jn-lectura">
					<article class="jn-articulo">
						<nav class="jn-migas" aria-label="Migas de pan">
							<a href="<?php echo esc_url( home_url( '/' ) ); ?>">Documentación</a>
							<span aria-hidden="true">/</span>
							<span><?php the_title(); ?></span>
						</nav>

						<header class="jn-art-cab">
							<span class="jn-badge mono">guía <?php echo esc_html( str_pad( (string) $guia_actual['n'], 2, '0', STR_PAD_LEFT ) ); ?> · <?php echo (int) $total; ?></span>
							<h1><?php the_title(); ?></h1>
							<div class="jn-meta">
								<span class="mono"><?php echo esc_html( $guia_actual['fecha'] ); ?></span>
								<span class="jn-meta-sep" aria-hidden="true">·</span>
								<span class="mono"><?php echo (int) $guia_actual['minutos']; ?> min de lectura</span>
								<span class="jn-meta-sep" aria-hidden="true">·</span>
								<span>contraportada verificada en el VPS</span>
							</div>
						</header>

						<div class="jn-contenido" id="jn-contenido">
							<?php the_content(); ?>
						</div>

						<nav class="jn-pasos" aria-label="Guías anterior y siguiente">
							<?php if ( $anterior ) : ?>
								<a class="jn-paso" href="<?php echo esc_url( $anterior['url'] ); ?>">
									<span class="jn-paso-t mono">← anterior · <?php echo esc_html( str_pad( (string) $anterior['n'], 2, '0', STR_PAD_LEFT ) ); ?></span>
									<b><?php echo esc_html( $anterior['titulo'] ); ?></b>
								</a>
							<?php else : ?>
								<span class="jn-paso vacio"></span>
							<?php endif; ?>
							<?php if ( $siguiente ) : ?>
								<a class="jn-paso sig" href="<?php echo esc_url( $siguiente['url'] ); ?>">
									<span class="jn-paso-t mono">siguiente · <?php echo esc_html( str_pad( (string) $siguiente['n'], 2, '0', STR_PAD_LEFT ) ); ?> →</span>
									<b><?php echo esc_html( $siguiente['titulo'] ); ?></b>
								</a>
							<?php else : ?>
								<a class="jn-paso sig" href="<?php echo esc_url( home_url( '/' ) ); ?>">
									<span class="jn-paso-t mono">fin del recorrido →</span>
									<b>Volver al índice</b>
								</a>
							<?php endif; ?>
						</nav>

						<div class="jn-art-pie">
							<a class="jn-btn" href="<?php echo esc_url( home_url( '/' ) ); ?>">← Todas las guías</a>
							<button type="button" class="jn-btn" data-buscar>Buscar otra cosa <kbd>/</kbd></button>
							<a class="jn-btn primario jn-btn-web" href="<?php echo esc_url( jn_docs_panel_url() ); ?>">Volver a la web principal <span aria-hidden="true">→</span></a>
						</div>
					</article>

					<aside class="jn-toc" aria-label="En esta página">
						<span class="jn-toc-t mono">en esta página</span>
						<nav id="jn-toc-nav"></nav>
						<a class="jn-toc-arriba mono" href="#jn-principal">↑ volver arriba</a>
					</aside>
				</div>
			<?php endwhile; ?>

		<?php elseif ( $es_archivo ) : ?>

			<section class="jn-archivo">
				<span class="jn-badge mono"><?php echo is_search() ? 'búsqueda' : 'archivo'; ?></span>
				<h1><?php echo esc_html( $titulo_doc ); ?></h1>
				<p class="jn-heroe-lead">Las guías publicadas en la documentación.</p>
				<div class="jn-rejilla">
					<?php if ( have_posts() ) : ?>
						<?php while ( have_posts() ) : the_post(); ?>
							<a class="jn-tarjeta" href="<?php the_permalink(); ?>">
								<span class="jn-tarjeta-n mono"><?php echo esc_html( get_the_date( 'Y' ) ); ?></span>
								<b><?php the_title(); ?></b>
								<span class="jn-tarjeta-d"><?php echo esc_html( wp_trim_words( get_the_excerpt(), 22 ) ); ?></span>
								<span class="jn-tarjeta-f mono">abrir →</span>
							</a>
						<?php endwhile; ?>
					<?php else : ?>
						<p class="jn-vacio">No hay resultados. Prueba con otra palabra o vuelve al índice.</p>
					<?php endif; ?>
				</div>
			</section>

		<?php elseif ( is_404() ) : ?>

			<section class="jn-404">
				<span class="jn-404-n mono" aria-hidden="true">404</span>
				<span class="jn-badge mono">fuera del circuito</span>
				<h1>Esa página no está en la documentación</h1>
				<p class="jn-heroe-lead">El enlace puede haber cambiado. Busca la guía que necesitas o vuelve al índice completo.</p>
				<div class="jn-heroe-acc">
					<button type="button" class="jn-btn primario" data-buscar>Buscar en la docs <kbd>/</kbd></button>
					<a class="jn-btn" href="<?php echo esc_url( home_url( '/' ) ); ?>">Volver al índice</a>
				</div>
			</section>

		<?php else : ?>

			<section class="jn-heroe">
				<div class="jn-heroe-txt">
					<span class="jn-badge mono">documentación · jumpernet 3.1</span>
					<h1>Todo JumperNET,<br><em>pieza a pieza.</em></h1>
					<p class="jn-heroe-lead">
						La red, el cifrado, la API, el navegador y las incidencias reales que
						aparecieron por el camino. Cada afirmación tiene detrás una prueba que
						puedes repetir en el VPS.
					</p>
					<div class="jn-heroe-acc">
						<?php if ( $primera ) : ?>
							<a class="jn-btn primario" href="<?php echo esc_url( $primera['url'] ); ?>">Empezar por el principio <span aria-hidden="true">→</span></a>
						<?php endif; ?>
						<button type="button" class="jn-btn" data-buscar>Buscar en la docs <kbd>/</kbd></button>
					</div>
					<dl class="jn-heroe-cifras">
						<div><dt class="mono">guías</dt><dd><?php echo (int) $total; ?></dd></div>
						<div><dt class="mono">bloques</dt><dd>3</dd></div>
						<div><dt class="mono">pruebas</dt><dd>16</dd></div>
						<div><dt class="mono">humo</dt><dd>0</dd></div>
					</dl>
				</div>
				<div class="jn-heroe-mapa" aria-hidden="true">
					<svg viewBox="0 0 420 320" role="presentation">
						<defs>
							<linearGradient id="jn-linea" x1="0" y1="0" x2="1" y2="1">
								<stop offset="0" stop-color="#33d6c0" stop-opacity=".8"/>
								<stop offset=".55" stop-color="#d6a84b" stop-opacity=".65"/>
								<stop offset="1" stop-color="#ff6347" stop-opacity=".8"/>
							</linearGradient>
						</defs>
						<g class="jn-mapa-lineas" fill="none" stroke="url(#jn-linea)" stroke-width="1.5">
							<path d="M56 236 C 120 236 128 168 190 168 S 268 104 330 104"/>
							<path d="M56 236 C 132 236 140 268 206 268 S 288 224 364 224" opacity=".45"/>
							<path d="M190 168 C 214 168 218 210 250 210 S 300 168 330 104" opacity=".35"/>
						</g>
						<g class="jn-mapa-nodos">
							<circle cx="56" cy="236" r="7"/>
							<circle cx="190" cy="168" r="8"/>
							<circle cx="330" cy="104" r="9"/>
							<circle cx="206" cy="268" r="6"/>
							<circle cx="364" cy="224" r="6"/>
						</g>
						<g class="jn-mapa-etq mono">
							<text x="56" y="262" text-anchor="middle">tú</text>
							<text x="190" y="146" text-anchor="middle">nodo 1</text>
							<text x="330" y="82" text-anchor="middle">nodo 3 · exit</text>
							<text x="206" y="292" text-anchor="middle">nodo 2</text>
							<text x="364" y="248" text-anchor="middle">internet</text>
						</g>
					</svg>
				</div>
			</section>

			<?php foreach ( $bloques as $clave => $bloque ) : ?>
				<?php
				$del_bloque = array_values( array_filter( $guias, function ( $g ) use ( $clave ) {
					return $g['bloque'] === $clave;
				} ) );
				if ( ! $del_bloque ) {
					continue;
				}
				?>
				<section class="jn-bloque-sec">
					<header class="jn-bloque-cab">
						<span class="jn-bloque-n mono"><?php echo esc_html( $bloque[0] ); ?></span>
						<div>
							<h2><?php echo esc_html( $bloque[1] ); ?></h2>
							<p><?php echo esc_html( $bloque[2] ); ?></p>
						</div>
					</header>
					<div class="jn-rejilla">
						<?php foreach ( $del_bloque as $g ) : ?>
							<a class="jn-tarjeta" href="<?php echo esc_url( $g['url'] ); ?>">
								<span class="jn-tarjeta-top">
									<span class="jn-tarjeta-n mono"><?php echo esc_html( str_pad( (string) $g['n'], 2, '0', STR_PAD_LEFT ) ); ?></span>
									<span class="jn-tarjeta-min mono"><?php echo (int) $g['minutos']; ?> min</span>
								</span>
								<b><?php echo esc_html( $g['titulo'] ); ?></b>
								<span class="jn-tarjeta-d"><?php echo esc_html( $g['desc'] ); ?></span>
								<span class="jn-tarjeta-f mono">leer guía <span aria-hidden="true">→</span></span>
							</a>
						<?php endforeach; ?>
					</div>
				</section>
			<?php endforeach; ?>

			<section class="jn-pruebas">
				<div class="jn-pruebas-txt">
					<span class="jn-badge mono">lo que avala cada página</span>
					<h2>Si la suite pasa, lo escrito es verdad.</h2>
					<p>
						La documentación no se apoya en capturas: se apoya en una suite de
						16 pasos que encadena saltos manuales, circuitos de la API, ciclo de
						usuario, HTTPS, SOCKS5/HTTP desde internet, JENC extremo a extremo,
						nodos personales y el modo solo-externos.
					</p>
					<a class="jn-btn" href="https://github.com/y0selin/jumperNET" target="_blank" rel="noreferrer">Ver el repositorio <span aria-hidden="true">→</span></a>
				</div>
				<pre class="jn-consola"><code><span class="jn-prompt">$</span> sudo bash tests/run_all.sh
<span class="jn-c"># 1.x saltos manuales · 2.x circuitos de la API</span>
<span class="jn-c"># 3.x ciclo de usuario · 4.x HTTPS con Let's Encrypt</span>
<span class="jn-c"># 5.x SOCKS5/HTTP desde internet · 8.x JENC</span>
<span class="jn-c"># 9.x nodos personales + auto-reparación</span>
<span class="jn-c"># 10.x modo SOLO EXTERNOS (peers de usuarios)</span>

<span class="jn-ok">✅ TODAS LAS PRUEBAS SUPERADAS</span></code></pre>
			</section>

		<?php endif; ?>

		<footer class="jn-pie">
			<div class="jn-pie-marca">
				<span class="jn-marca-logo" aria-hidden="true">≋</span>
				<div>
					<b>JumperNET</b>
					<span>documentación de la red de 3 saltos</span>
				</div>
			</div>
			<nav class="jn-pie-nav" aria-label="Enlaces del pie">
				<a href="<?php echo esc_url( home_url( '/' ) ); ?>">Índice</a>
				<a href="<?php echo esc_url( jn_docs_panel_url() ); ?>">Web principal</a>
				<a href="https://jumpernet.duckdns.org/" target="_blank" rel="noreferrer">API</a>
				<a href="https://github.com/y0selin/jumperNET" target="_blank" rel="noreferrer">GitHub</a>
			</nav>
			<span class="jn-pie-nota mono">hecho en el VPS · sin métricas inventadas</span>
		</footer>
	</main>
</div>

<div class="jn-palabra" id="jn-palabra" hidden>
	<div class="jn-palabra-caja" role="dialog" aria-modal="true" aria-label="Buscar en la documentación">
		<div class="jn-palabra-cab">
			<span class="jn-palabra-ico" aria-hidden="true">⌕</span>
			<input type="search" id="jn-busca" placeholder="Buscar en la documentación…" autocomplete="off" spellcheck="false" aria-label="Buscar en la documentación">
			<kbd>esc</kbd>
		</div>
		<ul class="jn-resultados" id="jn-resultados"></ul>
		<div class="jn-palabra-pie">
			<span><kbd>↑</kbd><kbd>↓</kbd> mover · <kbd>enter</kbd> abrir</span>
			<span id="jn-cuenta" class="mono"></span>
		</div>
	</div>
</div>

<?php wp_footer(); ?>
</body>
</html>
