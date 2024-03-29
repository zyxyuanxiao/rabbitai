
// Log event names ------------------------------------------------------------
export const LOG_ACTIONS_LOAD_CHART = 'load_chart';
export const LOG_ACTIONS_RENDER_CHART = 'render_chart';
export const LOG_ACTIONS_HIDE_BROWSER_TAB = 'hide_browser_tab';

export const LOG_ACTIONS_MOUNT_DASHBOARD = 'mount_dashboard';
export const LOG_ACTIONS_MOUNT_EXPLORER = 'mount_explorer';

export const LOG_ACTIONS_SELECT_DASHBOARD_TAB = 'select_dashboard_tab';
export const LOG_ACTIONS_FORCE_REFRESH_CHART = 'force_refresh_chart';
export const LOG_ACTIONS_CHANGE_EXPLORE_CONTROLS = 'change_explore_controls';
export const LOG_ACTIONS_TOGGLE_EDIT_DASHBOARD = 'toggle_edit_dashboard';
export const LOG_ACTIONS_FORCE_REFRESH_DASHBOARD = 'force_refresh_dashboard';
export const LOG_ACTIONS_PERIODIC_RENDER_DASHBOARD =
  'periodic_render_dashboard';
export const LOG_ACTIONS_EXPLORE_DASHBOARD_CHART = 'explore_dashboard_chart';
export const LOG_ACTIONS_EXPORT_CSV_DASHBOARD_CHART =
  'export_csv_dashboard_chart';
export const LOG_ACTIONS_CHANGE_DASHBOARD_FILTER = 'change_dashboard_filter';
export const LOG_ACTIONS_OMNIBAR_TRIGGERED = 'omnibar_triggered';

// Log event types --------------------------------------------------------------
export const LOG_EVENT_TYPE_TIMING = new Set([
  LOG_ACTIONS_LOAD_CHART,
  LOG_ACTIONS_RENDER_CHART,
  LOG_ACTIONS_HIDE_BROWSER_TAB,
]);
export const LOG_EVENT_TYPE_USER = new Set([
  LOG_ACTIONS_MOUNT_DASHBOARD,
  LOG_ACTIONS_SELECT_DASHBOARD_TAB,
  LOG_ACTIONS_EXPLORE_DASHBOARD_CHART,
  LOG_ACTIONS_FORCE_REFRESH_CHART,
  LOG_ACTIONS_EXPORT_CSV_DASHBOARD_CHART,
  LOG_ACTIONS_CHANGE_DASHBOARD_FILTER,
  LOG_ACTIONS_CHANGE_EXPLORE_CONTROLS,
  LOG_ACTIONS_TOGGLE_EDIT_DASHBOARD,
  LOG_ACTIONS_FORCE_REFRESH_DASHBOARD,
  LOG_ACTIONS_PERIODIC_RENDER_DASHBOARD,
  LOG_ACTIONS_OMNIBAR_TRIGGERED,
  LOG_ACTIONS_MOUNT_EXPLORER,
]);

export const Logger = {
  // note that this returns ms since page load, NOT ms since epoch
  getTimestamp() {
    return Math.round(window.performance.now());
  },
};
