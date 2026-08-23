import { createAction, createFeature, createReducer, on, props } from '@ngrx/store';

export type Theme = 'dark' | 'light';

export interface UiState {
  theme: Theme;
  sidebarCollapsed: boolean;
}

const THEME_STORAGE_KEY = 'cricket_theme';

function getInitialTheme(): Theme {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

const initialState: UiState = {
  theme: getInitialTheme(),
  sidebarCollapsed: false,
};

export const setTheme = createAction('[UI] Set Theme', props<{ theme: Theme }>());
export const toggleTheme = createAction('[UI] Toggle Theme');
export const toggleSidebar = createAction('[UI] Toggle Sidebar');
export const setSidebarCollapsed = createAction('[UI] Set Sidebar Collapsed', props<{ collapsed: boolean }>());

export const uiFeature = createFeature({
  name: 'ui',
  reducer: createReducer(
    initialState,
    on(setTheme, (state, { theme }): UiState => {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
      return { ...state, theme };
    }),
    on(toggleTheme, (state): UiState => {
      const theme: Theme = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem(THEME_STORAGE_KEY, theme);
      return { ...state, theme };
    }),
    on(toggleSidebar, (state): UiState => ({ ...state, sidebarCollapsed: !state.sidebarCollapsed })),
    on(setSidebarCollapsed, (state, { collapsed }): UiState => ({ ...state, sidebarCollapsed: collapsed }))
  ),
});

export const { name: uiFeatureKey, reducer: uiReducer, selectTheme, selectSidebarCollapsed } = uiFeature;
