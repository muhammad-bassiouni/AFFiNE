import { RadioButton, RadioButtonGroup } from '@affine/component';
import { useAFFiNEI18N } from '@affine/i18n/hooks';
import { useAtom } from 'jotai';
import type { ReactNode } from 'react';
import type React from 'react';

import { allPageModeSelectAtom } from '../../../atoms';
import type { HeaderProps } from '../../blocksuite/workspace-header/header';
import { Header } from '../../blocksuite/workspace-header/header';
import * as styles from '../../blocksuite/workspace-header/styles.css';

export interface WorkspaceTitleProps
  extends React.PropsWithChildren<HeaderProps> {
  icon?: ReactNode;
}

export const WorkspaceModeFilterTab = ({ ...props }: WorkspaceTitleProps) => {
  const t = useAFFiNEI18N();
  const [value, setMode] = useAtom(allPageModeSelectAtom);
  const handleValueChange = (value: string) => {
    if (value !== 'all' && value !== 'page' && value !== 'edgeless') {
      throw new Error('Invalid value for page mode option');
    }
    setMode(value);
  };

  return (
    <Header {...props}>
      <div className={styles.allPageListTitleWrapper}>
        <RadioButtonGroup
          width={300}
          defaultValue={value}
          onValueChange={handleValueChange}
        >
          <RadioButton value="all" style={{ textTransform: 'capitalize' }}>
            {t['all']()}
          </RadioButton>
          <RadioButton value="page">{t['Page']()}</RadioButton>
          <RadioButton value="edgeless">{t['Edgeless']()}</RadioButton>
        </RadioButtonGroup>
      </div>
    </Header>
  );
};