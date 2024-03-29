
import React from 'react';
import { styled, t } from '@rabbitai-ui/core';
import { useFilters, usePagination, useSortBy, useTable } from 'react-table';
import { Empty } from 'src/common/components';
import { TableCollection, Pagination } from 'src/components/dataViewCommon';
import { SortColumns } from './types';

const DEFAULT_PAGE_SIZE = 10;

export enum EmptyWrapperType {
  Default = 'Default',
  Small = 'Small',
}

export interface TableViewProps {
  columns: any[];
  data: any[];
  pageSize?: number;
  initialPageIndex?: number;
  initialSortBy?: SortColumns;
  loading?: boolean;
  withPagination?: boolean;
  emptyWrapperType?: EmptyWrapperType;
  noDataText?: string;
  className?: string;
  isPaginationSticky?: boolean;
  showRowCount?: boolean;
  scrollTable?: boolean;
}

const EmptyWrapper = styled.div`
  margin: ${({ theme }) => theme.gridUnit * 40}px 0;
`;

const TableViewStyles = styled.div<{
  isPaginationSticky?: boolean;
  scrollTable?: boolean;
}>`
  ${({ scrollTable, theme }) =>
    scrollTable &&
    `
    height: 300px;
    margin-bottom: ${theme.gridUnit * 4}px;
    overflow: auto;
  `}

  .table-cell.table-cell {
    vertical-align: top;
  }

  .pagination-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background-color: ${({ theme }) => theme.colors.grayscale.light5};

    ${({ theme, isPaginationSticky }) =>
      isPaginationSticky &&
      `
        position: sticky;
        bottom: 0;
        left: 0;
    `};
  }

  .row-count-container {
    margin-top: ${({ theme }) => theme.gridUnit * 2}px;
    color: ${({ theme }) => theme.colors.grayscale.base};
  }
`;

const TableView = ({
  columns,
  data,
  pageSize: initialPageSize,
  initialPageIndex,
  initialSortBy = [],
  loading = false,
  withPagination = true,
  emptyWrapperType = EmptyWrapperType.Default,
  noDataText,
  showRowCount = true,
  ...props
}: TableViewProps) => {
  const initialState = {
    pageSize: initialPageSize ?? DEFAULT_PAGE_SIZE,
    pageIndex: initialPageIndex ?? 0,
    sortBy: initialSortBy,
  };

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    page,
    rows,
    prepareRow,
    pageCount,
    gotoPage,
    state: { pageIndex, pageSize },
  } = useTable(
    {
      columns,
      data,
      initialState,
    },
    useFilters,
    useSortBy,
    usePagination,
  );

  const content = withPagination ? page : rows;

  let EmptyWrapperComponent;
  switch (emptyWrapperType) {
    case EmptyWrapperType.Small:
      EmptyWrapperComponent = ({ children }: any) => <>{children}</>;
      break;
    case EmptyWrapperType.Default:
    default:
      EmptyWrapperComponent = ({ children }: any) => (
        <EmptyWrapper>{children}</EmptyWrapper>
      );
  }

  const isEmpty = !loading && content.length === 0;

  return (
    <TableViewStyles {...props}>
      <TableCollection
        getTableProps={getTableProps}
        getTableBodyProps={getTableBodyProps}
        prepareRow={prepareRow}
        headerGroups={headerGroups}
        rows={content}
        columns={columns}
        loading={loading}
      />
      {isEmpty && (
        <EmptyWrapperComponent>
          {noDataText ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={noDataText}
            />
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </EmptyWrapperComponent>
      )}
      {pageCount > 1 && withPagination && (
        <div className="pagination-container">
          <Pagination
            totalPages={pageCount || 0}
            currentPage={pageCount ? pageIndex + 1 : 0}
            onChange={(p: number) => gotoPage(p - 1)}
            hideFirstAndLastPageLinks
          />
          {showRowCount && (
            <div className="row-count-container">
              {!loading &&
                t(
                  '%s-%s of %s',
                  pageSize * pageIndex + (page.length && 1),
                  pageSize * pageIndex + page.length,
                  data.length,
                )}
            </div>
          )}
        </div>
      )}
    </TableViewStyles>
  );
};

export default React.memo(TableView);
