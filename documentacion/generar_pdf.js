// Genera el PDF de la Olimpiada a partir de DOCUMENTACION.md
// Normas: fuente Oswald 12, interlineado sencillo, encabezado con tÃ­tulo,
// pie con "PÃ¡gina X de Y", carÃ¡tula, anexos y bibliografÃ­a.
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const DIR = __dirname;
const MD = path.join(DIR, 'DOCUMENTACION.md');
const FONT = path.join(DIR, 'assets', 'latin-400-normal.ttf');
const FONT_BOLD = path.join(DIR, 'assets', 'latin-700-normal.ttf');
const OUT = path.join(DIR, 'INFO-TEC2-7-01.pdf');

const FUENTE = 'Oswald';
const FUENTE_BOLD = 'Oswald-Bold';
const MONO = 'Courier';
const TAMANO = 12;
const INTERLINEADO = 12 * 1.35;
const MARGEN = 50;
const A4_W = 595.28;
const A4_H = 841.89;
const ANCHO_TEXTO = A4_W - MARGEN * 2;

const TITULO_TRABAJO = 'Sistema de GestiÃ³n y Monitoreo de Invernaderos';

const PORTADA = {
  olimp: 'OLIMPÃADA NACIONAL DE ETP 2026',
  instancia: 'Instancia Institucional',
  titulo: 'SISTEMA DE GESTIÃ“N Y MONITOREO DE INVERNADEROS',
  subtitulo: 'AutomatizaciÃ³n, informatizaciÃ³n y control de temperatura y humedad del parque ambiental',
  cue: 'CUE: 0611351-00',
  escuela: 'Escuela de EducaciÃ³n Secundaria TÃ©cnica NÂ° 2',
  localidad: 'Berisso - Provincia de Buenos Aires',
  profe: {
    label: 'Profesor responsable',
    nombre: 'Daniel Serganczuk',
    titulo: 'Tramo PedagÃ³gico en Secundaria TÃ©cnica - TÃ©cnica en InformÃ¡tica personal y profesional',
    cargo: 'Cargo: Profesor - Jefe de Departamento',
    correo: 'deserganczuk@gmail.com',
    tel: '+54 9 221 575-6796',
  },
  estudiantes: [
    { appynom: 'Villanueva Amparo', esp: 'InformÃ¡tica', ciclo: '7ma 5ta', anio: 'SÃ©ptimo' },
    { appynom: 'Villanueva Delfina', esp: 'InformÃ¡tica', ciclo: '7ma 5ta', anio: 'SÃ©ptimo' },
    { appynom: 'Bazan Thiago', esp: 'InformÃ¡tica', ciclo: '7ma 5ta', anio: 'SÃ©ptimo' },
    { appynom: 'Labaroni Francisco', esp: 'InformÃ¡tica', ciclo: '7ma 5ta', anio: 'SÃ©ptimo' },
    { appynom: 'Gomez Lautaro', esp: 'InformÃ¡tica', ciclo: '7ma 5ta', anio: 'SÃ©ptimo' },
    { appynom: 'Schreiber SebastiÃ¡n', esp: 'InformÃ¡tica', ciclo: '7ma 5ta', anio: 'SÃ©ptimo' },
  ],
  archivo: 'Archivo: INFO-TEC2-7-01.pdf',
};

// Divide un texto en partes: {tipo:'bold'|'code'|'plain', texto}
function tokenizar(inline) {
  const partes = [];
  if (inline.includes('`') || inline.includes('**')) {
    inline = inline.replace(/(\*\*[^*]+\*\*)/g, ' $1 ').replace(/(`[^`]+`)/g, ' $1 ');
  }
  inline = ' ' + inline + ' ';
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let m;
  while ((m = re.exec(inline)) !== null) {
    const pre = inline.slice(last, m.index);
    if (pre.trim().length) partes.push({ tipo: 'plain', texto: pre.replace(/\s+/g, ' ').trim() });
    const tok = m[0];
    if (tok.startsWith('**')) partes.push({ tipo: 'bold', texto: tok.slice(2, -2) });
    else partes.push({ tipo: 'code', texto: tok.slice(1, -1) });
    last = m.index + m[0].length;
  }
  const resto = inline.slice(last).replace(/\s+/g, ' ').trim();
  if (resto.length) partes.push({ tipo: 'plain', texto: resto });
  return partes;
}

function medidasPorTipo(tipo) {
  if (tipo === 'bold') return { font: FUENTE_BOLD, size: TAMANO };
  if (tipo === 'code') return { font: MONO, size: 9.5 };
  return { font: FUENTE, size: TAMANO };
}

// Render de pÃ¡rrafo con inlines (**bold** y `code`) usando continued:true
function renderRuns(doc, y, texto, opts = {}) {
  const x = opts.x || MARGEN;
  const width = opts.width || ANCHO_TEXTO;
  const partes = tokenizar(texto);
  if (!partes.length) return y;
  const items = [];
  doc.fillColor('#111111');
  partes.forEach((p, idx) => {
    const m = medidasPorTipo(p.tipo);
    doc.font(m.font).fontSize(m.size);
    try {
      if (opts.bullet && idx === 0) {
        doc.text('â€¢  ' + p.texto, x, y, { width: width, ...(idx < partes.length - 1 ? { continued: true } : {}) });
      } else {
        doc.text(p.texto, x, y, { width: width, ...(idx < partes.length - 1 ? { continued: true } : {}) });
      }
    } catch (err) {
      console.error('â–º Texto que rompe:', JSON.stringify(p.texto.slice(0, 200)));
      throw err;
    }
    items.push(doc.y);
  });
  return Math.max(...items) + (opts.after || INTERLINEADO * 0.8) - INTERLINEADO * 0.8 + INTERLINEADO * 0.8;
}

function saltoSiNecesario(doc, y, total, altoNecesario = 40) {
  if (y + altoNecesario > A4_H - MARGEN) { nuevaPagina(doc, total); return MARGEN; }
  return y;
}

let nPag = 1;
function nuevaPagina(doc, total) {
  doc.addPage();
  nPag++;
  if (nPag > 1) dibujarCabPie(doc, nPag, total);
}

function dibujarCabPie(doc, n, total) {
  doc.font(FUENTE).fontSize(9).fillColor('#888888')
    .text(TITULO_TRABAJO, MARGEN, 16, { width: ANCHO_TEXTO, align: 'right', lineBreak: false });
  doc.moveTo(MARGEN, 30).lineTo(A4_W - MARGEN, 30).lineWidth(0.6).strokeColor('#dddddd').stroke();
  doc.font(FUENTE).fontSize(9).fillColor('#555555')
    .text(total ? `Página ${n} de ${total}` : `Página ${n}`, MARGEN, A4_H - 32, { width: ANCHO_TEXTO, align: 'center', lineBreak: false });
}

// ---------- Render del contenido ----------
function renderContenido(doc, total) {
  nPag = 1;
  const md = fs.readFileSync(MD, 'utf8');
  const lineas = md.split(/\r?\n/);
  let y = MARGEN;
  let enCodigo = false;

  const esBloqueTabla = (s) => s.trim().startsWith('|');
  const esListaNumerada = (s) => /^\d+\.\s+/.test(s.trim());

  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i].trim();

    if (linea.startsWith('```')) {
      enCodigo = !enCodigo;
      y += 6;
      continue;
    }
    if (enCodigo) {
      y = saltoSiNecesario(doc, y, total, 14);
      let cadena = lineas[i] || ' ';
      // evita desbordar: recorta lÃ­neas muy largas
      const maxChars = 120;
      if (cadena.length > maxChars) cadena = cadena.slice(0, maxChars - 1) + 'â€¦';
      doc.fillColor('#222222')
        .font(MONO).fontSize(8.5)
        .text(cadena, MARGEN + 8, y, { width: ANCHO_TEXTO - 16 });
      y = doc.y + 9;
      continue;
    }
    if (linea === '') { y += 2; continue; }
    if (linea.startsWith('<!-- pagebreak -->')) { nuevaPagina(doc, total); y = MARGEN; continue; }
    if (linea.startsWith('---')) { y += 6; continue; }

    if (/^#{1,4} /.test(linea)) {
      const nivel = linea.match(/^(#+)/)[1].length;
      const texto = linea.replace(/^#+\s*/, '');
      if (nivel === 1) {
        if (y > MARGEN + 20) { nuevaPagina(doc, total); y = MARGEN; }
        doc.font(FUENTE_BOLD).fontSize(20).fillColor('#1b5e20')
          .text(texto, MARGEN, y + 8, { width: ANCHO_TEXTO });
        y = doc.y + 8;
        doc.moveTo(MARGEN, y).lineTo(A4_W - MARGEN, y)
          .lineWidth(1.4).strokeColor('#1b5e20').stroke();
        y += 14;
      } else if (nivel === 2) {
        y = saltoSiNecesario(doc, y, total, 50);
        doc.font(FUENTE_BOLD).fontSize(15).fillColor('#2e7d32')
          .text(texto, MARGEN, y, { width: ANCHO_TEXTO });
        y = doc.y + 8;
      } else {
        y = saltoSiNecesario(doc, y, total, 40);
        doc.font(FUENTE_BOLD).fontSize(13).fillColor('#33691e')
          .text(texto, MARGEN, y, { width: ANCHO_TEXTO });
        y = doc.y + 6;
      }
      continue;
    }

    if (linea.startsWith('> ')) {
      y = saltoSiNecesario(doc, y, total, 70);
      doc.save()
        .rect(MARGEN, y, 3, INTERLINEADO * 0.66).fill('#2e7d32');
      y = renderRuns(doc, y, linea.slice(2), { x: MARGEN + 12, width: ANCHO_TEXTO - 24, after: 10 });
      continue;
    }

    if (esBloqueTabla(linea)) {
      const filas = [];
      while (i < lineas.length && esBloqueTabla(lineas[i])) {
        const fila = lineas[i].trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
        if (!fila.every(c => /^:?-+:?$/.test(c))) filas.push(fila);
        i++;
      }
      i--;
      const cols = filas.length ? filas[0].length : 1;
      const colW = ANCHO_TEXTO / cols;
      const pad = 4;
      // primera pasada: calcular altos por fila
      const altos = filas.map(fila => {
        let maxH = 16;
        fila.slice(0, cols).forEach((c, ci) => {
          const partes = tokenizar(c);
          let lines = 1;
          const cellW = Math.max(colW - pad * 2, 30);
          const words = (partes.length ? partes.map(p => p.texto).join(' ') : '').split(/\s+/);
          let acum = '';
          const estimador = (s) => doc.font(FUENTE).fontSize(9.5).widthOfString(s);
          for (const w of words) {
            const cand = acum ? acum + ' ' + w : w;
            if (estimador(cand) > cellW && acum) { lines++; acum = w; } else { acum = cand; }
          }
          maxH = Math.max(maxH, lines * 11 + 8);
        });
        return maxH;
      });

      for (let fi = 0; fi < filas.length; fi++) {
        const fila = filas[fi];
        const alto = altos[fi];
        y = saltoSiNecesario(doc, y, total, alto + 4);
        let x = MARGEN;
        for (let ci = 0; ci < cols; ci++) {
          const c = (fila[ci] || '').replace(/\*\*/g, '');
          doc.rect(x, y, colW, alto).stroke(fi === 0 ? '#1b5e20' : '#c5c5c5');
          doc.font(fi === 0 ? FUENTE_BOLD : FUENTE).fontSize(fi === 0 ? 10 : 9.5)
            .fillColor(fi === 0 ? '#ffffff' : '#222222');
          if (fi === 0) doc.rect(x, y, colW, alto).fill('#2e7d32');
          doc.fillColor(fi === 0 ? '#ffffff' : '#222222')
            .text(c, x + pad, y + 3, { width: colW - pad * 2 });
          x += colW;
        }
        y += alto;
      }
      y += 8;
      continue;
    }

    if (/^[-*] /.test(linea)) {
      y = saltoSiNecesario(doc, y, total, 30);
      y = renderRuns(doc, y, linea.slice(2), { bullet: true, after: 8 });
      continue;
    }

    if (esListaNumerada(linea)) {
      y = saltoSiNecesario(doc, y, total, 30);
      const idx = linea.indexOf(' ');
      doc.font(FUENTE_BOLD).fontSize(TAMANO).fillColor('#111111')
        .text(linea.slice(0, idx), MARGEN, y, { width: 30 });
      y = renderRuns(doc, y, linea.slice(idx + 1), { x: MARGEN + 18, width: ANCHO_TEXTO - 18, after: 8 });
      continue;
    }

    // pÃ¡rrafo: puede abarcar varias lÃ­neas hasta el bloque vacÃ­o
    const parrafo = [linea];
    while (i + 1 < lineas.length) {
      const sig = lineas[i + 1].trim();
      if (sig === '' || sig.startsWith('```') || /^#{1,4} /.test(sig) || sig.startsWith('---')
          || esBloqueTabla(sig) || /^[-*] /.test(sig) || esListaNumerada(sig)
          || sig.startsWith('> ') || sig.startsWith('<!-- pagebreak -->')) break;
      parrafo.push(sig);
      i++;
    }
    y = saltoSiNecesario(doc, y, total, 60);
    y = renderRuns(doc, y, parrafo.join(' '), { after: INTERLINEADO * 0.9 });
  }
}

// ---------- Cabecera y pie ----------
function armarCabYPie(doc, total) {
  let n = 0;
  doc.on('pageAdded', () => {
    n++;
    if (n === 1) return;
    doc.save();
    doc.font(FUENTE).fontSize(9).fillColor('#888888')
      .text(TITULO_TRABAJO, MARGEN, 16, { width: ANCHO_TEXTO, align: 'right' });
    doc.moveTo(MARGEN, 30).lineTo(A4_W - MARGEN, 30).lineWidth(0.6).strokeColor('#dddddd').stroke();
    doc.font(FUENTE).fontSize(9).fillColor('#555555')
      .text(total ? `PÃ¡gina ${n} de ${total}` : `PÃ¡gina ${n}`, MARGEN, A4_H - 28, { width: ANCHO_TEXTO, align: 'center' });
    doc.restore();
  });
  return { paginas: () => n };
}

// ---------- CarÃ¡tula ----------
function dibujarCaratula(doc) {
  let y = 70;
  doc.font(FUENTE_BOLD).fontSize(18).fillColor('#1b5e20')
    .text(PORTADA.olimp, MARGEN, y, { width: ANCHO_TEXTO, align: 'center' });
  y = doc.y + 4;
  doc.font(FUENTE).fontSize(13).fillColor('#2e7d32')
    .text(PORTADA.instancia, MARGEN, y, { width: ANCHO_TEXTO, align: 'center' });
  y = doc.y + 30;
  doc.font(FUENTE_BOLD).fontSize(20).fillColor('#000000')
    .text(PORTADA.titulo, MARGEN, y, { width: ANCHO_TEXTO, align: 'center' });
  y = doc.y + 8;
  doc.font(FUENTE).fontSize(12).fillColor('#333333')
    .text(PORTADA.subtitulo, MARGEN, y, { width: ANCHO_TEXTO, align: 'center' });
  y = doc.y + 32;

  doc.font(FUENTE_BOLD).fontSize(12).fillColor('#1b5e20').text(PORTADA.cue, MARGEN, y, { width: ANCHO_TEXTO, align: 'center' });
  y = doc.y + 3;
  doc.font(FUENTE).fontSize(12).fillColor('#000000').text(PORTADA.escuela, MARGEN, y, { width: ANCHO_TEXTO, align: 'center' });
  y = doc.y + 3;
  doc.text(PORTADA.localidad, MARGEN, y, { width: ANCHO_TEXTO, align: 'center' });
  y = doc.y + 34;

  doc.font(FUENTE_BOLD).fontSize(11).fillColor('#222222').text(PORTADA.profe.label, MARGEN, y, { width: ANCHO_TEXTO });
  y = doc.y + 3;
  doc.font(FUENTE).fontSize(11).fillColor('#000000').text(PORTADA.profe.nombre, MARGEN, y, { width: ANCHO_TEXTO });
  y = doc.y + 2;
  doc.font(FUENTE).fontSize(10).fillColor('#333333').text(PORTADA.profe.titulo, MARGEN, y, { width: ANCHO_TEXTO });
  y = doc.y + 2;
  doc.text(PORTADA.profe.cargo, MARGEN, y, { width: ANCHO_TEXTO });
  y = doc.y + 2;
  doc.text(`Correo: ${PORTADA.profe.correo}    TelÃ©fono: ${PORTADA.profe.tel}`, MARGEN, y, { width: ANCHO_TEXTO });
  y = doc.y + 30;

  doc.font(FUENTE_BOLD).fontSize(11).fillColor('#222222').text('Estudiantes integrantes del equipo', MARGEN, y, { width: ANCHO_TEXTO });
  y = doc.y + 8;
  PORTADA.estudiantes.forEach(e => {
    doc.font(FUENTE).fontSize(11).fillColor('#000000')
      .text(`${e.appynom}  â€”  ${e.esp}  â€”  Curso ${e.ciclo}  â€”  ${e.anio} aÃ±o`, MARGEN + 12, y, { width: ANCHO_TEXTO - 12 });
    y = doc.y + 7;
  });

  y = doc.y + 30;
  doc.moveTo(MARGEN + 40, y).lineTo(A4_W - MARGEN - 40, y).lineWidth(1).strokeColor('#2e7d32').stroke();
  y += 14;
  doc.font(FUENTE_BOLD).fontSize(11).fillColor('#1b5e20')
    .text(PORTADA.archivo, MARGEN, y, { width: ANCHO_TEXTO, align: 'center' });
}

// ---------- Pasadas ----------
function nuevaDoc() {
  const doc = new PDFDocument({ size: 'A4', margin: { top: MARGEN, left: MARGEN, right: MARGEN, bottom: 18 } });
  doc.registerFont(FUENTE, FONT);
  doc.registerFont(FUENTE_BOLD, FONT_BOLD);
  return doc;
}

function generar() {
  // PASADA 1: solo contar (sin total en pie)
  const d1 = nuevaDoc();
  const out1 = fs.createWriteStream(path.join(DIR, '_contador.pdf'));
  d1.pipe(out1);
  dibujarCaratula(d1);
  renderContenido(d1, 0);
  d1.end();
  out1.on('finish', () => {
    const total = nPag;   // cantidad de pÃ¡ginas de la pasada 1
    const d2 = nuevaDoc();
    const out2 = fs.createWriteStream(OUT);
    d2.pipe(out2);
    dibujarCaratula(d2);
    renderContenido(d2, total);
    d2.end();
    out2.on('finish', () => {
      const size = fs.statSync(OUT).size;
      console.log(`PDF OK: ${OUT} (${size} bytes, ${total} pÃ¡ginas)`);
      try { fs.unlinkSync(path.join(DIR, '_contador.pdf')); } catch (e) {}
    });
    out2.on('error', e => console.error('Error al escribir PDF:', e.message));
  });
  out1.on('error', e => console.error('Error en pasada 1:', e.message));
}

generar();
