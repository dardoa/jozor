import { memo } from 'react';
import { Printer, FileText, Archive, Calendar, Download, FileImage } from 'lucide-react';
import {
  DropdownContent,
  DropdownMenuItem,
  DropdownMenuDivider,
  DropdownMenuHeader,
} from '../ui/DropdownMenu';
import { ExportMenuProps } from '../../types';
import { useTranslation } from '../../context/TranslationContext';
import { useAppStore } from '../../store/useAppStore';

export const ExportMenu = memo(({ onClose, onExport, onBack }: ExportMenuProps) => {
  const { t } = useTranslation();
  const currentUserRole = useAppStore((state) => state.currentUserRole);
  const isDemoMode = useAppStore((state) => state.isDemoMode);
  const isOwner = isDemoMode || currentUserRole === 'owner';

  return (
    <DropdownContent className='w-64 z-[99999] !bg-[var(--card-bg)] shadow-2xl pointer-events-auto' onClose={onClose}>
      {onBack ? (
        <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[var(--text-main)] border-b border-[var(--border-main)]">
          <button onClick={onBack} className="p-1 hover:bg-[var(--theme-hover)] rounded-md transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-left w-4 h-4"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <span>{t.export}</span>
        </div>
      ) : (
        <DropdownMenuHeader icon={<Download className='w-3 h-3' />} label={t.downloadAs} />
      )}

      {!isOwner ? (
        <div className='p-4 text-center'>
          <p className='text-xs text-[var(--text-dim)] italic'>
            {t.language === 'ar'
              ? 'التصدير متاح لمالك الشجرة فقط.'
              : 'Exporting is restricted to the tree owner.'}
          </p>
        </div>
      ) : (
        <>
          {/* Jozor Archive — primary format */}
          <DropdownMenuItem
            onClick={() => onExport('jozor')}
            icon={<Archive className='w-4 h-4' />}
            label={t.jozorArchive}
            subLabel={t.photosData}
            colorClass='bg-[var(--primary-600)]/5 hover:!bg-[var(--primary-600)]/10 !text-[var(--primary-600)]'
            iconBgClass='bg-[var(--primary-600)]/20'
            iconTextColorClass='text-[var(--primary-600)]'
          />

          <DropdownMenuDivider />

          {/* Data formats */}
          <DropdownMenuItem onClick={() => onExport('ics')} icon={<Calendar className='w-3.5 h-3.5' />}>
            {t.calendarExport}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onExport('json')} icon={<FileText className='w-3.5 h-3.5' />}>
            {t.jsonFile}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onExport('gedcom')} icon={<FileText className='w-3.5 h-3.5' />}>
            {t.gedcomFile}
          </DropdownMenuItem>

          <DropdownMenuDivider />

          {/* Image formats */}
          <DropdownMenuItem onClick={() => onExport('png')} icon={<FileImage className='w-3.5 h-3.5' />}>
            {t.language === 'ar' ? 'تصدير صورة عالية الدقة (PNG)' : 'Export High-Res PNG'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onExport('jpeg')} icon={<FileImage className='w-3.5 h-3.5' />}>
            {t.language === 'ar' ? 'تصدير صورة قياسية (JPEG)' : 'Export Standard JPEG'}
          </DropdownMenuItem>

          <DropdownMenuDivider />

          {/* Print / Document */}
          <DropdownMenuItem onClick={() => onExport('print')} icon={<Printer className='w-3.5 h-3.5' />}>
            {t.printPdf}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onExport('pdf')} icon={<FileText className='w-3.5 h-3.5' />}>
            {t.language === 'ar' ? 'تصدير مستند (PDF)' : 'Export Document (PDF)'}
          </DropdownMenuItem>
        </>
      )}
    </DropdownContent>
  );
});
