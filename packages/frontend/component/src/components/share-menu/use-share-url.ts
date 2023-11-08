import { useAFFiNEI18N } from '@affine/i18n/hooks';
import { useCallback, useMemo } from 'react';

import { toast } from '../../ui/toast';

type UrlType = 'share' | 'workspace';

export type ShareMode = 'page' | 'edgeless';

type UseSharingUrl = {
  workspaceId: string;
  pageId: string;
  urlType: UrlType;
  mode?: ShareMode;
};

export const generateUrl = ({
  workspaceId,
  pageId,
  urlType,
  mode,
}: UseSharingUrl) => {
  const url = new URL(
    `${runtimeConfig.serverUrlPrefix}/${urlType}/${workspaceId}/${pageId}`
  );
  if (urlType === 'share' && mode) {
    url.search = new URLSearchParams({ mode }).toString();
  }
  return url.toString();
};

export const useSharingUrl = ({
  workspaceId,
  pageId,
  urlType,
  mode,
}: UseSharingUrl) => {
  const t = useAFFiNEI18N();
  const sharingUrl = useMemo(
    () => generateUrl({ workspaceId, pageId, urlType, mode }),
    [workspaceId, pageId, urlType, mode]
  );

  const onClickCopyLink = useCallback(() => {
    navigator.clipboard
      .writeText(sharingUrl)
      .then(() => {
        toast(t['Copied link to clipboard']());
      })
      .catch(err => {
        console.error(err);
      });
  }, [sharingUrl, t]);

  return {
    sharingUrl,
    onClickCopyLink,
  };
};
