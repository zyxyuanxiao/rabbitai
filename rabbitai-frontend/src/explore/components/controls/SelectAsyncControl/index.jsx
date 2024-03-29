
import React from 'react';
import PropTypes from 'prop-types';
import { t } from '@rabbitai-ui/core';

import Select from 'src/components/AsyncSelect';
import ControlHeader from 'src/explore/components/ControlHeader';
import withToasts from 'src/messageToasts/enhancers/withToasts';

const propTypes = {
  dataEndpoint: PropTypes.string.isRequired,
  multi: PropTypes.bool,
  mutator: PropTypes.func,
  onAsyncErrorMessage: PropTypes.string,
  onChange: PropTypes.func,
  placeholder: PropTypes.string,
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.arrayOf(PropTypes.string),
    PropTypes.arrayOf(PropTypes.number),
  ]),
  addDangerToast: PropTypes.func.isRequired,
};

const defaultProps = {
  multi: true,
  onAsyncErrorMessage: t('Error while fetching data'),
  onChange: () => {},
  placeholder: t('Select ...'),
};

const SelectAsyncControl = props => {
  const {
    value,
    onChange,
    dataEndpoint,
    multi,
    mutator,
    placeholder,
    onAsyncErrorMessage,
  } = props;
  const onSelectionChange = options => {
    let val;
    if (multi) {
      val = options?.map(option => option.value) ?? null;
    } else {
      val = options?.value ?? null;
    }
    onChange(val);
  };

  return (
    <div data-test="SelectAsyncControl">
      <ControlHeader {...props} />
      <Select
        dataEndpoint={dataEndpoint}
        onChange={onSelectionChange}
        onAsyncError={errorMsg =>
          props.addDangerToast(`${onAsyncErrorMessage}: ${errorMsg}`)
        }
        mutator={mutator}
        multi={multi}
        value={value}
        placeholder={placeholder}
        valueRenderer={v => <div>{v.label}</div>}
      />
    </div>
  );
};

SelectAsyncControl.propTypes = propTypes;
SelectAsyncControl.defaultProps = defaultProps;

export default withToasts(SelectAsyncControl);
