// @ts-nocheck
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { searchService } from '../searchService';
import { Person } from '../../types';

const mockPeople: Person[] = [
  { id: 'p1', firstName: 'أحمد', lastName: 'العلي', gender: 'male', parents: [], children: ['p2', 'p3'], spouses: ['s1'], isDeceased: false } as any,
  { id: 'p2', firstName: 'خالد', lastName: 'أحمد', gender: 'male', parents: ['p1'], children: ['p4'], spouses: [], isDeceased: false } as any,
  { id: 'p3', firstName: 'سارة', lastName: 'أحمد', gender: 'female', parents: ['p1'], children: [], spouses: [], isDeceased: false } as any,
  { id: 'p4', firstName: 'فهد', lastName: 'خالد', gender: 'male', parents: ['p2'], children: [], spouses: [], isDeceased: false } as any,
  { id: 's1', firstName: 'نورة', lastName: 'العلي', gender: 'female', parents: [], children: ['p2', 'p3'], spouses: ['p1'], isDeceased: false } as any,
  { id: 'm1', firstName: 'محمد', lastName: 'المنصور', gender: 'male', parents: [], children: [], spouses: [], birthPlace: 'مكة', currentLocation: 'الرياض', isDeceased: true } as any,
];

describe('Inference Search Service', () => {
  beforeEach(async () => {
    await searchService.updateSearchIndex(mockPeople);
  });

  it('should find children of a target person (أبناء أحمد)', async () => {
    const results = await searchService.search('أبناء أحمد');
    const names = results.map(p => p.firstName);
    
    expect(names).toContain('خالد');
    expect(names).toContain('سارة');
    expect(names).not.toContain('أحمد'); // Should not include the father
    expect(results.length).toBe(2);
  });

  it('should find grandchildren of a target person (أحفاد أحمد)', async () => {
    const results = await searchService.search('أحفاد أحمد');
    const names = results.map(p => p.firstName);
    
    expect(names).toContain('فهد'); // Khalid's son
    expect(results.length).toBe(1);
  });

  it('should filter by location (في مكة)', async () => {
    const results = await searchService.search('في مكة');
    expect(results.length).toBe(1);
    expect(results[0].firstName).toBe('محمد');
  });

  it('should combine location and status (متوفين في مكة)', async () => {
    const results = await searchService.search('متوفين في مكة');
    expect(results.length).toBe(1);
    expect(results[0].firstName).toBe('محمد');
  });

  it('should handle missing targets gracefully (أبناء شخص غير موجود)', async () => {
    const results = await searchService.search('أبناء زيكو');
    expect(results.length).toBe(0);
  });
});

