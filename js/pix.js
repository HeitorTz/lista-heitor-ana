// BR Code Pix estático (padrão EMV QRCPS-MPM do Banco Central),
// gerado no navegador, sem serviço externo.

export const PIX = {
  chave: 'htkarater10@gmail.com',
  recebedor: 'Heitor Tomazeli',
  cidade: 'Vitória',
};

// CRC16-CCITT-FALSE: polinômio 0x1021, valor inicial 0xFFFF.
export function crc16(texto) {
  let crc = 0xffff;
  for (let i = 0; i < texto.length; i++) {
    crc ^= texto.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

// O BR Code aceita só caracteres ASCII: tira acentos e limita o tamanho.
function limpar(texto, max) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\x20-\x7e]/g, '')
    .trim()
    .slice(0, max);
}

function campo(id, valor) {
  return id + String(valor.length).padStart(2, '0') + valor;
}

/**
 * Monta o "Pix Copia e Cola".
 * @param {object} p
 * @param {string} p.chave
 * @param {string} p.recebedor  até 25 caracteres
 * @param {string} p.cidade     até 15 caracteres
 * @param {number|null} [p.valor] em reais; sem valor, quem paga digita
 * @param {string} [p.txid]     '***' = sem identificador
 */
export function montarBrCode({ chave, recebedor, cidade, valor = null, txid = '***' }) {
  const contaPix = campo('00', 'br.gov.bcb.pix') + campo('01', chave);
  let payload =
    campo('00', '01') +
    campo('26', contaPix) +
    campo('52', '0000') +
    campo('53', '986') +
    (valor != null && valor > 0 ? campo('54', valor.toFixed(2)) : '') +
    campo('58', 'BR') +
    campo('59', limpar(recebedor, 25)) +
    campo('60', limpar(cidade, 15)) +
    campo('62', campo('05', txid)) +
    '6304';
  return payload + crc16(payload);
}

export function brCodeDoCasal(valor = null) {
  return montarBrCode({ ...PIX, valor });
}
