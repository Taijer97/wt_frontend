import axios from 'axios';

const sanitize = (s?: string) => (s || '').trim().replace(/^['"`]+|['"`]+$/g, '');
const base =
  sanitize((import.meta as any).env?.VITE_API_RUC_URL) ||
  'https://dniruc.apisperu.com/api/v1/ruc';
const token = sanitize((import.meta as any).env?.VITE_API_RUC_TOKEN) || sanitize((import.meta as any).env?.VITE_API_DNI_TOKEN) || '';

const factilizaBase =
  sanitize((import.meta as any).env?.VITE_API_FACTILIZA_URL) ||
  sanitize((import.meta as any).env?.VITE_FACTILIZA_URL) ||
  'https://api.factiliza.com/v1';
const factilizaToken =
  sanitize((import.meta as any).env?.VITE_API_FACTILIZA_TOKEN) ||
  sanitize((import.meta as any).env?.VITE_FACTILIZA_TOKEN) ||
  '';
const useApisPeruForRuc = String((import.meta as any).env?.VITE_USE_APISPERU_FOR_RUC || '').toLowerCase() === 'true';

export async function fetchRuc(ruc: string) {
  if (!useApisPeruForRuc && factilizaToken) {
    try {
      const url = `${factilizaBase.replace(/\/+$/, '')}/ruc/info/${ruc}`;
      const auth = factilizaToken.toLowerCase().startsWith('bearer ') ? factilizaToken : `Bearer ${factilizaToken}`;
      const res = await axios.get(url, { headers: { Authorization: auth } });
      const payload = res.data || {};
      if (payload?.status === 200 && payload?.success === true) {
        const d = payload.data || {};
        return {
          ruc: d.numero || ruc,
          razonSocial: d.nombre_o_razon_social || d.razonSocial || '',
          nombreComercial: d.nombre_comercial || d.nombreComercial || '',
          direccion: d.direccion_completa || d.direccion || '',
          departamento: d.departamento || '',
          provincia: d.provincia || '',
          distrito: d.distrito || '',
          estado: d.estado || '',
          condicion: d.condicion || '',
        };
      }
    } catch (err: any) {
      console.warn('[RUC API] Error en Factiliza, intentando API alternativa:', err?.message);
    }
  }

  if (!base) throw new Error('RUC API base missing');
  if (!token && base.includes('apisperu.com')) {
    throw new Error('RUC API token no configurado');
  }
  const url = `${base.replace(/\/+$/, '')}/${ruc}`;
  try {
    const res = await axios.get(url, { 
      params: token ? { token } : undefined
    });
    console.log(`[RUC API] Conexión exitosa (200) a: ${url}`);
    const responseData = res.data || {};
    const data = responseData.data || responseData;
    
    const razonSocial = data.razonSocial || data.nombre_o_razon_social || '';
    const nombreComercial = data.nombreComercial || '';
    const direccion = data.direccion_completa || data.direccionCompleta || data.direccion || '';
    const departamento = data.departamento || '';
    const provincia = data.provincia || '';
    const distrito = data.distrito || '';
    const estado = data.estado || '';
    const condicion = data.condicion || '';
    return {
      ruc: data.ruc || data.numero || ruc,
      razonSocial,
      nombreComercial,
      direccion,
      departamento,
      provincia,
      distrito,
      estado,
      condicion,
    };
  } catch (err: any) {
    const msg = err?.response?.data?.message || err?.message || 'Error RUC';
    throw new Error(msg);
  }
}
