// Converte as fotos PNG de assets/ para WebP otimizado, mantendo os originais.
// Uso: npm run webp
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const tarefas = [
  { pasta: 'assets/produtos', larguraMax: 600, qualidade: 80 },
  { pasta: 'assets', larguraMax: 1600, qualidade: 82, so: ['banner.png'] },
];

let antes = 0;
let depois = 0;

for (const { pasta, larguraMax, qualidade, so } of tarefas) {
  const arquivos = (await readdir(pasta)).filter(
    (a) => a.endsWith('.png') && (!so || so.includes(a)),
  );
  for (const arquivo of arquivos) {
    const origem = join(pasta, arquivo);
    const destino = origem.replace(/\.png$/, '.webp');
    await sharp(origem)
      .resize({ width: larguraMax, withoutEnlargement: true })
      .webp({ quality: qualidade, effort: 6 })
      .toFile(destino);
    const [a, d] = [(await stat(origem)).size, (await stat(destino)).size];
    antes += a;
    depois += d;
    console.log(`${origem} → ${destino}  ${(a / 1024).toFixed(0)} KB → ${(d / 1024).toFixed(0)} KB`);
  }
}

console.log(`Total: ${(antes / 1048576).toFixed(1)} MB → ${(depois / 1048576).toFixed(2)} MB`);
