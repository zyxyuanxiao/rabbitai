

import React from 'react';
import { render, screen, waitFor } from 'spec/helpers/testing-library';
import { RabbitaiClient } from '@rabbitai-ui/core';
import userEvent from '@testing-library/user-event';
import DatabaseSelector from '.';

const RabbitaiClientGet = jest.spyOn(RabbitaiClient, 'get');

const createProps = () => ({
  dbId: 1,
  formMode: false,
  isDatabaseSelectEnabled: true,
  readOnly: false,
  schema: 'public',
  sqlLabMode: true,
  getDbList: jest.fn(),
  getTableList: jest.fn(),
  handleError: jest.fn(),
  onDbChange: jest.fn(),
  onSchemaChange: jest.fn(),
  onSchemasLoad: jest.fn(),
  onChange: jest.fn(),
});

beforeEach(() => {
  jest.resetAllMocks();
  RabbitaiClientGet.mockImplementation(
    async ({ endpoint }: { endpoint: string }) => {
      if (endpoint.includes('schemas')) {
        return {
          json: { result: ['information_schema', 'public'] },
        } as any;
      }
      if (endpoint.includes('/function_names')) {
        return {
          json: { function_names: [] },
        } as any;
      }
      return {
        json: {
          count: 1,
          description_columns: {},
          ids: [1],
          label_columns: {
            allow_csv_upload: 'Allow Csv Upload',
            allow_ctas: 'Allow Ctas',
            allow_cvas: 'Allow Cvas',
            allow_dml: 'Allow Dml',
            allow_multi_schema_metadata_fetch:
              'Allow Multi Schema Metadata Fetch',
            allow_run_async: 'Allow Run Async',
            allows_cost_estimate: 'Allows Cost Estimate',
            allows_subquery: 'Allows Subquery',
            allows_virtual_table_explore: 'Allows Virtual Table Explore',
            backend: 'Backend',
            changed_on: 'Changed On',
            changed_on_delta_humanized: 'Changed On Delta Humanized',
            'created_by.first_name': 'Created By First Name',
            'created_by.last_name': 'Created By Last Name',
            database_name: 'Database Name',
            explore_database_id: 'Explore Database Id',
            expose_in_sqllab: 'Expose In Sqllab',
            force_ctas_schema: 'Force Ctas Schema',
            id: 'Id',
          },
          list_columns: [
            'allow_csv_upload',
            'allow_ctas',
            'allow_cvas',
            'allow_dml',
            'allow_multi_schema_metadata_fetch',
            'allow_run_async',
            'allows_cost_estimate',
            'allows_subquery',
            'allows_virtual_table_explore',
            'backend',
            'changed_on',
            'changed_on_delta_humanized',
            'created_by.first_name',
            'created_by.last_name',
            'database_name',
            'explore_database_id',
            'expose_in_sqllab',
            'force_ctas_schema',
            'id',
          ],
          list_title: 'List Database',
          order_columns: [
            'allow_csv_upload',
            'allow_dml',
            'allow_run_async',
            'changed_on',
            'changed_on_delta_humanized',
            'created_by.first_name',
            'database_name',
            'expose_in_sqllab',
          ],
          result: [
            {
              allow_csv_upload: false,
              allow_ctas: false,
              allow_cvas: false,
              allow_dml: false,
              allow_multi_schema_metadata_fetch: false,
              allow_run_async: false,
              allows_cost_estimate: null,
              allows_subquery: true,
              allows_virtual_table_explore: true,
              backend: 'postgresql',
              changed_on: '2021-03-09T19:02:07.141095',
              changed_on_delta_humanized: 'a day ago',
              created_by: null,
              database_name: 'examples',
              explore_database_id: 1,
              expose_in_sqllab: true,
              force_ctas_schema: null,
              id: 1,
            },
          ],
        },
      } as any;
    },
  );
});

test('Should render', async () => {
  const props = createProps();
  render(<DatabaseSelector {...props} />);
  expect(await screen.findByTestId('DatabaseSelector')).toBeInTheDocument();
});

test('Refresh should work', async () => {
  const props = createProps();

  render(<DatabaseSelector {...props} />);

  await waitFor(() => {
    expect(RabbitaiClientGet).toBeCalledTimes(2);
    expect(props.getDbList).toBeCalledTimes(1);
    expect(props.getTableList).toBeCalledTimes(0);
    expect(props.handleError).toBeCalledTimes(0);
    expect(props.onDbChange).toBeCalledTimes(0);
    expect(props.onSchemaChange).toBeCalledTimes(0);
    expect(props.onSchemasLoad).toBeCalledTimes(1);
    expect(props.onChange).toBeCalledTimes(0);
  });

  userEvent.click(screen.getByRole('button'));

  await waitFor(() => {
    expect(RabbitaiClientGet).toBeCalledTimes(3);
    expect(props.getDbList).toBeCalledTimes(1);
    expect(props.getTableList).toBeCalledTimes(0);
    expect(props.handleError).toBeCalledTimes(0);
    expect(props.onDbChange).toBeCalledTimes(1);
    expect(props.onSchemaChange).toBeCalledTimes(1);
    expect(props.onSchemasLoad).toBeCalledTimes(2);
    expect(props.onChange).toBeCalledTimes(1);
  });
});

test('Should database select display options', async () => {
  const props = createProps();
  render(<DatabaseSelector {...props} />);
  const selector = await screen.findByText('Database:');
  expect(selector).toBeInTheDocument();
  expect(selector.parentElement).toHaveTextContent(
    'Database:postgresql examples',
  );
});

test('Should schema select display options', async () => {
  const props = createProps();
  render(<DatabaseSelector {...props} />);

  const selector = await screen.findByText('Schema:');
  expect(selector).toBeInTheDocument();
  expect(selector.parentElement).toHaveTextContent('Schema: public');

  userEvent.click(screen.getByRole('button'));

  expect(await screen.findByText('Select a schema (2)')).toBeInTheDocument();
});
