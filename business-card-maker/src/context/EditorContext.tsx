import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
} from 'react';

import { cloneElement } from '@/utils/cardFactory';
import type {
  CardBackground,
  CardContact,
  CardElement,
  CardProject,
  CardSide,
  SideKey,
} from '@/types/card';

interface Snapshot {
  name: string;
  contact: CardContact;
  front: CardSide;
  back: CardSide;
}

interface EditorState {
  project: CardProject;
  side: SideKey;
  selectedId: string | null;
  past: Snapshot[];
  future: Snapshot[];
  dirty: boolean;
}

type Action =
  | { type: 'select'; id: string | null }
  | { type: 'setSide'; side: SideKey }
  | { type: 'addElement'; element: CardElement }
  | {
      type: 'updateElement';
      id: string;
      patch: Partial<CardElement>;
      transient?: boolean;
    }
  | { type: 'removeElement'; id: string }
  | { type: 'duplicateElement'; id: string }
  | { type: 'reorder'; id: string; direction: 'forward' | 'backward' }
  | { type: 'setBackground'; patch: Partial<CardBackground>; bothSides?: boolean }
  | { type: 'setContact'; patch: Partial<CardContact> }
  | { type: 'setName'; name: string }
  | { type: 'replaceSides'; front: CardSide; back: CardSide }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'markSaved' };

const HISTORY_LIMIT = 60;

function snapshot(project: CardProject): Snapshot {
  return {
    name: project.name,
    contact: project.contact,
    front: project.front,
    back: project.back,
  };
}

function pushHistory(state: EditorState): Snapshot[] {
  const next = [...state.past, snapshot(state.project)];
  return next.length > HISTORY_LIMIT ? next.slice(next.length - HISTORY_LIMIT) : next;
}

function mapSide(
  project: CardProject,
  side: SideKey,
  mapper: (value: CardSide) => CardSide,
): CardProject {
  return { ...project, [side]: mapper(project[side]) } as CardProject;
}

function reducer(state: EditorState, action: Action): EditorState {
  switch (action.type) {
    case 'select':
      return { ...state, selectedId: action.id };

    case 'setSide':
      return { ...state, side: action.side, selectedId: null };

    case 'addElement': {
      const project = mapSide(state.project, state.side, (side) => ({
        ...side,
        elements: [...side.elements, action.element],
      }));
      return {
        ...state,
        past: pushHistory(state),
        future: [],
        project,
        selectedId: action.element.id,
        dirty: true,
      };
    }

    case 'updateElement': {
      const project = mapSide(state.project, state.side, (side) => ({
        ...side,
        elements: side.elements.map((element) =>
          element.id === action.id
            ? ({ ...element, ...action.patch } as CardElement)
            : element,
        ),
      }));
      return {
        ...state,
        // Dragging emits many updates; only the committed one enters history.
        past: action.transient ? state.past : pushHistory(state),
        future: action.transient ? state.future : [],
        project,
        dirty: true,
      };
    }

    case 'removeElement': {
      const project = mapSide(state.project, state.side, (side) => ({
        ...side,
        elements: side.elements.filter((element) => element.id !== action.id),
      }));
      return {
        ...state,
        past: pushHistory(state),
        future: [],
        project,
        selectedId: state.selectedId === action.id ? null : state.selectedId,
        dirty: true,
      };
    }

    case 'duplicateElement': {
      const source = state.project[state.side].elements.find(
        (element) => element.id === action.id,
      );
      if (!source) return state;
      const copy = cloneElement(source);
      copy.x += 24;
      copy.y += 24;
      const project = mapSide(state.project, state.side, (side) => ({
        ...side,
        elements: [...side.elements, copy],
      }));
      return {
        ...state,
        past: pushHistory(state),
        future: [],
        project,
        selectedId: copy.id,
        dirty: true,
      };
    }

    case 'reorder': {
      const elements = [...state.project[state.side].elements];
      const index = elements.findIndex((element) => element.id === action.id);
      if (index === -1) return state;
      const target = action.direction === 'forward' ? index + 1 : index - 1;
      if (target < 0 || target >= elements.length) return state;
      [elements[index], elements[target]] = [elements[target], elements[index]];
      const project = mapSide(state.project, state.side, (side) => ({
        ...side,
        elements,
      }));
      return { ...state, past: pushHistory(state), future: [], project, dirty: true };
    }

    case 'setBackground': {
      const apply = (side: CardSide): CardSide => ({
        ...side,
        background: { ...side.background, ...action.patch },
      });
      const project = action.bothSides
        ? { ...state.project, front: apply(state.project.front), back: apply(state.project.back) }
        : mapSide(state.project, state.side, apply);
      return { ...state, past: pushHistory(state), future: [], project, dirty: true };
    }

    case 'setContact':
      return {
        ...state,
        past: pushHistory(state),
        future: [],
        project: {
          ...state.project,
          contact: { ...state.project.contact, ...action.patch },
        },
        dirty: true,
      };

    case 'setName':
      return {
        ...state,
        project: { ...state.project, name: action.name },
        dirty: true,
      };

    case 'replaceSides':
      return {
        ...state,
        past: pushHistory(state),
        future: [],
        project: { ...state.project, front: action.front, back: action.back },
        selectedId: null,
        dirty: true,
      };

    case 'undo': {
      if (!state.past.length) return state;
      const previous = state.past[state.past.length - 1];
      return {
        ...state,
        past: state.past.slice(0, -1),
        future: [snapshot(state.project), ...state.future],
        project: { ...state.project, ...previous },
        selectedId: null,
        dirty: true,
      };
    }

    case 'redo': {
      if (!state.future.length) return state;
      const [next, ...rest] = state.future;
      return {
        ...state,
        past: [...state.past, snapshot(state.project)],
        future: rest,
        project: { ...state.project, ...next },
        selectedId: null,
        dirty: true,
      };
    }

    case 'markSaved':
      return { ...state, dirty: false };

    default:
      return state;
  }
}

interface EditorContextValue {
  project: CardProject;
  side: SideKey;
  currentSide: CardSide;
  selectedId: string | null;
  selectedElement: CardElement | null;
  canUndo: boolean;
  canRedo: boolean;
  dirty: boolean;
  select: (id: string | null) => void;
  setSide: (side: SideKey) => void;
  addElement: (element: CardElement) => void;
  updateElement: (
    id: string,
    patch: Partial<CardElement>,
    transient?: boolean,
  ) => void;
  updateSelected: (patch: Partial<CardElement>, transient?: boolean) => void;
  removeElement: (id: string) => void;
  duplicateElement: (id: string) => void;
  reorder: (id: string, direction: 'forward' | 'backward') => void;
  setBackground: (patch: Partial<CardBackground>, bothSides?: boolean) => void;
  setContact: (patch: Partial<CardContact>) => void;
  setName: (name: string) => void;
  replaceSides: (front: CardSide, back: CardSide) => void;
  undo: () => void;
  redo: () => void;
  markSaved: () => void;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export function EditorProvider({
  project,
  children,
}: {
  project: CardProject;
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(reducer, {
    project,
    side: 'front',
    selectedId: null,
    past: [],
    future: [],
    dirty: false,
  });

  const select = useCallback((id: string | null) => dispatch({ type: 'select', id }), []);
  const setSide = useCallback((side: SideKey) => dispatch({ type: 'setSide', side }), []);
  const addElement = useCallback(
    (element: CardElement) => dispatch({ type: 'addElement', element }),
    [],
  );
  const updateElement = useCallback(
    (id: string, patch: Partial<CardElement>, transient = false) =>
      dispatch({ type: 'updateElement', id, patch, transient }),
    [],
  );
  const removeElement = useCallback(
    (id: string) => dispatch({ type: 'removeElement', id }),
    [],
  );
  const duplicateElement = useCallback(
    (id: string) => dispatch({ type: 'duplicateElement', id }),
    [],
  );
  const reorder = useCallback(
    (id: string, direction: 'forward' | 'backward') =>
      dispatch({ type: 'reorder', id, direction }),
    [],
  );
  const setBackground = useCallback(
    (patch: Partial<CardBackground>, bothSides = false) =>
      dispatch({ type: 'setBackground', patch, bothSides }),
    [],
  );
  const setContact = useCallback(
    (patch: Partial<CardContact>) => dispatch({ type: 'setContact', patch }),
    [],
  );
  const setName = useCallback((name: string) => dispatch({ type: 'setName', name }), []);
  const replaceSides = useCallback(
    (front: CardSide, back: CardSide) => dispatch({ type: 'replaceSides', front, back }),
    [],
  );
  const undo = useCallback(() => dispatch({ type: 'undo' }), []);
  const redo = useCallback(() => dispatch({ type: 'redo' }), []);
  const markSaved = useCallback(() => dispatch({ type: 'markSaved' }), []);

  const value = useMemo<EditorContextValue>(() => {
    const currentSide = state.project[state.side];
    const selectedElement =
      currentSide.elements.find((element) => element.id === state.selectedId) ?? null;
    return {
      project: state.project,
      side: state.side,
      currentSide,
      selectedId: state.selectedId,
      selectedElement,
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
      dirty: state.dirty,
      select,
      setSide,
      addElement,
      updateElement,
      updateSelected: (patch, transient) => {
        if (state.selectedId) updateElement(state.selectedId, patch, transient);
      },
      removeElement,
      duplicateElement,
      reorder,
      setBackground,
      setContact,
      setName,
      replaceSides,
      undo,
      redo,
      markSaved,
    };
  }, [
    state,
    select,
    setSide,
    addElement,
    updateElement,
    removeElement,
    duplicateElement,
    reorder,
    setBackground,
    setContact,
    setName,
    replaceSides,
    undo,
    redo,
    markSaved,
  ]);

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useEditor(): EditorContextValue {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditor must be used inside <EditorProvider>');
  }
  return context;
}
