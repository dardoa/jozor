
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import { Dropdown } from '../Dropdown';
import { DropdownContent, DropdownMenuItem } from '../DropdownMenu';

const CustomTrigger = ({
  label,
  ...props
}: { label: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button type="button" {...props}>
    {label}
  </button>
);

describe('Dropdown', () => {
  it('opens when a custom trigger is clicked', () => {
    render(
      <Dropdown trigger={<CustomTrigger label="Open menu" />}>
        <DropdownContent>
          <DropdownMenuItem label="Menu item" />
        </DropdownContent>
      </Dropdown>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));

    expect(screen.getByRole('menuitem', { name: 'Menu item' })).toBeInTheDocument();
  });

  it('opens from the keyboard and closes when a menu item is clicked', () => {
    const onSelect = vi.fn();

    render(
      <Dropdown trigger={<CustomTrigger label="Keyboard menu" />}>
        <DropdownContent>
          <DropdownMenuItem label="Select item" onClick={onSelect} />
        </DropdownContent>
      </Dropdown>
    );

    const trigger = screen.getByRole('button', { name: 'Keyboard menu' });
    fireEvent.keyDown(trigger, { key: 'Enter' });

    const menuItem = screen.getByRole('menuitem', { name: 'Select item' });
    fireEvent.click(menuItem);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menuitem', { name: 'Select item' })).not.toBeInTheDocument();
  });

  it('adds menu accessibility attributes to the trigger', () => {
    render(
      <Dropdown trigger={<CustomTrigger label="Accessible menu" />}>
        <DropdownContent>
          <DropdownMenuItem label="Accessible item" />
        </DropdownContent>
      </Dropdown>
    );

    const trigger = screen.getByRole('button', { name: 'Accessible menu' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });
});

