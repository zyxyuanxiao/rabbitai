
import React from 'react';
import { render, screen } from 'spec/helpers/testing-library';
import { Provider } from 'react-redux';
import fetchMock from 'fetch-mock';
import { storeWithState } from 'spec/fixtures/mockStore';
import ToastPresenter from 'src/messageToasts/containers/ToastPresenter';
import TableLoader, { TableLoaderProps } from '.';

fetchMock.get('glob:*/api/v1/mock', [
  { id: 1, name: 'John Doe' },
  { id: 2, name: 'Jane Doe' },
]);

const defaultProps: TableLoaderProps = {
  dataEndpoint: '/api/v1/mock',
  addDangerToast: jest.fn(),
};

function renderWithProps(props: TableLoaderProps = defaultProps) {
  return render(
    <Provider store={storeWithState({})}>
      <TableLoader {...props} />
      <ToastPresenter />
    </Provider>,
  );
}

test('renders loading and table', async () => {
  renderWithProps();

  expect(screen.getByRole('status')).toBeInTheDocument();
  expect(await screen.findByRole('table')).toBeInTheDocument();
});

test('renders with column names', async () => {
  renderWithProps({
    ...defaultProps,
    columns: ['id_modified', 'name_modified'],
  });

  const columnHeaders = await screen.findAllByRole('columnheader');

  expect(columnHeaders[0]).toHaveTextContent('id_modified');
  expect(columnHeaders[1]).toHaveTextContent('name_modified');
});

test('renders without mutator', async () => {
  renderWithProps();

  expect(await screen.findAllByRole('row')).toHaveLength(3);
  expect(await screen.findAllByRole('columnheader')).toHaveLength(2);
  expect(await screen.findAllByRole('cell')).toHaveLength(4);
});

test('renders with mutator', async () => {
  const mutator = function (data: { id: number; name: string }[]) {
    return data.map(row => ({
      id: row.id,
      name: <h4>{row.name}</h4>,
    }));
  };

  renderWithProps({ ...defaultProps, mutator });

  expect(await screen.findAllByRole('heading', { level: 4 })).toHaveLength(2);
});

test('renders error message', async () => {
  fetchMock.mock('glob:*/api/v1/mock', 500, {
    overwriteRoutes: true,
  });

  renderWithProps();

  expect(await screen.findByRole('alert')).toBeInTheDocument();
});
