// Leitura do catálogo (dados/itens.json). Itens, links e preços ficam só lá.

export async function carregarCatalogo() {
  const resposta = await fetch('dados/itens.json', { cache: 'no-cache' });
  if (!resposta.ok) throw new Error(`itens.json: HTTP ${resposta.status}`);
  const catalogo = await resposta.json();
  const porId = new Map();
  for (const secao of catalogo.secoes) {
    for (const item of secao.itens) porId.set(item.id, item);
  }
  return { ...catalogo, porId };
}

// Regra D13 + frete: no Pix do item, usa "precoPix" quando existe (senão "valor")
// e soma o "frete" (0 = grátis; ausente = ainda não levantado, soma 0).
// Devolve null quando o item (ou a opção) ainda não tem preço.
export function composicaoPix(item, opcao = 0) {
  const preco = item.precos?.[opcao];
  const base = preco?.precoPix ?? preco?.valor ?? null;
  if (base == null) return null;
  const frete = preco.frete ?? null;
  // Arredonda para centavos: 684.5 + 155.89 daria 840.3900000000001.
  const total = Math.round((base + (frete ?? 0)) * 100) / 100;
  return { preco: base, frete, total };
}

export function valorPix(item, opcao = 0) {
  return composicaoPix(item, opcao)?.total ?? null;
}

export function temDuasOpcoes(item) {
  return item.botoes.length > 1;
}

// Item pode ser presenteado via Pix se pelo menos uma opção tem preço.
export function aceitaPix(item) {
  return item.botoes.some((_, i) => valorPix(item, i) != null);
}

const reais = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export function formatarReais(valor) {
  return reais.format(valor);
}

// Pequeno construtor de elementos: el('p', { class: 'x' }, 'texto', filho).
// Textos sempre entram como textContent (nada de innerHTML com dados).
export function el(tag, atributos = {}, ...filhos) {
  const elemento = document.createElement(tag);
  for (const [nome, valor] of Object.entries(atributos)) {
    if (valor == null || valor === false) continue;
    if (nome.startsWith('on')) elemento.addEventListener(nome.slice(2), valor);
    else if (valor === true) elemento.setAttribute(nome, '');
    else elemento.setAttribute(nome, valor);
  }
  for (const filho of filhos.flat()) {
    if (filho == null || filho === false) continue;
    elemento.append(filho instanceof Node ? filho : document.createTextNode(String(filho)));
  }
  return elemento;
}
