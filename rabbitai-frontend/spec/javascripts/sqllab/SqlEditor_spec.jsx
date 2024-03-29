
import React from 'react';
import { mount } from 'enzyme';
import { rabbitaiTheme, ThemeProvider } from '@rabbitai-ui/core';
import { Provider } from 'react-redux';
import thunk from 'redux-thunk';
import configureStore from 'redux-mock-store';
import fetchMock from 'fetch-mock';
import {
  SQL_EDITOR_GUTTER_HEIGHT,
  SQL_EDITOR_GUTTER_MARGIN,
  SQL_TOOLBAR_HEIGHT,
} from 'src/SqlLab/constants';
import AceEditorWrapper from 'src/SqlLab/components/AceEditorWrapper';
import ConnectedSouthPane from 'src/SqlLab/components/SouthPane/state';
import SqlEditor from 'src/SqlLab/components/SqlEditor';
import SqlEditorLeftBar from 'src/SqlLab/components/SqlEditorLeftBar';
import { Dropdown } from 'src/common/components';
import {
  queryEditorSetFunctionNames,
  queryEditorSetSelectedText,
} from 'src/SqlLab/actions/sqlLab';
import waitForComponentToPaint from 'spec/helpers/waitForComponentToPaint';
import { initialState, queries, table } from './fixtures';

const MOCKED_SQL_EDITOR_HEIGHT = 500;

fetchMock.get('glob:*/api/v1/database/*', {});

const middlewares = [thunk];
const mockStore = configureStore(middlewares);
const store = mockStore(initialState);

describe('SqlEditor', () => {
  const mockedProps = {
    actions: {
      queryEditorSetFunctionNames,
      queryEditorSetSelectedText,
      addDangerToast: jest.fn(),
    },
    database: {},
    queryEditorId: initialState.sqlLab.queryEditors[0].id,
    latestQuery: queries[0],
    tables: [table],
    getHeight: () => '100px',
    editorQueries: [],
    dataPreviewQueries: [],
    defaultQueryLimit: 1000,
    maxRow: 100000,
    displayLimit: 100,
  };

  const buildWrapper = (props = {}) =>
    mount(
      <Provider store={store}>
        <SqlEditor {...mockedProps} {...props} />
      </Provider>,
      {
        wrappingComponent: ThemeProvider,
        wrappingComponentProps: { theme: rabbitaiTheme },
      },
    );

  it('render a SqlEditorLeftBar', async () => {
    const wrapper = buildWrapper();
    await waitForComponentToPaint(wrapper);
    expect(wrapper.find(SqlEditorLeftBar)).toExist();
  });
  it('render an AceEditorWrapper', async () => {
    const wrapper = buildWrapper();
    await waitForComponentToPaint(wrapper);
    expect(wrapper.find(AceEditorWrapper)).toExist();
  });
  it('render a SouthPane', async () => {
    const wrapper = buildWrapper();
    await waitForComponentToPaint(wrapper);
    expect(wrapper.find(ConnectedSouthPane)).toExist();
  });
  // TODO eschutho convert tests to RTL
  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('does not overflow the editor window', async () => {
    const wrapper = buildWrapper();
    await waitForComponentToPaint(wrapper);
    const totalSize =
      parseFloat(wrapper.find(AceEditorWrapper).props().height) +
      wrapper.find(ConnectedSouthPane).props().height +
      SQL_TOOLBAR_HEIGHT +
      SQL_EDITOR_GUTTER_MARGIN * 2 +
      SQL_EDITOR_GUTTER_HEIGHT;
    expect(totalSize).toEqual(MOCKED_SQL_EDITOR_HEIGHT);
  });
  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('does not overflow the editor window after resizing', async () => {
    const wrapper = buildWrapper();
    wrapper.setState({ height: 450 });
    await waitForComponentToPaint(wrapper);
    const totalSize =
      parseFloat(wrapper.find(AceEditorWrapper).props().height) +
      wrapper.find(ConnectedSouthPane).props().height +
      SQL_TOOLBAR_HEIGHT +
      SQL_EDITOR_GUTTER_MARGIN * 2 +
      SQL_EDITOR_GUTTER_HEIGHT;
    expect(totalSize).toEqual(450);
  });
  it('render a Limit Dropdown', async () => {
    const defaultQueryLimit = 101;
    const updatedProps = { ...mockedProps, defaultQueryLimit };
    const wrapper = buildWrapper(updatedProps);
    await waitForComponentToPaint(wrapper);
    expect(wrapper.find(Dropdown)).toExist();
  });
});
