import axios from 'axios';

const base =
  (import.meta as any).env?.VITE_API_RUC_URL ||
  'https://dniruc.apisperu.com/api/v1/ruc';
const token = (import.meta as any).env?.VITE_API_RUC_TOKEN || '';

export async function fetchRuc(ruc: string) {
  if (!base) throw new Error('RUC API base missing');
  const res = await axios.get(`${base}/${ruc}`, { params: token ? { token } : undefined });
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
