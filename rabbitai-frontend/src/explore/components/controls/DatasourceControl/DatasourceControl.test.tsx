

import React from 'react';
import { render, screen, act } from 'spec/helpers/testing-library';
import userEvent from '@testing-library/user-event';
import { RabbitaiClient } from '@rabbitai-ui/core';
import * as Utils from 'src/explore/exploreUtils';
import DatasourceControl from '.';

const RabbitaiClientGet = jest.spyOn(RabbitaiClient, 'get');

const createProps = () => ({
  hovered: false,
  type: 'DatasourceControl',
  label: 'Datasource',
  default: null,
  description: null,
  value: '25__table',
  datasource: {
    id: 25,
    database: {
      name: 'examples',
    },
    name: 'channels',
    type: 'table',
    columns: [],
  },
  validationErrors: [],
  name: 'datasource',
  actions: {},
  isEditable: true,
  onChange: jest.fn(),
  onDatasourceSave: jest.fn(),
});

test('Should render', () => {
  const props = createProps();
  render(<DatasourceControl {...props} />);
  expect(screen.getByTestId('datasource-control')).toBeVisible();
});

test('Should have elements', () => {
  const props = createProps();
  render(<DatasourceControl {...props} />);
  expect(screen.getByText('channels')).toBeVisible();
  expect(screen.getByTestId('datasource-menu-trigger')).toBeVisible();
});

test('Should open a menu', () => {
  const props = createProps();
  render(<DatasourceControl {...props} />);

  expect(screen.queryByText('Edit dataset')).not.toBeInTheDocument();
  expect(screen.queryByText('Change dataset')).not.toBeInTheDocument();
  expect(screen.queryByText('View in SQL Lab')).not.toBeInTheDocument();

  userEvent.click(screen.getByTestId('datasource-menu-trigger'));

  expect(screen.getByText('Edit dataset')).toBeInTheDocument();
  expect(screen.getByText('Change dataset')).toBeInTheDocument();
  expect(screen.getByText('View in SQL Lab')).toBeInTheDocument();
});

test('Click on Change dataset option', async () => {
  const props = createProps();
  RabbitaiClientGet.mockImplementation(
    async ({ endpoint }: { endpoint: string }) => {
      if (endpoint.includes('_info')) {
        return {
          json: { permissions: ['can_read', 'can_write'] },
        } as any;
      }
      return { json: { result: [] } } as any;
    },
  );

  render(<DatasourceControl {...props} />, {
    useRedux: true,
  });
  userEvent.click(screen.getByTestId('datasource-menu-trigger'));

  await act(async () => {
    userEvent.click(screen.getByText('Change dataset'));
  });
  expect(
    screen.getByText(
      'Changing the dataset may break the chart if the chart relies on columns or metadata that does not exist in the target dataset',
    ),
  ).toBeInTheDocument();
});

test('Click on Edit dataset', async () => {
  const props = createProps();
  RabbitaiClientGet.mockImplementation(
    async () => ({ json: { result: [] } } as any),
  );
  render(<DatasourceControl {...props} />, {
    useRedux: true,
  });
  userEvent.click(screen.getByTestId('datasource-menu-trigger'));

  await act(async () => {
    userEvent.click(screen.getByText('Edit dataset'));
  });

  expect(
    screen.getByText(
      'Changing these settings will affect all charts using this dataset, including charts owned by other people.',
    ),
  ).toBeInTheDocument();
});

test('Click on View in SQL Lab', async () => {
  const props = createProps();
  const postFormSpy = jest.spyOn(Utils, 'postForm');
  postFormSpy.mockImplementation(jest.fn());

  render(<DatasourceControl {...props} />, {
    useRedux: true,
  });
  userEvent.click(screen.getByTestId('datasource-menu-trigger'));

  expect(postFormSpy).toBeCalledTimes(0);

  await act(async () => {
    userEvent.click(screen.getByText('View in SQL Lab'));
  });

  expect(postFormSpy).toBeCalledTimes(1);
});
