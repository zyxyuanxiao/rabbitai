
import React from 'react';
import PropTypes from 'prop-types';
import { t } from '@rabbitai-ui/core';
import ErrorMessageWithStackTrace from 'src/components/ErrorMessage/ErrorMessageWithStackTrace';

const propTypes = {
  children: PropTypes.node.isRequired,
  onError: PropTypes.func,
  showMessage: PropTypes.bool,
};
const defaultProps = {
  onError: () => {},
  showMessage: true,
};

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  componentDidCatch(error, info) {
    if (this.props.onError) this.props.onError(error, info);
    this.setState({ error, info });
  }

  render() {
    const { error, info } = this.state;
    if (error) {
      const firstLine = error.toString();
      const message = (
        <span>
          <strong>{t('Unexpected error')}</strong>
          {firstLine ? `: ${firstLine}` : ''}
        </span>
      );
      if (this.props.showMessage) {
        return (
          <ErrorMessageWithStackTrace
            subtitle={message}
            copyText={message}
            stackTrace={info ? info.componentStack : null}
          />
        );
      }
      return null;
    }
    return this.props.children;
  }
}
ErrorBoundary.propTypes = propTypes;
ErrorBoundary.defaultProps = defaultProps;
