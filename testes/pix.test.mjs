// Testes do BR Code Pix. Rodar com: npm run teste:pix
import assert from 'node:assert/strict';
import { test } from 'node:test';
import jsQR from 'jsqr';
import { composicaoPix, valorPix } from '../js/catalogo.js';
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

test('Pix do item soma o frete ao preço no Pix', () => {
  // Mesa com cadeiras (seção 13): R$ 684,50 + R$ 155,89 de frete.
  const mesa = { precos: [{ valor: 769.02, precoPix: 684.5, frete: 155.89 }] };
  assert.deepEqual(composicaoPix(mesa), { preco: 684.5, frete: 155.89, total: 840.39 });
  assert.equal(valorPix(mesa), 840.39);
  // Sem precoPix, a soma usa o "valor" (Cômoda: R$ 269,98 + R$ 136,49).
  assert.equal(valorPix({ precos: [{ valor: 269.98, frete: 136.49 }] }), 406.47);
  assert.match(brCodeDoCasal(valorPix(mesa)), /5406840\.39/);
});

test('frete 0 (grátis) não muda o valor', () => {
  const jantar = { precos: [{ valor: 424.9, precoPix: 398.05, frete: 0 }] };
  assert.deepEqual(composicaoPix(jantar), { preco: 398.05, frete: 0, total: 398.05 });
});

test('item sem frete levantado sai só com o preço; sem preço, sem Pix', () => {
  const copos = { precos: [{ valor: 37.89 }] };
  assert.deepEqual(composicaoPix(copos), { preco: 37.89, frete: null, total: 37.89 });
  // Duas opções: cada uma com o seu preço (Conjunto de sobremesa).
  const sobremesa = { precos: [{ valor: 95.75 }, { valor: 55.9 }] };
  assert.equal(valorPix(sobremesa, 1), 55.9);
  assert.equal(valorPix({ precos: [null] }), null);
});

test('o catálogo tem frete válido e nenhum total com mais de 2 casas', async () => {
  const { readFile } = await import('node:fs/promises');
  const catalogo = JSON.parse(await readFile(new URL('../dados/itens.json', import.meta.url), 'utf8'));
  assert.equal(catalogo.cepFrete, '29041320');
  for (const item of catalogo.secoes.flatMap((s) => s.itens)) {
    item.precos.forEach((preco, i) => {
      if (preco?.frete != null) assert.ok(preco.frete >= 0, `${item.id}: frete negativo`);
      const total = valorPix(item, i);
      if (total != null) assert.equal(total, Math.round(total * 100) / 100, `${item.id}: ${total}`);
    });
  }
});
