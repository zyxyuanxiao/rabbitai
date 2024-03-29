

import React from 'react';
import { render, screen } from 'spec/helpers/testing-library';
import userEvent from '@testing-library/user-event';
import DatabaseErrorMessage from './DatabaseErrorMessage';
import { ErrorLevel, ErrorSource, ErrorTypeEnum } from './types';

const mockedProps = {
  error: {
    error_type: ErrorTypeEnum.DATABASE_SECURITY_ACCESS_ERROR,
    extra: {
      engine_name: 'Engine name',
      issue_codes: [
        {
          code: 1,
          message: 'Issue code message A',
        },
        {
          code: 2,
          message: 'Issue code message B',
        },
      ],
      owners: ['Owner A', 'Owner B'],
    },
    level: 'error' as ErrorLevel,
    message: 'Error message',
  },
  source: 'dashboard' as ErrorSource,
};

test('should render', () => {
  const { container } = render(<DatabaseErrorMessage {...mockedProps} />);
  expect(container).toBeInTheDocument();
});

test('should render the error message', () => {
  render(<DatabaseErrorMessage {...mockedProps} />, { useRedux: true });
  const button = screen.getByText('See more');
  userEvent.click(button);
  expect(screen.getByText('Error message')).toBeInTheDocument();
});

test('should render the issue codes', () => {
  render(<DatabaseErrorMessage {...mockedProps} />, { useRedux: true });
  const button = screen.getByText('See more');
  userEvent.click(button);
  expect(screen.getByText(/This may be triggered by:/)).toBeInTheDocument();
  expect(screen.getByText(/Issue code message A/)).toBeInTheDocument();
  expect(screen.getByText(/Issue code message B/)).toBeInTheDocument();
});

test('should render the engine name', () => {
  render(<DatabaseErrorMessage {...mockedProps} />);
  expect(screen.getByText(/Engine name/)).toBeInTheDocument();
});

test('should render the owners', () => {
  render(<DatabaseErrorMessage {...mockedProps} />, { useRedux: true });
  const button = screen.getByText('See more');
  userEvent.click(button);
  expect(
    screen.getByText('Please reach out to the Chart Owners for assistance.'),
  ).toBeInTheDocument();
  expect(
    screen.getByText('Chart Owners: Owner A, Owner B'),
  ).toBeInTheDocument();
});

test('should NOT render the owners', () => {
  const noVisualizationProps = {
    ...mockedProps,
    source: 'sqllab' as ErrorSource,
  };
  render(<DatabaseErrorMessage {...noVisualizationProps} />, {
    useRedux: true,
  });
  const button = screen.getByText('See more');
  userEvent.click(button);
  expect(
    screen.queryByText('Chart Owners: Owner A, Owner B'),
  ).not.toBeInTheDocument();
});
