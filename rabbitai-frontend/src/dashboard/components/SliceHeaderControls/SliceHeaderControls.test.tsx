

import userEvent from '@testing-library/user-event';
import React from 'react';
import { render, screen } from 'spec/helpers/testing-library';
import SliceHeaderControls from '.';

jest.mock('src/common/components', () => {
  const original = jest.requireActual('src/common/components');
  return {
    ...original,
    NoAnimationDropdown: (props: any) => (
      <div data-test="NoAnimationDropdown" className="ant-dropdown">
        {props.overlay}
        {props.children}
      </div>
    ),
  };
});

const createProps = () => ({
  addDangerToast: jest.fn(),
  addSuccessToast: jest.fn(),
  exploreChart: jest.fn(),
  exportCSV: jest.fn(),
  forceRefresh: jest.fn(),
  handleToggleFullSize: jest.fn(),
  toggleExpandSlice: jest.fn(),
  slice: {
    slice_id: 371,
    slice_url: '/rabbitai/explore/?form_data=%7B%22slice_id%22%3A%20371%7D',
    slice_name: 'Vaccine Candidates per Country & Stage',
    form_data: {
      adhoc_filters: [],
      color_scheme: 'rabbitaiColors',
      datasource: '58__table',
      groupby: ['product_category', 'clinical_stage'],
      linear_color_scheme: 'schemeYlOrBr',
      metric: 'count',
      queryFields: {
        groupby: 'groupby',
        metric: 'metrics',
        secondary_metric: 'metrics',
      },
      row_limit: 10000,
      slice_id: 371,
      time_range: 'No filter',
      time_range_endpoints: ['inclusive', 'exclusive'],
      url_params: {},
      viz_type: 'sunburst',
    },
    viz_type: 'sunburst',
    datasource: '58__table',
    description: 'test-description',
    description_markeddown: '',
    owners: [],
    modified: '<span class="no-wrap">22 hours ago</span>',
    changed_on: 1617143411523,
  },
  isCached: [false],
  isExpanded: false,
  cachedDttm: [null],
  updatedDttm: 1617213803803,
  rabbitaiCanExplore: true,
  rabbitaiCanCSV: true,
  sliceCanEdit: false,
  componentId: 'CHART-fYo7IyvKZQ',
  dashboardId: 26,
  isFullSize: false,
  chartStatus: 'rendered',
});

test('Should render', () => {
  const props = createProps();
  render(<SliceHeaderControls {...props} />, { useRedux: true });
  expect(
    screen.getByRole('button', { name: 'More Options' }),
  ).toBeInTheDocument();
  expect(screen.getByTestId('NoAnimationDropdown')).toBeInTheDocument();
});

test('Should render default props', () => {
  const props = createProps();

  // @ts-ignore
  delete props.forceRefresh;
  // @ts-ignore
  delete props.toggleExpandSlice;
  // @ts-ignore
  delete props.exploreChart;
  // @ts-ignore
  delete props.exportCSV;
  // @ts-ignore
  delete props.cachedDttm;
  // @ts-ignore
  delete props.updatedDttm;
  // @ts-ignore
  delete props.isCached;
  // @ts-ignore
  delete props.isExpanded;
  // @ts-ignore
  delete props.sliceCanEdit;

  render(<SliceHeaderControls {...props} />, { useRedux: true });

  userEvent.click(screen.getByRole('menuitem', { name: 'Maximize chart' }));
  userEvent.click(screen.getByRole('menuitem', { name: /Force refresh/ }));
  userEvent.click(
    screen.getByRole('menuitem', { name: 'Toggle chart description' }),
  );
  userEvent.click(
    screen.getByRole('menuitem', { name: 'View chart in Explore' }),
  );
  userEvent.click(screen.getByRole('menuitem', { name: 'Export CSV' }));
  userEvent.click(screen.getByRole('menuitem', { name: /Force refresh/ }));

  expect(
    screen.getByRole('button', { name: 'More Options' }),
  ).toBeInTheDocument();
  expect(screen.getByTestId('NoAnimationDropdown')).toBeInTheDocument();
});

test('Should "export to CSV"', () => {
  const props = createProps();
  render(<SliceHeaderControls {...props} />, { useRedux: true });

  expect(props.exportCSV).toBeCalledTimes(0);
  userEvent.click(screen.getByRole('menuitem', { name: 'Export CSV' }));
  expect(props.exportCSV).toBeCalledTimes(1);
  expect(props.exportCSV).toBeCalledWith(371);
});

test('Should "View chart in Explore"', () => {
  const props = createProps();
  render(<SliceHeaderControls {...props} />, { useRedux: true });

  expect(props.exploreChart).toBeCalledTimes(0);
  userEvent.click(
    screen.getByRole('menuitem', { name: 'View chart in Explore' }),
  );
  expect(props.exploreChart).toBeCalledTimes(1);
  expect(props.exploreChart).toBeCalledWith(371);
});

test('Should "Toggle chart description"', () => {
  const props = createProps();
  render(<SliceHeaderControls {...props} />, { useRedux: true });

  expect(props.toggleExpandSlice).toBeCalledTimes(0);
  userEvent.click(
    screen.getByRole('menuitem', { name: 'Toggle chart description' }),
  );
  expect(props.toggleExpandSlice).toBeCalledTimes(1);
  expect(props.toggleExpandSlice).toBeCalledWith(371);
});

test('Should "Force refresh"', () => {
  const props = createProps();
  render(<SliceHeaderControls {...props} />, { useRedux: true });

  expect(props.forceRefresh).toBeCalledTimes(0);
  userEvent.click(screen.getByRole('menuitem', { name: /Force refresh/ }));
  expect(props.forceRefresh).toBeCalledTimes(1);
  expect(props.forceRefresh).toBeCalledWith(371, 26);
});

test('Should "Maximize chart"', () => {
  const props = createProps();
  render(<SliceHeaderControls {...props} />, { useRedux: true });

  expect(props.handleToggleFullSize).toBeCalledTimes(0);
  userEvent.click(screen.getByRole('menuitem', { name: 'Maximize chart' }));
  expect(props.handleToggleFullSize).toBeCalledTimes(1);
});
