
import React from 'react';
import PropTypes from 'prop-types';
import { isFunction } from 'lodash';
import { Select } from 'src/components/Select';
import { Tooltip } from 'src/components/Tooltip';
import ControlHeader from '../ControlHeader';

const propTypes = {
  description: PropTypes.string,
  label: PropTypes.string.isRequired,
  labelMargin: PropTypes.number,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func,
  value: PropTypes.string,
  clearable: PropTypes.bool,
  default: PropTypes.string,
  choices: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.array),
    PropTypes.func,
  ]),
  schemes: PropTypes.oneOfType([PropTypes.object, PropTypes.func]),
  isLinear: PropTypes.bool,
};

const defaultProps = {
  choices: [],
  schemes: {},
  clearable: false,
  onChange: () => {},
};

export default class ColorSchemeControl extends React.PureComponent {
  constructor(props) {
    super(props);
    this.onChange = this.onChange.bind(this);
    this.renderOption = this.renderOption.bind(this);
  }

  onChange(option) {
    const optionValue = option ? option.value : null;
    this.props.onChange(optionValue);
  }

  renderOption(key) {
    const { isLinear } = this.props;
    const currentScheme = this.schemes[key.value];

    // For categorical scheme, display all the colors
    // For sequential scheme, show 10 or interpolate to 10.
    // Sequential schemes usually have at most 10 colors.
    let colors = [];
    if (currentScheme) {
      colors = isLinear ? currentScheme.getColors(10) : currentScheme.colors;
    }

    return (
      <Tooltip id={`${currentScheme.id}-tooltip`} title={currentScheme.label}>
        <ul
          css={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            alignItems: 'center',

            '& li': {
              flexBasis: 9,
              height: 10,
              margin: '9px 1px',
            },
          }}
          data-test={currentScheme.id}
        >
          {colors.map((color, i) => (
            <li
              key={`${currentScheme.id}-${i}`}
              css={{
                backgroundColor: color,
                border: `1px solid ${color === 'white' ? 'black' : color}`,
              }}
            >
              &nbsp;
            </li>
          ))}
        </ul>
      </Tooltip>
    );
  }

  render() {
    const { schemes, choices, labelMargin = 0 } = this.props;
    // save parsed schemes for later
    this.schemes = isFunction(schemes) ? schemes() : schemes;
    const options = (isFunction(choices) ? choices() : choices).map(
      ([value, label]) => ({
        value,
        // use scheme label if available
        label: this.schemes[value]?.label || label,
      }),
    );
    const selectProps = {
      multi: false,
      name: `select-${this.props.name}`,
      placeholder: `Select (${options.length})`,
      default: this.props.default,
      options,
      value: this.props.value,
      autosize: false,
      clearable: this.props.clearable,
      onChange: this.onChange,
      optionRenderer: this.renderOption,
      valueRenderer: this.renderOption,
    };
    return (
      <div>
        <ControlHeader {...this.props} />
        <Select {...selectProps} css={{ marginTop: labelMargin }} />
      </div>
    );
  }
}

ColorSchemeControl.propTypes = propTypes;
ColorSchemeControl.defaultProps = defaultProps;
