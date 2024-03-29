import React from 'react';
import { useChartOwnerNames } from 'src/common/hooks/apiResources';
import ErrorMessageWithStackTrace from 'src/components/ErrorMessage/ErrorMessageWithStackTrace';
import { RabbitaiError } from 'src/components/ErrorMessage/types';

interface Props {
  chartId: string;
  error?: RabbitaiError;
}

/**
 * fetches the chart owners and adds them to the extra data of the error message
 */
export const ChartErrorMessage: React.FC<Props> = ({
  chartId,
  error,
  ...props
}) => {
  const { result: owners } = useChartOwnerNames(chartId);

  // don't mutate props
  const ownedError = error && {
    ...error,
    extra: { ...error.extra, owners },
  };

  return <ErrorMessageWithStackTrace {...props} error={ownedError} />;
};
