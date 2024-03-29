
import userEvent from '@testing-library/user-event';
import React from 'react';
import { render, screen } from 'spec/helpers/testing-library';
import CollectionControl from '.';

jest.mock('@rabbitai-ui/chart-controls', () => ({
  InfoTooltipWithTrigger: (props: any) => (
    <button
      onClick={props.onClick}
      type="button"
      data-icon={props.icon}
      data-tooltip={props.tooltip}
    >
      {props.label}
    </button>
  ),
}));

jest.mock('..', () => ({
  __esModule: true,
  default: {
    TestControl: (props: any) => (
      <button
        type="button"
        onClick={() => props.onChange(0, 'update')}
        data-test="TestControl"
      >
        TestControl
      </button>
    ),
  },
}));

const createProps = () => ({
  actions: {
    addDangerToast: jest.fn(),
    addInfoToast: jest.fn(),
    addSuccessToast: jest.fn(),
    addWarningToast: jest.fn(),
    createNewSlice: jest.fn(),
    fetchDatasourcesStarted: jest.fn(),
    fetchDatasourcesSucceeded: jest.fn(),
    fetchFaveStar: jest.fn(),
    saveFaveStar: jest.fn(),
    setControlValue: jest.fn(),
    setDatasource: jest.fn(),
    setDatasourceType: jest.fn(),
    setDatasources: jest.fn(),
    setExploreControls: jest.fn(),
    sliceUpdated: jest.fn(),
    toggleFaveStar: jest.fn(),
    updateChartTitle: jest.fn(),
  },
  addTooltip: 'Add an item',
  controlName: 'TestControl',
  description: null,
  hovered: false,
  itemGenerator: jest.fn(),
  keyAccessor: jest.fn(() => 'hrYAZ5iBH'),
  label: 'Time series columns',
  name: 'column_collection',
  onChange: jest.fn(),
  placeholder: 'Empty collection',
  type: 'CollectionControl',
  validationErrors: [],
  validators: [jest.fn()],
  value: [{ key: 'hrYAZ5iBH' }],
});

test('Should render', () => {
  const props = createProps();
  render(<CollectionControl {...props} />);
  expect(screen.getByTestId('CollectionControl')).toBeInTheDocument();
});

test('Should show the button with the label', () => {
  const props = createProps();
  render(<CollectionControl {...props} />);
  expect(screen.getByRole('button', { name: props.label })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: props.label })).toHaveTextContent(
    props.label,
  );
});

test('Should have add button', () => {
  const props = createProps();
  render(<CollectionControl {...props} />);

  expect(props.onChange).toBeCalledTimes(0);
  userEvent.click(screen.getByRole('button', { name: 'plus-large' }));
  expect(props.onChange).toBeCalledWith([{ key: 'hrYAZ5iBH' }, undefined]);
});

test('Should have remove button', () => {
  const props = createProps();
  render(<CollectionControl {...props} />);

  expect(props.onChange).toBeCalledTimes(0);
  userEvent.click(screen.getByRole('button', { name: 'remove-item' }));
  expect(props.onChange).toBeCalledWith([]);
});

test('Should have SortableDragger icon', () => {
  const props = createProps();
  render(<CollectionControl {...props} />);
  expect(screen.getByLabelText('drag')).toBeVisible();
});

test('Should call Control component', () => {
  const props = createProps();
  render(<CollectionControl {...props} />);

  expect(props.onChange).toBeCalledTimes(0);
  userEvent.click(screen.getByTestId('TestControl'));
  expect(props.onChange).toBeCalledWith([{ key: 'hrYAZ5iBH' }]);
});
