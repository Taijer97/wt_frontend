import axios from 'axios';

const sanitize = (s?: string) => (s || '').trim().replace(/^['"`]+|['"`]+$/g, '');
const base =
  sanitize((import.meta as any).env?.VITE_API_DNI_URL) ||
  sanitize((import.meta as any).env?.VITE_API_DNI_BASE_URL) ||
  '';
const username = sanitize((import.meta as any).env?.VITE_API_DNI_USER) || '';
const password = sanitize((import.meta as any).env?.VITE_API_DNI_PASSWORD) || '';
const apisPeruToken =
  sanitize((import.meta as any).env?.VITE_API_DNI_TOKEN) ||
  sanitize((import.meta as any).env?.VITE_API_RUC_TOKEN) ||
  '';

let cachedToken: string | null = null;

async function ensureToken() {
  if (cachedToken) return cachedToken;
  if (!base) return '';
  if (!password) throw new Error('DNI API config missing');
  const body: any = username ? { username, password } : { password };
  const res = await axios.post(`${base}/login`, body);
  const data = res.data || {};
  const token =
    data.token ||
    data.access_token ||
    data.accessToken ||
    data.result?.token ||
    '';
  const tokenType = (data.token_type || 'Bearer').toString();
  if (!token) throw new Error('DNI API token missing');
  const auth = `${tokenType.charAt(0).toUpperCase()}${tokenType.slice(1)} ${token}`;
  cachedToken = auth;
  return auth;
}

export async function fetchDni(dni: string) {
  if (base) {
    const auth = await ensureToken();
    const res = await axios.get(`${base.replace(/\/+$/, '')}/search/dni/${dni}`, {
      params: { limit: 100 },
      headers: auth ? { Authorization: auth } : undefined,
    });
    const first = (res.data?.results || [])[0] || {};
    const nombres = first.NOMBRES || '';
    const apPat = first.AP_PAT || '';
    const apMat = first.AP_MAT || '';
    const fullName = [nombres, apPat, apMat].filter(Boolean).join(' ').trim();
    const direccion = first.DIRECCION || '';
    const estadoCivil = (first.EST_CIVIL || '').toUpperCase();
    const fechaNacimiento = first.FECHA_NAC || '';
    const ubigeoDir = first.UBIGEO_DIR || '';
    return {
      dni: first.DNI || dni,
      nombres,
      apPat,
      apMat,
      fullName,
      direccion,
      estadoCivil,
      fechaNacimiento,
      ubigeoDir,
    };
  }
  if (!apisPeruToken) {
    throw new Error('DNI API token no configurado');
  }
  const url = `https://dniruc.apisperu.com/api/v1/dni/${dni}`;
  const res = await axios.get(url, {
    params: { token: apisPeruToken }
  });
  const d = res.data || {};
  const nombres = d.nombres || '';
  const apPat = d.apellidoPaterno || '';
  const apMat = d.apellidoMaterno || '';
  const fullName = [nombres, apPat, apMat].filter(Boolean).join(' ').trim();
  return {
    dni: d.dni || dni,
    nombres,
    apPat,
    apMat,
    fullName,
    direccion: '',
    estadoCivil: '',
    fechaNacimiento: d.fechaNacimiento || '',
    ubigeoDir: '',
  };
}
