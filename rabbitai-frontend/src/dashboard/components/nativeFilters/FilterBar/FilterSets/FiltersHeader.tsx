
import React, { FC } from 'react';
import { styled, t } from '@rabbitai-ui/core';
import { Collapse, Typography, Tooltip } from 'src/common/components';
import { DataMaskState } from 'src/dataMask/types';
import { CaretDownOutlined } from '@ant-design/icons';
import { areObjectsEqual } from 'src/reduxUtils';
import { FilterSet } from 'src/dashboard/reducers/types';
import { getFilterValueForDisplay } from './utils';
import { useFilters } from '../state';
import { getFilterBarTestId } from '../index';

const FilterHeader = styled.div`
  display: flex;
  align-items: center;
  font-size: ${({ theme }) => theme.typography.sizes.s}px;
`;

const StyledCollapse = styled(Collapse)`
  &.ant-collapse-ghost > .ant-collapse-item {
    & > .ant-collapse-content > .ant-collapse-content-box {
      padding: 0;
      padding-top: 0;
      padding-bottom: 0;
      font-size: ${({ theme }) => theme.typography.sizes.s}px;
    }
    & > .ant-collapse-header {
      padding: 0;
      display: flex;
      align-items: center;
      flex-direction: row-reverse;
      justify-content: flex-end;
      max-width: max-content;
      & .ant-collapse-arrow {
        position: static;
        padding-left: ${({ theme }) => theme.gridUnit}px;
      }
  }
`;

export type FiltersHeaderProps = {
  dataMask?: DataMaskState;
  filterSet?: FilterSet;
};

const FiltersHeader: FC<FiltersHeaderProps> = ({ dataMask, filterSet }) => {
  const filters = useFilters();
  const filterValues = Object.values(filters);

  let resultFilters = filterValues ?? [];
  if (filterSet?.nativeFilters) {
    resultFilters = Object.values(filterSet?.nativeFilters);
  }

  const getFiltersHeader = () => (
    <FilterHeader>
      <Typography.Text type="secondary">
        {t('Filters (%d)', resultFilters.length)}
      </Typography.Text>
    </FilterHeader>
  );

  const getFilterRow = ({ id, name }: { id: string; name: string }) => {
    const changedFilter =
      filterSet &&
      !areObjectsEqual(filters[id], filterSet?.nativeFilters?.[id], {
        ignoreUndefined: true,
      });
    const removedFilter = !Object.keys(filters).includes(id);

    return (
      <Tooltip
        title={
          (removedFilter &&
            t(
              "This filter doesn't exist in dashboard. It will not be applied.",
            )) ||
          (changedFilter &&
            t('Filter metadata changed in dashboard. It will not be applied.'))
        }
        placement="bottomLeft"
        key={id}
      >
        <div data-test="filter-info">
          <Typography.Text strong delete={removedFilter} mark={changedFilter}>
            {name}:&nbsp;
          </Typography.Text>
          <Typography.Text delete={removedFilter} mark={changedFilter}>
            {getFilterValueForDisplay(dataMask?.[id]?.filterState?.value) || (
              <Typography.Text type="secondary">{t('None')}</Typography.Text>
            )}
          </Typography.Text>
        </div>
      </Tooltip>
    );
  };

  return (
    <StyledCollapse
      ghost
      expandIconPosition="right"
      defaultActiveKey={!filterSet ? ['filters'] : undefined}
      expandIcon={({ isActive }: { isActive: boolean }) => (
        <CaretDownOutlined rotate={isActive ? 0 : 180} />
      )}
    >
      <Collapse.Panel
        {...getFilterBarTestId('collapse-filter-set-description')}
        header={getFiltersHeader()}
        key="filters"
      >
        {resultFilters.map(getFilterRow)}
      </Collapse.Panel>
    </StyledCollapse>
  );
};

export default FiltersHeader;
