
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
  it('activates a normal command exactly once with Enter and closes', () => {
    const onSelect = vi.fn();
    render(<Dropdown trigger={<CustomTrigger label="Commands" />}>
      <DropdownContent><DropdownMenuItem label="Run" onClick={onSelect} /></DropdownContent>
    </Dropdown>);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Commands' }), { key: 'ArrowDown' });
    fireEvent.keyDown(screen.getByRole('menuitem', { name: 'Run' }), { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledOnce();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('keeps keyboard-activated items open when closeOnClick is false', () => {
    const onSelect = vi.fn();
    render(<Dropdown trigger={<CustomTrigger label="Keep open" />}>
      <DropdownContent><DropdownMenuItem label="Check" closeOnClick={false} onClick={onSelect} /></DropdownContent>
    </Dropdown>);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Keep open' }), { key: 'ArrowDown' });
    fireEvent.keyDown(screen.getByRole('menuitem', { name: 'Check' }), { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledOnce();
    expect(screen.getByRole('menu')).toBeVisible();
    fireEvent.keyDown(screen.getByRole('menuitem'), { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep open' })).toHaveFocus();
  });

  it('does not activate a command when the trigger handles Enter to close', () => {
    const onSelect = vi.fn();
    render(<Dropdown trigger={<CustomTrigger label="Toggle" />}>
      <DropdownContent><DropdownMenuItem label="Unselected" onClick={onSelect} /></DropdownContent>
    </Dropdown>);
    const trigger = screen.getByRole('button', { name: 'Toggle' });
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'Enter' });
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('skips disabled commands and closes on an outside click', () => {
    const disabled = vi.fn();
    render(<Dropdown trigger={<CustomTrigger label="Disabled menu" />}>
      <DropdownContent>
        <DropdownMenuItem label="Disabled" disabled onClick={disabled} />
        <DropdownMenuItem label="Available" closeOnClick={false} />
      </DropdownContent>
    </Dropdown>);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Disabled menu' }), { key: 'ArrowDown' });
    expect(screen.getByRole('menuitem', { name: 'Available' })).toHaveFocus();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(disabled).not.toHaveBeenCalled();
  });

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

