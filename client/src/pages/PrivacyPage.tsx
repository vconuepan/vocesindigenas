import { Helmet } from "react-helmet-async";
import ObfuscatedEmail from "../components/ObfuscatedEmail";
import { SEO, CommonOgTags } from "../lib/seo";

export default function PrivacyPage() {
  return (
    <>
      <Helmet>
        <title>Politica de Privacidad - {SEO.siteName}</title>
        <meta
          name="description"
          content="Impacto Indigena respeta tu privacidad. Sin cookies, sin rastreo, sin analitica invasiva. Conoce los datos minimos que recopilamos."
        />
        <meta
          property="og:title"
          content={`Politica de Privacidad - ${SEO.siteName}`}
        />
        <meta
          property="og:description"
          content="Impacto Indigena respeta tu privacidad. Sin cookies, sin rastreo, sin analitica invasiva."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${SEO.siteUrl}/privacy`} />
        {CommonOgTags({})}
      </Helmet>

      <div className="page-section">
        <h1 className="page-title">Politica de Privacidad</h1>

        <div className="prose max-w-none">
          <p>
            No usamos cookies, pixels de rastreo, Google Analytics, scripts
            publicitarios ni ningun otro metodo invasivo de recopilacion de
            datos. Cuando visitas este sitio como lector, nada se almacena en
            tu dispositivo.
          </p>

          <h2 className="section-heading mt-10">Que recopilamos</h2>

          <h3 className="text-lg font-normal mt-6 mb-2">Analitica del sitio</h3>
          <p>
            Usamos{" "}
            <a
              href="https://www.simpleanalytics.com/"
              className="text-brand-700 hover:text-brand-800"
              target="_blank"
              rel="noopener noreferrer"
            >
              Simple Analytics
            </a>
            , un servicio de analitica enfocado en privacidad que:
          </p>
          <ul className="list-disc pl-6 space-y-1 mt-2">
            <li>
              <strong>No</strong> usa cookies
            </li>
            <li>
              <strong>No</strong> rastrea visitantes individuales
            </li>
            <li>
              <strong>No</strong> recopila datos personales
            </li>
            <li>
              <strong>No</strong> almacena tu direccion IP
            </li>
            <li>Respeta la configuracion Do Not Track</li>
            <li>Cumple con GDPR, CCPA y PECR</li>
          </ul>
          <p className="mt-3">
            Simple Analytics recopila unicamente datos agregados y anonimos
            como vistas de pagina y fuentes de referencia. Ninguna informacion
            se vincula a ti como individuo. Puedes consultar su politica de
            privacidad en{" "}
            <a
              href="https://simpleanalytics.com/privacy"
              className="text-brand-700 hover:text-brand-800"
              target="_blank"
              rel="noopener noreferrer"
            >
              simpleanalytics.com/privacy
            </a>
            .
          </p>

          <h3 className="text-lg font-normal mt-6 mb-2">
            Boletin de noticias (opcional)
          </h3>
          <p>Si decides suscribirte a nuestro boletin, recopilamos:</p>
          <ul className="list-disc pl-6 space-y-1 mt-2">
            <li>
              Tu <strong>correo electronico</strong> (proporcionado voluntariamente por ti)
            </li>
            <li>
              Tu <strong>direccion IP</strong> (registrada por nuestro proveedor de boletin,{" "}
              <a
                href="https://www.useplunk.com/"
                className="text-brand-700 hover:text-brand-800"
                target="_blank"
                rel="noopener noreferrer"
              >
                Plunk
              </a>
              , para prevenir spam y abuso)
            </li>
          </ul>
          <p className="mt-3">
            Estos datos se usan unicamente para enviarte actualizaciones de
            Impacto Indigena y para prevenir el abuso del servicio. Nunca
            compartiremos, venderemos ni distribuiremos tu correo electronico
            a terceros.
          </p>
          <p className="mt-3">
            Nuestro proveedor de boletin, Plunk, registra automaticamente las
            aperturas de correo y clics en enlaces como parte de su
            infraestructura de entrega. No podemos desactivar esta
            funcionalidad. No usamos estos datos para perfilamiento,
            publicidad ni ningun otro proposito mas alla del monitoreo basico
            de entrega.
          </p>
          <p>
            Puedes cancelar tu suscripcion en cualquier momento usando el
            enlace de cancelacion incluido en cada correo.
          </p>

          <h3 className="text-lg font-normal mt-6 mb-2">Registros del servidor</h3>
          <p>
            Nuestro servidor registra metadatos basicos de las solicitudes
            (ruta URL, estado HTTP, tiempo de respuesta) para monitoreo
            operacional. Estos registros se conservan durante 14 dias y luego
            se eliminan automaticamente. La informacion sensible como
            encabezados de autenticacion y cookies se oculta en todos los
            registros.
          </p>

          <h2 className="section-heading mt-10">
            Que almacenamos en tu dispositivo
          </h2>
          <p>
            No usamos cookies, ni sessionStorage, IndexedDB ni ningun otro
            mecanismo de almacenamiento del navegador para visitantes publicos.
          </p>
          <p>
            El unico dato almacenado en tu dispositivo es tu{" "}
            <strong>preferencia del filtro emocional</strong> (un numero entre
            0 y 100), guardado en localStorage para que el control permanezca
            donde lo dejaste entre visitas. Este valor nunca sale de tu
            navegador y no se envia a nuestros servidores.
          </p>
          <p>
            Nuestra interfaz de administracion, que no es accesible al publico,
            usa cookies de autenticacion seguras y httpOnly.
          </p>

          <h2 className="section-heading mt-10">Servicios de terceros</h2>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th scope="col" className="text-left align-top py-2 pr-4 font-normal">
                    Servicio
                  </th>
                  <th scope="col" className="text-left align-top py-2 pr-4 font-normal">
                    Proposito
                  </th>
                  <th scope="col" className="text-left align-top py-2 font-normal">
                    Datos compartidos
                  </th>
                </tr>
              </thead>
              <tbody className="text-neutral-600">
                <tr className="border-b border-neutral-100">
                  <td className="align-top py-2 pr-4">
                    <a
                      href="https://www.simpleanalytics.com/"
                      className="text-brand-700 hover:text-brand-800"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Simple Analytics
                    </a>
                  </td>
                  <td className="align-top py-2 pr-4">Analitica con privacidad</td>
                  <td className="align-top py-2">
                    Solo vistas de pagina anonimas. Sin cookies, sin datos personales.
                  </td>
                </tr>
                <tr className="border-b border-neutral-100">
                  <td className="align-top py-2 pr-4">
                    <a
                      href="https://www.useplunk.com/"
                      className="text-brand-700 hover:text-brand-800"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Plunk
                    </a>
                  </td>
                  <td className="align-top py-2 pr-4">Envio del boletin</td>
                  <td className="align-top py-2">
                    Correo electronico y direccion IP (si te suscribes). Ver su{" "}
                    <a
                      href="https://www.useplunk.com/privacy"
                      className="text-brand-700 hover:text-brand-800"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      politica de privacidad
                    </a>
                    .
                  </td>
                </tr>
                <tr>
                  <td className="align-top py-2 pr-4">
                    <a
                      href="https://render.com/"
                      className="text-brand-700 hover:text-brand-800"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Render
                    </a>
                  </td>
                  <td className="align-top py-2 pr-4">Alojamiento web</td>
                  <td className="align-top py-2">
                    Datos HTTP estandar (direccion IP, agente de usuario) como
                    parte de la infraestructura de alojamiento. No tenemos
                    acceso a los registros de infraestructura de Render.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-4">
            Todas las fuentes tipograficas usadas en este sitio son
            auto-alojadas. No cargamos fuentes, scripts ni otros recursos
            desde CDNs externos como Google, lo que significa que tu direccion
            IP no se comparte con terceros cuando visitas el sitio.
          </p>

          <h2 className="section-heading mt-10">Tus derechos</h2>
          <p>Bajo el GDPR (y regulaciones similares), tienes derecho a:</p>
          <ul className="list-disc pl-6 space-y-1 mt-2">
            <li>Solicitar acceso a cualquier dato personal que tengamos sobre ti</li>
            <li>Solicitar la correccion o eliminacion de tus datos</li>
            <li>Oponerte al procesamiento de datos</li>
            <li>Presentar una queja ante una autoridad supervisora</li>
          </ul>
          <p className="mt-3">
            Dado que recopilamos casi ningun dato personal, generalmente hay
            muy poco (o nada) que proporcionar. Si te has suscrito a nuestro
            boletin, podemos eliminar tu correo electronico a peticion.
          </p>
          <p>
            Para cualquier consulta relacionada con privacidad, contactanos en{" "}
            <ObfuscatedEmail className="text-brand-700 hover:text-brand-800" />.
          </p>
        </div>
      </div>
    </>
  );
}
