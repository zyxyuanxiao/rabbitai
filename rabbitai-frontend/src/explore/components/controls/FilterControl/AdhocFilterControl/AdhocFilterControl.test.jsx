
/* eslint-disable no-unused-expressions */
import React from 'react';
import sinon from 'sinon';
import { shallow } from 'enzyme';
import { rabbitaiTheme } from '@rabbitai-ui/core';

import AdhocFilter, {
  EXPRESSION_TYPES,
  CLAUSES,
} from 'src/explore/components/controls/FilterControl/AdhocFilter';
import { LabelsContainer } from 'src/explore/components/controls/OptionControls';
import { AGGREGATES, OPERATORS } from 'src/explore/constants';
import AdhocMetric from 'src/explore/components/controls/MetricControl/AdhocMetric';
import AdhocFilterControl from '.';

const simpleAdhocFilter = new AdhocFilter({
  expressionType: EXPRESSION_TYPES.SIMPLE,
  subject: 'value',
  operator: '>',
  comparator: '10',
  clause: CLAUSES.WHERE,
});

const sumValueAdhocMetric = new AdhocMetric({
  expressionType: EXPRESSION_TYPES.SIMPLE,
  column: { type: 'VARCHAR(255)', column_name: 'source' },
  aggregate: AGGREGATES.SUM,
});

const savedMetric = { metric_name: 'sum__value', expression: 'SUM(value)' };

const columns = [
  { type: 'VARCHAR(255)', column_name: 'source' },
  { type: 'VARCHAR(255)', column_name: 'target' },
  { type: 'DOUBLE', column_name: 'value' },
];

const formData = {
  metric: undefined,
  metrics: [sumValueAdhocMetric, savedMetric.metric_name],
};

function setup(overrides) {
  const onChange = sinon.spy();
  const props = {
    onChange,
    value: [simpleAdhocFilter],
    datasource: { type: 'table' },
    columns,
    savedMetrics: [savedMetric],
    formData,
    theme: rabbitaiTheme,
    ...overrides,
  };
  const wrapper = shallow(<AdhocFilterControl {...props} />);
  const component = wrapper.shallow();
  return { wrapper, component, onChange };
}

describe('AdhocFilterControl', () => {
  it('renders LabelsContainer', () => {
    const { component } = setup();
    expect(component.find(LabelsContainer)).toExist();
  });

  it('handles saved metrics being selected to filter on', () => {
    const { component, onChange } = setup({ value: [] });
    component.instance().onNewFilter({ saved_metric_name: 'sum__value' });

    const adhocFilter = onChange.lastCall.args[0][0];
    expect(adhocFilter instanceof AdhocFilter).toBe(true);
    expect(
      adhocFilter.equals(
        new AdhocFilter({
          expressionType: EXPRESSION_TYPES.SQL,
          subject: savedMetric.expression,
          operator: OPERATORS['>'],
          comparator: 0,
          clause: CLAUSES.HAVING,
        }),
      ),
    ).toBe(true);
  });

  it('handles adhoc metrics being selected to filter on', () => {
    const { component, onChange } = setup({ value: [] });
    component.instance().onNewFilter(sumValueAdhocMetric);

    const adhocFilter = onChange.lastCall.args[0][0];
    expect(adhocFilter instanceof AdhocFilter).toBe(true);
    expect(
      adhocFilter.equals(
        new AdhocFilter({
          expressionType: EXPRESSION_TYPES.SQL,
          subject: sumValueAdhocMetric.label,
          operator: OPERATORS['>'],
          comparator: 0,
          clause: CLAUSES.HAVING,
        }),
      ),
    ).toBe(true);
  });

  it('persists existing filters even when new filters are added', () => {
    const { component, onChange } = setup();
    component.instance().onNewFilter(columns[0]);

    const existingAdhocFilter = onChange.lastCall.args[0][0];
    expect(existingAdhocFilter instanceof AdhocFilter).toBe(true);
    expect(existingAdhocFilter.equals(simpleAdhocFilter)).toBe(true);

    const newAdhocFilter = onChange.lastCall.args[0][1];
    expect(newAdhocFilter instanceof AdhocFilter).toBe(true);
    expect(
      newAdhocFilter.equals(
        new AdhocFilter({
          expressionType: EXPRESSION_TYPES.SIMPLE,
          subject: columns[0].column_name,
          operator: OPERATORS['=='],
          comparator: '',
          clause: CLAUSES.WHERE,
        }),
      ),
    ).toBe(true);
  });
});
