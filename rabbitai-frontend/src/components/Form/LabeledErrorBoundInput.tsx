
import React from 'react';
import { Input } from 'antd';
import { styled, css, RabbitaiTheme } from '@rabbitai-ui/core';
import FormItem from './FormItem';
import FormLabel from './FormLabel';

export interface LabeledErrorBoundInputProps {
  label?: string;
  validationMethods:
    | { onBlur: (value: any) => string }
    | { onChange: (value: any) => string };
  errorMessage: string | null;
  helpText?: string;
  required?: boolean;
  id?: string;
  [x: string]: any;
}

const StyledInput = styled(Input)`
  margin: 8px 0;
`;

const alertIconStyles = (theme: RabbitaiTheme, hasError: boolean) => css`
  .ant-form-item-children-icon {
    display: none;
  }
  ${hasError &&
  `.ant-form-item-control-input-content {
      position: relative;

      &:after {
        content: ' ';
        display: inline-block;
        background: ${theme.colors.error.base};
        mask: url('/images/icons/error.svg');
        mask-size: cover;
        width: ${theme.gridUnit * 4}px;
        height: ${theme.gridUnit * 4}px;
        position: absolute;
        right: 7px;
        top: 15px;
      }
    }`}
`;

const LabeledErrorBoundInput = ({
  label,
  validationMethods,
  errorMessage,
  helpText,
  required = false,
  id,
  ...props
}: LabeledErrorBoundInputProps) => (
  <>
    <FormLabel htmlFor={id} required={required}>
      {label}
    </FormLabel>
    <FormItem
      css={(theme: RabbitaiTheme) => alertIconStyles(theme, !!errorMessage)}
      validateTrigger={Object.keys(validationMethods)}
      validateStatus={errorMessage ? 'error' : 'success'}
      help={errorMessage || helpText}
      hasFeedback={!!errorMessage}
    >
      <StyledInput {...props} {...validationMethods} />
    </FormItem>
  </>
);

export default LabeledErrorBoundInput;
