import { WorkspaceFlavour } from '@affine/env/workspace';
import { useAFFiNEI18N } from '@affine/i18n/hooks';
import { ArrowRightSmallIcon } from '@blocksuite/icons';
import { Button } from '@toeverything/components/button';
import { Menu, MenuItem, MenuTrigger } from '@toeverything/components/menu';
import { ConfirmModal } from '@toeverything/components/modal';
import { useMemo, useState } from 'react';
import { useCallback } from 'react';

import { RadioButton, RadioButtonGroup } from '../../ui/button';
import Input from '../../ui/input';
import { Switch } from '../../ui/switch';
import { toast } from '../../ui/toast';
import { PublicLinkDisableModal } from './disable-public-link';
import * as styles from './index.css';
import type { ShareMenuProps } from './share-menu';
import { type ShareMode, useSharingUrl } from './use-share-url';

const CloudSvg = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="146"
    height="84"
    viewBox="0 0 146 84"
    fill="none"
  >
    <g opacity="0.1">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M66.9181 15.9788C52.6393 15.9788 41.064 27.5541 41.064 41.8329C41.064 43.7879 41.2801 45.687 41.6881 47.5094C42.2383 49.9676 40.6923 52.4066 38.2344 52.9579C29.4068 54.938 22.814 62.8293 22.814 72.2496C22.814 83.1687 31.6657 92.0204 42.5848 92.0204H97.3348C111.614 92.0204 123.189 80.4451 123.189 66.1663C123.189 51.8874 111.614 40.3121 97.3348 40.3121C97.1618 40.3121 96.9892 40.3138 96.8169 40.3172C94.6134 40.3603 92.6941 38.8222 92.2561 36.6623C89.8629 24.8606 79.4226 15.9788 66.9181 15.9788ZM31.939 41.8329C31.939 22.5145 47.5997 6.85376 66.9181 6.85376C82.573 6.85376 95.8181 17.1339 100.285 31.3098C118.223 32.808 132.314 47.8415 132.314 66.1663C132.314 85.4847 116.653 101.145 97.3348 101.145H42.5848C26.6261 101.145 13.689 88.2083 13.689 72.2496C13.689 59.9818 21.3304 49.5073 32.1102 45.3122C31.9969 44.1668 31.939 43.0061 31.939 41.8329Z"
        fill="var(--affine-icon-color)"
      />
    </g>
  </svg>
);

export const LocalSharePage = (props: ShareMenuProps) => {
  const t = useAFFiNEI18N();

  return (
    <>
      <div className={styles.localSharePage}>
        <div className={styles.columnContainerStyle} style={{ gap: '12px' }}>
          <div
            className={styles.descriptionStyle}
            style={{ maxWidth: '230px' }}
          >
            {t['com.affine.share-menu.EnableCloudDescription']()}
          </div>
          <div>
            <Button
              onClick={props.onEnableAffineCloud}
              type="primary"
              data-testid="share-menu-enable-affine-cloud-button"
            >
              {t['Enable AFFiNE Cloud']()}
            </Button>
          </div>
        </div>
        <div className={styles.cloudSvgContainer}>
          <CloudSvg />
        </div>
      </div>
    </>
  );
};

export const AffineSharePage = (props: ShareMenuProps) => {
  const {
    workspace: { id: workspaceId },
    currentPage: { id: pageId },
    currentPageMode,
  } = props;
  const { isSharedPage, toggleShare } = props.useIsSharedPage(
    workspaceId,
    pageId
  );
  const [currentShareMode, updateShareMode] = props.useShareMode(
    workspaceId,
    pageId
  );

  const [showDisable, setShowDisable] = useState(false);
  const [showChangeModeModal, setShowChangeModeModal] = useState(false);
  const [mode, setMode] = useState<ShareMode>(currentPageMode);

  const defaultMode = useMemo(() => {
    if (isSharedPage) {
      // if it's a shared page, use the share mode
      return currentShareMode;
    }
    // default to current page mode
    return currentPageMode;
  }, [currentPageMode, currentShareMode, isSharedPage]);

  const { sharingUrl, onClickCopyLink } = useSharingUrl({
    workspaceId,
    pageId,
    urlType: 'share',
    mode: mode,
  });
  const t = useAFFiNEI18N();

  const onClickCreateLink = useCallback(() => {
    toggleShare(true, mode);
  }, [mode, toggleShare]);

  const onDisablePublic = useCallback(() => {
    toggleShare(false);
    toast('Successfully disabled', {
      portal: document.body,
    });
    setShowDisable(false);
  }, [toggleShare]);

  const onShareModeChange = useCallback(
    (value: ShareMode) => {
      if (isSharedPage) {
        return setShowChangeModeModal(true);
      }
      setMode(value);
    },
    [isSharedPage]
  );

  const onConfirmChangeMode = useCallback(() => {
    const value = mode === 'edgeless' ? 'page' : 'edgeless';
    updateShareMode(value);
    setMode(value);
    setShowChangeModeModal(false);
  }, [mode, updateShareMode]);

  return (
    <>
      <div className={styles.titleContainerStyle}>
        {t['com.affine.share-menu.publish-to-web']()}
      </div>
      <div className={styles.columnContainerStyle}>
        <div className={styles.descriptionStyle}>
          {t['com.affine.share-menu.publish-to-web.description']()}
        </div>
      </div>
      <div className={styles.rowContainerStyle}>
        <Input
          inputStyle={{
            color: 'var(--affine-text-secondary-color)',
            fontSize: 'var(--affine-font-xs)',
            lineHeight: '20px',
          }}
          value={
            isSharedPage ? sharingUrl : `${runtimeConfig.serverUrlPrefix}/...`
          }
          readOnly
        />
        {isSharedPage ? (
          <Button
            onClick={onClickCopyLink}
            data-testid="share-menu-copy-link-button"
            style={{ padding: '4px 12px', whiteSpace: 'nowrap' }}
          >
            {t.Copy()}
          </Button>
        ) : (
          <Button
            onClick={onClickCreateLink}
            type="primary"
            data-testid="share-menu-create-link-button"
            style={{ padding: '4px 12px', whiteSpace: 'nowrap' }}
          >
            {t.Create()}
          </Button>
        )}
      </div>
      <div className={styles.rowContainerStyle}>
        <div className={styles.subTitleStyle}>
          {t['com.affine.share-menu.ShareMode']()}
        </div>
        <div>
          <RadioButtonGroup
            className={styles.radioButtonGroup}
            defaultValue={defaultMode}
            value={mode}
            onValueChange={onShareModeChange}
          >
            <RadioButton
              className={styles.radioButton}
              value={'page'}
              spanStyle={styles.spanStyle}
            >
              {t['com.affine.pageMode.page']()}
            </RadioButton>
            <RadioButton
              className={styles.radioButton}
              value={'edgeless'}
              spanStyle={styles.spanStyle}
            >
              {t['com.affine.pageMode.edgeless']()}
            </RadioButton>
          </RadioButtonGroup>
        </div>
      </div>
      {isSharedPage ? (
        <>
          {runtimeConfig.enableEnhanceShareMode && (
            <>
              <div className={styles.rowContainerStyle}>
                <div className={styles.subTitleStyle}>Link expires</div>
                <div>
                  <Menu items={<MenuItem>Never</MenuItem>}>
                    <MenuTrigger>Never</MenuTrigger>
                  </Menu>
                </div>
              </div>
              <div className={styles.rowContainerStyle}>
                <div className={styles.subTitleStyle}>
                  {'Show "Created with AFFiNE"'}
                </div>
                <div>
                  <Switch />
                </div>
              </div>
              <div className={styles.rowContainerStyle}>
                <div className={styles.subTitleStyle}>
                  Search engine indexing
                </div>
                <div>
                  <Switch />
                </div>
              </div>
            </>
          )}
          <MenuItem
            endFix={<ArrowRightSmallIcon />}
            block
            type="danger"
            className={styles.menuItemStyle}
            onSelect={e => {
              e.preventDefault();
              setShowDisable(true);
            }}
          >
            <div className={styles.disableSharePage}>
              {t['Disable Public Link']()}
            </div>
          </MenuItem>
          <PublicLinkDisableModal
            open={showDisable}
            onConfirm={onDisablePublic}
            onOpenChange={setShowDisable}
          />
          <ConfirmModal
            open={showChangeModeModal}
            onOpenChange={setShowChangeModeModal}
            title={t['com.affine.share-menu.confirm-modify-mode.title']()}
            description={t['com.affine.share-menu.confirm-modify-mode.title']()}
            confirmButtonOptions={{
              type: 'primary',
              ['data-testid' as string]:
                'confirm-change-share-page-mode-button',
              children: 'Modify',
            }}
            onConfirm={onConfirmChangeMode}
          />
        </>
      ) : null}
    </>
  );
};

export const SharePage = (props: ShareMenuProps) => {
  if (props.workspace.flavour === WorkspaceFlavour.LOCAL) {
    return <LocalSharePage {...props} />;
  } else if (props.workspace.flavour === WorkspaceFlavour.AFFINE_CLOUD) {
    return (
      <>
        <AffineSharePage {...props} />
      </>
    );
  }
  throw new Error('Unreachable');
};
