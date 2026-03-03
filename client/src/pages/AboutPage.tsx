import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { GITHUB_REPO_URL } from "../config";
import { SEO, CommonOgTags } from "../lib/seo";
import StructuredData from "../components/StructuredData";
import { buildBreadcrumbSchema } from "../lib/structured-data";
import SupportButton from "../components/SupportButton";

export default function AboutPage() {
  return (
    <>
      <Helmet>
        <title>Quienes Somos - {SEO.siteName}</title>
        <meta
          name="description"
          content="Impacto Indigena es una plataforma de noticias curada por IA que analiza el impacto global en los pueblos indigenas. Parte de Impacto Indigena SpA, empresa social indigena fundada por Venancio Conuepan Mesias."
        />
        <meta property="og:title" content={`Quienes Somos - ${SEO.siteName}`} />
        <meta
          property="og:description"
          content="Impacto Indigena es una plataforma de noticias curada por IA que analiza el impacto global en los pueblos indigenas."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${SEO.siteUrl}/about`} />
        {CommonOgTags({})}
      </Helmet>
      <StructuredData
        data={[
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: `Quienes Somos - ${SEO.siteName}`,
            description:
              "Impacto Indigena es una plataforma de noticias curada por IA que analiza el impacto global en los pueblos indigenas.",
            url: `${SEO.siteUrl}/about`,
            isPartOf: {
              "@type": "WebSite",
              name: SEO.siteName,
              url: SEO.siteUrl,
            },
          },
          buildBreadcrumbSchema([
            { name: "Inicio", url: SEO.siteUrl },
            { name: "Quienes Somos" },
          ]),
        ]}
      />

      <div className="page-section">
        <h1 className="page-title">Quienes Somos</h1>
        <p className="page-intro">
          No solo hablamos sobre pueblos indigenas. Somos pueblos indigenas.
          Y es tiempo de construir con nosotros, no sin nosotros.
        </p>

        <div className="prose max-w-none">

          <h2 className="section-heading mt-8">La Historia</h2>
          <p>
            Los pueblos indigenas representan menos del 5% de la poblacion mundial, pero protegen
            mas del 80% de la biodiversidad del planeta. Sin embargo, la narrativa global los
            presenta casi siempre desde la vulnerabilidad: una vision que, aunque bien
            intencionada, no les permite alcanzar su maximo potencial ni contribuir con dignidad
            a transformar los desafios globales que nos afectan a todos por igual.
          </p>
          <p>
            Lo que hoy llamamos soluciones basadas en la naturaleza es la realidad cotidiana de
            la mayoria de los pueblos indigenas del mundo. Su conocimiento ancestral, su
            gobernanza propia y su relacion profunda con el territorio son contribuciones
            invaluables para enfrentar la crisis climatica, la perdida de biodiversidad y los
            retos de la convivencia global.
          </p>
          <p>
            <strong>Impacto Indigena News</strong> nace para cambiar esa narrativa. Siguiendo
            los principios de la narrativa publica de Marshall Ganz, creemos que cambiar una
            historia requiere amplificar historias reales: las de comunidades que resisten,
            innovan, lideran y construyen el futuro desde sus territorios. Usamos inteligencia
            artificial para monitorear fuentes especializadas en todo el mundo, analizar el
            impacto real de las noticias en los pueblos indigenas y presentar esa informacion
            de forma clara, accesible y sin publicidad.
          </p>

          <h2 className="section-heading mt-10">Impacto Indigena SpA</h2>
          <p>
            Esta plataforma es parte de{" "}
            <a href="https://www.impactoindigena.com" target="_blank" rel="noopener noreferrer" className="text-brand-700 hover:text-brand-800 underline">
              Impacto Indigena SpA
            </a>
            , una Empresa Social Indigena constituida en Chile en 2023 que promueve un
            cuadruple impacto positivo — economico, social, ambiental y cultural — para
            contribuir al fortalecimiento de la autonomia de los pueblos indigenas y visibilizar
            sus saberes para un desarrollo sostenible y autodeterminado.
          </p>

          <h2 className="section-heading mt-10">El Modelo R · E · D Indigena</h2>
          <p>
            Todo nuestro trabajo se articula en torno al modelo RED Indigena: una forma de
            impulsar transformacion con identidad.
          </p>
        </div>

        <div className="not-prose grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
          {[
            {
              letra: "R",
              titulo: "Reconocer",
              texto: "Valoramos la riqueza cultural, espiritual y ecologica de los pueblos indigenas. Visibilizamos sus aportes y combatimos los estereotipos que perpetuan su exclusion.",
              color: "#1a5276",
            },
            {
              letra: "E",
              titulo: "Empoderar",
              texto: "Fortalecemos liderazgos y estructuras de gobernanza indigena. Promovemos su participacion efectiva en decisiones que afectan sus territorios y su futuro.",
              color: "#1f618d",
            },
            {
              letra: "D",
              titulo: "Desarrollar",
              texto: "Impulsamos un desarrollo sostenible y autodeterminado. Respetamos sus modelos de vida y construimos soluciones en dialogo y colaboracion.",
              color: "#2980b9",
            },
          ].map((item) => (
            <div
              key={item.letra}
              className="border border-neutral-200 border-t-4 rounded-lg p-5"
              style={{ borderTopColor: item.color }}
            >
              <div className="text-4xl font-bold mb-2" style={{ color: item.color, opacity: 0.3 }}>
                {item.letra}
              </div>
              <h3 className="font-bold text-neutral-800 mb-2">{item.titulo}</h3>
              <p className="text-sm text-neutral-600 leading-relaxed">{item.texto}</p>
            </div>
          ))}
        </div>

        <div className="prose max-w-none">
          <p>
            El modelo RED es mas que un enfoque: es una forma de regenerar el presente y
            co-crear un futuro justo con los pueblos indigenas, en beneficio de todas las
            personas y el planeta.
          </p>

          <h2 className="section-heading mt-10">Red Indigena Colaborativa</h2>
          <p>
            Trabajamos en una red indigena colaborativa que articula capacidades, saberes y
            recursos junto a:
          </p>
          <ul>
            <li>Fundacion Konwepang-Millakir por el respeto del mapu</li>
            <li>Fundacion Empresas Indigenas</li>
            <li>Sociedad de Profesionales Conuepan y Millaquir Limitada</li>
            <li>Impacto Indigena SpA</li>
          </ul>

          <h2 className="section-heading mt-10">Nuestros Proyectos</h2>
          <p>Iniciativas que transforman territorios y relaciones.</p>
        </div>

        <div className="not-prose grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
          {[
            {
              titulo: "Cafe Climatico",
              texto: "Espacio de encuentro intercultural que promueve el dialogo entre juventudes, lideres indigenas, cientificos y tomadores de decision sobre cambio climatico. Siete ediciones en La Araucania, en parques, colegios y universidades.",
            },
            {
              titulo: "Red Mision Nielol",
              texto: "Red de voluntariado indigena y no indigena que impulsa acciones de educacion ambiental, restauracion ecologica y cuidado del territorio, con base en el cerro Nielol de Temuco como simbolo de encuentro y resistencia cultural mapuche.",
            },
            {
              titulo: "Programa Liderazgo Escolar",
              texto: "Iniciativa que fortalece el liderazgo de estudiantes indigenas en contextos escolares, promoviendo el orgullo cultural, la accion climatica y el compromiso con sus comunidades.",
            },
            {
              titulo: "Podcast Voces Indigenas",
              texto: "Serie digital donde personas indigenas comparten en primera voz sus historias, saberes y propuestas de cambio. Amplificamos voces silenciadas y contribuimos a una narrativa mas diversa, digna y conectada con los territorios.",
            },
          ].map((p) => (
            <div key={p.titulo} className="border border-neutral-200 rounded-lg p-5">
              <h3 className="font-bold text-neutral-800 mb-2">{p.titulo}</h3>
              <p className="text-sm text-neutral-600 leading-relaxed">{p.texto}</p>
            </div>
          ))}
        </div>

        <div className="prose max-w-none">

          <h2 className="section-heading mt-10">Servicios para Empresas Responsables</h2>
          <p>
            Apoyamos a las empresas responsables en el diseno de estrategias efectivas para
            cumplir sus compromisos de respeto a los derechos humanos de los pueblos indigenas,
            mediante un enfoque practico, integrado y basado en principios internacionales.{" "}
            <a href="https://www.impactoindigena.com" target="_blank" rel="noopener noreferrer" className="text-brand-700 hover:text-brand-800 underline">
              Conoce mas en impactoindigena.com
            </a>.
          </p>

          <h2 className="section-heading mt-10">Fundador</h2>
          <p>
            <a href="https://www.linkedin.com/in/vconuepan/" target="_blank" rel="noopener noreferrer" className="text-brand-700 hover:text-brand-800 underline">
              <strong>Venancio Conuepan Mesias</strong>
            </a>{" "}
            es un abogado mapuche y consultor en sostenibilidad, fundador de Impacto Indigena
            SpA y Director Ejecutivo de la Fundacion Empresas Indigenas. Con mas de diez anos
            de trayectoria, ha liderado proyectos en gobernanza territorial, mediacion
            intercultural, accion climatica y emprendimiento indigena.
          </p>
          <p>
            Ha representado a Chile en espacios globales como el Caucus Indigena Internacional
            sobre empresas y derechos, propiedad intelectual y cambio climatico. Fue reconocido
            como uno de los 100 Jovenes Lideres de Chile en 2014, y ha recibido becas y
            distinciones del Departamento de Estado de EE.UU., el Alto Comisionado de Naciones
            Unidas, One Young World y The Melton Foundation. Actualmente es becario de la
            Fundacion Pacto Social y finaliza su Magister en Derecho Regulatorio en la
            Pontificia Universidad Catolica de Chile.
          </p>
          <p>
            Contacto:{" "}
            <a href="mailto:venancio@impactoindigena.com" className="text-brand-700 hover:text-brand-800 underline">
              venancio@impactoindigena.com
            </a>
          </p>

          <h2 className="section-heading mt-10">Sobre esta plataforma</h2>
          <p>
            Impacto Indigena News fue desarrollada como prototipo en el marco de la cohorte{" "}
            <strong>LatAm AI 2025</strong> de{" "}
            <a href="https://changemakerxchange.ai" target="_blank" rel="noopener noreferrer" className="text-brand-700 hover:text-brand-800 underline">
              Changemakerxchange.ai
            </a>
            , con el apoyo de{" "}
            <a href="https://www.linkedin.com/in/odinmuehlenbein/" target="_blank" rel="noopener noreferrer" className="text-brand-700 hover:text-brand-800 underline">
              Odin Muhlebein
            </a>
            , experto en inteligencia artificial del Ashoka AI Lab y mentor de la cohorte.
            El codigo de la plataforma es abierto y esta disponible en{" "}
            <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer" className="text-brand-700 hover:text-brand-800 underline">
              GitHub
            </a>.
          </p>

        </div>

        <SupportButton className="mt-2 pt-8" />

        <div className="prose max-w-none mt-12 pt-8 border-t border-neutral-200">
          <h2 className="section-heading">Explorar</h2>
          <ul className="space-y-2 my-4">
            <li>
              <Link to="/methodology" className="text-brand-700 hover:text-brand-800 font-normal">
                Metodologia
              </Link>{" "}
              &mdash; Como seleccionamos las noticias, desde la fuente hasta la publicacion
            </li>
            <li>
              <Link to="/privacy" className="text-brand-700 hover:text-brand-800 font-normal">
                Privacidad
              </Link>{" "}
              &mdash; Nuestro compromiso con tu privacidad e independencia
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}
