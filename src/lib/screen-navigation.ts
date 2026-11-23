import type { NavigationState } from 'expo-router/react-navigation';

function completeState(state: NavigationState): NavigationState | null {
  if (!Array.isArray(state.routes) || state.routes.length === 0 || !Array.isArray(state.routeNames) ||
      !state.key || !Number.isInteger(state.index) || state.index < 0 || state.index >= state.routes.length ||
      !Number.isInteger(state.routeKeySeq) ||
      state.routes.some(route => !route.key || !state.routeNames.includes(route.name))) return null;

  const routes: NavigationState['routes'] = [];
  for (const route of state.routes) {
    if (!route.state) {
      routes.push(route);
      continue;
    }
    const childState = completeState(route.state);
    if (!childState) return null;
    routes.push({ ...route, state: childState });
  }

  return { ...state, stale: false, routes };
}

/** Keep other tabs and their filters, remove only the flow the user is leaving. */
function homeTabs(state: NavigationState, target: 'index' | 'tasks'): NavigationState | null {
  if (state.type !== 'tab') return state;
  const homeIndex = state.routes.findIndex(route => route.name === target);
  if (homeIndex < 0) return null;
  const routes = state.routes.map((route, index) => {
    if (index !== state.index || !route.state || route.state.type !== 'stack') return route;
    return { ...route, state: { ...route.state, stale: false, index: 0, routes: route.state.routes.slice(0, 1) } };
  });
  const activeTabKey = routes[homeIndex].key;
  return { ...state, stale: false, index: homeIndex, routes, history: [{ type: 'route', key: activeTabKey }] };
}

export function homeNavigationState(root: NavigationState, target: 'index' | 'tasks' = 'index'): NavigationState | null {
  const state = completeState(root);
  if (!state) return null;
  const appIndex = state.routes.findIndex(route => route.name === '(app)');
  if (appIndex < 0) return null;

  const app = state.routes[appIndex];
  if (!app.state) return null;
  const appState = homeTabs(app.state, target);
  if (!appState) return null;

  return { ...state, stale: false, index: 0, routes: [{ ...app, state: appState }] };
}
