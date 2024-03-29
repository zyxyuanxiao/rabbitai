
import React, { createRef } from 'react';
import shortid from 'shortid';
import Alert from 'src/components/Alert';
import Tabs from 'src/components/Tabs';
import { t, styled } from '@rabbitai-ui/core';

import { isFeatureEnabled, FeatureFlag } from 'src/featureFlags';

import Label from 'src/components/Label';
import { UserWithPermissionsAndRoles } from 'src/types/bootstrapTypes';
import QueryHistory from '../QueryHistory';
import ResultSet from '../ResultSet';
import {
  STATUS_OPTIONS,
  STATE_TYPE_MAP,
  LOCALSTORAGE_MAX_QUERY_AGE_MS,
} from '../../constants';

const TAB_HEIGHT = 140;

/*
    editorQueries are queries executed by users passed from SqlEditor component
    dataPrebiewQueries are all queries executed for preview of table data (from SqlEditorLeft)
*/
interface SouthPanePropTypes {
  editorQueries: any[];
  latestQueryId?: string;
  dataPreviewQueries: any[];
  actions: Record<string, Function>;
  activeSouthPaneTab?: string;
  height: number;
  databases: Record<string, any>;
  offline?: boolean;
  displayLimit: number;
  user: UserWithPermissionsAndRoles;
  defaultQueryLimit: number;
}

const StyledPane = styled.div`
  width: 100%;

  .ant-tabs .ant-tabs-content-holder {
    overflow: visible;
  }
  .SouthPaneTabs {
    height: 100%;
    display: flex;
    flex-direction: column;
    .scrollable {
      overflow-y: auto;
    }
  }
  .ant-tabs-tabpane {
    display: flex;
    flex-direction: column;
    .scrollable {
      overflow-y: auto;
    }
  }
  .tab-content {
    .alert {
      margin-top: ${({ theme }) => theme.gridUnit * 2}px;
    }

    button.fetch {
      margin-top: ${({ theme }) => theme.gridUnit * 2}px;
    }
  }
`;

export default function SouthPane({
  editorQueries,
  latestQueryId,
  dataPreviewQueries,
  actions,
  activeSouthPaneTab = 'Results',
  height,
  databases,
  offline = false,
  displayLimit,
  user,
  defaultQueryLimit,
}: SouthPanePropTypes) {
  const innerTabContentHeight = height - TAB_HEIGHT;
  const southPaneRef = createRef<HTMLDivElement>();
  const switchTab = (id: string) => {
    actions.setActiveSouthPaneTab(id);
  };
  const renderOfflineStatus = () => (
    <Label className="m-r-3" type={STATE_TYPE_MAP[STATUS_OPTIONS.offline]}>
      {STATUS_OPTIONS.offline}
    </Label>
  );

  const renderResults = () => {
    let latestQuery;
    if (editorQueries.length > 0) {
      // get the latest query
      latestQuery = editorQueries.find(({ id }) => id === latestQueryId);
    }
    let results;
    if (latestQuery) {
      if (
        isFeatureEnabled(FeatureFlag.SQLLAB_BACKEND_PERSISTENCE) &&
        latestQuery.state === 'success' &&
        !latestQuery.resultsKey &&
        !latestQuery.results
      ) {
        results = (
          <Alert
            type="warning"
            message={t(
              'No stored results found, you need to re-run your query',
            )}
          />
        );
        return results;
      }
      if (Date.now() - latestQuery.startDttm <= LOCALSTORAGE_MAX_QUERY_AGE_MS) {
        results = (
          <ResultSet
            showControls
            search
            query={latestQuery}
            actions={actions}
            user={user}
            height={innerTabContentHeight}
            database={databases[latestQuery.dbId]}
            displayLimit={displayLimit}
            defaultQueryLimit={defaultQueryLimit}
          />
        );
      }
    } else {
      results = (
        <Alert type="info" message={t('Run a query to display results here')} />
      );
    }
    return results;
  };

  const renderDataPreviewTabs = () =>
    dataPreviewQueries.map(query => (
      <Tabs.TabPane
        tab={t('Preview: `%s`', decodeURIComponent(query.tableName))}
        key={query.id}
      >
        <ResultSet
          query={query}
          visualize={false}
          csv={false}
          actions={actions}
          cache
          user={user}
          height={innerTabContentHeight}
          displayLimit={displayLimit}
          defaultQueryLimit={defaultQueryLimit}
        />
      </Tabs.TabPane>
    ));
  return offline ? (
    renderOfflineStatus()
  ) : (
    <StyledPane className="SouthPane" ref={southPaneRef}>
      <Tabs
        activeKey={activeSouthPaneTab}
        className="SouthPaneTabs"
        onChange={switchTab}
        id={shortid.generate()}
        fullWidth={false}
        animated={false}
      >
        <Tabs.TabPane tab={t('Results')} key="Results">
          {renderResults()}
        </Tabs.TabPane>
        <Tabs.TabPane tab={t('Query history')} key="History">
          <QueryHistory
            queries={editorQueries}
            actions={actions}
            displayLimit={displayLimit}
          />
        </Tabs.TabPane>
        {renderDataPreviewTabs()}
      </Tabs>
    </StyledPane>
  );
}
