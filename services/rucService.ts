import axios from 'axios';

const sanitize = (s?: string) => (s || '').trim().replace(/^['"`]+|['"`]+$/g, '');
const base =
  sanitize((import.meta as any).env?.VITE_API_RUC_URL) ||
  'https://dniruc.apisperu.com/api/v1/ruc';
const token = sanitize((import.meta as any).env?.VITE_API_RUC_TOKEN) || sanitize((import.meta as any).env?.VITE_API_DNI_TOKEN) || '';

export async function fetchRuc(ruc: string) {
  if (!base) throw new Error('RUC API base missing');
  if (!token && base.includes('apisperu.com')) {
    throw new Error('RUC API token no configurado');
  }
  const url = `${base.replace(/\/+$/, '')}/${ruc}`;
  const res = await axios.get(url, { 
    params: token ? { token } : undefined
  });
  const data = res.data || {};
  const razonSocial = data.razonSocial || '';
  const nombreComercial = data.nombreComercial || '';
  const direccion = data.direccion || '';
  const departamento = data.departamento || '';
  const provincia = data.provincia || '';
  const distrito = data.distrito || '';
  const estado = data.estado || '';
  const condicion = data.condicion || '';
  return {
    ruc: data.ruc || ruc,
    razonSocial,
    nombreComercial,
    direccion,
    departamento,
    provincia,
    distrito,
    estado,
    condicion,
  };
}
