
import React from 'react';
import { useArgs } from '@storybook/client-api';
import { Radio } from './index';

export default {
  title: 'Radio',
  component: Radio,
  parameters: {
    controls: { hideNoControlsWarning: true },
  },
  argTypes: {
    theme: {
      table: {
        disable: true,
      },
    },
    checked: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
};

export const RabbitaiRadio = () => {
  const [{ checked, ...rest }, updateArgs] = useArgs();
  return (
    <Radio
      checked={checked}
      onChange={() => updateArgs({ checked: !checked })}
      {...rest}
    >
      Example
    </Radio>
  );
};

RabbitaiRadio.args = {
  checked: false,
  disabled: false,
};
