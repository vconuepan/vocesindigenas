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
    { title: 'Mongabay', rssUrl: 'https://news.mongabay.com/feed/', slug: 'clima-biodiversidad' },
    { title: 'Carbon Brief', rssUrl: 'https://www.carbonbrief.org/feed', slug: 'clima-biodiversidad' },
    { title: 'The Guardian Environment', rssUrl: 'https://www.theguardian.com/environment/rss', slug: 'clima-biodiversidad' },
    { title: 'Climate Home News', rssUrl: 'https://www.climatechangenews.com/feed/', slug: 'clima-biodiversidad' },
    { title: 'IUCN News', rssUrl: 'https://www.iucn.org/news/rss.xml', slug: 'clima-biodiversidad' },
    { title: 'WWF News', rssUrl: 'https://www.worldwildlife.org/stories.rss', slug: 'clima-biodiversidad' },
    { title: 'Servindi', rssUrl: 'https://www.servindi.org/rss.xml', slug: 'clima-biodiversidad' },

    // EMPRESAS Y DERECHOS HUMANOS
    { title: 'Business and Human Rights Resource Centre', rssUrl: 'https://www.business-humanrights.org/en/rss/', slug: 'empresas-derechos-humanos' },
    { title: 'Global Witness', rssUrl: 'https://www.globalwitness.org/en/feed/', sl
