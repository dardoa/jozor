import * as d3 from 'd3';
import { Person, TreeNode, TreeLink, TreeSettings } from '../types';
import { 
    NODE_WIDTH_DEFAULT, NODE_WIDTH_COMPACT,
} from './layoutConstants'; // Import constants from layoutConstants

/**
 * Calculates the layout for a pedigree chart (ancestors only).
 */
export const calculatePedigreeLayout = (people: Record<string, Person>, focusId: string, settings: TreeSettings) => {
     const nodes: TreeNode[] = [];
     const links: TreeLink[] = [];
     const maxGenerations = 5; // Limit generations for performance and readability
     
     // Config
     const baseLevelWidth = settings.isCompact ? 180 : 220; 
     const rootY = 0; // Starting Y position for the focus person

     // Recursive placement function
     const buildAncestor = (id: string, generation: number, y: number, branchHeight: number) => {
         if (generation >= maxGenerations) return;
         
         const person = people[id];
         if (!person) return;

         // Prevent adding the same person multiple times in the same chart type
         if (nodes.some(n => n.id === id && n.type === (generation === 0 ? 'focus' : 'ancestor'))) return; 

         nodes.push({
             id: id,
             x: generation * baseLevelWidth, // X position based on generation
             y: y, // Y position adjusted for branching
             data: person,
             type: generation === 0 ? 'focus' : 'ancestor'
         });

         const nextBranchHeight = branchHeight / 2; // Halve branch height for next generation
         
         // Father
         let fatherId = person.parents.find(pid => people[pid]?.gender === 'male');
         // Fallback if no explicit male parent, take first parent
         if (!fatherId && person.parents.length > 0) fatherId = person.parents[0];

         if (fatherId) {
             const fatherY = y - nextBranchHeight; // Father goes up
             buildAncestor(fatherId, generation + 1, fatherY, nextBranchHeight);
             links.push({ source: id, target: fatherId, type: 'parent-child' });
         }

         // Mother
         let motherId = person.parents.find(pid => people[pid]?.gender === 'female');
         // Fallback if no explicit female parent, take second parent if available and not father
         if (!motherId && person.parents.length > 1) {
             motherId = person.parents.find(pid => pid !== fatherId);
         }

         if (motherId) {
             const motherY = y + nextBranchHeight; // Mother goes down
             buildAncestor(motherId, generation + 1, motherY, nextBranchHeight);
             links.push({ source: id, target: motherId, type: 'parent-child' });
         }
     };

     // Initial call: Start with the focus person at generation 0, Y=0, and a base branch height
     buildAncestor(focusId, 0, rootY, 300); // 300 is an arbitrary initial branch height

     return { nodes, links, collapsePoints: [] };
};