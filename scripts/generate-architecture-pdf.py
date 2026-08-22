#!/usr/bin/env python3
"""
Nexus One POS — Plan de Refactorizacion de Arquitectura de Elite v2.9.70
Genera PDF profesional con el plan completo, codigo de ejemplo y configuraciones.
"""

import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    KeepTogether, HRFlowable, ListFlowable, ListItem, Preformatted
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

# ─── Font Registration ──────────────────────────────────────────
FONT_DIR = '/usr/share/fonts'
try:
    pdfmetrics.registerFont(TTFont('NotoSansSC', f'{FONT_DIR}/truetype/chinese/NotoSansSC-Regular.ttf'))
    pdfmetrics.registerFont(TTFont('NotoSansSC-Bold', f'{FONT_DIR}/truetype/chinese/NotoSansSC-Bold.ttf'))
    registerFontFamily('NotoSansSC', normal='NotoSansSC', bold='NotoSansSC-Bold')
except Exception:
    pass
pdfmetrics.registerFont(TTFont('Inter', f'{FONT_DIR}/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('Inter-Bold', f'{FONT_DIR}/truetype/dejavu/DejaVuSans-Bold.ttf'))
registerFontFamily('Inter', normal='Inter', bold='Inter-Bold')

# ─── Cascade Palette ───────────────────────────────────────────
PAGE_BG       = colors.HexColor('#f5f5f4')
SECTION_BG    = colors.HexColor('#ecebea')
CARD_BG       = colors.HexColor('#eae9e6')
TABLE_STRIPE  = colors.HexColor('#f3f2f1')
HEADER_FILL   = colors.HexColor('#61583c')
COVER_BLOCK   = colors.HexColor('#7e7457')
BORDER        = colors.HexColor('#c4c0b2')
ICON          = colors.HexColor('#968246')
ACCENT        = colors.HexColor('#8e7423')
ACCENT_2      = colors.HexColor('#44add0')
TEXT_PRIMARY   = colors.HexColor('#242320')
TEXT_MUTED     = colors.HexColor('#7e7b74')
SEM_SUCCESS   = colors.HexColor('#468a5d')
SEM_WARNING   = colors.HexColor('#947b49')
SEM_ERROR     = colors.HexColor('#8f453f')
SEM_INFO      = colors.HexColor('#547a9f')

# ─── Output ─────────────────────────────────────────────────────
OUTPUT_DIR = '/home/z/my-project/download'
os.makedirs(OUTPUT_DIR, exist_ok=True)
OUTPUT_PATH = os.path.join(OUTPUT_DIR, 'Nexus_One_Arquitectura_Elite_v2.9.70.pdf')

# ─── Styles ─────────────────────────────────────────────────────
styles = getSampleStyleSheet()

styles.add(ParagraphStyle(
    'CoverTitle', fontName='Inter-Bold', fontSize=36, leading=42,
    textColor=colors.white, alignment=TA_LEFT, spaceAfter=12
))
styles.add(ParagraphStyle(
    'CoverSubtitle', fontName='Inter', fontSize=16, leading=22,
    textColor=colors.HexColor('#d4d0c4'), alignment=TA_LEFT, spaceAfter=6
))
styles.add(ParagraphStyle(
    'CoverMeta', fontName='Inter', fontSize=12, leading=16,
    textColor=colors.HexColor('#b0a890'), alignment=TA_LEFT
))
styles.add(ParagraphStyle(
    'H1', fontName='Inter-Bold', fontSize=22, leading=28,
    textColor=HEADER_FILL, spaceBefore=20, spaceAfter=10,
    borderWidth=0, borderColor=HEADER_FILL, borderPadding=0
))
styles.add(ParagraphStyle(
    'H2', fontName='Inter-Bold', fontSize=16, leading=22,
    textColor=ACCENT, spaceBefore=14, spaceAfter=8
))
styles.add(ParagraphStyle(
    'H3', fontName='Inter-Bold', fontSize=13, leading=18,
    textColor=ICON, spaceBefore=10, spaceAfter=6
))
styles.add(ParagraphStyle(
    'Body', fontName='Inter', fontSize=10, leading=15,
    textColor=TEXT_PRIMARY, alignment=TA_JUSTIFY, spaceAfter=8,
    firstLineIndent=0
))
styles.add(ParagraphStyle(
    'BodyIndent', fontName='Inter', fontSize=10, leading=15,
    textColor=TEXT_PRIMARY, alignment=TA_JUSTIFY, spaceAfter=6,
    leftIndent=20
))
styles.add(ParagraphStyle(
    'CodeBlock', fontName='Inter', fontSize=7.5, leading=10,
    textColor=TEXT_PRIMARY, backColor=colors.HexColor('#f8f7f5'),
    borderWidth=0.5, borderColor=BORDER, borderPadding=8,
    leftIndent=10, rightIndent=10, spaceAfter=10, spaceBefore=6
))
styles.add(ParagraphStyle(
    'CodeInline', fontName='Inter', fontSize=8.5, leading=12,
    textColor=ACCENT, backColor=colors.HexColor('#f0ede5'),
    borderPadding=2
))
styles.add(ParagraphStyle(
    'BulletBody', fontName='Inter', fontSize=10, leading=15,
    textColor=TEXT_PRIMARY, alignment=TA_JUSTIFY, spaceAfter=4,
    leftIndent=20, bulletIndent=8, bulletFontSize=10
))
styles.add(ParagraphStyle(
    'TableHeader', fontName='Inter-Bold', fontSize=9, leading=12,
    textColor=colors.white, alignment=TA_LEFT
))
styles.add(ParagraphStyle(
    'TableCell', fontName='Inter', fontSize=9, leading=12,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT
))
styles.add(ParagraphStyle(
    'TableCellBold', fontName='Inter-Bold', fontSize=9, leading=12,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT
))
styles.add(ParagraphStyle(
    'FooterStyle', fontName='Inter', fontSize=8, leading=10,
    textColor=TEXT_MUTED, alignment=TA_CENTER
))
styles.add(ParagraphStyle(
    'Note', fontName='Inter', fontSize=9, leading=13,
    textColor=SEM_INFO, alignment=TA_LEFT, leftIndent=15,
    borderWidth=1, borderColor=SEM_INFO, borderPadding=6,
    backColor=colors.HexColor('#f0f5fa'), spaceAfter=10, spaceBefore=6
))

# ─── Helper Functions ───────────────────────────────────────────
def h1(text):
    return Paragraph(text, styles['H1'])

def h2(text):
    return Paragraph(text, styles['H2'])

def h3(text):
    return Paragraph(text, styles['H3'])

def body(text):
    return Paragraph(text, styles['Body'])

def code(text):
    return Paragraph(text.replace('<', '&lt;').replace('>', '&gt;').replace('\n', '<br/>'), styles['CodeBlock'])

def note(text):
    return Paragraph(text, styles['Note'])

def bullet_list(items):
    elements = []
    for item in items:
        elements.append(Paragraph(f"\u2022  {item}", styles['BulletBody']))
    return elements

def make_table(headers, rows, col_widths=None):
    W = A4[0] - 2*2.5*cm
    if col_widths is None:
        n = len(headers)
        col_widths = [W/n] * n
    
    header_row = [Paragraph(h, styles['TableHeader']) for h in headers]
    data = [header_row]
    for row in rows:
        data.append([Paragraph(str(c), styles['TableCell']) for c in row])
    
    t = Table(data, colWidths=col_widths, repeatRows=1)
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
    ]
    for i in range(1, len(data)):
        if i % 2 == 0:
            style_cmds.append(('BACKGROUND', (0, i), (-1, i), TABLE_STRIPE))
    t.setStyle(TableStyle(style_cmds))
    return t

def hr():
    return HRFlowable(width='100%', thickness=0.5, color=BORDER, spaceAfter=10, spaceBefore=10)

def spacer(h=10):
    return Spacer(1, h)

# ─── Build Document ─────────────────────────────────────────────
story = []

# ======== COVER PAGE ========
# Dark cover block
cover_data = [
    [Spacer(1, 80)],
    [Paragraph('NEXUS ONE POS', styles['CoverTitle'])],
    [Paragraph('Arquitectura de Ingenieria de Elite', styles['CoverSubtitle'])],
    [Spacer(1, 8)],
    [Paragraph('Conecta. Gestiona. Crece.', ParagraphStyle(
        'Slogan', fontName='Inter-Bold', fontSize=20, leading=26,
        textColor=ACCENT_2
    ))],
    [Spacer(1, 40)],
    [Paragraph('Plan de Refactorizacion v2.9.70', styles['CoverMeta'])],
    [Paragraph('Modo Local — Windows 10+ | 5 Pilares Tecnicos', styles['CoverMeta'])],
    [Spacer(1, 20)],
    [Paragraph('Agosto 2026 | Nexus One POS', styles['CoverMeta'])],
]

cover_table = Table(cover_data, colWidths=[A4[0] - 5*cm])
cover_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#1a1914')),
    ('LEFTPADDING', (0, 0), (-1, -1), 30),
    ('RIGHTPADDING', (0, 0), (-1, -1), 30),
    ('TOPPADDING', (0, 0), (-1, -1), 0),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
]))
story.append(Spacer(1, -2*cm))
story.append(cover_table)
story.append(PageBreak())

# ======== TABLA DE CONTENIDOS ========
story.append(h1('Tabla de Contenidos'))
story.append(hr())

toc_items = [
    ('1', 'Resumen Ejecutivo'),
    ('2', 'Pilar 1: Optimizacion Molecular (Prueba de la Tostadora)'),
    ('3', 'Pilar 2: Usabilidad Radical y Estetica de Alta Gama'),
    ('4', 'Pilar 3: Motor de Licencias Local con Feature Flags'),
    ('5', 'Pilar 4: Add-on de Cumplimiento Legal — Patron Adapter'),
    ('6', 'Pilar 5: Tolerancia a Fallos e Inmunidad'),
    ('7', 'Plan de Refactorizacion: Archivos a Modificar'),
    ('8', 'Instrucciones de Implementacion Paso a Paso'),
]
for num, title in toc_items:
    story.append(Paragraph(f'<b>{num}.</b>  {title}', ParagraphStyle(
        'TOCItem', fontName='Inter', fontSize=11, leading=20,
        textColor=TEXT_PRIMARY, leftIndent=20
    )))

story.append(PageBreak())

# ======== SECCION 1: RESUMEN EJECUTIVO ========
story.append(h1('1. Resumen Ejecutivo'))
story.append(hr())

story.append(body(
    'Este documento detalla el plan de ingenieria de vanguardia para transformar Nexus One POS en un '
    'sistema de nivel mundial, ejecutandose 100% en modo local (offline) sobre Windows 10+. La filosofia '
    'de cierre se basa en el lema <b>"Conecta. Gestiona. Crece."</b> y cada pilar tecnico esta disenado para '
    'operar sin conexion a internet, garantizando que el punto de venta siga funcionando incluso si la '
    'computadora se desconecta de la red o si hay un apagon electrico imprevisto. El sistema esta pensado '
    'para correr en hardware modesto (Celeron con 2GB de RAM) manteniendo 60+ FPS estables, y al mismo '
    'tiempo aprovechar al maximo procesadores modernos como Ryzen 9 o Intel Ultra 9 cuando estan disponibles.'
))

story.append(body(
    'La implementacion se estructura en cinco pilares fundamentales que cubren desde la optimizacion '
    'de rendimiento a nivel de nanosegundo, hasta la resiliencia ante cortes de energia. Cada pilar es '
    'independiente y se puede implementar de forma incremental sin romper la logica de negocio existente. '
    'A continuacion se presenta una vision general de los archivos de infraestructura creados en esta version y '
    'como se integran con la arquitectura actual del sistema. Este plan prioriza la instalacion local '
    'exclusivamente; todas las mejoras para la version online se abordaran en una fase posterior.'
))

story.append(h2('Archivos de Infraestructura Creados (v2.9.70)'))

story.append(make_table(
    ['Archivo', 'Pilar', 'Funcion'],
    [
        ['src/core/performance-engine.ts', '1', 'Motor de rendimiento, busqueda indexada, batch processing, monitor de memoria'],
        ['src/hooks/use-privacy-mode.ts', '2', 'Hook React: oculta/difumna montos con Ctrl+Shift+P'],
        ['src/hooks/use-global-shortcuts.ts', '2', 'Atajos de teclado globales estilo WhatsApp/iPhone'],
        ['src/core/feature-flags.ts', '3', 'Feature flags encriptadas con HMAC-SHA256, 3 planes (Conecta/Gestiona/Crece)'],
        ['src/core/tax-adapter.ts', '4', 'Patron Adapter: motor de impuestos desacoplado con hot-reload'],
        ['src/lib/tax-locales/venezuela.ts', '4', 'Estrategia fiscal Venezuela (SENIAT IVA 16%/8%/Exento)'],
        ['src/lib/tax-locales/us-sales-tax.ts', '4', 'Estrategia fiscal USA (Sales Tax por estado) - ejemplo'],
        ['src/core/resilient-db.ts', '5', 'BD indestructible: WAL mode, ACID estricto, recuperacion de corrupcion'],
        ['src/core/peripheral-isolator.ts', '5', 'Circuit Breaker: aislamiento de errores de impresora/escaner'],
        ['src/core/nexus-bootstrap.ts', 'Todos', 'Inicializador automatico del sistema al arrancar'],
    ],
    col_widths=[160, 40, 290]
))

story.append(PageBreak())

# ======== SECCION 2: OPTIMIZACION MOLECULAR ========
story.append(h1('2. Pilar 1: Optimizacion Molecular'))
story.append(Paragraph('La Prueba de la Tostadora: 60+ FPS en 2GB de RAM', styles['H3']))
story.append(hr())

story.append(body(
    'El primer pilar aborda el rendimiento a nivel microscopico. En un entorno de punto de venta local, el '
    'cajero no puede esperar ni un frame de retraso al escanear un producto o al procesar un cierre de caja. '
    'El objetivo es garantizar que cada interaccion se complete en menos de 16 milisegundos (60 FPS), incluso '
    'en hardware con procesadores Celeron de generaciones anteriores y unicamente 2GB de memoria RAM disponible. '
    'Para lograr esto, se implementan tres estrategias complementarias que trabajan en conjunto: un motor de '
    'busqueda indexada para el catalogo de productos, un sistema de procesamiento por lotes para operaciones '
    'masivas, y un monitor de rendimiento que activa automaticamente el modo ahorro cuando la memoria '
    'se acerca al limite critico.'
))

story.append(h2('2.1 Busqueda Indexada del Catalogo'))
story.append(body(
    'El sistema actual realiza busquedas lineales sobre el array de productos cada vez que el cajero '
    'escribe en el campo de busqueda. Con 500+ productos, esto genera multiples re-renderizados por cada '
    'tecla presionada. La solucion es un indice invertido que mapea prefijos de 3 caracteres a conjuntos '
    'de IDs de productos. Cuando el cajero escribe "lech", el motor busca en el indice las claves "lec" '
    'y "ech", intersecta los resultados, y rankea por relevancia. Esta operacion es O(1) para busquedas '
    'por codigo de barras (busqueda exacta) y O(log n) para busquedas por nombre, eliminando completamente '
    'la necesidad de recorrer el array completo en cada keystroke.'
))

story.append(code(
    '// Uso del motor de busqueda indexado<br/>'
    'import { getCatalogSearchEngine } from "@/core/performance-engine";<br/><br/>'
    'const engine = getCatalogSearchEngine();<br/><br/>'
    '// Construir indice (una sola vez al cargar productos)<br/>'
    'engine.buildIndex(products.map(p =&gt; ({<br/>'
    '  id: p.id, name: p.name, barcode: p.barcode, category: p.category<br/>'
    '})));<br/><br/>'
    '// Buscar (debounced con rAF)<br/>'
    'const results = engine.search(query, 50); // max 50 resultados<br/><br/>'
    '// Saber si hay que virtualizar la lista<br/>'
    'if (engine.needsVirtualization()) {<br/>'
    '  // Activar renderizado virtual (solo items visibles)<br/>'
    '}'
))

story.append(h2('2.2 Debounce con requestAnimationFrame'))
story.append(body(
    'El debounce tradicional con setTimeout tiene un problema: puede ejecutar el callback en un momento '
    'donde el navegador esta ocupado con otros trabajos, causando un frame drop perceptible. La solucion '
    'es combinar setTimeout con requestAnimationFrame, garantizando que la busqueda se ejecute '
    'sincronizada con el ciclo de renderizado del navegador. Si el callback se ejecuta en medio de un '
    'frame, el navegador puede agrupar la actualizacion del DOM con el siguiente repaint, eliminando el '
    'retrazo visual. Ademas, se implementa un throttle con trailing para operaciones repetitivas '
    'como el scroll del catalogo o el arrastre del carrito, asegurando que nunca se ejecuten mas de '
    '30 renders por segundo.'
))

story.append(code(
    '// Debounce optimizado con rAF<br/>'
    'import { rafDebounce, throttleTrailing } from "@/core/performance-engine";<br/><br/>'
    '// Busqueda: espera 150ms luego ejecuta en el proximo frame<br/>'
    'const searchProducts = rafDebounce((query: string) =&gt; {<br/>'
    '  const ids = engine.search(query);<br/>'
    '  setFilteredProducts(ids.map(id =&gt; productMap.get(id)));<br/>'
    '}, 150);<br/><br/>'
    '// Scroll: max 1 ejecucion cada 100ms<br/>'
    'const onScroll = throttleTrailing((e) =&gt; {<br/>'
    '  updateVisibleRange(e.target.scrollTop);<br/>'
    '}, 100);'
))

story.append(h2('2.3 Batch Processor para Operaciones Masivas'))
story.append(body(
    'Cuando se procesan cierres de caja con cientos de ventas, importaciones de productos desde Excel, '
    'o sincronizaciones masivas, el event loop de Node.js puede bloquearse. El BatchProcessor divide '
    'automaticamente las operaciones en lotes de 50 elementos y ejecuta cada lote con un setTimeout(0) '
    'entre medio, liberando el event loop para que pueda atender peticiones HTTP del frontend. Esto '
    'garantiza que mientras se procesa una operacion masiva en segundo plano, el cajero puede seguir '
    'escaneando productos y facturando sin ningun tipo de lag o congelamiento de la interfaz.'
))

story.append(h2('2.4 Configuraciones Especificas para 2GB RAM'))

story.append(make_table(
    ['Parametro', 'Valor', 'Justificacion'],
    [
        ['Cache SQLite', '8MB (cache_size=-8000)', 'Balance entre velocidad y consumo de RAM en maquinas con 2GB'],
        ['Temp Store', 'MEMORY', 'Tablas temporales en RAM en vez de disco, mas rapido para POS'],
        ['WAL Autocheckpoint', '1000 paginas', 'Escribe el WAL al archivo principal cada 1000 paginas'],
        ['Batch Size', '50 items', 'No bloquear el event loop mas de ~16ms por lote'],
        ['Search Debounce', '150ms', 'Tiempo optimo entre keystrokes para evitar busquedas espureas'],
        ['Virtualization Threshold', '100 productos', 'A partir de 100 items, solo renderizar los visibles en pantalla'],
        ['Memory Threshold', '1200MB', 'Activar modo ahorro automatico si la RAM usada supera este valor'],
    ],
    col_widths=[130, 130, 230]
))

story.append(PageBreak())

# ======== SECCION 3: USABILIDAD RADICAL ========
story.append(h1('3. Pilar 2: Usabilidad Radical'))
story.append(Paragraph('Estilo WhatsApp / Samsung S26 Ultra — Interfaz Invisible', styles['H3']))
story.append(hr())

story.append(body(
    'El segundo pilar transforma la experiencia de usuario para que sea tan intuitiva como WhatsApp. '
    'La filosofia es eliminar todo clic innecesario, todo dialogo redundante, y toda friccion entre la '
    'intencion del cajero y la accion del sistema. Cuando el cajero escanea un codigo de barras, el cursor '
    'debe volver automaticamente al campo de busqueda. Cuando cambia de tab con un atajo de teclado, '
    'la transicion debe ser organica y fluida, sin parpadeos ni re-renderizados innecesarios. Cada '
    'interaccion debe sentirse como una extension natural del pensamiento del cajero, no como una lucha '
    'contra la interfaz.'
))

story.append(h2('3.1 Atajos de Teclado Globales'))
story.append(body(
    'Se implementa un sistema de atajos de teclado que funciona en cualquier pantalla de la aplicacion, '
    'sin importar que campo de texto este enfocado. Los atajos estan disenados para ser mnemonicos y '
    'siguen el patron de las aplicaciones mas populares: F2 para buscar, F4 para procesar, Escape para '
    'cerrar. El sistema incluye proteccion para no disparar atajos cuando el usuario esta escribiendo en '
    'un campo de texto, a menos que sean teclas de funcion (F-keys) que se disparan independientemente del '
    'contexto. La implementacion captura eventos en la fase de captura (capture phase) para garantizar '
    'que ningun componente hijo pueda interferir con los atajos globales.'
))

story.append(make_table(
    ['Atajo', 'Accion', 'Categoria'],
    [
        ['F2', 'Enfocar campo de busqueda POS', 'POS'],
        ['F4', 'Procesar venta rapida', 'POS'],
        ['F5', 'Limpiar carrito', 'POS'],
        ['F7', 'Abrir cajon de dinero', 'Hardware'],
        ['F8', 'Estacionar/hold venta actual', 'POS'],
        ['F9', 'Activar escanner de codigo de barras', 'Hardware'],
        ['Ctrl+B', 'Ir a productos', 'Navegacion'],
        ['Ctrl+R', 'Ir a reportes', 'Navegacion'],
        ['Ctrl+D', 'Ir a dashboard', 'Navegacion'],
        ['Ctrl+Shift+P', 'Toggle Modo Privacidad', 'Seguridad'],
        ['Escape', 'Cerrar dialogo/modal activo', 'General'],
    ],
    col_widths=[120, 260, 110]
))

story.append(h2('3.2 Modo Privacidad (Privacy Mode)'))
story.append(body(
    'En un entorno de punto de venta fisico, es comun que clientes o personas ajenas miren la pantalla del '
    'cajero. El Modo Privacidad permite ocultar o difuminar todos los montos de dinero con un solo clic o '
    'con el atajo rapido Ctrl+Shift+P. El sistema ofrece dos niveles de privacidad: <b>Blur</b> (difumina '
    'los montos con un filtro gaussiano de 8px que se reduce al pasar el mouse, permitiendo al cajero '
    'ver los valores cuando lo necesita) y <b>Hide</b> (reemplaza completamente los montos por puntos '
    'asteriscos, sin opcion de revelarlos excepto desactivando el modo). La preferencia se persiste en '
    'localStorage para que el modo se mantenga entre sesiones. El hook usePrivacyMode() retorna '
    'funciones de utilidad como renderMoney() que automaticamente aplica el nivel de privacidad '
    'segun la configuracion activa.'
))

story.append(code(
    '// Uso del hook de privacidad en cualquier componente<br/>'
    'import { usePrivacyMode } from "@/hooks/use-privacy-mode";<br/><br/>'
    'function CartPanel() {<br/>'
    '  const { toggle, renderMoney, isActive } = usePrivacyMode();<br/><br/>'
    '  return (<br/>'
    '    &lt;div&gt;<br/>'
    '      &lt;button onClick={toggle}&gt;<br/>'
    '        {isActive ? "Mostrar montos" : "Ocultar montos"}<br/>'
    '      &lt;/button&gt;<br/>'
    '      &lt;span className={renderMoney(125.50, "$").className}&gt;<br/>'
    '        {renderMoney(125.50, "$").text}<br/>'
    '      &lt;/span&gt;<br/>'
    '    &lt;/div&gt;<br/>'
    '  );<br/>'
    '}'
))

story.append(h2('3.3 Dark Mode Cinematico'))
story.append(body(
    'Se agrega un conjunto de design tokens especializados para el modo oscuro que reducen la fatiga visual '
    'del cajero durante turnos largos. Los tokens de "Cinematic Dark" incluyen variables de glow sutil '
    '(--nx-glow-primary) que anaden una luminiscencia tenue alrededor de las tarjetas y bordes activos, '
    'creando una sensacion de profundidad similar a la interfaz de Samsung One UI en modo oscuro. Las sombras '
    'de las tarjetas (.card-shadow) se redefinen en modo oscuro para incluir un halo primario que mejora '
    'la jerarquia visual sin necesidad de bordes solidos. Los colores de texto se ajustan para garantizar un '
    'contraste minimo de 4.5:1 con el fondo, cumpliendo con las pautas WCAG 2.1 AA para accesibilidad.'
))

story.append(PageBreak())

# ======== SECCION 4: MOTOR DE LICENCIAS ========
story.append(h1('4. Pilar 3: Motor de Licencias Local'))
story.append(Paragraph('Feature Flags Encriptadas — Sin Internet Requerido', styles['H3']))
story.append(hr())

story.append(body(
    'El sistema de licencias se redisea completamente para funcionar sin conexion a internet. Los tres '
    'planes ahora se alinean con el lema del sistema: <b>Conecta</b> (gratis, para empezar a vender hoy), '
    '<b>Gestiona</b> (basico, control total del negocio), y <b>Crece</b> (profesional, escala sin limites). '
    'Cada plan define un conjunto de Feature Flags que controlan granularmente que funcionalidades '
    'estan disponibles en la interfaz. Los flags se almacenan en un token JWT interno firmado con HMAC-SHA256, '
    'que se genera al activar la licencia y se verifica en cada solicitud del servidor sin necesidad de '
    'conexion a internet. La firma criptografica garantiza que los flags no pueden ser modificados manualmente '
    'en la base de datos sin invalidar el token.'
))

story.append(h2('4.1 Matriz de Planes y Features'))

story.append(make_table(
    ['Feature', 'Conecta (Gratis)', 'Gestiona (Basico)', 'Crece (Profesional)'],
    [
        ['Punto de Venta basico', 'SI', 'SI', 'SI'],
        ['Pago Mixto', 'NO', 'SI', 'SI'],
        ['Apartar Venta', 'NO', 'NO', 'SI'],
        ['Alertas de Stock', 'NO', 'SI', 'SI'],
        ['Reportes Avanzados', 'NO', 'NO', 'SI'],
        ['Graficos de Ventas', 'NO', 'NO', 'SI'],
        ['Multiples Usuarios', 'NO', 'NO', 'SI (5 max)'],
        ['Credito', 'NO', 'SI', 'SI'],
        ['Devoluciones', 'NO', 'SI', 'SI'],
        ['Cotizaciones', 'NO', 'NO', 'SI'],
        ['Compras a Proveedores', 'NO', 'SI', 'SI'],
        ['Exportar/Importar', 'NO', 'SI', 'SI'],
        ['Respaldo Automatico', 'NO', 'SI', 'SI'],
        ['Max Productos', '50', '500', 'Ilimitados'],
        ['Max Ventas/Dia', '20', 'Ilimitadas', 'Ilimitadas'],
    ],
    col_widths=[145, 100, 115, 130]
))

story.append(h2('4.2 Validacion Local sin Internet'))
story.append(body(
    'El flujo de validacion funciona completamente offline. Cuando se activa una licencia, el servidor genera '
    'un FeatureToken que contiene el plan, los flags, la fecha de emision y la fecha de expiracion, todo '
    'firmado con HMAC-SHA256 usando una clave secreta embebida en el codigo compilado. Este token se almacena '
    'en la base de datos local y se carga en memoria al iniciar la aplicacion. En cada request al servidor, '
    'se verifica que el token no haya expirado y que la firma sea valida usando timingSafeEqual() para '
    'prevenir ataques de timing. Si el token expira (cada 24 horas), se regenera automaticamente desde los '
    'datos de la licencia almacenados en la BD. Esto significa que el sistema puede funcionar meses sin '
    'internet, renovando internamente su token de features cada dia.'
))

story.append(code(
    '// Generar token de features (server-side)<br/>'
    'import { generateFeatureToken, hasFeature, verifyFeatureToken }<br/>'
    '  from "@/core/feature-flags";<br/><br/>'
    '// Al activar licencia:<br/>'
    'const plan = planFromLicenseType(license.licenseType); // "profesional"<br/>'
    'const token = generateFeatureToken(plan); // Base64url JWT<br/><br/>'
    '// En cada API route, verificar un flag especifico:<br/>'
    'const canUseCredit = hasFeature(featureToken, "advanced.credit");<br/><br/>'
    '// Verificar si un tab es accesible:<br/>'
    'const canSeeReports = isTabAccessible("reports", featureToken);<br/><br/>'
    '// En la UI, ocultar botones segun features:<br/>'
    '{hasFeature(token, "advanced.credit") && <CreditTab />}'
))

story.append(h2('4.3 Control de Tabs por Feature'))
story.append(body(
    'Se implementa un mapeo directo entre cada tab de la aplicacion y la feature requerida para acceder a el. '
    'Cuando la aplicacion renderiza la barra de navegacion, consulta isTabAccessible() para cada tab. Si el '
    'plan del usuario no incluye la feature necesaria, el tab se oculta completamente o se muestra con un '
    'indicador visual de "bloqueado" que invita al usuario a actualizar su plan. Este sistema es '
    'completamente declarativo: agregar un nuevo tab a la aplicacion solo requiere agregar una linea al '
    'mapeo TAB_FEATURE_MAP, y el sistema de licencias se encarga del resto automaticamente.'
))

story.append(PageBreak())

# ======== SECCION 5: PATRON ADAPTER PARA IMPUESTOS ========
story.append(h1('5. Pilar 4: Cumplimiento Legal — Patron Adapter'))
story.append(Paragraph('Motor de Impuestos Desacoplado con Actualizacion en Caliente', styles['H3']))
story.append(hr())

story.append(body(
    'El cuarto pilar implementa el Patron de Diseno Adapter en el nucleo de ventas. El principio fundamental '
    'es que el motor de ventas procesa cada transaccion de forma completamente generica, sin conocer '
    'nada sobre impuestos, tasas, ni regulaciones fiscales. Todo el calculo fiscal se delega a un modulo '
    'independiente llamado "Estrategia Fiscal" que se registra dinamicamente en un TaxRegistry. Cuando se '
    'necesita agregar soporte para un nuevo pais (por ejemplo, Colombia con IVA del 19%, o Mexico con IVA '
    'del 16% y retenciones de ISR), simplemente se crea un nuevo archivo que implementa la interfaz '
    'TaxStrategy y se registra en el bootstrap del sistema. El codigo de ventas no se toca en absoluto.'
))

story.append(h2('5.1 Arquitectura del Adapter'))

story.append(body(
    'El flujo de una venta con impuestos funciona asi: el core de ventas recibe un array de SaleItemForTax '
    '(cada item con su tipo de impuesto: exento, reducido, general, etc.) y los pasa al TaxAdapter. El '
    'adapter busca la estrategia fiscal registrada para el locale actual (por defecto, Venezuela/SENIAT) y '
    'delega el calculo. La estrategia retorna un TaxCalculationResult con lineas de impuesto desglosadas, '
    'totales, y texto legal para el ticket. Este resultado se usa tanto para mostrar en pantalla como para '
    'imprimir en el ticket fiscal. Si la estrategia fiscal necesita actualizarse (por ejemplo, si el SENIAT '
    'cambia la tasa de IVA), se descarga un JSON ultraligero en segundo plano y se aplica sin reiniciar.'
))

story.append(code(
    '// El core de ventas NO sabe nada de impuestos:<br/>'
    'import { calculateTaxes, getTicketTaxLines } from "@/core/tax-adapter";<br/><br/>'
    '// Items de la venta con tipo de impuesto:<br/>'
    'const items = saleItems.map(i =&gt; ({<br/>'
    '  name: i.name,<br/>'
    '  quantity: i.quantity,<br/>'
    '  unitPrice: i.price,<br/>'
    '  taxType: product.taxType, // "general", "reducido", "exento"<br/>'
    '  isService: false,<br/>'
    '}));<br/><br/>'
    '// Calcular impuestos (delegado a la estrategia activa)<br/>'
    'const taxResult = calculateTaxes(items);<br/>'
    '// taxResult.lines = [{ label: "IVA 16%", rate: 0.16, amount: 4.80, ... }]<br/>'
    '// taxResult.totalTax = 4.80<br/>'
    '// taxResult.grandTotal = 34.80<br/><br/>'
    '// Generar lineas para el ticket:<br/>'
    'const ticketLines = getTicketTaxLines(taxResult);'
))

story.append(h2('5.2 Ejemplo: Agregar Soporte para Colombia'))
story.append(body(
    'Para agregar soporte para Colombia, se crea un archivo src/lib/tax-locales/colombia.ts que implemente '
    'la interfaz TaxStrategy. La clase ColombiaTaxStrategy define la tasa de IVA del 19%, los tipos '
    'de productos exentos (alimentos basicos, medicamentos), y genera el texto legal requerido por la DIAN. '
    'Luego se registra en el archivo nexus-bootstrap.ts con una sola linea: taxRegistry.register(new ColombiaTaxStrategy()). '
    'El selector de locale en la configuracion de la tienda permite al usuario cambiar entre paises, y '
    'todos los calculos se adaptan automaticamente sin modificar ninguna otra parte del sistema. Este es '
    'el poder del Patron Adapter: desacoplar completamente la logica de negocio de las regulaciones fiscales.'
))

story.append(h2('5.3 Actualizacion en Caliente (Hot Reload)'))
story.append(body(
    'Cuando el sistema detecta conexion a internet (mediante un fetch con timeout de 5 segundos a un endpoint '
    'de configuracion), descarga un JSON ultraligero con las tasas de impuestos vigentes y las compara con la '
    'version actual. Si hay una actualizacion disponible, la aplica en segundo plano sin reiniciar la aplicacion '
    'y sin interrumpir al cajero. La verificacion se realiza cada 30 minutos. Si no hay internet, el sistema '
    'sigue funcionando con la ultima configuracion conocida. Este mecanismo permite que las autoridades '
    'fiscales publiquen actualizaciones de tasas y los sistemas POS las reciban de forma transparente, sin que '
    'el cajero se entere de que hubo una actualizacion. El JSON de configuracion pesa menos de 1KB, por lo '
    'que no impacta el consumo de datos ni el rendimiento del sistema.'
))

story.append(PageBreak())

# ======== SECCION 6: TOLERANCIA A FALLOS ========
story.append(h1('6. Pilar 5: Tolerancia a Fallos e Inmunidad'))
story.append(Paragraph('Resistencia a Apagones y Aislamiento de Perifericos', styles['H3']))
story.append(hr())

story.append(body(
    'El quinto pilar garantiza que el sistema sea inmune a las condiciones adversas del entorno fisico en el '
    'que opera un punto de venta: cortes de energia electrica, desconexiones de impresoras, fallos del escaner '
    'de codigo de barras, y cualquier otro error de hardware. La estrategia se divide en dos frentes: '
    'proteccion de la base de datos ante apagones, y aislamiento de errores de perifericos para que nunca '
    'afecten la interfaz de usuario.'
))

story.append(h2('6.1 Base de Datos Indestructible'))
story.append(body(
    'SQLite se configura con los maximos niveles de durabilidad. El modo WAL (Write-Ahead Logging) es la clave: '
    'en lugar de sobreescribir directamente el archivo de base de datos, SQLite escribe primero en un archivo '
    'log separado (WAL). Esto tiene dos ventajas cruciales: primero, las lecturas no se bloquean durante las '
    'escrituras, lo que significa que el cajero puede seguir consultando productos mientras se registra una venta. '
    'Segundo, si hay un corte de energia a mitad de una transaccion, el WAL se queda en un estado inconsistente, '
    'pero el archivo principal de la base de datos permanece intacto. Al reiniciar, SQLite detecta automaticamente '
    'que el WAL no se completo y revierte la transaccion incompleta. El inventario queda consistente y '
    'ningun producto se descuenta sin que la venta se haya completado.'
))

story.append(h3('PRAGMAs de Resiliencia Aplicados'))

story.append(make_table(
    ['PRAGMA', 'Valor', 'Efecto'],
    [
        ['journal_mode', 'WAL', 'Lecturas y escrituras simultaneas. Resistencia a apagones.'],
        ['synchronous', 'FULL', 'Espera confirmacion del SO antes de retornar. Maxima seguridad.'],
        ['busy_timeout', '5000', 'Si la BD esta ocupada, esperar hasta 5 segundos en vez de fallar.'],
        ['wal_autocheckpoint', '1000', 'Escribe el WAL al archivo principal cada 1000 paginas.'],
        ['cache_size', '-8000', '8MB de cache en RAM para consultas rapidas de POS.'],
        ['temp_store', 'MEMORY', 'Tablas temporales en RAM, no en disco. Mas rapido.'],
        ['foreign_keys', 'ON', 'Integridad referencial estricta.'],
        ['secure_delete', 'ON', 'Sobreescribir datos borrados (seguridad fisica).'],
        ['auto_vacuum', 'INCREMENTAL', 'Liberar espacio de registros borrados sin bloquear.'],
    ],
    col_widths=[130, 80, 280]
))

story.append(h3('Verificacion y Recuperacion Automatica'))
story.append(body(
    'Al iniciar el sistema, se ejecuta automaticamente una verificacion de integridad con PRAGMA integrity_check. '
    'Si se detecta corrupcion, el sistema realiza los siguientes pasos sin intervencion del usuario: primero, '
    'crea un backup de los archivos corruptos en el directorio prisma/recovery-backups/ con timestamp. Segundo, '
    'fuerza un checkpoint del WAL con modo TRUNCATE para intentar recuperar las transacciones pendientes. '
    'Tercero, re-verifica la integridad. Si la recuperacion tiene exito, el sistema opera normalmente y '
    'registra el evento en el log. Si no se puede recuperar, el sistema muestra un mensaje claro al usuario '
    'indicando que restaure desde el ultimo backup automatico (que se crea cada hora en /respaldos/). '
    'En ningun caso el sistema intenta operar con una base de datos corrupta, ya que eso podria causar '
    'perdida de datos de inventario o inconsistencias en los cierres de caja.'
))

story.append(h2('6.2 Aislador de Perifericos (Circuit Breaker)'))
story.append(body(
    'El PeripheralIsolator implementa el patron Circuit Breaker para cada dispositivo de hardware conectado al '
    'sistema: impresora termica, escaner de codigo de barras, cajon de dinero, y balanza. Cuando un periferico '
    'falla (por ejemplo, la impresora se desconecta o el escaner deja de responder), el error se captura en un '
    'try/catch con timeout configurable. Si el error persiste despues de los reintentos configurados, el '
    'periferico entra en modo "cooldown" durante un periodo determinado (por ejemplo, 30 segundos para la '
    'impresora). Durante el cooldown, cualquier intento de usar ese periferico va directamente al fallback '
    '(por ejemplo, impresion HTML en vez de ESC/POS). La interfaz de usuario nunca se congela, nunca muestra '
    'un dialogo de error bloqueante, y el cajero puede seguir facturando normalmente mientras el sistema '
    'reintenta la conexion con el periferico en segundo plano.'
))

story.append(code(
    '// Usar el aislador para imprimir sin congelar la UI<br/>'
    'import { isolatePeripheral, registerPeripheral }<br/>'
    '  from "@/core/peripheral-isolator";<br/><br/>'
    '// Registrar al iniciar:<br/>'
    'registerPeripheral("printer", "thermal-main");<br/><br/>'
    '// Imprimir con aislamiento total:<br/>'
    'const result = await isolatePeripheral(<br/>'
    '  "printer", "thermal-main",<br/>'
    '  () =&gt; printViaEscPos(buffer),     // operacion principal<br/>'
    '  () =&gt; printViaHtml(ticketData)   // fallback si falla<br/>'
    ');<br/><br/>'
    'if (result.fallbackUsed) {<br/>'
    '  // Mostrar aviso sutil, NO bloquear<br/>'
    '  toast("Impresora no disponible. Usando impresion alternativa.");<br/>'
    '}'
))

story.append(make_table(
    ['Periferico', 'Timeout', 'Reintentos', 'Cooldown', 'Fallback'],
    [
        ['Impresora termica', '5 seg', '2', '30 seg', 'Impresion HTML (window.print)'],
        ['Escaner barras', '3 seg', '0', '10 seg', 'Busqueda manual por nombre'],
        ['Cajon de dinero', '3 seg', '3', '30 seg', 'Indicador visual "abrir manualmente"'],
        ['Display cliente', '2 seg', '1', '15 seg', 'Sin display'],
        ['Balanza', '2 seg', '1', '10 seg', 'Ingreso manual de peso'],
    ],
    col_widths=[100, 70, 70, 70, 180]
))

story.append(PageBreak())

# ======== SECCION 7: PLAN DE REFACTORIZACION ========
story.append(h1('7. Plan de Refactorizacion: Archivos a Modificar'))
story.append(hr())

story.append(body(
    'A continuacion se detalla exactamente que archivos de la estructura actual deben modificarse para '
    'inyectar las optimizaciones de los cinco pilares sin romper la logica de negocio ya programada. '
    'Los cambios se organizan por prioridad y riesgo, indicando si son modificaciones seguras (que no '
    'afectan funcionalidad existente) o refactorizaciones profundas (que requieren testing exhaustivo).'
))

story.append(h2('7.1 Fase 1: Inyeccion Segura (Sin Riesgo)'))
story.append(body(
    'Estos cambios son adiciones puras que no modifican codigo existente. Se pueden aplicar de forma '
    'independiente y no requieren testing de regresion ya que no alteran el comportamiento actual del sistema.'
))

story.append(make_table(
    ['Archivo', 'Accion', 'Pilar', 'Detalle'],
    [
        ['src/lib/db.ts', 'Modificar', '5', 'Agregar ensureResilientDB() con PRAGMAs de WAL/FULL'],
        ['src/app/globals.css', 'Modificar', '2', 'Agregar classes .nexus-privacy-blur y .nexus-privacy-hide'],
        ['src/instrumentation.ts', 'Modificar', '5', 'Llamar ensureResilientDB() al iniciar el servidor'],
        ['src/app/layout.tsx', 'Modificar', '1', 'Importar y ejecutar nexus-bootstrap en el cliente'],
    ],
    col_widths=[140, 65, 40, 245]
))

story.append(h2('7.2 Fase 2: Integracion de Hooks (Bajo Riesgo)'))
story.append(body(
    'Estos cambios integran los nuevos hooks en componentes existentes. Requieren testing basico para '
    'verificar que los atajos de teclado no entren en conflicto con campos de texto y que el modo privacidad '
    'se aplique correctamente a todos los montos visibles en la interfaz.'
))

story.append(make_table(
    ['Componente', 'Accion', 'Pilar', 'Detalle'],
    [
        ['src/app/page.tsx', 'Modificar', '2', 'Agregar useGlobalShortcuts y usePrivacyMode'],
        ['src/components/pos-tab.tsx', 'Modificar', '2', 'Integrar auto-focus post-escaneo, privacidad en totales'],
        ['src/components/app-nav.tsx', 'Modificar', '3', 'Filtrar tabs por isTabAccessible() segun feature token'],
        ['src/components/cash-closing-tab.tsx', 'Modificar', '1', 'Usar BatchProcessor para cierres masivos'],
    ],
    col_widths=[145, 65, 40, 240]
))

story.append(h2('7.3 Fase 3: Integracion de Licencias (Medio Riesgo)'))
story.append(body(
    'Estos cambios conectan el motor de feature flags con el sistema de licencias existente. Se debe verificar '
    'que la migracion de los planes legacy (trial/basica/profesional) a los nuevos planes (Conecta/Gestiona/Crece) '
    'sea correcta y que los features se mapeen adecuadamente. Es importante probar cada plan para asegurarse '
    'de que los tabs y botones correctos se muestran u ocultan segun corresponda.'
))

story.append(make_table(
    ['Archivo', 'Accion', 'Pilar', 'Detalle'],
    [
        ['src/app/api/license/route.ts', 'Modificar', '3', 'Generar FeatureToken al activar licencia'],
        ['src/app/api/auth/route.ts', 'Modificar', '3', 'Incluir FeatureToken en la respuesta de login'],
        ['src/lib/auth-fetch.ts', 'Modificar', '3', 'Almacenar FeatureToken junto con el JWT de sesion'],
        ['src/components/license-tab.tsx', 'Modificar', '3', 'Mostrar planes Conecta/Gestiona/Crece con features'],
    ],
    col_widths=[160, 65, 40, 225]
))

story.append(h2('7.4 Fase 4: Motor de Impuestos (Bajo Riesgo, Futuro)'))
story.append(body(
    'La integracion del motor de impuestos con el core de ventas es un cambio bajo riesgo porque actualmente el '
    'sistema ya calcula impuestos de forma incrustada en el codigo de ventas. La refactorizacion extrae esa '
    'logica a un modulo independiente sin cambiar los resultados del calculo. Se puede hacer de forma gradual: '
    'primero crear el adapter, luego migrar el calculo de Venezuela al adapter, y finalmente verificar que los '
    'numeros coincidan exactamente con los del sistema actual antes de eliminar el codigo viejo.'
))

story.append(PageBreak())

# ======== SECCION 8: IMPLEMENTACION ========
story.append(h1('8. Instrucciones de Implementacion'))
story.append(hr())

story.append(h2('8.1 Verificacion Previa'))
story.extend(bullet_list([
    'Confirmar que Node.js 18+ esta instalado: node --version',
    'Confirmar que npm 9+ esta instalado: npm --version',
    'Navegar al directorio del proyecto: cd nexus-one-pos',
    'Respaldar la base de datos actual: copiar prisma/dev.db a un lugar seguro',
    'Verificar que el sistema funciona correctamente antes de aplicar cambios: npm run dev',
]))

story.append(h2('8.2 Pasos de Instalacion'))
story.extend(bullet_list([
    '1. Copiar todos los archivos nuevos al proyecto (directorio src/core/ y src/hooks/)',
    '2. Copiar los archivos de localizacion fiscal a src/lib/tax-locales/',
    '3. Actualizar src/lib/db.ts con la version resiliente (incluye PRAGMAs)',
    '4. Actualizar src/app/globals.css con las clases de Privacy Mode y Dark Cinematico',
    '5. Actualizar src/app/layout.tsx con el slogan y la descripcion actualizada',
    '6. Ejecutar: npm install (no se agregaron dependencias nuevas)',
    '7. Ejecutar: npx prisma generate (regenerar cliente Prisma)',
    '8. Ejecutar: npm run build (compilar para produccion)',
    '9. Reiniciar el sistema: DETENER-TODO.bat luego INICIAR-NEXUSONE.bat',
    '10. Verificar en el navegador: http://localhost:3000',
]))

story.append(h2('8.3 Verificacion Post-Instalacion'))
story.extend(bullet_list([
    'Abrir la consola del navegador (F12) y verificar que aparece: "PRAGMAs de resiliencia SQLite aplicados (WAL+FULL)"',
    'Escribir en la barra de busqueda del POS y verificar que la busqueda es instantanea',
    'Presionar Ctrl+Shift+P y verificar que los montos se difuminan',
    'Desconectar la impresora y verificar que el sistema no se congela al intentar imprimir',
    'Verificar que la version del sistema muestra v2.9.70 en el login',
]))

story.append(h2('8.4 Configuracion de Base de Datos Indestructible'))
story.append(body(
    'La configuracion de la base de datos se aplica automaticamente a traves del archivo db.ts actualizado. '
    'Los PRAGMAs se ejecutan en el primer query despues del inicio del servidor. Para verificar manualmente '
    'que el modo WAL esta activo, se puede ejecutar el siguiente comando en la consola de Node.js o usar '
    'cualquier visor SQLite (como DB Browser for SQLite) para consultar PRAGMA journal_mode y confirmar '
    'que devuelve "wal". Para forzar un checkpoint manual despues de una jornada intensiva de ventas, '
    'se puede usar la funcion forceCheckpoint() del modulo resilient-db.ts.'
))

story.append(code(
    '// Verificar que WAL esta activo (en consola Node.js):<br/>'
    'const { PrismaClient } = require("@prisma/client");<br/>'
    'const prisma = new PrismaClient();<br/>'
    'const result = await prisma.$queryRawUnsafe("PRAGMA journal_mode;");<br/>'
    'console.log(result); // debe mostrar [{ journal_mode: "wal" }]<br/><br/>'
    '// Verificar integridad:<br/>'
    'const health = await prisma.$queryRawUnsafe("PRAGMA integrity_check;");<br/>'
    'console.log(health); // debe mostrar [{ integrity_check: "ok" }]'
))

story.append(note(
    'Nota importante: Los PRAGMAs de resiliencia (WAL, synchronous FULL, etc.) son persistentes. Una vez '
    'aplicados, se mantienen en la base de datos para siempre. No es necesario aplicarlos en cada inicio del '
    'servidor, pero el codigo los aplica como medida de seguridad por si la base de datos se recrea desde cero '
    '(por ejemplo, durante una instalacion limpia).'
))

# ─── Build PDF ──────────────────────────────────────────────────
doc = SimpleDocTemplate(
    OUTPUT_PATH,
    pagesize=A4,
    topMargin=2.5*cm,
    bottomMargin=2*cm,
    leftMargin=2.5*cm,
    rightMargin=2.5*cm,
    title='Nexus One POS — Arquitectura de Ingenieria de Elite v2.9.70',
    author='Nexus One',
    subject='Plan de Refactorizacion — 5 Pilares Tecnicos — Modo Local',
)

doc.build(story)
print(f'PDF generado: {OUTPUT_PATH}')
print(f'Tamano: {os.path.getsize(OUTPUT_PATH) / 1024:.1f} KB')
