import { shallow as enzymeShallow, mount as enzymeMount } from 'enzyme';
import { rabbitaiTheme } from '@rabbitai-ui/core';
import { ReactElement } from 'react';
import { ProviderWrapper } from './ProviderWrapper';

type optionsType = {
  wrappingComponentProps?: any;
  wrappingComponent?: ReactElement;
  context?: any;
};

export function styledMount(
  component: ReactElement,
  options: optionsType = {},
) {
  return enzymeMount(component, {
    ...options,
    wrappingComponent: ProviderWrapper,
    wrappingComponentProps: {
      theme: rabbitaiTheme,
      ...options?.wrappingComponentProps,
    },
  });
}

export function styledShallow(
  component: ReactElement,
  options: optionsType = {},
) {
  return enzymeShallow(component, {
    ...options,
    wrappingComponent: ProviderWrapper,
    wrappingComponentProps: {
      theme: rabbitaiTheme,
      ...options?.wrappingComponentProps,
    },
  });
}
