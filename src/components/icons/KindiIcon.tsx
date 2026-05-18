import React, { memo } from 'react';

import kindiIconUrl from '../../assets/icons/kindi-icon.svg';

interface KindiIconProps {
  className?: string;
  size?: number | string;
  title?: string;
}

export const KindiIcon: React.FC<KindiIconProps> = memo(({
  className,
  size = 24,
  title = 'Kindi',
}) => (
  <img
    src={kindiIconUrl}
    alt={title}
    className={className}
    style={{ width: size, height: size }}
    draggable={false}
    loading="eager"
  />
));

KindiIcon.displayName = 'KindiIcon';
