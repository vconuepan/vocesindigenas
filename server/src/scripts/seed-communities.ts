import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient, CommunityType } from '@prisma/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();

const communities = [
  {
    slug: 'chile-indigena',
    name: 'Pueblos Indígenas de Chile',
    description:
      'Noticias y análisis sobre los pueblos originarios de Chile: Mapuche, Aymara, Rapa Nui, Atacameño, Quechua, Colla, Diaguita, Kawésqar y Yagán.',
    type: CommunityType.PUEBLO,
    region: 'Cono Sur',
    issueIds: ['fdf9fd2f-f172-4b73-979a-8b389d506416'],
  },
  {
    slug: 'derechos-indigenas',
    name: 'Derechos Humanos y Empresas',
    description:
      'Impacto empresarial en territorios indígenas, responsabilidad corporativa, consulta previa y derechos humanos.',
    type: CommunityType.CAUSA,
    region: null,
    issueIds: ['issue-ddhh-002'],
  },
  {
    slug: 'cambio-climatico',
    name: 'Clima y Biodiversidad',
    description:
      'Cambio climático, biodiversidad y el rol de los pueblos indígenas como guardianes del territorio y el conocimiento ambiental.',
    type: CommunityType.CAUSA,
    region: null,
    issueIds: ['issue-clima-001'],
  },
  {
    slug: 'reconciliacion-y-paz',
    name: 'Paz y Reconciliación',
    description:
      'Conflictos territoriales, defensores de derechos, procesos de paz y reconciliación entre pueblos indígenas y el Estado.',
    type: CommunityType.CAUSA,
    region: null,
    issueIds: ['issue-paz-004'],
  },
  {
    slug: 'desarrollo-sostenible',
    name: 'Emprendimiento Indígena',
    description:
      'Empresas indígenas, economía propia, emprendimiento con identidad y desarrollo sostenible autodeterminado.',
    type: CommunityType.CAUSA,
    region: null,
    issueIds: ['issue-emp-003'],
  },
];

async function main() {
  console.log('Seeding communities...');

  for (const community of communities) {
    const existing = await prisma.community.findUnique({
      where: { slug: community.slug },
    });

    if (existing) {
      console.log(`  skip: ${community.slug} (already exists)`);
      continue;
    }

    await prisma.community.create({ data: community });
    console.log(`  created: ${community.slug}`);
  }

  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
