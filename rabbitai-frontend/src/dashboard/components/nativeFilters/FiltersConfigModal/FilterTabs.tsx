
import { PlusOutlined } from '@ant-design/icons';
import { styled, t } from '@rabbitai-ui/core';
import React, { FC } from 'react';
import { LineEditableTabs } from 'src/components/Tabs';
import Icon from 'src/components/Icon';
import { FilterRemoval } from './types';
import { REMOVAL_DELAY_SECS } from './utils';

export const FILTER_WIDTH = 200;

export const StyledSpan = styled.span`
  cursor: pointer;
  color: ${({ theme }) => theme.colors.primary.dark1};
  &:hover {
    color: ${({ theme }) => theme.colors.primary.dark2};
  }
`;

export const StyledFilterTitle = styled.span`
  width: ${FILTER_WIDTH}px;
  white-space: normal;
  color: ${({ theme }) => theme.colors.grayscale.dark1};
`;

export const StyledAddFilterBox = styled.div`
  color: ${({ theme }) => theme.colors.primary.dark1};
  text-align: left;
  padding: ${({ theme }) => theme.gridUnit * 2}px 0;
  margin: ${({ theme }) => theme.gridUnit * 3}px 0 0
    ${({ theme }) => -theme.gridUnit * 2}px;
  border-top: 1px solid ${({ theme }) => theme.colors.grayscale.light1};

  &:hover {
    color: ${({ theme }) => theme.colors.primary.base};
  }
`;

export const StyledTrashIcon = styled(Icon)`
  color: ${({ theme }) => theme.colors.grayscale.light3};
`;

export const FilterTabTitle = styled.span`
  transition: color ${({ theme }) => theme.transitionTiming}s;
  width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: space-between;

  @keyframes tabTitleRemovalAnimation {
    0%,
    90% {
      opacity: 1;
    }
    95%,
    100% {
      opacity: 0;
    }
  }

  &.removed {
    color: ${({ theme }) => theme.colors.warning.dark1};
    transform-origin: top;
    animation-name: tabTitleRemovalAnimation;
    animation-duration: ${REMOVAL_DELAY_SECS}s;
  }
`;

const FilterTabsContainer = styled(LineEditableTabs)`
  ${({ theme }) => `
    height: 100%;

    & > .ant-tabs-content-holder {
      border-left: 1px solid ${theme.colors.grayscale.light2};
      margin-right: ${theme.gridUnit * 4}px;
    }
    & > .ant-tabs-content-holder ~ .ant-tabs-content-holder {
      border: none;
    }

    &.ant-tabs-left
      > .ant-tabs-content-holder
      > .ant-tabs-content
      > .ant-tabs-tabpane {
      padding-left: ${theme.gridUnit * 4}px;
      margin-top: ${theme.gridUnit * 4}px;
    }

    .ant-tabs-nav-list {
      padding-top: ${theme.gridUnit * 4}px;
      padding-right: ${theme.gridUnit * 2}px;
      padding-bottom: ${theme.gridUnit * 4}px;
      padding-left: ${theme.gridUnit * 3}px;
    }

    // extra selector specificity:
    &.ant-tabs-card > .ant-tabs-nav .ant-tabs-tab {
      min-width: ${FILTER_WIDTH}px;
      margin: 0 ${theme.gridUnit * 2}px 0 0;
      padding: ${theme.gridUnit}px
        ${theme.gridUnit * 2}px;

      &:hover,
      &-active {
        color: ${theme.colors.grayscale.dark1};
        border-radius: ${theme.borderRadius}px;
        background-color: ${theme.colors.secondary.light4};

        .ant-tabs-tab-remove > svg {
          color: ${theme.colors.grayscale.base};
          transition: all 0.3s;
        }
      }
    }

    .ant-tabs-tab-btn {
      text-align: left;
      justify-content: space-between;
      text-transform: unset;
    }
  `}
`;

type FilterTabsProps = {
  onChange: (activeKey: string) => void;
  getFilterTitle: (id: string) => string;
  currentFilterId: string;
  onEdit: (filterId: string, action: 'add' | 'remove') => void;
  filterIds: string[];
  removedFilters: Record<string, FilterRemoval>;
  restoreFilter: Function;
  children: Function;
};

const FilterTabs: FC<FilterTabsProps> = ({
  onEdit,
  getFilterTitle,
  onChange,
  currentFilterId,
  filterIds = [],
  removedFilters = [],
  restoreFilter,
  children,
}) => (
  <FilterTabsContainer
    tabPosition="left"
    onChange={onChange}
    activeKey={currentFilterId}
    onEdit={onEdit}
    addIcon={
      <StyledAddFilterBox>
        <PlusOutlined />{' '}
        <span data-test="add-filter-button" aria-label="Add filter">
          {t('Add filter')}
        </span>
      </StyledAddFilterBox>
    }
  >
    {filterIds.map(id => (
      <LineEditableTabs.TabPane
        tab={
          <FilterTabTitle className={removedFilters[id] ? 'removed' : ''}>
            <StyledFilterTitle>
              {removedFilters[id] ? t('(Removed)') : getFilterTitle(id)}
            </StyledFilterTitle>
            {removedFilters[id] && (
              <StyledSpan
                role="button"
                data-test="undo-button"
                tabIndex={0}
                onClick={() => restoreFilter(id)}
              >
                {t('Undo?')}
              </StyledSpan>
            )}
          </FilterTabTitle>
        }
        key={id}
        closeIcon={
          removedFilters[id] ? <></> : <StyledTrashIcon name="trash" />
        }
      >
        {
          // @ts-ignore
          children(id)
        }
      </LineEditableTabs.TabPane>
    ))}
  </FilterTabsContainer>
);

export default FilterTabs;
