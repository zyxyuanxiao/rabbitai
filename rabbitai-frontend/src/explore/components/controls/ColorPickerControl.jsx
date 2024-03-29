
import React from 'react';
import PropTypes from 'prop-types';
import { SketchPicker } from 'react-color';
import { getCategoricalSchemeRegistry } from '@rabbitai-ui/core';
import Popover from 'src/components/Popover';
import ControlHeader from '../ControlHeader';

const propTypes = {
  onChange: PropTypes.func,
  value: PropTypes.object,
};

const defaultProps = {
  onChange: () => {},
};

const swatchCommon = {
  position: 'absolute',
  width: '50px',
  height: '20px',
  top: '0px',
  left: '0px',
  right: '0px',
  bottom: '0px',
};

const styles = {
  swatch: {
    width: '50px',
    height: '20px',
    position: 'relative',
    padding: '5px',
    borderRadius: '1px',
    display: 'inline-block',
    cursor: 'pointer',
    boxShadow:
      'rgba(0, 0, 0, 0.15) 0px 0px 0px 1px inset, rgba(0, 0, 0, 0.25) 0px 0px 4px inset',
  },
  color: {
    ...swatchCommon,
    borderRadius: '2px',
  },
  checkboard: {
    ...swatchCommon,
    background:
      'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyRCgLaBCAAgXwixzAS0pgAAAABJRU5ErkJggg==") left center',
  },
};
export default class ColorPickerControl extends React.Component {
  constructor(props) {
    super(props);
    this.onChange = this.onChange.bind(this);
  }

  onChange(col) {
    this.props.onChange(col.rgb);
  }

  renderPopover() {
    const presetColors = getCategoricalSchemeRegistry()
      .get()
      .colors.filter((s, i) => i < 7);
    return (
      <div id="filter-popover" className="color-popover">
        <SketchPicker
          color={this.props.value}
          onChange={this.onChange}
          presetColors={presetColors}
        />
      </div>
    );
  }

  render() {
    const c = this.props.value || { r: 0, g: 0, b: 0, a: 0 };
    const colStyle = {
      ...styles.color,
      background: `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a})`,
    };
    return (
      <div>
        <ControlHeader {...this.props} />
        <Popover
          trigger="click"
          placement="right"
          content={this.renderPopover()}
        >
          <div style={styles.swatch}>
            <div style={styles.checkboard} />
            <div style={colStyle} />
          </div>
        </Popover>
      </div>
    );
  }
}

ColorPickerControl.propTypes = propTypes;
ColorPickerControl.defaultProps = defaultProps;
