import { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { publicApi } from "../lib/api";
import { getSavedSlugs } from "../lib/preferences";
import StoryCard from "../components/StoryCard";
import type { PublicStory } from "@shared/types";

export default function SavedPage() {
  const [savedSlugs, setSavedSlugs] = useState<string[]>([]);

  useEffect(() => {
    setSavedSlugs(getSavedSlugs());
  }, []);

  const refreshSaved = useCallback(() => {
    setSavedSlugs(getSavedSlugs());
  }, []);

  useEffect(() => {
    window.addEventListener("storage", refreshSaved);
    window.addEventListener("ar-saved-changed", refreshSaved);
    return () => {
      window.removeEventListener("storage", refreshSaved);
      window.removeEventListener("ar-saved-changed", refreshSaved);
    };
  }, [refreshSaved]);

  const { data: stories, isLoading } = useQuery({
    queryKey: ["saved-stories", savedSlugs],
    queryFn: async () => {
      if (savedSlugs.length === 0) return [];
      const results = await Promise.allSettled(
        savedSlugs.map((slug) => publicApi.stories.get(slug)),
      );
      return results
        .filter(
          (r): r is PromiseFulfilledResult<PublicStory> =>
            r.status === "fulfilled",
        )
        .map((r) => r.value)
        .reverse();
    },
    enabled: savedSlugs.length > 0,
  });

  return (
    <>
      <Helmet>
        <title>Guardados - Impacto Indígena</title>
        <meta
          name="description"
          content="Tus noticias guardadas en Impacto Indígena."
        />
      </Helmet>
      <div className="page-section py-12">
        <h1 className="page-title mb-2">Noticias Guardadas</h1>
        {savedSlugs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-neutral-500 mb-4">
              Aún no has guardado ninguna noticia.
            </p>
            <p className="text-sm text-neutral-400 mb-6">
              Haz clic en el ícono de marcador en cualquier noticia para guardarla aquí.
            </p>
          </div>
        )}
        {isLoading && savedSlugs.length > 0 && (
          <div className="text-center py-12 text-neutral-500">
            Cargando noticias guardadas...
          </div>
        )}
        {stories && stories.length > 0 && (
          <div className="space-y-4">
            {stories.map((story) => (
              <StoryCard key={story.id} story={story} variant="compact" />
            ))}
          </div>
        )}
        {savedSlugs.length > 0 && (
          <p className="text-xs text-neutral-400 mt-8 text-center">
            Las noticias guardadas se almacenan solo en este navegador.
          </p>
        )}
      </div>
    </>
  );
}
