import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { PrismaClient, CommunityType } from '@prisma/client'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const prisma = new PrismaClient()

const ISSUES = {
  chileIndigena:        'fdf9fd2f-f172-4b73-979a-8b389d506416',
  derechosIndigenas:    'issue-ddhh-002',
  cambioClimatico:      'issue-clima-001',
  reconciliacionYPaz:   'issue-paz-004',
  desarrolloSostenible: 'issue-emp-003',
}

const communities = [
  // ── CAUSAS ─────────────────────────────────────────────────────────
  {
    slug: 'chile-indigena',
    name: 'Pueblos Indígenas de Chile',
    description: 'Noticias sobre los pueblos originarios de Chile: derechos, territorio, cultura y autonomía.',
    type: CommunityType.PUEBLO,
    region: 'Chile',
    issueIds: [ISSUES.chileIndigena],
    keywords: [],
  },
  {
    slug: 'derechos-indigenas',
    name: 'Derechos Humanos y Pueblos Indígenas',
    description: 'Derechos territoriales, consulta previa, DDHH y marcos jurídicos que afectan a los pueblos indígenas.',
    type: CommunityType.CAUSA,
    region: null,
    issueIds: [ISSUES.derechosIndigenas],
    keywords: [],
  },
  {
    slug: 'cambio-climatico',
    name: 'Cambio Climático y Biodiversidad',
    description: 'Impacto del cambio climático en territorios indígenas, defensa de la naturaleza y saberes ancestrales.',
    type: CommunityType.CAUSA,
    region: null,
    issueIds: [ISSUES.cambioClimatico],
    keywords: [],
  },
  {
    slug: 'reconciliacion-y-paz',
    name: 'Conflictos, Reconciliación y Paz',
    description: 'Conflictos territoriales, procesos de paz y justicia transicional con perspectiva indígena.',
    type: CommunityType.CAUSA,
    region: null,
    issueIds: [ISSUES.reconciliacionYPaz],
    keywords: [],
  },
  {
    slug: 'desarrollo-sostenible',
    name: 'Emprendimiento y Empresas Indígenas',
    description: 'Economías comunitarias, emprendimiento con identidad y desarrollo autodeterminado.',
    type: CommunityType.CAUSA,
    region: null,
    issueIds: [ISSUES.desarrolloSostenible],
    keywords: [],
  },

  // ── PUEBLOS ─────────────────────────────────────────────────────────
  {
    slug: 'mapuche',
    name: 'Pueblo Mapuche',
    description: 'El pueblo más numeroso de Chile y Argentina. Noticias sobre su territorio, cultura, autonomía y conflictos en el Wallmapu.',
    type: CommunityType.PUEBLO,
    region: 'Chile y Argentina',
    issueIds: [ISSUES.chileIndigena, ISSUES.derechosIndigenas, ISSUES.reconciliacionYPaz],
    keywords: ['mapuche', 'mapuches', 'wallmapu', 'pehuenche', 'lafkenche', 'pewenche', 'mapuche-ngulu', 'mapuche-willi'],
  },
  {
    slug: 'aymara',
    name: 'Pueblo Aymara',
    description: 'Pueblo ancestral del altiplano. Noticias sobre comunidades aymara en Chile, Bolivia y Perú.',
    type: CommunityType.PUEBLO,
    region: 'Chile, Bolivia, Perú',
    issueIds: [ISSUES.chileIndigena, ISSUES.derechosIndigenas, ISSUES.cambioClimatico],
    keywords: ['aymara', 'aymaras', 'aimara', 'aimaras'],
  },
  {
    slug: 'rapa-nui',
    name: 'Pueblo Rapa Nui',
    description: 'El pueblo originario de Isla de Pascua. Autonomía, patrimonio, soberanía y derechos en Rapa Nui.',
    type: CommunityType.PUEBLO,
    region: 'Isla de Pascua, Chile',
    issueIds: [ISSUES.chileIndigena, ISSUES.derechosIndigenas],
    keywords: ['rapa nui', 'rapanui', 'isla de pascua', 'pascuense', 'easter island'],
  },
  {
    slug: 'quechua',
    name: 'Pueblos Quechua',
    description: 'Los pueblos quechua-hablantes de los Andes. Cultura, derechos y resistencia en Perú, Bolivia, Ecuador y Colombia.',
    type: CommunityType.PUEBLO,
    region: 'Andes (Perú, Bolivia, Ecuador, Colombia)',
    issueIds: [ISSUES.derechosIndigenas, ISSUES.reconciliacionYPaz, ISSUES.desarrolloSostenible],
    keywords: ['quechua', 'quechuas', 'kichwa', 'kichwas', 'quichua', 'runasimi'],
  },
  {
    slug: 'guarani',
    name: 'Pueblo Guaraní',
    description: 'Noticias sobre el pueblo guaraní en Paraguay, Argentina, Bolivia y Brasil: territorio, lengua y derechos.',
    type: CommunityType.PUEBLO,
    region: 'Paraguay, Argentina, Bolivia, Brasil',
    issueIds: [ISSUES.derechosIndigenas, ISSUES.reconciliacionYPaz],
    keywords: ['guaraní', 'guarani', 'guaraníes', 'guaranies', 'pueblo guaraní'],
  },
  {
    slug: 'pueblos-amazonicos',
    name: 'Pueblos Amazónicos',
    description: 'Comunidades indígenas de la cuenca amazónica: defensa del territorio, selva y derechos en Brasil, Perú, Colombia, Ecuador y Bolivia.',
    type: CommunityType.PUEBLO,
    region: 'Cuenca Amazónica',
    issueIds: [ISSUES.derechosIndigenas, ISSUES.cambioClimatico, ISSUES.reconciliacionYPaz],
    keywords: ['amazónico', 'amazónicos', 'pueblos amazónicos', 'indígenas amazónicos', 'yanomami', 'asháninka', 'awajún', 'waorani'],
  },

  // ── TERRITORIOS ─────────────────────────────────────────────────────
  {
    slug: 'wallmapu-araucania',
    name: 'Wallmapu / Araucanía',
    description: 'Territorio histórico mapuche. Conflictos de tierras, autonomía y noticias de las regiones de La Araucanía, Los Ríos y Los Lagos.',
    type: 'TERRITORIO' as CommunityType,
    region: 'Regiones XIV-IX, Chile',
    issueIds: [ISSUES.chileIndigena, ISSUES.derechosIndigenas, ISSUES.reconciliacionYPaz],
    keywords: ['araucanía', 'la araucanía', 'wallmapu', 'araucano', 'región de la araucanía', 'temuco', 'cautín', 'malleco'],
  },
  {
    slug: 'amazonia',
    name: 'Amazonía',
    description: 'El territorio indígena más extenso del mundo. Deforestación, megaproyectos y resistencia de los pueblos de la selva.',
    type: 'TERRITORIO' as CommunityType,
    region: 'Brasil, Perú, Colombia, Bolivia, Ecuador',
    issueIds: [ISSUES.derechosIndigenas, ISSUES.cambioClimatico],
    keywords: ['amazonía', 'amazonia', 'amazon', 'cuenca amazónica', 'panamazónico', 'selva amazónica', 'panamazonía'],
  },
  {
    slug: 'andes-altiplano',
    name: 'Andes y Altiplano',
    description: 'Los pueblos de la cordillera andina y el altiplano: agua, minería, identidad y derechos en el corazón de Sudamérica.',
    type: 'TERRITORIO' as CommunityType,
    region: 'Chile, Bolivia, Perú, Argentina, Ecuador, Colombia',
    issueIds: [ISSUES.derechosIndigenas, ISSUES.cambioClimatico, ISSUES.desarrolloSostenible],
    keywords: ['andes', 'altiplano', 'andino', 'andina', 'cordillera andina', 'cordillera de los andes', 'puna'],
  },
  {
    slug: 'patagonia',
    name: 'Patagonia',
    description: 'Territorio austral compartido por Chile y Argentina. Megaproyectos, glaciares, pueblos originarios y soberanía en el sur del mundo.',
    type: 'TERRITORIO' as CommunityType,
    region: 'Sur de Chile y Argentina',
    issueIds: [ISSUES.chileIndigena, ISSUES.cambioClimatico, ISSUES.reconciliacionYPaz],
    keywords: ['patagonia', 'patagónico', 'patagónica', 'magallanes', 'aysen', 'aysén', 'tierra del fuego'],
  },
  {
    slug: 'gran-chaco',
    name: 'Gran Chaco',
    description: 'La segunda selva más grande de América. Derechos indígenas, deforestación y resistencia en Paraguay, Argentina, Bolivia y Brasil.',
    type: 'TERRITORIO' as CommunityType,
    region: 'Paraguay, Argentina, Bolivia, Brasil',
    issueIds: [ISSUES.derechosIndigenas, ISSUES.reconciliacionYPaz, ISSUES.cambioClimatico],
    keywords: ['chaco', 'gran chaco', 'chaqueño', 'chaqueña', 'bajo chaco', 'chaco seco'],
  },
]

async function main() {
  console.log('Seeding communities...')
  for (const c of communities) {
    const existing = await prisma.community.findUnique({ where: { slug: c.slug } })
    if (existing) {
      await prisma.community.update({
        where: { slug: c.slug },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: { name: c.name, description: c.description, type: c.type, region: c.region, issueIds: c.issueIds, keywords: c.keywords } as any,
      })
      console.log(`  updated: ${c.slug}`)
    } else {
      await prisma.community.create({ data: c })
      console.log(`  created: ${c.slug}`)
    }
  }
  console.log('Done.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
