import React, { memo } from 'react';
import { 
  Printer, FileText, Archive, Calendar, Download
} from 'lucide-react';
import { DropdownMenuContainer, DropdownMenuItem, DropdownMenuDivider, DropdownMenuHeader } from '../ui/DropdownMenu';

export const ExportMenu = memo(({
    onClose, onExport, t
}: {
    onClose: () => void;
    onExport: (type: 'jozor' | 'json' | 'gedcom' | 'ics' | 'print') => void;
    t: any;
}) => (
    <>
        <div className="fixed inset-0 z-10" onClick={onClose}></div>
        <DropdownMenuContainer className="end-0 w-64">
            <DropdownMenuHeader icon={<Download className="w-3 h-3" />} label={t.downloadAs} />
            
            <DropdownMenuItem 
                onClick={() => onExport('jozor')}
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
        </DropdownMenuContainer>
    </>
));