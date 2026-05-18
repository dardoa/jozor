import type { TranslationSchema } from '../../../utils/translationLoader';
import type { DriveFileManagerModalProps } from '../../../types';

export type DriveFileManagerFile = DriveFileManagerModalProps['files'][number];

export interface DriveFileManagerTextProps {
  t: TranslationSchema;
}
