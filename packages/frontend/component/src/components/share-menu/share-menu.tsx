import {
  type AffineCloudWorkspace,
  type AffineOfficialWorkspace,
  type AffinePublicWorkspace,
  type LocalWorkspace,
  WorkspaceFlavour,
} from '@affine/env/workspace';
import { useAFFiNEI18N } from '@affine/i18n/hooks';
import { WebIcon } from '@blocksuite/icons';
import type { Page } from '@blocksuite/store';
import { Button } from '@toeverything/components/button';
import { Divider } from '@toeverything/components/divider';
import { Menu } from '@toeverything/components/menu';

import * as styles from './index.css';
import { ShareExport } from './share-export';
import { SharePage } from './share-page';
import type { ShareMode } from './use-share-url';

export interface ShareMenuProps<
  Workspace extends AffineOfficialWorkspace =
    | AffineCloudWorkspace
    | LocalWorkspace
    | AffinePublicWorkspace,
> {
  workspace: Workspace;
  currentPage: Page;
  currentPageMode: ShareMode;
  useIsSharedPage: (
    workspaceId: string,
    pageId: string
  ) => {
    isSharedPage: boolean;
    toggleShare: (enable: boolean, shareMode?: ShareMode) => void;
  };
  useShareMode: (
    workspaceId: string,
    pageId: string
  ) => [ShareMode, (shareMode: ShareMode) => void];
  onEnableAffineCloud: () => void;
  togglePagePublic: () => Promise<void>;
  exportHandler: (type: 'pdf' | 'html' | 'png' | 'markdown') => Promise<void>;
}

const ShareMenuContent = (props: ShareMenuProps) => {
  const t = useAFFiNEI18N();
  return (
    <div className={styles.containerStyle}>
      <div className={styles.headerStyle}>
        <div className={styles.shareIconStyle}>
          <WebIcon />
        </div>
        {t['com.affine.share-menu.SharePage']()}
      </div>
      <SharePage {...props} />
      <div className={styles.columnContainerStyle}>
        <Divider size="thinner" />
      </div>
      <ShareExport {...props} />
    </div>
  );
};

const LocalShareMenu = (props: ShareMenuProps) => {
  const t = useAFFiNEI18N();
  return (
    <Menu
      items={<ShareMenuContent {...props} />}
      contentOptions={{
        className: styles.menuStyle,
        ['data-testid' as string]: 'local-share-menu',
      }}
      rootOptions={{
        modal: false,
      }}
    >
      <Button data-testid="local-share-menu-button" type="plain">
        {t['com.affine.share-menu.shareButton']()}
      </Button>
    </Menu>
  );
};

const CloudShareMenu = (props: ShareMenuProps) => {
  const t = useAFFiNEI18N();

  const { workspace, currentPage, useIsSharedPage } = props;
  const { isSharedPage } = useIsSharedPage(workspace.id, currentPage.id);

  return (
    <Menu
      items={<ShareMenuContent {...props} />}
      contentOptions={{
        className: styles.menuStyle,
        ['data-testid' as string]: 'cloud-share-menu',
      }}
      rootOptions={{
        modal: false,
      }}
    >
      <Button data-testid="cloud-share-menu-button" type="plain">
        <div
          style={{
            color: isSharedPage
              ? 'var(--affine-link-color)'
              : 'var(--affine-text-primary-color)',
          }}
        >
          {isSharedPage
            ? t['com.affine.share-menu.sharedButton']()
            : t['com.affine.share-menu.shareButton']()}
        </div>
      </Button>
    </Menu>
  );
};

export const ShareMenu = (props: ShareMenuProps) => {
  const { workspace } = props;

  if (workspace.flavour === WorkspaceFlavour.LOCAL) {
    return <LocalShareMenu {...props} />;
  }
  return <CloudShareMenu {...props} />;
};
