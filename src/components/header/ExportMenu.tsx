import { memo } from 'react';
import { 
  Printer, FileText, Archive, Calendar, Download
} from 'lucide-react';
import { DropdownContent, DropdownMenuItem, DropdownMenuDivider, DropdownMenuHeader } from '../ui/DropdownMenu';
import { ExportMenuProps } from '../../types';
import { useTranslation } from '../../context/TranslationContext';

export const ExportMenu = memo(({
    onClose, onExport
}: ExportMenuProps) => {
    const { t } = useTranslation();

    return (
        <DropdownContent className="w-64" onClose={onClose}>
            <DropdownMenuHeader icon={<Download className="w-3 h-3" />} label={t.downloadAs} />
            
            <DropdownMenuItem 
                onClick={() => onExport('jozor')}
                icon={<Archive className="w-4 h-4"/>}
                colorClass="bg-teal-50/50 dark:bg-teal-900/10 hover:!bg-teal-50 dark:hover:!bg-teal-900/30 !text-teal-900 dark:!text-teal-100"
                iconBgClass="bg-teal-100 dark:bg-teal-900/50"
                iconTextColorClass="text-teal-600 dark:text-teal-400"
            >
                <div className="flex flex-col items-start">
                    <span className="font-medium truncate">{t.jozorArchive}</span>
                    <span className="text-xs text-stone-500 dark:text-stone-400 truncate">{t.photosData}</span>
                </div>
            </DropdownMenuItem>
            
            <DropdownMenuDivider />
            
            <DropdownMenuItem onClick={() => onExport('ics')} icon={<Calendar className="w-3.5 h-3.5"/>}>
                {t.calendarExport}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport('json')} icon={<FileText className="w-3.5 h-3.5"/>}>
                {t.jsonFile}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport('gedcom')} icon={<FileText className="w-3.5 h-3.5"/>}>
                {t.gedcomFile}
            </DropdownMenuItem>
            
            <DropdownMenuDivider />
            
            <DropdownMenuItem onClick={() => onExport('print')} icon={<Printer className="w-3.5 h-3.5"/>}>
                {t.printPdf}
            </DropdownMenuItem>
        </DropdownContent>
    );
});