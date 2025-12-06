import React from 'react';
import { Search } from 'lucide-react';
import { useTranslation } from '../../context/TranslationContext';
import { Person } from '../../types';

interface SearchInputWithResultsProps {
  people: Record<string, Person>;
  onFocusPerson: (id: string) => void;
}

export const SearchInputWithResults: React.FC<SearchInputWithResultsProps> = ({ people, onFocusPerson }) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [results, setResults] = React.useState<Person[]>([]);

  React.useEffect(() => {
    if (searchTerm.length > 1) {
      const filtered = Object.values(people).filter(person =>
        person.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setResults(filtered);
    } else {
      setResults([]);
    }
  }, [searchTerm, people]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <input
          type="text"
          placeholder={t.search}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8 pr-3 py-1.5 text-sm rounded-full bg-stone-100 dark:bg-stone-800 border border-transparent focus:border-teal-500 focus:ring-0 outline-none transition-all w-36 md:w-48"
        />
      </div>
      {searchTerm.length > 1 && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-white dark:bg-stone-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
          {results.map(person => (
            <button
              key={person.id}
              onClick={() => {
                onFocusPerson(person.id);
                setSearchTerm('');
                setResults([]);
              }}
              className="block w-full text-left px-4 py-2 text-sm text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700"
            >
              {person.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};