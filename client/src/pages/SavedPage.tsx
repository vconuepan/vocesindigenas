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
        <m
