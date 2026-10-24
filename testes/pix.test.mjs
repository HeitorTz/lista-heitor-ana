// Testes do BR Code Pix. Rodar com: npm run teste:pix
import assert from 'node:assert/strict';
import { test } from 'node:test';
import jsQR from 'jsqr';
import { brCodeDoCasal, crc16, montarBrCode } from '../js/pix.js';
import qrcode from '../js/vendor/qrcode.mjs';

test('CRC16-CCITT-FALSE confere com o valor de checagem do padrão', () => {
  // Valor de referência do algoritmo para a entrada "123456789".
  assert.equal(crc16('123456789'), '29B1');
});

test('reproduz o exemplo do Manual do BR Code (Banco Central)', () => {
  const esperado =
    '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-426655440000' +
    '5204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D';
  const gerado = montarBrCode({
    chave: '123e4567-e12b-12d1-a456-426655440000',
    recebedor: 'Fulano de Tal',
    cidade: 'BRASILIA',
  });
  assert.equal(gerado, esperado);
});

test('Pix do casal com valor do item', () => {
  const codigo = brCodeDoCasal(608.88);
  assert.match(codigo, /0121htkarater10@gmail\.com/);
  assert.match(codigo, /5406608\.88/);
  assert.match(codigo, /5915Heitor Tomazeli/);
  assert.match(codigo, /6007Vitoria/);
  assert.equal(codigo.slice(-4), crc16(codigo.slice(0, -4)));
});

test('Pixinho solidário sai sem valor (campo 54 ausente)', () => {
  const codigo = brCodeDoCasal(null);
  assert.doesNotMatch(codigo, /5802BR.*54\d\d/);
  assert.ok(!codigo.includes('5303986' + '54'));
  assert.equal(codigo.slice(-4), crc16(codigo.slice(0, -4)));
});

test('o QR Code gerado decodifica de volta para o mesmo BR Code', () => {
  for (const valor of [null, 1117.96, 37.89]) {
    const codigo = brCodeDoCasal(valor);
    const qr = qrcode(0, 'M');
    qr.addData(codigo);
    qr.make();
    const escala = 4;
    const margem = 4;
    const n = qr.getModuleCount();
    const lado = (n + margem * 2) * escala;
    const pixels = new Uint8ClampedArray(lado * lado * 4).fill(255);
    for (let y = 0; y < lado; y++) {
      for (let x = 0; x < lado; x++) {
        const r = Math.floor(y / escala) - margem;
        const c = Math.floor(x / escala) - margem;
        if (r >= 0 && c >= 0 && r < n && c < n && qr.isDark(r, c)) {
          const i = (y * lado + x) * 4;
          pixels[i] = pixels[i + 1] = pixels[i + 2] = 0;
        }
      }
    }
    const lido = jsQR(pixels, lado, lado);
    assert.ok(lido, 'QR não foi lido');
    assert.equal(lido.data, codigo);
  }
});
