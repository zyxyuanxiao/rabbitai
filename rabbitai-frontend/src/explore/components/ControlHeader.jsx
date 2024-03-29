
import React from 'react';
import PropTypes from 'prop-types';
import { t, css } from '@rabbitai-ui/core';
import { InfoTooltipWithTrigger } from '@rabbitai-ui/chart-controls';
import { Tooltip } from 'src/components/Tooltip';
import { FormLabel } from 'src/components/Form';

const propTypes = {
  name: PropTypes.string,
  label: PropTypes.string,
  description: PropTypes.string,
  validationErrors: PropTypes.array,
  renderTrigger: PropTypes.bool,
  rightNode: PropTypes.node,
  leftNode: PropTypes.node,
  onClick: PropTypes.func,
  hovered: PropTypes.bool,
  tooltipOnClick: PropTypes.func,
  warning: PropTypes.string,
  danger: PropTypes.string,
};

const defaultProps = {
  validationErrors: [],
  renderTrigger: false,
  hovered: false,
  name: undefined,
};

export default class ControlHeader extends React.Component {
  renderOptionalIcons() {
    if (this.props.hovered) {
      return (
        <span
          css={theme => css`
            position: absolute;
            top: 50%;
            right: 0;
            padding-left: ${theme.gridUnit}px;
            transform: translate(100%, -50%);
            white-space: nowrap;
          `}
        >
          {this.props.description && (
            <span>
              <InfoTooltipWithTrigger
                label={t('description')}
                tooltip={this.props.description}
                placement="top"
                onClick={this.props.tooltipOnClick}
              />{' '}
            </span>
          )}
          {this.props.renderTrigger && (
            <span>
              <InfoTooltipWithTrigger
                label={t('bolt')}
                tooltip={t('Changing this control takes effect instantly')}
                placement="top"
                icon="bolt"
              />{' '}
            </span>
          )}
        </span>
      );
    }
    return null;
  }

  render() {
    if (!this.props.label) {
      return null;
    }
    const labelClass =
      this.props.validationErrors.length > 0 ? 'text-danger' : '';
    return (
      <div className="ControlHeader" data-test={`${this.props.name}-header`}>
        <div className="pull-left">
          <FormLabel
            css={{
              marginBottom: 0,
              position: 'relative',
              whiteSpace: 'nowrap',
            }}
          >
            {this.props.leftNode && <span>{this.props.leftNode}</span>}
            <span
              role="button"
              tabIndex={0}
              onClick={this.props.onClick}
              className={labelClass}
              style={{ cursor: this.props.onClick ? 'pointer' : '' }}
            >
              {this.props.label}
            </span>{' '}
            {this.props.warning && (
              <span>
                <Tooltip
                  id="error-tooltip"
                  placement="top"
                  title={this.props.warning}
                >
                  <i className="fa fa-exclamation-circle text-warning" />
                </Tooltip>{' '}
              </span>
            )}
            {this.props.danger && (
              <span>
                <Tooltip
                  id="error-tooltip"
                  placement="top"
                  title={this.props.danger}
                >
                  <i className="fa fa-exclamation-circle text-danger" />
                </Tooltip>{' '}
              </span>
            )}
            {this.props.validationErrors.length > 0 && (
              <span>
                <Tooltip
                  id="error-tooltip"
                  placement="top"
                  title={this.props.validationErrors.join(' ')}
                >
                  <i className="fa fa-exclamation-circle text-danger" />
                </Tooltip>{' '}
              </span>
            )}
            {this.renderOptionalIcons()}
          </FormLabel>
        </div>
        {this.props.rightNode && (
          <div className="pull-right">{this.props.rightNode}</div>
        )}
        <div className="clearfix" />
      </div>
    );
  }
}

ControlHeader.propTypes = propTypes;
ControlHeader.defaultProps = defaultProps;
