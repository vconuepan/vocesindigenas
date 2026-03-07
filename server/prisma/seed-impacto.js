const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {

  const issues = [
    { id: 'issue-clima-001', name: 'Pueblos Indigenas, Cambio Climatico y Biodiversidad', slug: 'clima-biodiversidad', description: 'Cambio climatico y proteccion de la biodiversidad en territorios indigenas' },
    { id: 'issue-ddhh-002', name: 'Empresas, Derechos Humanos y Pueblos Indigenas', slug: 'empresas-derechos-humanos', description: 'Responsabilidad empresarial y derechos humanos de pueblos indigenas' },
    { id: 'issue-emp-003', name: 'Emprendimiento y Empresas Indigenas', slug: 'emprendimiento-indigena', description: 'Emprendimiento, economia y empresas de pueblos indigenas' },
    { id: 'issue-paz-004', name: 'Pueblos Indigenas, Conflictos, Reconciliacion y Paz', slug: 'reconciliacion-paz', description: 'Conflictos, reconciliacion y construccion de paz con pueblos indigenas' },
  ];

  for (const issue of issues) {
    await prisma.issue.upsert({
      where: { slug: issue.slug },
      update: { name: issue.name, description: issue.description },
      create: { id: issue.id, name: issue.name, slug: issue.slug, description: issue.description, promptFactors: '', promptAntifactors: '', promptRatings: '', intro: '', evaluationIntro: '', evaluationCriteria: '', makeADifference: '' },
    });
    console.log('issue:', issue.name);
  }

  const feeds = [
    // CLIMA Y BIODIVERSIDAD
    { title: 'Mongabay', rssUrl: 'https://news.mongabay.com/feed/', slug: 'clima-biodiversidad', language: 'en', region: 'global' },
    { title: 'Carbon Brief', rssUrl: 'https://www.carbonbrief.org/feed', slug: 'clima-biodiversidad', language: 'en', region: 'global' },
    { title: 'The Guardian Environment', rssUrl: 'https://www.theguardian.com/environment/rss', slug: 'clima-biodiversidad', language: 'en', region: 'global' },
    { title: 'Climate Home News', rssUrl: 'https://www.climatechangenews.com/feed/', slug: 'clima-biodiversidad', language: 'en', region: 'global' },
    { title: 'IUCN News', rssUrl: 'https://www.iucn.org/news/rss.xml', slug: 'clima-biodiversidad', language: 'en', region: 'global' },
    { title: 'WWF News', rssUrl: 'https://www.worldwildlife.org/stories.rss', slug: 'clima-biodiversidad', language: 'en', region: 'global' },
    { title: 'Servindi Ambiente', rssUrl: 'https://www.servindi.org/rss.xml', slug: 'clima-biodiversidad', language: 'es', region: 'latin_america' },

    // EMPRESAS Y DERECHOS HUMANOS
    { title: 'Business and Human Rights Resource Centre', rssUrl: 'https://www.business-humanrights.org/en/rss/', slug: 'empresas-derechos-humanos', language: 'en', region: 'global' },
    { title: 'Global Witness', rssUrl: 'https://www.globalwitness.org/en/feed/', slug: 'empresas-derechos-humanos', language: 'en', region: 'global' },
    { title: 'Forest Peoples Programme', rssUrl: 'https://www.forestpeoples.org/rss.xml', slug: 'empresas-derechos-humanos', language: 'en', region: 'global' },
    { title: 'Human Rights Watch', rssUrl: 'https://www.hrw.org/rss/news.xml', slug: 'empresas-derechos-humanos', language: 'en', region: 'global' },
    { title: 'Amnesty International', rssUrl: 'https://www.amnesty.org/en/feed/', slug: 'empresas-derechos-humanos', language: 'en', region: 'global' },
    { title: 'FIDH News', rssUrl: 'https://www.fidh.org/en/rss', slug: 'empresas-derechos-humanos', language: 'en', region: 'global' },

    // EMPRENDIMIENTO INDIGENA
    { title: 'Stanford Social Innovation Review', rssUrl: 'https://ssir.org/site/rss_2.0', slug: 'emprendimiento-indigena', language: 'en', region: 'global' },
    { title: 'Devex Development', rssUrl: 'https://www.devex.com/news/rss.xml', slug: 'emprendimiento-indigena', language: 'en', region: 'global' },
    { title: 'Cultural Survival', rssUrl: 'https://www.culturalsurvival.org/rss.xml', slug: 'emprendimiento-indigena', language: 'en', region: 'global' },
    { title: 'IWGIA News', rssUrl: 'https://www.iwgia.org/en/news.rss', slug: 'emprendimiento-indigena', language: 'en', region: 'global' },
    { title: 'NACLA Report', rssUrl: 'https://nacla.org/rss.xml', slug: 'emprendimiento-indigena', language: 'en', region: 'latin_america' },

    // RECONCILIACION Y PAZ
    { title: 'UN Indigenous Peoples', rssUrl: 'https://www.un.org/development/desa/indigenouspeoples/feed', slug: 'reconciliacion-paz', language: 'en', region: 'global' },
    { title: 'International Crisis Group', rssUrl: 'https://www.crisisgroup.org/rss.xml', slug: 'reconciliacion-paz', language: 'en', region: 'global' },
    { title: 'Peace Direct', rssUrl: 'https://www.peacedirect.org/feed/', slug: 'reconciliacion-paz', language: 'en', region: 'global' },
    { title: 'Berghof Foundation', rssUrl: 'https://berghof-foundation.org/feed', slug: 'reconciliacion-paz', language: 'en', region: 'global' },
    { title: 'OHCHR News', rssUrl: 'https://www.ohchr.org/en/rss/news', slug: 'reconciliacion-paz', language: 'en', region: 'global' },
    { title: 'Survival International', rssUrl: 'https://www.survivalinternational.org/news/rss', slug: 'reconciliacion-paz', language: 'en', region: 'global' },
    { title: 'Indian Country Today', rssUrl: 'https://indiancountrytoday.com/feed', slug: 'reconciliacion-paz', language: 'en', region: 'north_america' },
  ];

  for (const feed of feeds) {
    const issue = await prisma.issue.findUnique({ where: { slug: feed.slug } });
    if (!issue) { console.log('issue no encontrado:', feed.slug); continue; }
    const existing = await prisma.feed.findUnique({ where: { rssUrl: feed.rssUrl } });
    if (existing) { console.log('ya existe:', feed.title); continue; }
    await prisma.feed.create({
      data: { title: feed.title, rssUrl: feed.rssUrl, language: feed.language, region: feed.region, issueId: issue.id, active: true, crawlIntervalHours: 6 }
    });
    console.log('feed creado:', feed.title);
  }

  console.log('LISTO - issues y feeds creados');
  process.exit(0);
}
main().catch(e => { console.error(e.message); process.exit(1); });
"
