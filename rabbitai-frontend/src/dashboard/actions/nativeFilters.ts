

import { makeApi } from '@rabbitai-ui/core';
import { Dispatch } from 'redux';
import { FilterConfiguration } from 'src/dashboard/components/nativeFilters/types';
import { DataMaskType, DataMaskStateWithId } from 'src/dataMask/types';
import {
  SET_DATA_MASK_FOR_FILTER_CONFIG_FAIL,
  setDataMaskForFilterConfigComplete,
} from 'src/dataMask/actions';
import { HYDRATE_DASHBOARD } from './hydrate';
import { dashboardInfoChanged } from './dashboardInfo';
import {
  DashboardInfo,
  Filters,
  FilterSet,
  FilterSets,
} from '../reducers/types';

export const SET_FILTER_CONFIG_BEGIN = 'SET_FILTER_CONFIG_BEGIN';
export interface SetFilterConfigBegin {
  type: typeof SET_FILTER_CONFIG_BEGIN;
  filterConfig: FilterConfiguration;
}
export const SET_FILTER_CONFIG_COMPLETE = 'SET_FILTER_CONFIG_COMPLETE';
export interface SetFilterConfigComplete {
  type: typeof SET_FILTER_CONFIG_COMPLETE;
  filterConfig: FilterConfiguration;
}
export const SET_FILTER_CONFIG_FAIL = 'SET_FILTER_CONFIG_FAIL';
export interface SetFilterConfigFail {
  type: typeof SET_FILTER_CONFIG_FAIL;
  filterConfig: FilterConfiguration;
}
export const SET_FILTER_SETS_CONFIG_BEGIN = 'SET_FILTER_SETS_CONFIG_BEGIN';
export interface SetFilterSetsConfigBegin {
  type: typeof SET_FILTER_SETS_CONFIG_BEGIN;
  filterSetsConfig: FilterSet[];
}
export const SET_FILTER_SETS_CONFIG_COMPLETE =
  'SET_FILTER_SETS_CONFIG_COMPLETE';
export interface SetFilterSetsConfigComplete {
  type: typeof SET_FILTER_SETS_CONFIG_COMPLETE;
  filterSetsConfig: FilterSet[];
}
export const SET_FILTER_SETS_CONFIG_FAIL = 'SET_FILTER_SETS_CONFIG_FAIL';
export interface SetFilterSetsConfigFail {
  type: typeof SET_FILTER_SETS_CONFIG_FAIL;
  filterSetsConfig: FilterSet[];
}

export const setFilterConfiguration = (
  filterConfig: FilterConfiguration,
) => async (dispatch: Dispatch, getState: () => any) => {
  dispatch({
    type: SET_FILTER_CONFIG_BEGIN,
    filterConfig,
  });
  const { id, metadata } = getState().dashboardInfo;
  const oldFilters = getState().nativeFilters?.filters;

  // TODO extract this out when makeApi supports url parameters
  const updateDashboard = makeApi<
    Partial<DashboardInfo>,
    { result: DashboardInfo }
  >({
    method: 'PUT',
    endpoint: `/api/v1/dashboard/${id}`,
  });

  try {
    const response = await updateDashboard({
      json_metadata: JSON.stringify({
        ...metadata,
        native_filter_configuration: filterConfig,
      }),
    });
    dispatch(
      dashboardInfoChanged({
        metadata: JSON.parse(response.result.json_metadata),
      }),
    );
    dispatch({
      type: SET_FILTER_CONFIG_COMPLETE,
      filterConfig,
    });
    dispatch(setDataMaskForFilterConfigComplete(filterConfig, oldFilters));
  } catch (err) {
    dispatch({ type: SET_FILTER_CONFIG_FAIL, filterConfig });
    dispatch({ type: SET_DATA_MASK_FOR_FILTER_CONFIG_FAIL, filterConfig });
  }
};

type BootstrapData = {
  nativeFilters: {
    filters: Filters;
    filterSets: FilterSets;
    filtersState: object;
  };
};

export interface SetBootstrapData {
  type: typeof HYDRATE_DASHBOARD;
  data: BootstrapData;
}

export const setFilterSetsConfiguration = (
  filterSetsConfig: FilterSet[],
) => async (dispatch: Dispatch, getState: () => any) => {
  dispatch({
    type: SET_FILTER_SETS_CONFIG_BEGIN,
    filterSetsConfig,
  });
  const { id, metadata } = getState().dashboardInfo;

  // TODO extract this out when makeApi supports url parameters
  const updateDashboard = makeApi<
    Partial<DashboardInfo>,
    { result: DashboardInfo }
  >({
    method: 'PUT',
    endpoint: `/api/v1/dashboard/${id}`,
  });

  try {
    const response = await updateDashboard({
      json_metadata: JSON.stringify({
        ...metadata,
        filter_sets_configuration: filterSetsConfig,
      }),
    });
    const newMetadata = JSON.parse(response.result.json_metadata);
    dispatch(
      dashboardInfoChanged({
        metadata: newMetadata,
      }),
    );
    dispatch({
      type: SET_FILTER_SETS_CONFIG_COMPLETE,
      filterSetsConfig: newMetadata?.filter_sets_configuration,
    });
  } catch (err) {
    dispatch({ type: SET_FILTER_SETS_CONFIG_FAIL, filterSetsConfig });
  }
};

export const SAVE_FILTER_SETS = 'SAVE_FILTER_SETS';
export interface SaveFilterSets {
  type: typeof SAVE_FILTER_SETS;
  name: string;
  dataMask: Pick<DataMaskStateWithId, DataMaskType.NativeFilters>;
  filtersSetId: string;
}

export function saveFilterSets(
  name: string,
  filtersSetId: string,
  dataMask: Pick<DataMaskStateWithId, DataMaskType.NativeFilters>,
): SaveFilterSets {
  return {
    type: SAVE_FILTER_SETS,
    name,
    filtersSetId,
    dataMask,
  };
}

export const SET_FOCUSED_NATIVE_FILTER = 'SET_FOCUSED_NATIVE_FILTER';
export interface SetFocusedNativeFilter {
  type: typeof SET_FOCUSED_NATIVE_FILTER;
  id: string;
}
export const UNSET_FOCUSED_NATIVE_FILTER = 'UNSET_FOCUSED_NATIVE_FILTER';
export interface UnsetFocusedNativeFilter {
  type: typeof UNSET_FOCUSED_NATIVE_FILTER;
}

export function setFocusedNativeFilter(id: string): SetFocusedNativeFilter {
  return {
    type: SET_FOCUSED_NATIVE_FILTER,
    id,
  };
}
export function unsetFocusedNativeFilter(): UnsetFocusedNativeFilter {
  return {
    type: UNSET_FOCUSED_NATIVE_FILTER,
  };
}

export type AnyFilterAction =
  | SetFilterConfigBegin
  | SetFilterConfigComplete
  | SetFilterConfigFail
  | SetFilterSetsConfigBegin
  | SetFilterSetsConfigComplete
  | SetFilterSetsConfigFail
  | SaveFilterSets
  | SetBootstrapData
  | SetFocusedNativeFilter
  | UnsetFocusedNativeFilter;
