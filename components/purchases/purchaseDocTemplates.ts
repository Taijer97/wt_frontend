import { PurchaseEntry } from '../../types';

export const fmtDateEs = (iso?: string) => {
  const dt = iso ? new Date(iso) : new Date();
  const meses = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ];
  return `${dt.getDate()} de ${meses[dt.getMonth()]} del año ${dt.getFullYear()}`;
};

export const curr = (v?: number) => {
  const num = v || 0;
  return `S/ ${num.toFixed(2)}`.replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

export const buildContractHtml = (p: PurchaseEntry) => {
  const fecha = fmtDateEs(p.date);
  const base = curr(p.priceAgreed || 0);
  const vendedorNombre = p.providerName || '';
  const vendedorDni = p.providerDni || '';
  const vendedorDir = p.providerAddress || '';
  const vendedorTelefono = p.providerPhone || '';
  const compradorNombre = p.intermediaryName || '';
  const compradorDoc = p.intermediaryDocNumber || '';
  const compradorRuc = p.intermediaryRucNumber || '';
  const compradorDir = p.intermediaryAddress || '';
  const cat = p.productType || '';
  const brand = p.productBrand || '';
  const model = p.productModel || '';
  const serial = p.productSerial || '';
  const cond = p.productCondition || '';
  const banco = p.bankOrigin || '';
  const cuenta = p.bankAccount || '';

  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Contrato de Compra-Venta</title><style>@page{size:A4;margin:2.2cm}body{font-family:Arial,sans-serif;font-size:13.2px;line-height:1.45;color:#000}h2{text-align:center;text-transform:uppercase;margin-bottom:10px}p{margin:5px 0;text-align:justify}.firmas{margin-top:28px;display:flex;justify-content:space-between;width:100%}.firma{width:48%}.firma-contenido{display:flex;justify-content:space-between;align-items:flex-end;gap:10px}.firma-texto{text-align:center;flex:1}.linea{border-top:1px solid #000;margin:40px 0 5px 0;width:100%}.huella-container{text-align:center}.huella-box{width:80px;height:80px;border:1.5px solid #000}.huella-label{font-size:10px;margin-top:2px}.footer{margin-top:15px;font-size:10.5px;color:#555;text-align:center}.space{height:100px}@media print{body{margin:0}}</style></head><body><h2>Contrato de Compra-Venta</h2><p><strong>Fecha:</strong> ${fecha}</p><p>Conste por el presente documento el <strong>Contrato de Compra-Venta</strong> que celebran, de una parte el <strong>PROPIETARIO (VENDEDOR)</strong> y, de la otra, el <strong>COMPRADOR (INTERMEDIARIO)</strong>, conforme a las cláusulas siguientes:</p><p><strong>PRIMERA: DATOS DEL VENDEDOR</strong></p><p>Nombre: ${vendedorNombre}.<br>DNI: ${vendedorDni}.<br>Dirección: ${vendedorDir}.<br>Teléfono: ${vendedorTelefono}.</p><p><strong>SEGUNDA: DATOS DEL COMPRADOR (INTERMEDIARIO)</strong></p><p>Nombre: ${compradorNombre}.<br>Documento / RUC: ${compradorDoc} / ${compradorRuc}.<br>Dirección: ${compradorDir}.</p><p><strong>TERCERA: DESCRIPCIÓN DEL EQUIPO</strong></p><p>Categoría: ${cat}. Marca: ${brand}. Modelo: ${model}.<br>Número de serie: ${serial}. Condición: ${cond}.</p><p><strong>CUARTA: PRECIO Y ACUERDO COMERCIAL</strong></p><p>El precio de venta asciende a la suma de <strong>${base}</strong>, monto que el COMPRADOR declara haber cancelado en su totalidad.${banco ? ` Dicho pago se realizó a través del banco <strong>${banco}</strong>` : ''}${cuenta ? ` a la cuenta <strong>${cuenta}</strong>` : ''}.</p><p><strong>QUINTA: DECLARACIONES</strong></p><p>El VENDEDOR declara ser legítimo propietario del bien descrito, libre de cargas o gravámenes. El COMPRADOR declara haber revisado y aceptado el equipo conforme.</p><p><strong>SEXTA: CONFORMIDAD</strong></p><p>Leído que fue el presente contrato, ambas partes lo firman en señal de conformidad en la fecha indicada.</p><div class="space"></div><div class="firmas"><div class="firma"><div class="firma-contenido"><div class="firma-texto"><div class="linea"></div><strong>VENDEDOR</strong><br>Nombre: ${vendedorNombre}<br>DNI: ${vendedorDni}</div><div class="huella-container"><div class="huella-box"></div><div class="huella-label">Huella</div></div></div></div><div class="firma"><div class="firma-contenido"><div class="firma-texto"><div class="linea"></div><strong>COMPRADOR / INTERMEDIARIO</strong><br>Nombre: ${compradorNombre}<br>DNI / RUC: ${compradorDoc} / ${compradorRuc}</div><div class="huella-container"><div class="huella-box"></div><div class="huella-label">Huella</div></div></div></div></div></body></html>`;
};

export const buildDjHtml = (p: PurchaseEntry) => {
  const fecha = fmtDateEs(p.date);
  const vendedorNombre = p.providerName || '';
  const vendedorDni = p.providerDni || '';
  const vendedorDir = p.providerAddress || '';
  const cat = p.productType || '';
  const brand = p.productBrand || '';
  const model = p.productModel || '';
  const serial = p.productSerial || '';
  const cond = p.productCondition || '';

  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Declaración Jurada de Origen</title><style>@page{size:A4;margin:2.2cm}body{font-family:Arial,sans-serif;font-size:13.2px;line-height:1.5;color:#000}h2{text-align:center;text-transform:uppercase;margin-bottom:12px;letter-spacing:.5px}p{margin:6px 0;text-align:justify}.section{margin-top:10px}.firma{margin-top:50px}.firma-contenido{display:flex;justify-content:center;align-items:flex-end;gap:20px}.firma-texto{text-align:center}.linea{border-top:1px solid #000;margin:50px auto 6px auto;width:220px}.huella-container{text-align:center}.huella-box{width:80px;height:80px;border:1.5px solid #000}.huella-label{font-size:10px;margin-top:2px}.footer{margin-top:20px;font-size:10px;color:#555;text-align:center}.space{height:100px}@media print{body{margin:0}}</style></head><body><h2>Declaración Jurada de Origen</h2><p><strong>Fecha:</strong> ${fecha}</p><p>Yo, <strong>${vendedorNombre}</strong>, identificado con Documento Nacional de Identidad (DNI) N.º <strong>${vendedorDni}</strong>, con domicilio en <strong>${vendedorDir}</strong>, declaro bajo juramento lo siguiente:</p><p class="section"><strong>PRIMERA: DECLARACIÓN DE PROPIEDAD</strong></p><p>Declaro ser único y legítimo propietario del bien descrito en la presente declaración, el cual ha sido obtenido de manera lícita, sin vulnerar derechos de terceros y conforme a la normativa vigente.</p><p class="section"><strong>SEGUNDA: DESCRIPCIÓN DEL BIEN</strong></p><p>Categoría: <strong>${cat}</strong>. Marca: <strong>${brand}</strong>. Modelo: <strong>${model}</strong>. Número de serie: <strong>${serial}</strong>. Condición: <strong>${cond}</strong>.</p><p class="section"><strong>TERCERA: RESPONSABILIDAD</strong></p><p>Declaro que el bien no se encuentra reportado como robado, extraviado, ni vinculado a actividades ilícitas. Asumo plena responsabilidad civil, administrativa y penal en caso de que la presente declaración resulte falsa.</p><p class="section"><strong>CUARTA: FINALIDAD</strong></p><p>La presente Declaración Jurada se emite para los fines legales que correspondan, sirviendo como constancia del origen y propiedad del bien descrito.</p><p class="section"><strong>QUINTA: CONFORMIDAD</strong></p><p>Firmo la presente declaración en señal de conformidad, en la fecha indicada.</p><div class="space"></div><div class="firma"><div class="firma-contenido"><div class="firma-texto"><div class="linea"></div><strong>DECLARANTE</strong><br>Nombre: ${vendedorNombre}<br>DNI: ${vendedorDni}</div><div class="huella-container"><div class="huella-box"></div><div class="huella-label">Huella</div></div></div></div><div class="footer">Documento generado electrónicamente</div></body></html>`;
};
