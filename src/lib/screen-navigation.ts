import type { NavigationState, PartialState } from 'expo-router/react-navigation';

type State = NavigationState | PartialState<NavigationState>;
function partial(state: State): PartialState<NavigationState> {
  return { ...state, stale: true, routes: state.routes.map(route => ({ ...route, state: route.state ? partial(route.state) : undefined })) };
}

/** Keep other tabs and their filters, remove only the flow the user is leaving. */
function homeTabs(input: State, target: 'index' | 'tasks'): PartialState<NavigationState> {
  const state = partial(input);
  if (state.type !== 'tab') return state;
  const homeIndex = state.routes.findIndex(route => route.name === target);
  if (homeIndex < 0) return state;
  const routes = state.routes.map((route, index) => {
    if (index !== state.index || !route.state || route.state.type !== 'stack') return route;
    return { ...route, state: { ...route.state, index: 0, routes: route.state.routes.slice(0, 1) } };
  });
  return { ...state, index: homeIndex, routes, history: routes[homeIndex].key ? [{ type: 'route', key: routes[homeIndex].key }] : [] };
}

export function homeNavigationState(root: State, target: 'index' | 'tasks' = 'index'): PartialState<NavigationState> {
  const state = partial(root);
  const app = state.routes.find(route => route.name === '(app)');
  return { ...state, index: 0, routes: [app ? { ...app, ...(app.state ? { state: homeTabs(app.state, target) } : {}) }
    : { name: '(app)', ...(target === 'tasks' ? { state: { stale: true, type: 'tab', index: 0, routes: [{ name: 'tasks' }] } } : {}) }] };
}
