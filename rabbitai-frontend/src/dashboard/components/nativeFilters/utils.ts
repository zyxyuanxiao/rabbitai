
import {
  ExtraFormData,
  QueryFormData,
  getChartMetadataRegistry,
  Behavior,
  EXTRA_FORM_DATA_APPEND_KEYS,
  EXTRA_FORM_DATA_OVERRIDE_KEYS,
  AdhocFilter,
  FeatureFlag,
} from '@rabbitai-ui/core';
import { Charts } from 'src/dashboard/types';
import { RefObject } from 'react';
import { DataMaskStateWithId } from 'src/dataMask/types';
import extractUrlParams from 'src/dashboard/util/extractUrlParams';
import { isFeatureEnabled } from 'src/featureFlags';
import { Filter } from './types';

export const getFormData = ({
  datasetId,
  cascadingFilters = {},
  groupby,
  inputRef,
  defaultDataMask,
  controlValues,
  filterType,
  sortMetric,
  adhoc_filters,
  time_range,
}: Partial<Filter> & {
  datasetId?: number;
  inputRef?: RefObject<HTMLInputElement>;
  cascadingFilters?: object;
  groupby?: string;
  adhoc_filters?: AdhocFilter[];
  time_range?: string;
}): Partial<QueryFormData> => {
  const otherProps: {
    datasource?: string;
    groupby?: string[];
    sortMetric?: string;
  } = {};
  if (datasetId) {
    otherProps.datasource = `${datasetId}__table`;
  }
  if (groupby) {
    otherProps.groupby = [groupby];
  }
  if (sortMetric) {
    otherProps.sortMetric = sortMetric;
  }
  return {
    ...controlValues,
    ...otherProps,
    adhoc_filters: adhoc_filters ?? [],
    extra_filters: [],
    extra_form_data: cascadingFilters,
    granularity_sqla: 'ds',
    metrics: ['count'],
    row_limit: 1000,
    showSearch: true,
    defaultValue: defaultDataMask?.filterState?.value,
    time_range,
    time_range_endpoints: ['inclusive', 'exclusive'],
    url_params: extractUrlParams('regular'),
    viz_type: filterType,
    inputRef,
  };
};

export function mergeExtraFormData(
  originalExtra: ExtraFormData = {},
  newExtra: ExtraFormData = {},
): ExtraFormData {
  const mergedExtra: ExtraFormData = {};
  EXTRA_FORM_DATA_APPEND_KEYS.forEach((key: string) => {
    const mergedValues = [
      ...(originalExtra[key] || []),
      ...(newExtra[key] || []),
    ];
    if (mergedValues.length) {
      mergedExtra[key] = mergedValues;
    }
  });
  EXTRA_FORM_DATA_OVERRIDE_KEYS.forEach((key: string) => {
    const originalValue = originalExtra[key];
    if (originalValue !== undefined) {
      mergedExtra[key] = originalValue;
    }
    const newValue = newExtra[key];
    if (newValue !== undefined) {
      mergedExtra[key] = newValue;
    }
  });
  return mergedExtra;
}

export function isCrossFilter(vizType: string) {
  // @ts-ignore need export from rabbitai-ui `ItemWithValue`
  return getChartMetadataRegistry().items[vizType]?.value.behaviors?.includes(
    Behavior.INTERACTIVE_CHART,
  );
}

export function getExtraFormData(
  dataMask: DataMaskStateWithId,
  charts: Charts,
  filterIdsAppliedOnChart: string[],
): ExtraFormData {
  let extraFormData: ExtraFormData = {};
  filterIdsAppliedOnChart.forEach(key => {
    extraFormData = mergeExtraFormData(
      extraFormData,
      dataMask[key]?.extraFormData ?? {},
    );
  });
  return extraFormData;
}

export function nativeFilterGate(behaviors: Behavior[]): boolean {
  return (
    !behaviors.includes(Behavior.NATIVE_FILTER) ||
    (isFeatureEnabled(FeatureFlag.DASHBOARD_FILTERS_EXPERIMENTAL) &&
      isFeatureEnabled(FeatureFlag.DASHBOARD_CROSS_FILTERS) &&
      behaviors.includes(Behavior.INTERACTIVE_CHART))
  );
}
