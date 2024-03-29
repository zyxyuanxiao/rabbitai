
import React from 'react';
import PropTypes from 'prop-types';
import columnType from './columnType';
import AdhocMetricOption from './AdhocMetricOption';
import AdhocMetric from './AdhocMetric';
import savedMetricType from './savedMetricType';

const propTypes = {
  option: PropTypes.oneOfType([PropTypes.object, PropTypes.string]).isRequired,
  index: PropTypes.number.isRequired,
  onMetricEdit: PropTypes.func,
  onRemoveMetric: PropTypes.func,
  onMoveLabel: PropTypes.func,
  onDropLabel: PropTypes.func,
  columns: PropTypes.arrayOf(columnType),
  savedMetrics: PropTypes.arrayOf(savedMetricType),
  savedMetricsOptions: PropTypes.arrayOf(savedMetricType),
  multi: PropTypes.bool,
  datasourceType: PropTypes.string,
};

export default function MetricDefinitionValue({
  option,
  onMetricEdit,
  onRemoveMetric,
  columns,
  savedMetrics,
  savedMetricsOptions,
  datasourceType,
  onMoveLabel,
  onDropLabel,
  index,
}) {
  const getSavedMetricByName = metricName =>
    savedMetrics.find(metric => metric.metric_name === metricName);

  let savedMetric;
  if (typeof option === 'string') {
    savedMetric = getSavedMetricByName(option);
  } else if (option.metric_name) {
    savedMetric = option;
  }

  if (option instanceof AdhocMetric || savedMetric) {
    const adhocMetric =
      option instanceof AdhocMetric ? option : new AdhocMetric({ isNew: true });

    const metricOptionProps = {
      onMetricEdit,
      onRemoveMetric,
      columns,
      savedMetricsOptions,
      datasourceType,
      adhocMetric,
      onMoveLabel,
      onDropLabel,
      index,
      savedMetric: savedMetric ?? {},
    };

    return <AdhocMetricOption {...metricOptionProps} />;
  }
  return null;
}
MetricDefinitionValue.propTypes = propTypes;
