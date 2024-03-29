
import React from 'react';
import { styledMount as mount } from 'spec/helpers/theming';
import thunk from 'redux-thunk';
import configureStore from 'redux-mock-store';
import fetchMock from 'fetch-mock';
import { act } from 'react-dom/test-utils';

import waitForComponentToPaint from 'spec/helpers/waitForComponentToPaint';
import DashboardTable from 'src/views/CRUD/welcome/DashboardTable';
import DashboardCard from 'src/views/CRUD/dashboard/DashboardCard';

// store needed for withToasts(DashboardTable)
const mockStore = configureStore([thunk]);
const store = mockStore({});

const dashboardsEndpoint = 'glob:*/api/v1/dashboard/?*';
const dashboardInfoEndpoint = 'glob:*/api/v1/dashboard/_info*';
const dashboardFavEndpoint = 'glob:*/api/v1/dashboard/favorite_status?*';
const mockDashboards = [
  {
    id: 1,
    url: 'url',
    dashboard_title: 'title',
    changed_on_utc: '24 Feb 2014 10:13:14',
  },
];

fetchMock.get(dashboardsEndpoint, { result: mockDashboards });
fetchMock.get(dashboardInfoEndpoint, {
  permissions: ['can_list', 'can_edit', 'can_delete'],
});
fetchMock.get(dashboardFavEndpoint, {
  result: [],
});

describe('DashboardTable', () => {
  const dashboardProps = {
    dashboardFilter: 'Favorite',
    user: {
      userId: '2',
    },
    mine: mockDashboards,
  };
  let wrapper = mount(<DashboardTable store={store} {...dashboardProps} />);

  beforeAll(async () => {
    await waitForComponentToPaint(wrapper);
  });

  it('renders', () => {
    expect(wrapper.find(DashboardTable)).toExist();
  });

  it('render a submenu with clickable tabs and buttons', async () => {
    expect(wrapper.find('SubMenu')).toExist();
    expect(wrapper.find('li.no-router')).toHaveLength(2);
    expect(wrapper.find('Button')).toHaveLength(4);
    act(() => {
      const handler = wrapper.find('li.no-router a').at(1).prop('onClick');
      if (handler) {
        handler({} as any);
      }
    });
    await waitForComponentToPaint(wrapper);
    expect(fetchMock.calls(/dashboard\/\?q/)).toHaveLength(1);
  });

  it('render DashboardCard', () => {
    expect(wrapper.find(DashboardCard)).toExist();
  });

  it('display EmptyState if there is no data', async () => {
    await act(async () => {
      wrapper = mount(
        <DashboardTable
          dashboardFilter="Mine"
          user={{ userId: '2' }}
          mine={[]}
          store={store}
        />,
      );
    });

    expect(wrapper.find('EmptyState')).toExist();
  });
});
