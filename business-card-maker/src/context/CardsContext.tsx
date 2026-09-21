import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  clearProjects,
  loadProjects,
  saveProjects,
} from '@/storage/storage';
import {
  createBlankCard,
  duplicateProject,
  projectFromTemplate,
} from '@/utils/cardFactory';
import type { CardProject, CardTemplate, FontId } from '@/types/card';

interface CardsContextValue {
  ready: boolean;
  projects: CardProject[];
  getProject: (id: string) => CardProject | undefined;
  createBlank: (name: string, font: FontId) => CardProject;
  createFromTemplate: (template: CardTemplate, name: string) => CardProject;
  upsert: (project: CardProject) => void;
  duplicate: (id: string, suffix: string) => CardProject | undefined;
  rename: (id: string, name: string) => void;
  remove: (id: string) => void;
  removeAll: () => void;
}

const CardsContext = createContext<CardsContextValue | null>(null);

export function CardsProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<CardProject[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await loadProjects();
      if (cancelled) return;
      setProjects(stored);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Single place where the in-memory list and AsyncStorage stay in sync. */
  const commit = useCallback(
    (updater: (current: CardProject[]) => CardProject[]) => {
      setProjects((current) => {
        const next = updater(current);
        void saveProjects(next);
        return next;
      });
    },
    [],
  );

  const getProject = useCallback(
    (id: string) => projects.find((project) => project.id === id),
    [projects],
  );

  const upsert = useCallback(
    (project: CardProject) => {
      const stamped = { ...project, updatedAt: Date.now() };
      commit((current) => {
        const index = current.findIndex((item) => item.id === stamped.id);
        if (index === -1) return [stamped, ...current];
        const next = [...current];
        next[index] = stamped;
        return next;
      });
    },
    [commit],
  );

  const createBlank = useCallback(
    (name: string, font: FontId) => {
      const project = createBlankCard(name, font);
      commit((current) => [project, ...current]);
      return project;
    },
    [commit],
  );

  const createFromTemplate = useCallback(
    (template: CardTemplate, name: string) => {
      const project = projectFromTemplate(template, name);
      commit((current) => [project, ...current]);
      return project;
    },
    [commit],
  );

  const duplicate = useCallback(
    (id: string, suffix: string) => {
      const source = projects.find((project) => project.id === id);
      if (!source) return undefined;
      const copy = duplicateProject(source, `${source.name} (${suffix})`);
      commit((current) => [copy, ...current]);
      return copy;
    },
    [commit, projects],
  );

  const rename = useCallback(
    (id: string, name: string) => {
      commit((current) =>
        current.map((project) =>
          project.id === id
            ? { ...project, name, updatedAt: Date.now() }
            : project,
        ),
      );
    },
    [commit],
  );

  const remove = useCallback(
    (id: string) => {
      commit((current) => current.filter((project) => project.id !== id));
    },
    [commit],
  );

  const removeAll = useCallback(() => {
    setProjects([]);
    void clearProjects();
  }, []);

  const value = useMemo<CardsContextValue>(
    () => ({
      ready,
      projects,
      getProject,
      createBlank,
      createFromTemplate,
      upsert,
      duplicate,
      rename,
      remove,
      removeAll,
    }),
    [
      ready,
      projects,
      getProject,
      createBlank,
      createFromTemplate,
      upsert,
      duplicate,
      rename,
      remove,
      removeAll,
    ],
  );

  return <CardsContext.Provider value={value}>{children}</CardsContext.Provider>;
}

export function useCards(): CardsContextValue {
  const context = useContext(CardsContext);
  if (!context) {
    throw new Error('useCards must be used inside <CardsProvider>');
  }
  return context;
}
