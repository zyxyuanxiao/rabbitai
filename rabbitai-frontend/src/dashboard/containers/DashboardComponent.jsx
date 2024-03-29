
import React from 'react';
import PropTypes from 'prop-types';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';

import { logEvent } from 'src/logger/actions';
import { addDangerToast } from 'src/messageToasts/actions';
import { componentLookup } from '../components/gridComponents';
import getDetailedComponentWidth from '../util/getDetailedComponentWidth';
import { getActiveFilters } from '../util/activeDashboardFilters';
import { componentShape } from '../util/propShapes';
import { COLUMN_TYPE, ROW_TYPE } from '../util/componentTypes';

import {
  createComponent,
  deleteComponent,
  updateComponents,
  handleComponentDrop,
} from '../actions/dashboardLayout';
import { setDirectPathToChild } from '../actions/dashboardState';

const propTypes = {
  id: PropTypes.string,
  parentId: PropTypes.string,
  depth: PropTypes.number,
  index: PropTypes.number,
  renderHoverMenu: PropTypes.bool,
  renderTabContent: PropTypes.bool,
  onChangeTab: PropTypes.func,
  component: componentShape.isRequired,
  parentComponent: componentShape.isRequired,
  createComponent: PropTypes.func.isRequired,
  deleteComponent: PropTypes.func.isRequired,
  updateComponents: PropTypes.func.isRequired,
  handleComponentDrop: PropTypes.func.isRequired,
  logEvent: PropTypes.func.isRequired,
  directPathToChild: PropTypes.arrayOf(PropTypes.string),
  directPathLastUpdated: PropTypes.number,
  dashboardId: PropTypes.number.isRequired,
  isComponentVisible: PropTypes.bool,
};

const defaultProps = {
  directPathToChild: [],
  directPathLastUpdated: 0,
  isComponentVisible: true,
};

/**
 * Selects the chart scope of the filter input that has focus.
 *
 * @returns {{chartId: number, scope: { scope: string[], immune: string[] }} | null }
 * the scope of the currently focused filter, if any
 */
function selectFocusedFilterScope(dashboardState, dashboardFilters) {
  if (!dashboardState.focusedFilterField) return null;
  const { chartId, column } = dashboardState.focusedFilterField;
  return {
    chartId,
    scope: dashboardFilters[chartId].scopes[column],
  };
}

function selectFocusedNativeFilterScope(nativeFilters) {
  if (!nativeFilters.focusedFilterId) return null;
  const id = nativeFilters.focusedFilterId;
  const focusedFilterScope = nativeFilters.filters[id].scope;
  return {
    chartId: id,
    scope: {
      scope: focusedFilterScope.rootPath,
      immune: focusedFilterScope.excluded,
    },
  };
}

function mapStateToProps(
  {
    dashboardLayout: undoableLayout,
    dashboardState,
    dashboardInfo,
    dashboardFilters,
    nativeFilters,
  },
  ownProps,
) {
  const dashboardLayout = undoableLayout.present;
  const { id, parentId } = ownProps;
  const component = dashboardLayout[id];
  const props = {
    component,
    parentComponent: dashboardLayout[parentId],
    editMode: dashboardState.editMode,
    undoLength: undoableLayout.past.length,
    redoLength: undoableLayout.future.length,
    filters: getActiveFilters(),
    directPathToChild: dashboardState.directPathToChild,
    directPathLastUpdated: dashboardState.directPathLastUpdated,
    dashboardId: dashboardInfo.id,
    focusedFilterScope:
      selectFocusedFilterScope(dashboardState, dashboardFilters) ||
      selectFocusedNativeFilterScope(nativeFilters),
  };

  // rows and columns need more data about their child dimensions
  // doing this allows us to not pass the entire component lookup to all Components
  if (component) {
    const componentType = component.type;
    if (componentType === ROW_TYPE || componentType === COLUMN_TYPE) {
      const { occupiedWidth, minimumWidth } = getDetailedComponentWidth({
        id,
        components: dashboardLayout,
      });

      if (componentType === ROW_TYPE) props.occupiedColumnCount = occupiedWidth;
      if (componentType === COLUMN_TYPE) props.minColumnWidth = minimumWidth;
    }
  }

  return props;
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      addDangerToast,
      createComponent,
      deleteComponent,
      updateComponents,
      handleComponentDrop,
      setDirectPathToChild,
      logEvent,
    },
    dispatch,
  );
}

class DashboardComponent extends React.PureComponent {
  render() {
    const { component } = this.props;
    const Component = component ? componentLookup[component.type] : null;
    return Component ? <Component {...this.props} /> : null;
  }
}

DashboardComponent.propTypes = propTypes;
DashboardComponent.defaultProps = defaultProps;

export default connect(mapStateToProps, mapDispatchToProps)(DashboardComponent);
