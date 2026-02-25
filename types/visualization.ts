import { Person } from './person';

export interface TreeNode {
    id: string;
    x: number;
    y: number;
    vx?: number;
    vy?: number;
    data: Person;
    type: 'focus' | 'spouse' | 'parent' | 'child' | 'sibling' | 'ancestor' | 'descendant';
    startAngle?: number;
    endAngle?: number;
    depth?: number;
    staggerLevel?: number;
    gridRow?: number;
    gridCol?: number;
    familyPodId?: string;
    isReference?: boolean;
}

export interface TreeLink {
    source: string | TreeNode;
    target: string | TreeNode;
    type: 'parent-child' | 'marriage';
    customOrigin?: { x: number; y: number };
    sourceCoords?: { x: number; y: number };
}

export interface FanArc {
    id: string;
    person: Person;
    startAngle: number;
    endAngle: number;
    innerRadius: number;
    outerRadius: number;
    depth: number;
    value: number;
    hasChildren: boolean;
}
