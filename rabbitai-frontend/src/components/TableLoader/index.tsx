
import React, { useState, useEffect, useMemo } from 'react';
import { t, RabbitaiClient, JsonObject } from '@rabbitai-ui/core';
import TableView, { EmptyWrapperType } from 'src/components/TableView';
import withToasts from 'src/messageToasts/enhancers/withToasts';
import Loading from 'src/components/Loading';
import 'stylesheets/reactable-pagination.less';

export interface TableLoaderProps {
  dataEndpoint?: string;
  mutator?: (data: JsonObject) => any[];
  columns?: string[];
  addDangerToast(text: string): any;
}

const TableLoader = (props: TableLoaderProps) => {
  const [data, setData] = useState<Array<any>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const { dataEndpoint, mutator } = props;
    if (dataEndpoint) {
      RabbitaiClient.get({ endpoint: dataEndpoint })
        .then(({ json }) => {
          const data = (mutator ? mutator(json) : json) as Array<any>;
          setData(data);
          setIsLoading(false);
        })
        .catch(() => {
          setIsLoading(false);
          props.addDangerToast(t('An error occurred'));
        });
    }
  }, [props]);

  const { columns, ...tableProps } = props;

  const memoizedColumns = useMemo(() => {
    let tableColumns = columns;
    if (!columns && data.length > 0) {
      tableColumns = Object.keys(data[0]).filter(col => col[0] !== '_');
    }
    return tableColumns
      ? tableColumns.map((column: string) => ({
          accessor: column,
          Header: column,
        }))
      : [];
  }, [columns, data]);

  delete tableProps.dataEndpoint;
  delete tableProps.mutator;

  if (isLoading) {
    return <Loading />;
  }

  return (
    <TableView
      columns={memoizedColumns}
      data={data}
      pageSize={50}
      loading={isLoading}
      emptyWrapperType={EmptyWrapperType.Small}
      {...tableProps}
    />
  );
};

export default withToasts(TableLoader);
