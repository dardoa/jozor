import React, { memo } from 'react';
import { 
  Printer, FileText, Archive, Calendar, Download
} from 'lucide-react';
import { DropdownContent, DropdownMenuItem, DropdownMenuDivider, DropdownMenuHeader } from '../ui/DropdownMenu'; // Changed import
import { ExportMenuProps } from '../../types'; // Import ExportMenuProps
import { useTranslation } from '../../context/TranslationContext'; // Import useTranslation

export const ExportMenu = memo(({
    onClose, onExport // Removed t
}: ExportMenuProps) => {
    const { t } = useTranslation(); // Use useTranslation hook directly

    return (
        <DropdownContent className="w-64" onClose={onClose}> {/* Pass onClose to DropdownContent */}
            <DropdownMenuHeader icon={<Download className="w-3 h-3" />} label={t.downloadAs} />
            
            <DropdownMenuItem 
                onClick={() => onExport('jozor')} // onClick will now automatically call onClose
                icon={<Archive className="w-4 h-4"/>}
                label={t.jozorArchive}
                subLabel={t.photosData}
                colorClass="bg-teal-50/50 dark:bg-teal-900/10 hover:!bg-teal-50 dark:hover:!bg-teal-900/30 !text-teal-900 dark:!text-teal-100"
                iconBgClass="bg-teal-100 dark:bg-teal-900/50"
                iconTextColorClass="text-teal-600 dark:text-teal-400"
            />
            
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