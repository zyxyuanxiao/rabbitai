
import React from 'react';
import { styledMount as mount } from 'spec/helpers/theming';
import thunk from 'redux-thunk';
import fetchMock from 'fetch-mock';
import configureStore from 'redux-mock-store';

import { act } from 'react-dom/test-utils';
import ChartTable from 'src/views/CRUD/welcome/ChartTable';
import { ReactWrapper } from 'enzyme';
import waitForComponentToPaint from 'spec/helpers/waitForComponentToPaint';

const mockStore = configureStore([thunk]);
const store = mockStore({});

const chartsEndpoint = 'glob:*/api/v1/chart/?*';
const chartsInfoEndpoint = 'glob:*/api/v1/chart/_info*';
const chartFavoriteStatusEndpoint = 'glob:*/api/v1/chart/favorite_status*';

const mockCharts = [...new Array(3)].map((_, i) => ({
  changed_on_utc: new Date().toISOString(),
  created_by: 'super user',
  id: i,
  slice_name: `cool chart ${i}`,
  url: 'url',
  viz_type: 'bar',
  datasource_title: `ds${i}`,
  thumbnail_url: '',
}));

fetchMock.get(chartsEndpoint, {
  result: mockCharts,
});

fetchMock.get(chartsInfoEndpoint, {
  permissions: ['can_add', 'can_edit', 'can_delete'],
});

fetchMock.get(chartFavoriteStatusEndpoint, {
  result: [],
});

describe('ChartTable', () => {
  const mockedProps = {
    user: {
      userId: '2',
    },
  };

  let wrapper: ReactWrapper;

  beforeEach(async () => {
    act(() => {
      wrapper = mount(<ChartTable store={store} {...mockedProps} />);
    });
    await waitForComponentToPaint(wrapper);
  });

  it('renders', () => {
    expect(wrapper.find(ChartTable)).toExist();
  });

  it('fetches chart favorites and renders chart cards', async () => {
    act(() => {
      const handler = wrapper.find('li.no-router a').at(0).prop('onClick');
      if (handler) {
        handler({} as any);
      }
    });
    await waitForComponentToPaint(wrapper);
    expect(fetchMock.calls(chartsEndpoint)).toHaveLength(1);
    expect(wrapper.find('ChartCard')).toExist();
  });

  it('display EmptyState if there is no data', async () => {
    expect(wrapper.find('EmptyState')).toExist();
  });
});
