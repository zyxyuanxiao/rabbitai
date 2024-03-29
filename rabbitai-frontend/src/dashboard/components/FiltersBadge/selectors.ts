
import { TIME_FILTER_MAP } from 'src/explore/constants';
import { getChartIdsInFilterScope } from 'src/dashboard/util/activeDashboardFilters';
import {
  ChartConfiguration,
  NativeFiltersState,
} from 'src/dashboard/reducers/types';
import { DataMaskStateWithId, DataMaskType } from 'src/dataMask/types';
import { FeatureFlag, isFeatureEnabled } from '@rabbitai-ui/core';
import { Layout } from '../../types';
import { getTreeCheckedItems } from '../nativeFilters/FiltersConfigModal/FiltersConfigForm/FilterScope/utils';

export enum IndicatorStatus {
  Unset = 'UNSET',
  Applied = 'APPLIED',
  Incompatible = 'INCOMPATIBLE',
  CrossFilterApplied = 'CROSS_FILTER_APPLIED',
}

const TIME_GRANULARITY_FIELDS = new Set(Object.values(TIME_FILTER_MAP));

// As of 2020-09-28, the DatasourceMeta type in rabbitai-ui is incorrect.
// Should patch it here until the DatasourceMeta type is updated.
type Datasource = {
  time_grain_sqla?: [string, string][];
  granularity?: [string, string][];
};

type Filter = {
  chartId: number;
  columns: { [key: string]: string | string[] };
  scopes: { [key: string]: any };
  labels: { [key: string]: string };
  isDateFilter: boolean;
  directPathToFilter: string[];
  datasourceId: string;
};

const selectIndicatorValue = (
  columnKey: string,
  filter: Filter,
  datasource: Datasource,
): any => {
  const values = filter.columns[columnKey];
  const arrValues = Array.isArray(values) ? values : [values];

  if (
    values == null ||
    (filter.isDateFilter && values === 'No filter') ||
    arrValues.length === 0
  ) {
    return [];
  }

  if (filter.isDateFilter && TIME_GRANULARITY_FIELDS.has(columnKey)) {
    const timeGranularityMap = (
      (columnKey === TIME_FILTER_MAP.time_grain_sqla
        ? datasource.time_grain_sqla
        : datasource.granularity) || []
    ).reduce(
      (map, [key, value]) => ({
        ...map,
        [key]: value,
      }),
      {},
    );

    return arrValues.map(value => timeGranularityMap[value] || value);
  }

  return arrValues;
};

const selectIndicatorsForChartFromFilter = (
  chartId: number,
  filter: Filter,
  filterDataSource: Datasource,
  appliedColumns: Set<string>,
  rejectedColumns: Set<string>,
): Indicator[] => {
  // filters can be applied (if the filter is compatible with the datasource)
  // or rejected (if the filter is incompatible)
  // or the status can be unknown (if the filter has calculated parameters that we can't analyze)
  const getStatus = (column: string, filter: Filter) => {
    if (appliedColumns.has(column) && filter.columns[column])
      return IndicatorStatus.Applied;
    if (rejectedColumns.has(column)) return IndicatorStatus.Incompatible;
    return IndicatorStatus.Unset;
  };

  return Object.keys(filter.columns)
    .filter(column =>
      getChartIdsInFilterScope({
        filterScope: filter.scopes[column],
      }).includes(chartId),
    )
    .map(column => ({
      column,
      name: filter.labels[column] || column,
      value: selectIndicatorValue(column, filter, filterDataSource),
      status: getStatus(column, filter),
      path: filter.directPathToFilter,
    }));
};

const getAppliedColumns = (chart: any): Set<string> =>
  new Set(
    (chart?.queriesResponse?.[0]?.applied_filters || []).map(
      (filter: any) => filter.column,
    ),
  );

const getRejectedColumns = (chart: any): Set<string> =>
  new Set(
    (chart?.queriesResponse?.[0]?.rejected_filters || []).map(
      (filter: any) => filter.column,
    ),
  );

export type Indicator = {
  column?: string;
  name: string;
  value?: any;
  status?: IndicatorStatus;
  path?: string[];
};

// inspects redux state to find what the filter indicators should be shown for a given chart
export const selectIndicatorsForChart = (
  chartId: number,
  filters: { [key: number]: Filter },
  datasources: { [key: string]: Datasource },
  charts: any,
): Indicator[] => {
  const chart = charts[chartId];
  // no indicators if chart is loading
  if (chart.chartStatus === 'loading') return [];

  // for now we only need to know which columns are compatible/incompatible,
  // so grab the columns from the applied/rejected filters
  const appliedColumns = getAppliedColumns(chart);
  const rejectedColumns = getRejectedColumns(chart);

  const indicators = Object.values(filters)
    .filter(filter => filter.chartId !== chartId)
    .reduce(
      (acc, filter) =>
        acc.concat(
          selectIndicatorsForChartFromFilter(
            chartId,
            filter,
            datasources[filter.datasourceId] || {},
            appliedColumns,
            rejectedColumns,
          ),
        ),
      [] as Indicator[],
    );
  indicators.sort((a, b) => a.name.localeCompare(b.name));
  return indicators;
};

export const selectNativeIndicatorsForChart = (
  nativeFilters: NativeFiltersState,
  dataMask: DataMaskStateWithId,
  chartId: number,
  charts: any,
  dashboardLayout: Layout,
  chartConfiguration: ChartConfiguration = {},
): Indicator[] => {
  const chart = charts[chartId];

  const appliedColumns = getAppliedColumns(chart);
  const rejectedColumns = getRejectedColumns(chart);

  const getStatus = ({
    value,
    column,
    type = DataMaskType.NativeFilters,
  }: {
    value: any;
    column?: string;
    type?: DataMaskType;
  }): IndicatorStatus => {
    // a filter is only considered unset if it's value is null
    const hasValue = value !== null;
    if (type === DataMaskType.CrossFilters && hasValue) {
      return IndicatorStatus.CrossFilterApplied;
    }
    if (!column && hasValue) {
      // Filter without datasource
      return IndicatorStatus.Applied;
    }
    if (column && rejectedColumns.has(column))
      return IndicatorStatus.Incompatible;
    if (column && appliedColumns.has(column) && hasValue) {
      return IndicatorStatus.Applied;
    }
    return IndicatorStatus.Unset;
  };

  let nativeFilterIndicators: any = [];
  if (isFeatureEnabled(FeatureFlag.DASHBOARD_NATIVE_FILTERS)) {
    nativeFilterIndicators = Object.values(nativeFilters.filters)
      .filter(nativeFilter =>
        getTreeCheckedItems(nativeFilter.scope, dashboardLayout).some(
          layoutItem => dashboardLayout[layoutItem]?.meta?.chartId === chartId,
        ),
      )
      .map(nativeFilter => {
        const column = nativeFilter.targets[0]?.column?.name;
        let value = dataMask[nativeFilter.id]?.filterState?.value ?? null;
        if (!Array.isArray(value) && value !== null) {
          value = [value];
        }
        return {
          column,
          name: nativeFilter.name,
          path: [nativeFilter.id],
          status: getStatus({ value, column }),
          value,
        };
      });
  }

  let crossFilterIndicators: any = [];
  if (isFeatureEnabled(FeatureFlag.DASHBOARD_CROSS_FILTERS)) {
    crossFilterIndicators = Object.values(chartConfiguration)
      .filter(chartConfig =>
        getTreeCheckedItems(
          chartConfig?.crossFilters?.scope,
          dashboardLayout,
        ).some(
          layoutItem => dashboardLayout[layoutItem]?.meta?.chartId === chartId,
        ),
      )
      .map(chartConfig => {
        let value = dataMask[chartConfig.id]?.filterState?.value ?? null;
        if (!Array.isArray(value) && value !== null) {
          value = [value];
        }
        return {
          name: Object.values(dashboardLayout).find(
            layoutItem => layoutItem?.meta?.chartId === chartConfig.id,
          )?.meta?.sliceName as string,
          path: [`${chartConfig.id}`],
          status: getStatus({
            value,
            type: DataMaskType.CrossFilters,
          }),
          value,
        };
      })
      .filter(filter => filter.status === IndicatorStatus.CrossFilterApplied);
  }
  return crossFilterIndicators.concat(nativeFilterIndicators);
};
