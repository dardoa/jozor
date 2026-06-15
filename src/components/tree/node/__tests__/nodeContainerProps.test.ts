import { describe, expect, it, vi } from 'vitest';
import type { Person, TreeNode, TreeSettings } from '../../../../types';
import {
  areNodeContainerPropsEqual,
  type NodeContainerProps,
} from '../nodeContainerProps';

const person = {
  id: 'person-1',
  firstName: 'Salem',
} as Person;

const settings = {
  showFirstName: true,
  showPhotos: true,
  privacyMode: false,
} as TreeSettings;

const buildProps = (
  node: TreeNode,
  overrides: Partial<NodeContainerProps> = {},
): NodeContainerProps => ({
  node,
  index: 0,
  isFocused: false,
  isHighlighted: false,
  onSelect: vi.fn(),
  onNodeContextMenu: vi.fn(),
  settings,
  zoomScale: 1,
  nodeWidth: 180,
  nodeHeight: 220,
  ...overrides,
});

describe('areNodeContainerPropsEqual', () => {
  it('treats separately allocated but equivalent nodes as equal', () => {
    const onSelect = vi.fn();
    const onNodeContextMenu = vi.fn();
    const previous = buildProps(
      { id: 'node-1', x: 10, y: 20, data: person, type: 'focus' },
      { onSelect, onNodeContextMenu },
    );
    const next = buildProps(
      { id: 'node-1', x: 10, y: 20, data: person, type: 'focus' },
      { onSelect, onNodeContextMenu },
    );

    expect(areNodeContainerPropsEqual(previous, next)).toBe(true);
  });

  it('detects person and position changes', () => {
    const onSelect = vi.fn();
    const onNodeContextMenu = vi.fn();
    const previous = buildProps(
      { id: 'node-1', x: 10, y: 20, data: person, type: 'focus' },
      { onSelect, onNodeContextMenu },
    );
    const moved = buildProps(
      { id: 'node-1', x: 11, y: 20, data: person, type: 'focus' },
      { onSelect, onNodeContextMenu },
    );
    const renamed = buildProps(
      {
        id: 'node-1',
        x: 10,
        y: 20,
        data: { ...person, firstName: 'Noura' },
        type: 'focus',
      },
      { onSelect, onNodeContextMenu },
    );

    expect(areNodeContainerPropsEqual(previous, moved)).toBe(false);
    expect(areNodeContainerPropsEqual(previous, renamed)).toBe(false);
  });
});
