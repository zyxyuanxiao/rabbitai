
import React from 'react';
import { render, screen } from 'spec/helpers/testing-library';
import userEvent from '@testing-library/user-event';
import PopoverSection from 'src/components/PopoverSection';

test('renders with default props', () => {
  render(
    <PopoverSection title="Title">
      <div role="form" />
    </PopoverSection>,
  );
  expect(screen.getByRole('form')).toBeInTheDocument();
  expect(screen.getAllByRole('img').length).toBe(1);
});

test('renders tooltip icon', () => {
  render(
    <PopoverSection title="Title" info="Tooltip">
      <div role="form" />
    </PopoverSection>,
  );
  expect(screen.getAllByRole('img').length).toBe(2);
});

test('renders a tooltip when hovered', async () => {
  render(
    <PopoverSection title="Title" info="Tooltip">
      <div role="form" />
    </PopoverSection>,
  );
  userEvent.hover(screen.getAllByRole('img')[0]);
  expect(await screen.findByRole('tooltip')).toBeInTheDocument();
});

test('calls onSelect when clicked', () => {
  const onSelect = jest.fn();
  render(
    <PopoverSection title="Title" onSelect={onSelect}>
      <div role="form" />
    </PopoverSection>,
  );
  userEvent.click(screen.getByRole('img'));
  expect(onSelect).toHaveBeenCalled();
});
