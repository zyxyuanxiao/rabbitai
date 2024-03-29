
import React from 'react';
import { shallow } from 'enzyme';
import sinon from 'sinon';

import Chart from 'src/dashboard/components/gridComponents/Chart';
import SliceHeader from 'src/dashboard/components/SliceHeader';
import ChartContainer from 'src/chart/ChartContainer';

import { sliceEntitiesForChart as sliceEntities } from 'spec/fixtures/mockSliceEntities';
import mockDatasource from 'spec/fixtures/mockDatasource';
import chartQueries, {
  sliceId as queryId,
} from 'spec/fixtures/mockChartQueries';

describe('Chart', () => {
  const props = {
    id: queryId,
    width: 100,
    height: 100,
    updateSliceName() {},

    // from redux
    chart: chartQueries[queryId],
    formData: chartQueries[queryId].formData,
    datasource: mockDatasource[sliceEntities.slices[queryId].datasource],
    slice: {
      ...sliceEntities.slices[queryId],
      description_markeddown: 'markdown',
      owners: [],
    },
    sliceName: sliceEntities.slices[queryId].slice_name,
    timeout: 60,
    filters: {},
    refreshChart() {},
    toggleExpandSlice() {},
    addFilter() {},
    logEvent() {},
    handleToggleFullSize() {},
    changeFilter() {},
    setFocusedFilterField() {},
    unsetFocusedFilterField() {},
    addSuccessToast() {},
    addDangerToast() {},
    componentId: 'test',
    dashboardId: 111,
    editMode: false,
    isExpanded: false,
    rabbitaiCanExplore: false,
    rabbitaiCanCSV: false,
    sliceCanEdit: false,
  };

  function setup(overrideProps) {
    const wrapper = shallow(<Chart {...props} {...overrideProps} />);
    return wrapper;
  }

  it('should render a SliceHeader', () => {
    const wrapper = setup();
    expect(wrapper.find(SliceHeader)).toExist();
  });

  it('should render a ChartContainer', () => {
    const wrapper = setup();
    expect(wrapper.find(ChartContainer)).toExist();
  });

  it('should render a description if it has one and isExpanded=true', () => {
    const wrapper = setup();
    expect(wrapper.find('.slice_description')).not.toExist();

    wrapper.setProps({ ...props, isExpanded: true });
    expect(wrapper.find('.slice_description')).toExist();
  });

  it('should call refreshChart when SliceHeader calls forceRefresh', () => {
    const refreshChart = sinon.spy();
    const wrapper = setup({ refreshChart });
    wrapper.instance().forceRefresh();
    expect(refreshChart.callCount).toBe(1);
  });

  it('should call changeFilter when ChartContainer calls changeFilter', () => {
    const changeFilter = sinon.spy();
    const wrapper = setup({ changeFilter });
    wrapper.instance().changeFilter();
    expect(changeFilter.callCount).toBe(1);
  });
});
